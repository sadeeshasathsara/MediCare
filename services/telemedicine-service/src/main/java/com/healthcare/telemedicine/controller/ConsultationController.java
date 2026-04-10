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
import com.healthcare.telemedicine.dto.consultation.CreateConsultationRequest;
import com.healthcare.telemedicine.dto.consultation.UpdateConsultationRequest;
import com.healthcare.telemedicine.model.ConsultationRecord;
import com.healthcare.telemedicine.security.SecurityUtils;
import com.healthcare.telemedicine.service.ConsultationService;

import jakarta.validation.Valid;

@Validated
@RestController
@RequestMapping("/api/v1/consultations")
public class ConsultationController {

    private final ConsultationService consultationService;

    public ConsultationController(ConsultationService consultationService) {
        this.consultationService = consultationService;
    }

    @PostMapping
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<ConsultationRecord>> createConsultation(
            @Valid @RequestBody CreateConsultationRequest request) {
        String actorId = SecurityUtils.currentUserId();
        ConsultationRecord record = consultationService.createRecord(
                request.getSessionId(),
                request.getDoctorNotes(),
                request.getDiagnosis(),
                request.getFollowUpDate(),
                actorId);
        return ResponseEntity.ok(ApiResponse.success(record, "Consultation record created"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'PATIENT')")
    public ResponseEntity<ApiResponse<ConsultationRecord>> getConsultation(@PathVariable("id") String id) {
        String actorId = SecurityUtils.currentUserId();
        String actorRole = SecurityUtils.currentRole();
        ConsultationRecord record = consultationService.getById(id, actorId, actorRole);
        return ResponseEntity.ok(ApiResponse.success(record, "Consultation record fetched"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DOCTOR', 'PATIENT')")
    public ResponseEntity<ApiResponse<List<ConsultationRecord>>> listConsultations(
            @RequestParam(required = false) String patientId,
            @RequestParam(required = false) String doctorId) {
        String actorId = SecurityUtils.currentUserId();
        String actorRole = SecurityUtils.currentRole();
        List<ConsultationRecord> records = consultationService.listByPatientOrDoctor(patientId, doctorId, actorId, actorRole);
        return ResponseEntity.ok(ApiResponse.success(records, "Consultation records fetched"));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<ConsultationRecord>> updateConsultation(
            @PathVariable("id") String id,
            @RequestBody UpdateConsultationRequest request) {
        String actorId = SecurityUtils.currentUserId();
        ConsultationRecord updated = consultationService.updateRecord(
                id,
                request.getDoctorNotes(),
                request.getDiagnosis(),
                request.getFollowUpDate(),
                actorId);
        return ResponseEntity.ok(ApiResponse.success(updated, "Consultation record updated"));
    }
}
