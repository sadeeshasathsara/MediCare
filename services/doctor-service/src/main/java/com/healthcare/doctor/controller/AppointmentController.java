package com.healthcare.doctor.controller;

import com.healthcare.doctor.dto.AppointmentResponse;
import com.healthcare.doctor.dto.UpdateAppointmentStatusRequest;
import com.healthcare.doctor.service.AppointmentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/doctors/{doctorId}/appointments")
public class AppointmentController {

    private final AppointmentService appointmentService;

    public AppointmentController(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    /**
     * GET /doctors/:id/appointments – view pending and upcoming appointments
     * Optional query param: ?status=PENDING|ACCEPTED|REJECTED|COMPLETED|CANCELLED
     */
    @GetMapping
    public ResponseEntity<List<AppointmentResponse>> getAppointments(
            @PathVariable String doctorId,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(appointmentService.getDoctorAppointments(doctorId, status));
    }

    /**
     * PATCH /doctors/:id/appointments/:apptId/status – accept or reject request
     */
    @PatchMapping("/{appointmentId}/status")
    public ResponseEntity<AppointmentResponse> updateStatus(
            @PathVariable String doctorId,
            @PathVariable String appointmentId,
            @Valid @RequestBody UpdateAppointmentStatusRequest request) {
        return ResponseEntity.ok(appointmentService.updateAppointmentStatus(doctorId, appointmentId, request));
    }
}
