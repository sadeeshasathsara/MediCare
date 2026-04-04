package com.healthcare.patient.controller;

import com.healthcare.patient.dto.CopyReportRequest;
import com.healthcare.patient.dto.ReportMetadataDto;
import com.healthcare.patient.dto.UpdateReportRequest;
import com.healthcare.patient.model.PatientReport;
import com.healthcare.patient.service.PatientReportService;
import com.healthcare.patient.storage.StoredObject;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/patients")
public class PatientReportsController {

    private final PatientReportService patientReportService;

    public PatientReportsController(PatientReportService patientReportService) {
        this.patientReportService = patientReportService;
    }

    @PostMapping(path = "/{id}/reports", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReportMetadataDto> upload(
            @PathVariable("id") String userId,
            @RequestPart("file") MultipartFile file,
            @RequestParam(value = "folderId", required = false) String folderId) {
        return ResponseEntity.status(201).body(patientReportService.upload(userId, file, folderId));
    }

    @GetMapping("/{id}/reports")
    public ResponseEntity<List<ReportMetadataDto>> list(@PathVariable("id") String userId) {
        return ResponseEntity.ok(patientReportService.list(userId));
    }

    @PatchMapping("/{id}/reports/{reportId}")
    public ResponseEntity<ReportMetadataDto> update(
            @PathVariable("id") String userId,
            @PathVariable("reportId") String reportId,
            @RequestBody UpdateReportRequest req) {
        return ResponseEntity.ok(patientReportService.update(userId, reportId, req));
    }

    @DeleteMapping("/{id}/reports/{reportId}")
    public ResponseEntity<Void> delete(
            @PathVariable("id") String userId,
            @PathVariable("reportId") String reportId) {
        patientReportService.softDelete(userId, reportId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reports/{reportId}/copy")
    public ResponseEntity<ReportMetadataDto> copy(
            @PathVariable("id") String userId,
            @PathVariable("reportId") String reportId,
            @RequestBody(required = false) CopyReportRequest req) {
        return ResponseEntity.status(201).body(patientReportService.copy(userId, reportId, req));
    }

    @GetMapping("/{id}/reports/{reportId}")
    public ResponseEntity<InputStreamResource> download(
            @PathVariable("id") String userId,
            @PathVariable("reportId") String reportId) {

        PatientReport meta = patientReportService.getReportMetadataOrThrow(userId, reportId);
        StoredObject obj = patientReportService.download(userId, reportId);

        String contentType = meta.getContentType() != null ? meta.getContentType()
                : MediaType.APPLICATION_OCTET_STREAM_VALUE;

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + sanitizeFilename(meta.getOriginalFileName()) + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .contentLength(meta.getSize())
                .body(new InputStreamResource(obj.getInputStream()));
    }

    private static String sanitizeFilename(String name) {
        if (name == null || name.isBlank())
            return "report";
        return name.replaceAll("[\\r\\n\"]", "_");
    }
}
