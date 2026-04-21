package com.healthcare.doctor.service;

import com.healthcare.doctor.dto.DoctorResponse;
import com.healthcare.doctor.dto.UpdateDoctorRequest;
import com.healthcare.doctor.model.Doctor;
import com.healthcare.doctor.repository.DoctorRepository;
import com.healthcare.doctor.storage.StorageService;
import com.healthcare.doctor.storage.StoredObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final StorageService storageService;

    private static final List<String> ALLOWED_PROFILE_PHOTO_TYPES = List.of("image/png", "image/jpeg");

    public DoctorService(DoctorRepository doctorRepository, StorageService storageService) {
        this.doctorRepository = doctorRepository;
        this.storageService = storageService;
    }

    public DoctorResponse getDoctorById(String id) {
        Doctor doctor = doctorRepository.findById(id)
                .or(() -> doctorRepository.findByUserId(id))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Doctor not found"));
        return toResponse(doctor);
    }

    public void ensureDoctorExists(String doctorId) {
        if (!doctorRepository.existsById(doctorId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Doctor not found");
        }
    }

    public DoctorResponse updateDoctor(String id, UpdateDoctorRequest request) {
        Doctor doctor = doctorRepository.findById(id).orElseGet(() -> {
            Doctor newDoctor = new Doctor();
            newDoctor.setId(id);
            newDoctor.setUserId(id);
            // Default to true. In a real system, verification status should be synced from auth-service headers.
            newDoctor.setVerified(true);
            newDoctor.setCreatedAt(Instant.now());
            return newDoctor;
        });

        boolean changed = true; // Since we might be creating it

        if (request.getBio() != null) {
            doctor.setBio(request.getBio().trim());
        }
        if (request.getQualifications() != null) {
            doctor.setQualifications(request.getQualifications());
        }
        if (request.getSpecialty() != null) {
            String specialty = request.getSpecialty().trim();
            if (specialty.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "specialty cannot be blank");
            }
            doctor.setSpecialty(specialty);
        }
        if (request.getConsultationFee() != null) {
            if (request.getConsultationFee() < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "consultationFee must be zero or positive");
            }
            doctor.setConsultationFee(request.getConsultationFee());
        }
        if (request.getPhone() != null) {
            doctor.setPhone(request.getPhone().trim());
        }
        if (request.getFullName() != null) {
            String fullName = request.getFullName().trim();
            if (fullName.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fullName cannot be blank");
            }
            doctor.setFullName(fullName);
        }

        if (!changed) {
            return toResponse(doctor);
        }

        doctor.setUpdatedAt(Instant.now());
        Doctor saved = doctorRepository.save(doctor);
        return toResponse(saved);
    }

    public List<DoctorResponse> listVerifiedDoctors(String specialty) {
        List<Doctor> doctors;
        if (specialty != null && !specialty.isBlank()) {
            doctors = doctorRepository.findByVerifiedTrueAndSpecialtyIgnoreCase(specialty.trim());
        } else {
            doctors = doctorRepository.findByVerifiedTrue();
        }
        return doctors.stream().map(this::toResponse).toList();
    }

    public Page<DoctorResponse> searchVerifiedDoctors(String search, String specialty, int page, int limit) {
        Pageable pageable = PageRequest.of(page, limit, Sort.by("fullName").ascending());
        
        String searchRegex = (search != null && !search.trim().isEmpty()) ? ".*" + search.trim() + ".*" : ".*";
        String specialtyRegex = (specialty != null && !specialty.trim().isEmpty()) ? "^" + specialty.trim() + "$" : ".*";

        Page<Doctor> doctorPage = doctorRepository.searchDoctors(searchRegex, specialtyRegex, pageable);
        return doctorPage.map(this::toResponse);
    }

    public List<String> listSpecialties() {
        List<Doctor> verifiedDoctors = doctorRepository.findByVerifiedTrue();
        return verifiedDoctors.stream()
                .map(Doctor::getSpecialty)
                .filter(s -> s != null && !s.isBlank())
                .distinct()
                .sorted()
                .toList();
    }

    public DoctorResponse uploadProfilePhoto(String userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "file is required");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_PROFILE_PHOTO_TYPES.contains(contentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "unsupported file type");
        }

        Doctor doctor = doctorRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "doctor not found"));

        String originalName = StringUtils.hasText(file.getOriginalFilename()) ? file.getOriginalFilename()
                : "profile-photo";
        String safeName = originalName.replaceAll("[^a-zA-Z0-9._-]", "_");
        String objectKey = "doctors/" + userId + "/profile-photo/" + UUID.randomUUID() + "-" + safeName;

        try {
            storageService.put(objectKey, file.getInputStream(), file.getSize(), contentType);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "failed to upload profile photo");
        }

        String oldKey = doctor.getProfilePhotoKey();
        doctor.setProfilePhotoKey(objectKey);
        doctor.setProfilePhotoContentType(contentType);
        doctor.setProfilePhotoSize(file.getSize());
        doctor.setProfilePhotoUpdatedAt(Instant.now());
        doctor.setUpdatedAt(Instant.now());

        Doctor saved = doctorRepository.save(doctor);

        if (oldKey != null && !oldKey.isBlank()) {
            try {
                storageService.delete(oldKey);
            } catch (RuntimeException ignored) {
                // Best-effort cleanup.
            }
        }

        return toResponse(saved);
    }

    public void removeProfilePhoto(String userId) {
        Doctor doctor = doctorRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "doctor not found"));

        String key = doctor.getProfilePhotoKey();
        if (key == null || key.isBlank()) {
            return;
        }

        doctor.setProfilePhotoKey(null);
        doctor.setProfilePhotoContentType(null);
        doctor.setProfilePhotoSize(null);
        doctor.setProfilePhotoUpdatedAt(null);
        doctor.setUpdatedAt(Instant.now());
        doctorRepository.save(doctor);

        storageService.delete(key);
    }

    public DownloadedProfilePhoto downloadProfilePhoto(String userId) {
        Doctor doctor = doctorRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "doctor not found"));

        String key = doctor.getProfilePhotoKey();
        if (key == null || key.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "profile photo not found");
        }

        StoredObject obj = storageService.get(key);
        String contentType = doctor.getProfilePhotoContentType();
        long contentLength = doctor.getProfilePhotoSize() != null ? doctor.getProfilePhotoSize()
                : obj.getContentLength();
        return new DownloadedProfilePhoto(obj, contentLength, contentType);
    }

    private DoctorResponse toResponse(Doctor doctor) {
        DoctorResponse response = new DoctorResponse();
        response.setId(doctor.getId());
        response.setUserId(doctor.getUserId());
        response.setFullName(doctor.getFullName());
        response.setEmail(doctor.getEmail());
        response.setPhone(doctor.getPhone());
        response.setSpecialty(doctor.getSpecialty());
        response.setBio(doctor.getBio());
        response.setQualifications(doctor.getQualifications());
        response.setLicenseNumber(doctor.getLicenseNumber());
        response.setConsultationFee(doctor.getConsultationFee());
        response.setVerified(doctor.isVerified());
        
        response.setHasProfilePhoto(doctor.getProfilePhotoKey() != null && !doctor.getProfilePhotoKey().isBlank());
        response.setProfilePhotoUpdatedAt(doctor.getProfilePhotoUpdatedAt());
        
        response.setCreatedAt(doctor.getCreatedAt());
        response.setUpdatedAt(doctor.getUpdatedAt());
        return response;
    }

    public static class DownloadedProfilePhoto {
        private final StoredObject object;
        private final long contentLength;
        private final String contentType;

        public DownloadedProfilePhoto(StoredObject object, long contentLength, String contentType) {
            this.object = object;
            this.contentLength = contentLength;
            this.contentType = contentType;
        }

        public StoredObject getObject() {
            return object;
        }

        public long getContentLength() {
            return contentLength;
        }

        public String getContentType() {
            return contentType;
        }
    }
}
