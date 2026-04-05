package com.healthcare.patient.service;

import com.healthcare.patient.dto.CreateReportFolderRequest;
import com.healthcare.patient.dto.ReportFolderDto;
import com.healthcare.patient.dto.UpdateReportFolderRequest;
import com.healthcare.patient.model.PatientReportFolder;
import com.healthcare.patient.repository.PatientReportRepository;
import com.healthcare.patient.repository.PatientReportFolderRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
public class PatientReportFolderService {

    private final PatientReportFolderRepository folderRepository;
    private final PatientReportRepository reportRepository;

    public PatientReportFolderService(PatientReportFolderRepository folderRepository,
            PatientReportRepository reportRepository) {
        this.folderRepository = folderRepository;
        this.reportRepository = reportRepository;
    }

    public List<ReportFolderDto> list(String userId) {
        AccessGuard.requireSelfOrAdmin(userId);
        return folderRepository.findByUserIdOrderByNameAsc(userId).stream().map(this::toDto).toList();
    }

    public ReportFolderDto create(String userId, CreateReportFolderRequest req) {
        AccessGuard.requireSelfOrAdmin(userId);

        if (req == null || !StringUtils.hasText(req.getName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name is required");
        }

        String parentId = normalizeParentId(req.getParentId());
        if (parentId != null) {
            folderRepository.findByIdAndUserId(parentId, userId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "parent folder not found"));
        }

        PatientReportFolder folder = new PatientReportFolder();
        folder.setUserId(userId);
        folder.setName(req.getName().trim());
        folder.setParentId(parentId);
        folder.setCreatedAt(Instant.now());
        folder.setUpdatedAt(Instant.now());

        PatientReportFolder saved = folderRepository.save(folder);
        return toDto(saved);
    }

    public ReportFolderDto update(String userId, String folderId, UpdateReportFolderRequest req) {
        AccessGuard.requireSelfOrAdmin(userId);

        PatientReportFolder folder = folderRepository.findByIdAndUserId(folderId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "folder not found"));

        boolean changed = false;

        if (req != null && req.getName() != null) {
            String trimmed = req.getName().trim();
            if (!StringUtils.hasText(trimmed)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name cannot be blank");
            }
            folder.setName(trimmed);
            changed = true;
        }

        if (req != null && req.getParentId() != null) {
            String nextParent = normalizeParentId(req.getParentId());
            if (Objects.equals(nextParent, folder.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "folder cannot be its own parent");
            }
            if (nextParent != null) {
                folderRepository.findByIdAndUserId(nextParent, userId)
                        .orElseThrow(
                                () -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "parent folder not found"));
            }

            // Prevent cycles by walking upward from proposed parent.
            if (nextParent != null && wouldCreateCycle(userId, folder.getId(), nextParent)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid parent (cycle)");
            }

            folder.setParentId(nextParent);
            changed = true;
        }

        if (changed) {
            folder.setUpdatedAt(Instant.now());
            folder = folderRepository.save(folder);
        }

        return toDto(folder);
    }

    public Set<String> collectDescendantFolderIds(String userId, String rootFolderId) {
        List<PatientReportFolder> all = folderRepository.findByUserIdOrderByNameAsc(userId);
        Map<String, List<String>> childrenByParent = new HashMap<>();
        for (PatientReportFolder f : all) {
            String parent = f.getParentId();
            childrenByParent.computeIfAbsent(parent, k -> new ArrayList<>()).add(f.getId());
        }

        Set<String> result = new HashSet<>();
        ArrayDeque<String> q = new ArrayDeque<>();
        q.add(rootFolderId);
        while (!q.isEmpty()) {
            String id = q.removeFirst();
            if (!result.add(id))
                continue;
            List<String> kids = childrenByParent.get(id);
            if (kids != null) {
                for (String c : kids)
                    q.addLast(c);
            }
        }
        return result;
    }

    public void deleteFolderTree(String userId, String folderId) {
        AccessGuard.requireSelfOrAdmin(userId);

        folderRepository.findByIdAndUserId(folderId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "folder not found"));

        Set<String> ids = collectDescendantFolderIds(userId, folderId);

        // Soft-delete reports inside the folder tree so they disappear from list.
        Instant now = Instant.now();
        var reports = reportRepository.findByUserIdAndFolderIdInAndDeletedAtIsNull(userId, ids);
        for (var r : reports) {
            r.setDeletedAt(now);
        }
        if (!reports.isEmpty()) {
            reportRepository.saveAll(reports);
        }

        for (String id : ids) {
            folderRepository.deleteById(id);
        }
    }

    private boolean wouldCreateCycle(String userId, String folderId, String proposedParentId) {
        // If proposed parent is a descendant of folderId, then we'd create a cycle.
        Set<String> descendants = collectDescendantFolderIds(userId, folderId);
        return descendants.contains(proposedParentId);
    }

    private String normalizeParentId(String parentId) {
        if (!StringUtils.hasText(parentId))
            return null;
        String trimmed = parentId.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private ReportFolderDto toDto(PatientReportFolder f) {
        ReportFolderDto dto = new ReportFolderDto();
        dto.setId(f.getId());
        dto.setUserId(f.getUserId());
        dto.setParentId(f.getParentId());
        dto.setName(f.getName());
        dto.setCreatedAt(f.getCreatedAt());
        dto.setUpdatedAt(f.getUpdatedAt());
        return dto;
    }
}
