package com.healthcare.doctor.controller;

import com.healthcare.doctor.dto.PrescriptionResponse;
import com.healthcare.doctor.service.PrescriptionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Internal API for cross-service access.
 * Patient Service can call this to read prescriptions for a patient (read-only).
 */
@RestController
@RequestMapping("/internal")
public class InternalController {

    private final PrescriptionService prescriptionService;

    public InternalController(PrescriptionService prescriptionService) {
        this.prescriptionService = prescriptionService;
    }

    /**
     * GET /internal/patients/:patientId/prescriptions
     * Read-only access for Patient Service to retrieve prescriptions.
     */
    @GetMapping("/patients/{patientId}/prescriptions")
    public ResponseEntity<List<PrescriptionResponse>> getPatientPrescriptions(@PathVariable String patientId) {
        return ResponseEntity.ok(prescriptionService.getPatientPrescriptions(patientId));
    }
}
