package com.healthcare.patient.controller;

import com.healthcare.patient.service.PatientProfileService;
import com.healthcare.patient.storage.StoredObject;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/patients")
public class PatientProfilePhotoController {

    private final PatientProfileService patientProfileService;

    public PatientProfilePhotoController(PatientProfileService patientProfileService) {
        this.patientProfileService = patientProfileService;
    }

    @PostMapping(path = "/{id}/profile-photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(
            @PathVariable("id") String userId,
            @RequestPart("file") MultipartFile file) {
        return ResponseEntity.status(201).body(patientProfileService.uploadProfilePhoto(userId, file));
    }

    @DeleteMapping("/{id}/profile-photo")
    public ResponseEntity<Void> remove(@PathVariable("id") String userId) {
        patientProfileService.removeProfilePhoto(userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/profile-photo")
    public ResponseEntity<InputStreamResource> download(@PathVariable("id") String userId) {
        PatientProfileService.DownloadedProfilePhoto downloaded = patientProfileService.downloadProfilePhoto(userId);
        StoredObject obj = downloaded.getObject();

        String contentType = downloaded.getContentType() != null ? downloaded.getContentType()
                : (obj.getContentType() != null ? obj.getContentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"profile-photo\"")
                .contentType(MediaType.parseMediaType(contentType))
                .contentLength(Math.max(downloaded.getContentLength(), 0))
                .body(new InputStreamResource(obj.getInputStream()));
    }
}
