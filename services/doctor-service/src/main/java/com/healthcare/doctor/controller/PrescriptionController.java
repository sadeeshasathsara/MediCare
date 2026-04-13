package com.healthcare.doctor.controller;

import com.healthcare.doctor.dto.CreatePrescriptionRequest;
import com.healthcare.doctor.dto.PrescriptionResponse;
import com.healthcare.doctor.service.PrescriptionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/doctors/{doctorId}/prescriptions")
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    public PrescriptionController(PrescriptionService prescriptionService) {
        this.prescriptionService = prescriptionService;
    }

    /**
     * POST /doctors/:id/prescriptions – issue prescription linked to patient + appointment
     */
    @PostMapping
    public ResponseEntity<PrescriptionResponse> createPrescription(
            @PathVariable String doctorId,
            @Valid @RequestBody CreatePrescriptionRequest request) {
        PrescriptionResponse response = prescriptionService.createPrescription(doctorId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * GET /doctors/:id/prescriptions – list all prescriptions issued
     */
    @GetMapping
    public ResponseEntity<List<PrescriptionResponse>> getPrescriptions(@PathVariable String doctorId) {
        return ResponseEntity.ok(prescriptionService.getDoctorPrescriptions(doctorId));
    }
}
