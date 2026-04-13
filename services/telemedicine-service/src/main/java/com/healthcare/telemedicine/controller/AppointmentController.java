package com.healthcare.telemedicine.controller;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
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

import com.healthcare.telemedicine.dto.appointment.RejectAppointmentRequest;
import com.healthcare.telemedicine.dto.appointment.RescheduleAppointmentRequest;
import com.healthcare.telemedicine.dto.appointment.SyncAppointmentRequest;
import com.healthcare.telemedicine.dto.common.ApiResponse;
import com.healthcare.telemedicine.model.Appointment;
import com.healthcare.telemedicine.model.enums.AppointmentStatus;
import com.healthcare.telemedicine.security.SecurityUtils;
import com.healthcare.telemedicine.service.AppointmentService;

import jakarta.validation.Valid;

@Validated
@RestController
@RequestMapping("/api/v1/appointments")
public class AppointmentController {

    private final AppointmentService appointmentService;

    public AppointmentController(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    @PostMapping("/sync")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<Appointment>> syncAppointment(@Valid @RequestBody SyncAppointmentRequest request) {
        String actorId = SecurityUtils.currentUserId();
        Appointment appointment = appointmentService.syncAppointment(request, actorId);
        return ResponseEntity.ok(ApiResponse.success(appointment, "Appointment synced"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DOCTOR', 'PATIENT')")
    public ResponseEntity<ApiResponse<List<Appointment>>> listAppointments(
            @RequestParam(required = false) String doctorId,
            @RequestParam(required = false) String patientId,
            @RequestParam(required = false) AppointmentStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        String actorId = SecurityUtils.currentUserId();
        String actorRole = SecurityUtils.currentRole();
        List<Appointment> appointments = appointmentService.listAppointments(
                doctorId,
                patientId,
                status,
                date,
                actorId,
                actorRole);
        return ResponseEntity.ok(ApiResponse.success(appointments, "Appointments fetched"));
    }

    @GetMapping("/upcoming")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<List<Appointment>>> upcomingAppointments(
            @RequestParam(required = false) String doctorId) {
        String actorId = SecurityUtils.currentUserId();
        List<Appointment> appointments = appointmentService.listUpcomingAppointments(doctorId, actorId);
        return ResponseEntity.ok(ApiResponse.success(appointments, "Upcoming appointments fetched"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'PATIENT')")
    public ResponseEntity<ApiResponse<Appointment>> getAppointment(@PathVariable("id") String id) {
        String actorId = SecurityUtils.currentUserId();
        String actorRole = SecurityUtils.currentRole();
        Appointment appointment = appointmentService.getAppointmentById(id, actorId, actorRole);
        return ResponseEntity.ok(ApiResponse.success(appointment, "Appointment fetched"));
    }

    @PatchMapping("/{id}/accept")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<Appointment>> acceptAppointment(@PathVariable("id") String id) {
        String actorId = SecurityUtils.currentUserId();
        Appointment appointment = appointmentService.acceptAppointment(id, actorId);
        return ResponseEntity.ok(ApiResponse.success(appointment, "Appointment accepted"));
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<Appointment>> rejectAppointment(
            @PathVariable("id") String id,
            @Valid @RequestBody RejectAppointmentRequest request) {
        String actorId = SecurityUtils.currentUserId();
        Appointment appointment = appointmentService.rejectAppointment(id, actorId, request.getReason());
        return ResponseEntity.ok(ApiResponse.success(appointment, "Appointment rejected"));
    }

    @PatchMapping("/{id}/reschedule")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<Appointment>> rescheduleAppointment(
            @PathVariable("id") String id,
            @Valid @RequestBody RescheduleAppointmentRequest request) {
        String actorId = SecurityUtils.currentUserId();
        Instant newTime = request.getNewScheduledAt();
        Appointment appointment = appointmentService.rescheduleAppointment(id, actorId, newTime, request.getReason());
        return ResponseEntity.ok(ApiResponse.success(appointment, "Appointment rescheduled"));
    }
}
