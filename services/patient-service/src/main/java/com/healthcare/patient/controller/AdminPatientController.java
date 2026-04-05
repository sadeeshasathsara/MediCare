package com.healthcare.patient.controller;

import com.healthcare.patient.dto.PagedResponse;
import com.healthcare.patient.dto.PatientProfileDto;
import com.healthcare.patient.dto.SetPatientStatusRequest;
import com.healthcare.patient.model.PatientStatus;
import com.healthcare.patient.service.PatientProfileService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/patients")
public class AdminPatientController {

    private final PatientProfileService patientProfileService;

    public AdminPatientController(PatientProfileService patientProfileService) {
        this.patientProfileService = patientProfileService;
    }

    @GetMapping
    public ResponseEntity<PagedResponse<PatientProfileDto>> listPatients(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "status", required = false) PatientStatus status) {

        int boundedSize = Math.min(Math.max(size, 1), 100);
        int boundedPage = Math.max(page, 0);

        Page<PatientProfileDto> result = patientProfileService.listPatients(PageRequest.of(boundedPage, boundedSize), q,
                status);
        return ResponseEntity.ok(new PagedResponse<>(
                result.getContent(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PatientProfileDto> getPatient(@PathVariable("id") String userId) {
        return ResponseEntity.ok(patientProfileService.getPatientForAdmin(userId));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<PatientProfileDto> setStatus(
            @PathVariable("id") String userId,
            @Valid @RequestBody SetPatientStatusRequest request) {
        return ResponseEntity.ok(patientProfileService.setStatus(userId, request.getStatus()));
    }
}
