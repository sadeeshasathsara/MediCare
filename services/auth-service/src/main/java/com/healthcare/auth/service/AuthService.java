package com.healthcare.auth.service;

import com.healthcare.auth.dto.AuthResponse;
import com.healthcare.auth.model.UserAccount;
import com.healthcare.auth.model.UserRole;
import com.healthcare.auth.repository.UserAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@Service
public class AuthService {

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserAccountRepository userAccountRepository, PasswordEncoder passwordEncoder,
            JwtService jwtService) {
        this.userAccountRepository = userAccountRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse registerPatient(String emailRaw, String passwordRaw) {
        String email = normalizeEmail(emailRaw);
        if (userAccountRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "email already in use");
        }

        Instant now = Instant.now();
        UserAccount user = new UserAccount();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(passwordRaw));
        user.setRole(UserRole.PATIENT);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);

        UserAccount saved = userAccountRepository.save(user);
        String token = jwtService.issueToken(saved);
        return new AuthResponse(token, saved.getId(), saved.getEmail(), saved.getRole().name());
    }

    public AuthResponse login(String emailRaw, String passwordRaw) {
        String email = normalizeEmail(emailRaw);
        UserAccount user = userAccountRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials"));

        if (!passwordEncoder.matches(passwordRaw, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials");
        }

        String token = jwtService.issueToken(user);
        return new AuthResponse(token, user.getId(), user.getEmail(), user.getRole().name());
    }

    public AuthResponse changeEmail(String userId, String newEmailRaw) {
        String newEmail = normalizeEmail(newEmailRaw);
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found"));

        if (!newEmail.equals(user.getEmail()) && userAccountRepository.existsByEmail(newEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "email already in use");
        }

        user.setEmail(newEmail);
        user.setUpdatedAt(Instant.now());
        UserAccount saved = userAccountRepository.save(user);
        String token = jwtService.issueToken(saved);
        return new AuthResponse(token, saved.getId(), saved.getEmail(), saved.getRole().name());
    }

    public static String normalizeEmail(String emailRaw) {
        if (emailRaw == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email is required");
        String email = emailRaw.trim().toLowerCase();
        if (email.isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email is required");
        return email;
    }
}
