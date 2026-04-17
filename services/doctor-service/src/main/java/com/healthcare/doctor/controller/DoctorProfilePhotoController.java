package com.healthcare.doctor.controller;

import com.healthcare.doctor.service.DoctorService;
import com.healthcare.doctor.storage.StoredObject;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/doctors")
public class DoctorProfilePhotoController {

    private final DoctorService doctorService;

    public DoctorProfilePhotoController(DoctorService doctorService) {
        this.doctorService = doctorService;
    }

    @PostMapping(path = "/{id}/profile-photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(
            @PathVariable("id") String userId,
            @RequestPart("file") MultipartFile file) {
        return ResponseEntity.status(201).body(doctorService.uploadProfilePhoto(userId, file));
    }

    @DeleteMapping("/{id}/profile-photo")
    public ResponseEntity<Void> remove(@PathVariable("id") String userId) {
        doctorService.removeProfilePhoto(userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/profile-photo")
    public ResponseEntity<InputStreamResource> download(@PathVariable("id") String userId) {
        DoctorService.DownloadedProfilePhoto downloaded = doctorService.downloadProfilePhoto(userId);
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
