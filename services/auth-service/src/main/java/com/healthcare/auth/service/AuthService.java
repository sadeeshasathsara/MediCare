package com.healthcare.auth.service;

import com.healthcare.auth.dto.*;
import com.healthcare.auth.model.*;
import com.healthcare.auth.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            RefreshTokenService refreshTokenService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
    }

    public RegisterResponse register(RegisterRequest request) {
        Role role = request.getRole();
        if (role == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "role is required");
        }
        if (role == Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "admin registration is not allowed");
        }

        String email = normalizeEmail(request.getEmail());
        if (email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email is required");
        }
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "password is required");
        }
        if (request.getFullName() == null || request.getFullName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fullName is required");
        }

        if (userRepository.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "email already exists");
        }

        DoctorProfile doctorProfile = null;
        boolean doctorVerified = true;
        DoctorVerificationStatus doctorVerificationStatus = null;

        if (role == Role.DOCTOR) {
            if (request.getDoctorProfile() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "doctorProfile is required for DOCTOR");
            }
            doctorProfile = toDoctorProfile(request.getDoctorProfile());
            doctorVerified = false;
            doctorVerificationStatus = DoctorVerificationStatus.PENDING;
        }

        Instant now = Instant.now();

        User user = new User();
        user.setEmail(email);
        user.setFullName(request.getFullName().trim());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(role);
        user.setDoctorProfile(doctorProfile);
        user.setDoctorVerified(doctorVerified);
        user.setDoctorVerificationStatus(doctorVerificationStatus);
        user.setStatus(UserStatus.ACTIVE);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);

        User saved = userRepository.save(user);
        return new RegisterResponse(
                saved.getId(),
                saved.getEmail(),
                saved.getFullName(),
                saved.getRole(),
                saved.isDoctorVerified(),
                toDoctorProfileDto(saved.getDoctorProfile()));
    }

    public LoginResponse login(LoginRequest request) {
        String email = normalizeEmail(request.getEmail());

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials");
        }

        if (user.getStatus() == UserStatus.DISABLED) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "account disabled");
        }

        if (user.getRole() == Role.DOCTOR && !user.isDoctorVerified()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "doctor account is not verified");
        }

        String accessToken = jwtService.generateAccessToken(user);
        RefreshTokenService.CreatedRefreshToken refresh = refreshTokenService.createForUser(user.getId());

        long expiresInSeconds = Math.max(1, jwtService.getAccessTtlMs() / 1000);
        UserInfoDto userInfo = new UserInfoDto(user.getId(), user.getRole(), user.isDoctorVerified());

        return new LoginResponse(accessToken, refresh.rawToken(), "Bearer", expiresInSeconds, userInfo);
    }

    public RefreshResponse refresh(RefreshRequest request) {
        Instant now = Instant.now();

        RefreshToken oldToken = refreshTokenService.findByRawToken(request.getRefreshToken())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid refresh token"));

        if (oldToken.isRevoked() || oldToken.isExpired(now)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "refresh token expired or revoked");
        }

        String userId = oldToken.getUserId();
        if (userId == null || userId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid refresh token");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid refresh token"));

        if (user.getStatus() == UserStatus.DISABLED) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "account disabled");
        }
        if (user.getRole() == Role.DOCTOR && !user.isDoctorVerified()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "doctor account is not verified");
        }

        RefreshTokenService.CreatedRefreshToken created = refreshTokenService.createForUser(user.getId());

        oldToken.setRevokedAt(now);
        oldToken.setReplacedByTokenId(created.token().getId());
        refreshTokenService.save(oldToken);

        String accessToken = jwtService.generateAccessToken(user);
        return new RefreshResponse(accessToken, created.rawToken(), "Bearer");
    }

    public void logout(RefreshRequest request) {
        Instant now = Instant.now();

        refreshTokenService.findByRawToken(request.getRefreshToken()).ifPresent(token -> {
            if (!token.isRevoked()) {
                token.setRevokedAt(now);
                refreshTokenService.save(token);
            }
        });
    }

    public VerifyDoctorResponse verifyDoctor(VerifyDoctorRequest request) {
        String doctorUserId = request.getDoctorUserId();
        if (doctorUserId == null || doctorUserId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "doctorUserId is required");
        }

        User doctor = userRepository.findById(doctorUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "doctor not found"));

        if (doctor.getRole() != Role.DOCTOR) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "user is not a doctor");
        }

        String decision = request.getDecision() == null ? "" : request.getDecision().trim().toUpperCase(Locale.ROOT);
        if (!decision.equals("APPROVE") && !decision.equals("REJECT")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "decision must be APPROVE or REJECT");
        }

        Instant now = Instant.now();

        if (decision.equals("APPROVE")) {
            doctor.setDoctorVerified(true);
            doctor.setDoctorVerificationStatus(DoctorVerificationStatus.APPROVED);
        } else {
            doctor.setDoctorVerified(false);
            doctor.setDoctorVerificationStatus(DoctorVerificationStatus.REJECTED);
        }

        doctor.setUpdatedAt(now);
        User saved = userRepository.save(doctor);
        return new VerifyDoctorResponse(saved.getId(), saved.isDoctorVerified());
    }

    public List<PendingDoctorDto> listPendingDoctors() {
        List<User> doctors = userRepository.findByRoleAndDoctorVerificationStatus(Role.DOCTOR,
                DoctorVerificationStatus.PENDING);
        return doctors.stream().map(this::toPendingDoctorDto).toList();
    }

    private static String normalizeEmail(String email) {
        if (email == null) {
            return "";
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static DoctorProfile toDoctorProfile(DoctorProfileDto dto) {
        DoctorProfile profile = new DoctorProfile();
        profile.setLicenseNumber(dto.getLicenseNumber() == null ? null : dto.getLicenseNumber().trim());
        profile.setSpecialty(dto.getSpecialty() == null ? null : dto.getSpecialty().trim());
        profile.setPhone(dto.getPhone() == null ? null : dto.getPhone().trim());
        return profile;
    }

    private static DoctorProfileDto toDoctorProfileDto(DoctorProfile profile) {
        if (profile == null) {
            return null;
        }
        DoctorProfileDto dto = new DoctorProfileDto();
        dto.setLicenseNumber(profile.getLicenseNumber());
        dto.setSpecialty(profile.getSpecialty());
        dto.setPhone(profile.getPhone());
        return dto;
    }

    private PendingDoctorDto toPendingDoctorDto(User user) {
        PendingDoctorDto dto = new PendingDoctorDto();
        dto.setId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setFullName(user.getFullName());
        dto.setDoctorVerificationStatus(user.getDoctorVerificationStatus());
        dto.setDoctorVerified(user.isDoctorVerified());
        dto.setStatus(user.getStatus());
        dto.setDoctorProfile(toDoctorProfileDto(user.getDoctorProfile()));
        return dto;
    }
}
