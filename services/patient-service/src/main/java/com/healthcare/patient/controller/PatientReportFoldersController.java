package com.healthcare.patient.controller;

import com.healthcare.patient.dto.CreateReportFolderRequest;
import com.healthcare.patient.dto.ReportFolderDto;
import com.healthcare.patient.dto.UpdateReportFolderRequest;
import com.healthcare.patient.service.PatientReportFolderService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/patients")
public class PatientReportFoldersController {

    private final PatientReportFolderService folderService;

    public PatientReportFoldersController(PatientReportFolderService folderService) {
        this.folderService = folderService;
    }

    @GetMapping("/{id}/report-folders")
    public ResponseEntity<List<ReportFolderDto>> list(@PathVariable("id") String userId) {
        return ResponseEntity.ok(folderService.list(userId));
    }

    @PostMapping("/{id}/report-folders")
    public ResponseEntity<ReportFolderDto> create(
            @PathVariable("id") String userId,
            @Valid @RequestBody CreateReportFolderRequest req) {

        ReportFolderDto created = folderService.create(userId, req);
        return ResponseEntity.created(URI.create("/patients/" + userId + "/report-folders/" + created.getId()))
                .body(created);
    }

    @PatchMapping("/{id}/report-folders/{folderId}")
    public ResponseEntity<ReportFolderDto> update(
            @PathVariable("id") String userId,
            @PathVariable("folderId") String folderId,
            @RequestBody UpdateReportFolderRequest req) {

        return ResponseEntity.ok(folderService.update(userId, folderId, req));
    }

    @DeleteMapping("/{id}/report-folders/{folderId}")
    public ResponseEntity<Void> delete(
            @PathVariable("id") String userId,
            @PathVariable("folderId") String folderId) {

        // Deletes folder + all descendants. Reports will be handled by report endpoints
        // (soft-delete/move).
        folderService.deleteFolderTree(userId, folderId);
        return ResponseEntity.noContent().build();
    }
}
