package com.healthcare.doctor.controller;

import com.healthcare.doctor.dto.PrescriptionResponse;
import com.healthcare.doctor.service.PrescriptionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/doctors/appointments/{appointmentId}/prescriptions")
public class AppointmentPrescriptionController {

    private final PrescriptionService prescriptionService;

    public AppointmentPrescriptionController(PrescriptionService prescriptionService) {
        this.prescriptionService = prescriptionService;
    }

    @GetMapping
    public ResponseEntity<List<PrescriptionResponse>> getAppointmentPrescriptions(
            @PathVariable String appointmentId,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        
        List<PrescriptionResponse> prescriptions = prescriptionService.getAppointmentPrescriptions(appointmentId, userId, userRole);
        return ResponseEntity.ok(prescriptions);
    }
}
