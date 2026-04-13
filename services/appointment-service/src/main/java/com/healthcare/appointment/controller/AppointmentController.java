package com.healthcare.appointment.controller;

import com.healthcare.appointment.dto.AppointmentResponse;
import com.healthcare.appointment.dto.CreateAppointmentRequest;
import com.healthcare.appointment.dto.RescheduleAppointmentRequest;
import com.healthcare.appointment.dto.UpdateAppointmentStatusRequest;
import com.healthcare.appointment.service.AppointmentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/appointments")
public class AppointmentController {

    private final AppointmentService appointmentService;

    public AppointmentController(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    @PostMapping
    public ResponseEntity<AppointmentResponse> createAppointment(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @Valid @RequestBody CreateAppointmentRequest request) {
        
        if (userId == null || !role.equals("PATIENT")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only patients can book appointments");
        }

        AppointmentResponse response = appointmentService.createAppointment(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppointmentResponse> getAppointment(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String role) {

        AppointmentResponse appointment = appointmentService.getAppointmentById(id);

        if (!role.equals("ADMIN") && !appointment.getPatientId().equals(userId) && !appointment.getDoctorId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        return ResponseEntity.ok(appointment);
    }

    @PutMapping("/{id}")
    public ResponseEntity<AppointmentResponse> rescheduleAppointment(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @Valid @RequestBody RescheduleAppointmentRequest request) {

        boolean isDoctor = "DOCTOR".equals(role);
        return ResponseEntity.ok(appointmentService.rescheduleAppointment(id, request, userId, isDoctor));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancelAppointment(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String role) {

        boolean isDoctor = "DOCTOR".equals(role);
        appointmentService.cancelAppointment(id, userId, isDoctor);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<AppointmentResponse> updateStatus(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @Valid @RequestBody UpdateAppointmentStatusRequest request) {

        if (!"DOCTOR".equals(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only doctors can update appointment status");
        }

        return ResponseEntity.ok(appointmentService.updateStatus(id, request, userId));
    }

    @GetMapping
    public ResponseEntity<List<AppointmentResponse>> listAppointments(
            @RequestParam(required = false) String patientId,
            @RequestParam(required = false) String doctorId,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String role) {

        if (patientId != null) {
            if (!role.equals("ADMIN") && !patientId.equals(userId) && !role.equals("DOCTOR")) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
            }
            return ResponseEntity.ok(appointmentService.getAppointmentsByPatientId(patientId));
        } else if (doctorId != null) {
            if (!role.equals("ADMIN") && !doctorId.equals(userId) && !role.equals("PATIENT")) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
            }
            return ResponseEntity.ok(appointmentService.getAppointmentsByDoctorId(doctorId));
        }

        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Must provide either patientId or doctorId");
    }

    @GetMapping("/search")
    public ResponseEntity<Object> searchAvailableDoctors(
            @RequestParam(required = false) String specialty,
            @RequestParam(required = false) String date) {

        return ResponseEntity.ok(appointmentService.searchAvailableDoctors(specialty, date));
    }
}
