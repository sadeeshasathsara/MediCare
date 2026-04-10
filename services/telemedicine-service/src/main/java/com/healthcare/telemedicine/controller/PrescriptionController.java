package com.healthcare.telemedicine.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.healthcare.telemedicine.dto.common.ApiResponse;
import com.healthcare.telemedicine.dto.prescription.CreatePrescriptionRequest;
import com.healthcare.telemedicine.dto.prescription.UpdatePrescriptionStatusRequest;
import com.healthcare.telemedicine.model.Prescription;
import com.healthcare.telemedicine.security.SecurityUtils;
import com.healthcare.telemedicine.service.PrescriptionService;

import jakarta.validation.Valid;

@Validated
@RestController
@RequestMapping("/api/v1/prescriptions")
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    public PrescriptionController(PrescriptionService prescriptionService) {
        this.prescriptionService = prescriptionService;
    }

    @PostMapping
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<Prescription>> createPrescription(
            @Valid @RequestBody CreatePrescriptionRequest request) {
        String actorId = SecurityUtils.currentUserId();
        Prescription prescription = prescriptionService.createPrescription(
                request.getConsultationId(),
                request.getExpiresAt(),
                request.getMedications(),
                request.getPrescriptionStatus(),
                actorId);
        return ResponseEntity.ok(ApiResponse.success(prescription, "Prescription created"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'PATIENT')")
    public ResponseEntity<ApiResponse<Prescription>> getPrescription(@PathVariable("id") String id) {
        String actorId = SecurityUtils.currentUserId();
        String actorRole = SecurityUtils.currentRole();
        Prescription prescription = prescriptionService.getById(id, actorId, actorRole);
        return ResponseEntity.ok(ApiResponse.success(prescription, "Prescription fetched"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DOCTOR', 'PATIENT')")
    public ResponseEntity<ApiResponse<List<Prescription>>> listPrescriptions(
            @RequestParam(required = false) String patientId,
            @RequestParam(required = false) String consultationId) {
        String actorId = SecurityUtils.currentUserId();
        String actorRole = SecurityUtils.currentRole();
        List<Prescription> prescriptions = prescriptionService.listByPatientOrConsultation(
                patientId,
                consultationId,
                actorId,
                actorRole);
        return ResponseEntity.ok(ApiResponse.success(prescriptions, "Prescriptions fetched"));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<Prescription>> cancelPrescription(@PathVariable("id") String id) {
        String actorId = SecurityUtils.currentUserId();
        Prescription prescription = prescriptionService.cancelPrescription(id, actorId);
        return ResponseEntity.ok(ApiResponse.success(prescription, "Prescription cancelled"));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<Prescription>> updateStatus(
            @PathVariable("id") String id,
            @Valid @RequestBody UpdatePrescriptionStatusRequest request) {
        String actorId = SecurityUtils.currentUserId();
        Prescription prescription = prescriptionService.updateStatus(id, request.getStatus(), actorId);
        return ResponseEntity.ok(ApiResponse.success(prescription, "Prescription status updated"));
    }
}
