package com.healthcare.patient.service;

import com.healthcare.patient.dto.PatientProfileDto;
import com.healthcare.patient.dto.UpdatePatientProfileRequest;
import com.healthcare.patient.model.Patient;
import com.healthcare.patient.model.PatientStatus;
import com.healthcare.patient.repository.PatientRepository;
import com.healthcare.patient.storage.StoredObject;
import com.healthcare.patient.storage.StorageService;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class PatientProfileService {

    private final PatientRepository patientRepository;
    private final StorageService storageService;
    private final MongoTemplate mongoTemplate;

    private static final List<String> ALLOWED_PROFILE_PHOTO_TYPES = List.of("image/png", "image/jpeg");

    public PatientProfileService(PatientRepository patientRepository, StorageService storageService,
            MongoTemplate mongoTemplate) {
        this.patientRepository = patientRepository;
        this.storageService = storageService;
        this.mongoTemplate = mongoTemplate;
    }

    public PatientProfileDto getProfile(String userId) {
        AccessGuard.requireSelfOrAdmin(userId);
        Patient patient = patientRepository.findByUserId(userId)
                .orElseGet(() -> createDefaultProfile(userId));
        return toDto(patient);
    }

    public PatientProfileDto updateProfile(String userId, UpdatePatientProfileRequest request) {
        AccessGuard.requireSelfOrAdmin(userId);

        Patient patient = patientRepository.findByUserId(userId)
                .orElseGet(() -> createDefaultProfile(userId));

        if (request.getEmail() != null) {
            patient.setEmail(request.getEmail().trim());
        }
        if (request.getName() != null) {
            patient.setName(request.getName().trim());
        }
        if (request.getDob() != null) {
            patient.setDob(request.getDob().trim());
        }

        if (request.getContact() != null) {
            Patient.Contact c = patient.getContact();
            if (c == null)
                c = new Patient.Contact();
            if (request.getContact().getPhone() != null) {
                c.setPhone(request.getContact().getPhone().trim());
            }
            patient.setContact(c);
        }

        if (request.getAddress() != null) {
            Patient.Address a = patient.getAddress();
            if (a == null)
                a = new Patient.Address();
            if (request.getAddress().getLine1() != null)
                a.setLine1(request.getAddress().getLine1().trim());
            if (request.getAddress().getLine2() != null)
                a.setLine2(request.getAddress().getLine2().trim());
            if (request.getAddress().getCity() != null)
                a.setCity(request.getAddress().getCity().trim());
            if (request.getAddress().getState() != null)
                a.setState(request.getAddress().getState().trim());
            if (request.getAddress().getPostalCode() != null)
                a.setPostalCode(request.getAddress().getPostalCode().trim());
            if (request.getAddress().getCountry() != null)
                a.setCountry(request.getAddress().getCountry().trim());
            patient.setAddress(a);
        }

        patient.setUpdatedAt(Instant.now());
        Patient saved = patientRepository.save(patient);
        return toDto(saved);
    }

    public void softDeletePatient(String userId) {
        AccessGuard.requireAdmin();
        Patient patient = patientRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "patient not found"));

        Instant now = Instant.now();
        patient.setStatus(PatientStatus.INACTIVE);
        patient.setDeletedAt(now);
        patient.setUpdatedAt(now);
        patientRepository.save(patient);
    }

    public PatientProfileDto getPatientForAdmin(String userId) {
        AccessGuard.requireAdmin();
        Patient patient = patientRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "patient not found"));
        return toDto(patient);
    }

    public Page<PatientProfileDto> listPatients(Pageable pageable, String q, PatientStatus status) {
        AccessGuard.requireAdmin();

        String queryText = q != null ? q.trim() : "";
        if (queryText.isEmpty() && status == null) {
            return patientRepository.findAll(pageable).map(this::toDto);
        }

        List<Criteria> and = new ArrayList<>();
        if (status != null) {
            and.add(Criteria.where("status").is(status));
        }
        if (!queryText.isEmpty()) {
            String escaped = Pattern.quote(queryText);
            Pattern pattern = Pattern.compile(".*" + escaped + ".*", Pattern.CASE_INSENSITIVE);

            and.add(new Criteria().orOperator(
                    Criteria.where("userId").regex(pattern),
                    Criteria.where("email").regex(pattern),
                    Criteria.where("name").regex(pattern)));
        }

        Criteria criteria = and.size() == 1 ? and.get(0) : new Criteria().andOperator(and.toArray(new Criteria[0]));
        Query query = new Query(criteria).with(pageable);
        List<Patient> items = mongoTemplate.find(query, Patient.class);

        Query countQuery = new Query(criteria);
        long total = mongoTemplate.count(countQuery, Patient.class);

        Page<Patient> page = new PageImpl<>(items, pageable, total);
        return page.map(this::toDto);
    }

    public PatientProfileDto setStatus(String userId, PatientStatus status) {
        AccessGuard.requireAdmin();
        Patient patient = patientRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "patient not found"));

        patient.setStatus(status);
        patient.setUpdatedAt(Instant.now());
        return toDto(patientRepository.save(patient));
    }

    public PatientProfileDto uploadProfilePhoto(String userId, MultipartFile file) {
        AccessGuard.requireSelfOrAdmin(userId);

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "file is required");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_PROFILE_PHOTO_TYPES.contains(contentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "unsupported file type");
        }

        Patient patient = patientRepository.findByUserId(userId)
                .orElseGet(() -> createDefaultProfile(userId));

        String originalName = StringUtils.hasText(file.getOriginalFilename()) ? file.getOriginalFilename()
                : "profile-photo";
        String safeName = originalName.replaceAll("[^a-zA-Z0-9._-]", "_");
        String objectKey = "patients/" + userId + "/profile-photo/" + UUID.randomUUID() + "-" + safeName;

        try {
            storageService.put(objectKey, file.getInputStream(), file.getSize(), contentType);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "failed to upload profile photo");
        }

        String oldKey = patient.getProfilePhotoKey();
        patient.setProfilePhotoKey(objectKey);
        patient.setProfilePhotoContentType(contentType);
        patient.setProfilePhotoSize(file.getSize());
        patient.setProfilePhotoUpdatedAt(Instant.now());
        patient.setUpdatedAt(Instant.now());

        Patient saved = patientRepository.save(patient);

        if (oldKey != null && !oldKey.isBlank()) {
            try {
                storageService.delete(oldKey);
            } catch (RuntimeException ignored) {
                // Best-effort cleanup.
            }
        }

        return toDto(saved);
    }

    public void removeProfilePhoto(String userId) {
        AccessGuard.requireSelfOrAdmin(userId);

        Patient patient = patientRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "patient not found"));

        String key = patient.getProfilePhotoKey();
        if (key == null || key.isBlank()) {
            return;
        }

        patient.setProfilePhotoKey(null);
        patient.setProfilePhotoContentType(null);
        patient.setProfilePhotoSize(null);
        patient.setProfilePhotoUpdatedAt(null);
        patient.setUpdatedAt(Instant.now());
        patientRepository.save(patient);

        storageService.delete(key);
    }

    public DownloadedProfilePhoto downloadProfilePhoto(String userId) {
        AccessGuard.requireSelfOrAdmin(userId);

        Patient patient = patientRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "patient not found"));

        String key = patient.getProfilePhotoKey();
        if (key == null || key.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "profile photo not found");
        }

        StoredObject obj = storageService.get(key);
        String contentType = patient.getProfilePhotoContentType();
        long contentLength = patient.getProfilePhotoSize() != null ? patient.getProfilePhotoSize()
                : obj.getContentLength();
        return new DownloadedProfilePhoto(obj, contentLength, contentType);
    }

    private Patient createDefaultProfile(String userId) {
        Instant now = Instant.now();
        Patient p = new Patient();
        p.setUserId(userId);
        p.setStatus(PatientStatus.ACTIVE);
        p.setCreatedAt(now);
        p.setUpdatedAt(now);
        return patientRepository.save(p);
    }

    private PatientProfileDto toDto(Patient p) {
        PatientProfileDto dto = new PatientProfileDto();
        dto.setUserId(p.getUserId());
        dto.setEmail(p.getEmail());
        dto.setName(p.getName());
        dto.setDob(p.getDob());
        dto.setStatus(p.getStatus());
        dto.setDeletedAt(p.getDeletedAt());
        dto.setCreatedAt(p.getCreatedAt());
        dto.setUpdatedAt(p.getUpdatedAt());

        dto.setHasProfilePhoto(p.getProfilePhotoKey() != null && !p.getProfilePhotoKey().isBlank());
        dto.setProfilePhotoUpdatedAt(p.getProfilePhotoUpdatedAt());
        dto.setProfilePhotoContentType(p.getProfilePhotoContentType());
        dto.setProfilePhotoSize(p.getProfilePhotoSize());

        if (p.getContact() != null) {
            PatientProfileDto.ContactDto c = new PatientProfileDto.ContactDto();
            c.setPhone(p.getContact().getPhone());
            dto.setContact(c);
        }

        if (p.getAddress() != null) {
            PatientProfileDto.AddressDto a = new PatientProfileDto.AddressDto();
            a.setLine1(p.getAddress().getLine1());
            a.setLine2(p.getAddress().getLine2());
            a.setCity(p.getAddress().getCity());
            a.setState(p.getAddress().getState());
            a.setPostalCode(p.getAddress().getPostalCode());
            a.setCountry(p.getAddress().getCountry());
            dto.setAddress(a);
        }

        return dto;
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
