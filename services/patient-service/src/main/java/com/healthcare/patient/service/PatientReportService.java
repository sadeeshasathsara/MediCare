package com.healthcare.patient.service;

import com.healthcare.patient.dto.ReportMetadataDto;
import com.healthcare.patient.dto.CopyReportRequest;
import com.healthcare.patient.dto.UpdateReportRequest;
import com.healthcare.patient.model.PatientReport;
import com.healthcare.patient.repository.PatientReportFolderRepository;
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
            "image/jpeg");

    private final PatientReportRepository patientReportRepository;
    private final PatientReportFolderRepository folderRepository;
    private final StorageService storageService;

    public PatientReportService(PatientReportRepository patientReportRepository,
            PatientReportFolderRepository folderRepository,
            StorageService storageService) {
        this.patientReportRepository = patientReportRepository;
        this.folderRepository = folderRepository;
        this.storageService = storageService;
    }

    public ReportMetadataDto upload(String userId, MultipartFile file, String folderId) {
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
        report.setDisplayFileName(originalName);
        report.setContentType(contentType);
        report.setSize(file.getSize());
        report.setUploadedAt(Instant.now());

        String normalizedFolderId = normalizeFolderId(folderId);
        if (normalizedFolderId != null) {
            folderRepository.findByIdAndUserId(normalizedFolderId, userId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "folder not found"));
        }
        report.setFolderId(normalizedFolderId);

        PatientReport saved = patientReportRepository.save(report);
        return toDto(saved);
    }

    public List<ReportMetadataDto> list(String userId) {
        AccessGuard.requireSelfOrAdmin(userId);
        return patientReportRepository.findByUserIdAndDeletedAtIsNullOrderByUploadedAtDesc(userId).stream()
                .map(this::toDto)
                .toList();
    }

    public StoredObject download(String userId, String reportId) {
        AccessGuard.requireSelfOrAdmin(userId);

        PatientReport report = patientReportRepository.findByIdAndUserIdAndDeletedAtIsNull(reportId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "report not found"));

        return storageService.get(report.getStorageKey());
    }

    public PatientReport getReportMetadataOrThrow(String userId, String reportId) {
        return patientReportRepository.findByIdAndUserIdAndDeletedAtIsNull(reportId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "report not found"));
    }

    public ReportMetadataDto update(String userId, String reportId, UpdateReportRequest req) {
        AccessGuard.requireSelfOrAdmin(userId);

        PatientReport report = patientReportRepository.findByIdAndUserIdAndDeletedAtIsNull(reportId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "report not found"));

        boolean changed = false;

        if (req != null && req.getFolderId() != null) {
            String normalized = normalizeFolderId(req.getFolderId());
            if (normalized != null) {
                folderRepository.findByIdAndUserId(normalized, userId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "folder not found"));
            }
            report.setFolderId(normalized);
            changed = true;
        }

        if (req != null && req.getDisplayFileName() != null) {
            String name = req.getDisplayFileName().trim();
            if (!StringUtils.hasText(name)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "displayFileName cannot be blank");
            }
            report.setDisplayFileName(name);
            changed = true;
        }

        if (changed) {
            report = patientReportRepository.save(report);
        }

        return toDto(report);
    }

    public void softDelete(String userId, String reportId) {
        AccessGuard.requireSelfOrAdmin(userId);

        PatientReport report = patientReportRepository.findByIdAndUserIdAndDeletedAtIsNull(reportId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "report not found"));

        report.setDeletedAt(Instant.now());
        patientReportRepository.save(report);
    }

    public ReportMetadataDto copy(String userId, String reportId, CopyReportRequest req) {
        AccessGuard.requireSelfOrAdmin(userId);

        PatientReport source = patientReportRepository.findByIdAndUserIdAndDeletedAtIsNull(reportId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "report not found"));

        String folderId = req != null ? normalizeFolderId(req.getFolderId()) : null;
        if (folderId != null) {
            folderRepository.findByIdAndUserId(folderId, userId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "folder not found"));
        }

        PatientReport copy = new PatientReport();
        copy.setUserId(userId);
        copy.setStorageKey(source.getStorageKey());
        copy.setOriginalFileName(source.getOriginalFileName());
        copy.setContentType(source.getContentType());
        copy.setSize(source.getSize());
        copy.setUploadedAt(Instant.now());
        copy.setFolderId(folderId != null ? folderId : source.getFolderId());
        copy.setSourceReportId(source.getId());

        String display = req != null && req.getDisplayFileName() != null ? req.getDisplayFileName().trim() : null;
        if (display != null && !display.isBlank()) {
            copy.setDisplayFileName(display);
        } else {
            copy.setDisplayFileName(
                    source.getDisplayFileName() != null ? source.getDisplayFileName() : source.getOriginalFileName());
        }

        PatientReport saved = patientReportRepository.save(copy);
        return toDto(saved);
    }

    private ReportMetadataDto toDto(PatientReport r) {
        ReportMetadataDto dto = new ReportMetadataDto();
        dto.setId(r.getId());
        dto.setUserId(r.getUserId());
        dto.setOriginalFileName(r.getOriginalFileName());
        dto.setDisplayFileName(r.getDisplayFileName());
        dto.setContentType(r.getContentType());
        dto.setSize(r.getSize());
        dto.setUploadedAt(r.getUploadedAt());
        dto.setFolderId(r.getFolderId());
        return dto;
    }

    private String normalizeFolderId(String folderId) {
        if (!StringUtils.hasText(folderId))
            return null;
        String trimmed = folderId.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
