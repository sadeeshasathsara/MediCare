package com.healthcare.patient.service;

import com.healthcare.patient.dto.ReportMetadataDto;
import com.healthcare.patient.model.PatientReport;
import com.healthcare.patient.repository.PatientReportRepository;
import com.healthcare.patient.storage.StoredObject;
import com.healthcare.patient.storage.StorageService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class PatientReportService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf",
            "image/png",
            "image/jpeg"
    );

    private final PatientReportRepository patientReportRepository;
    private final StorageService storageService;

    public PatientReportService(PatientReportRepository patientReportRepository, StorageService storageService) {
        this.patientReportRepository = patientReportRepository;
        this.storageService = storageService;
    }

    public ReportMetadataDto upload(String userId, MultipartFile file) {
        AccessGuard.requireSelfOrAdmin(userId);

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "file is required");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "unsupported file type");
        }

        String originalName = StringUtils.hasText(file.getOriginalFilename()) ? file.getOriginalFilename() : "report";
        String safeName = originalName.replaceAll("[^a-zA-Z0-9._-]", "_");

        String objectKey = "patients/" + userId + "/" + UUID.randomUUID() + "-" + safeName;

        try {
            storageService.put(objectKey, file.getInputStream(), file.getSize(), contentType);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "failed to upload report");
        }

        PatientReport report = new PatientReport();
        report.setUserId(userId);
        report.setStorageKey(objectKey);
        report.setOriginalFileName(originalName);
        report.setContentType(contentType);
        report.setSize(file.getSize());
        report.setUploadedAt(Instant.now());

        PatientReport saved = patientReportRepository.save(report);
        return toDto(saved);
    }

    public List<ReportMetadataDto> list(String userId) {
        AccessGuard.requireSelfOrAdmin(userId);
        return patientReportRepository.findByUserIdOrderByUploadedAtDesc(userId).stream()
                .map(this::toDto)
                .toList();
    }

    public StoredObject download(String userId, String reportId) {
        AccessGuard.requireSelfOrAdmin(userId);

        PatientReport report = patientReportRepository.findByIdAndUserId(reportId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "report not found"));

        return storageService.get(report.getStorageKey());
    }

    public PatientReport getReportMetadataOrThrow(String userId, String reportId) {
        return patientReportRepository.findByIdAndUserId(reportId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "report not found"));
    }

    private ReportMetadataDto toDto(PatientReport r) {
        ReportMetadataDto dto = new ReportMetadataDto();
        dto.setId(r.getId());
        dto.setUserId(r.getUserId());
        dto.setOriginalFileName(r.getOriginalFileName());
        dto.setContentType(r.getContentType());
        dto.setSize(r.getSize());
        dto.setUploadedAt(r.getUploadedAt());
        return dto;
    }
}
