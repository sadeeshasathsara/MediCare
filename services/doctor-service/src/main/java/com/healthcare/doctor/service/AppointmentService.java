package com.healthcare.doctor.service;

import com.healthcare.doctor.dto.AppointmentResponse;
import com.healthcare.doctor.dto.UpdateAppointmentStatusRequest;
import com.healthcare.doctor.model.Appointment;
import com.healthcare.doctor.model.AppointmentStatus;
import com.healthcare.doctor.repository.AppointmentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

@Service
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final DoctorService doctorService;

    public AppointmentService(AppointmentRepository appointmentRepository, DoctorService doctorService) {
        this.appointmentRepository = appointmentRepository;
        this.doctorService = doctorService;
    }

    public List<AppointmentResponse> getDoctorAppointments(String doctorId, String statusFilter) {
        doctorService.ensureDoctorExists(doctorId);

        List<Appointment> appointments;

        if (statusFilter != null && !statusFilter.isBlank()) {
            String normalized = statusFilter.trim().toUpperCase(Locale.ROOT);
            try {
                AppointmentStatus status = AppointmentStatus.valueOf(normalized);
                appointments = appointmentRepository.findByDoctorIdAndStatus(doctorId, status);
            } catch (IllegalArgumentException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Invalid status filter: " + statusFilter + ". Must be one of: PENDING, ACCEPTED, REJECTED, COMPLETED, CANCELLED");
            }
        } else {
            // Default: return PENDING and ACCEPTED (upcoming)
            appointments = appointmentRepository.findByDoctorIdAndStatusIn(
                    doctorId, List.of(AppointmentStatus.PENDING, AppointmentStatus.ACCEPTED));
        }

        return appointments.stream().map(this::toResponse).toList();
    }

    public AppointmentResponse updateAppointmentStatus(String doctorId, String appointmentId,
                                                        UpdateAppointmentStatusRequest request) {
        doctorService.ensureDoctorExists(doctorId);

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));

        if (!appointment.getDoctorId().equals(doctorId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Appointment does not belong to this doctor");
        }

        if (appointment.getStatus() != AppointmentStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only PENDING appointments can be accepted or rejected. Current status: " + appointment.getStatus());
        }

        String statusStr = request.getStatus().trim().toUpperCase(Locale.ROOT);
        if (!statusStr.equals("ACCEPTED") && !statusStr.equals("REJECTED")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "status must be ACCEPTED or REJECTED");
        }

        appointment.setStatus(AppointmentStatus.valueOf(statusStr));

        if (request.getNotes() != null) {
            appointment.setNotes(request.getNotes().trim());
        }

        appointment.setUpdatedAt(Instant.now());
        Appointment saved = appointmentRepository.save(appointment);
        return toResponse(saved);
    }

    /**
     * Check if a doctor has an appointment (any status) with a given patient.
     */
    public boolean hasDoctorPatientRelationship(String doctorId, String patientId) {
        return appointmentRepository.existsByDoctorIdAndPatientId(doctorId, patientId);
    }

    private AppointmentResponse toResponse(Appointment appointment) {
        AppointmentResponse response = new AppointmentResponse();
        response.setId(appointment.getId());
        response.setDoctorId(appointment.getDoctorId());
        response.setPatientId(appointment.getPatientId());
        response.setPatientName(appointment.getPatientName());
        response.setScheduledAt(appointment.getScheduledAt());
        response.setReason(appointment.getReason());
        response.setStatus(appointment.getStatus() != null ? appointment.getStatus().name() : null);
        response.setNotes(appointment.getNotes());
        response.setCreatedAt(appointment.getCreatedAt());
        response.setUpdatedAt(appointment.getUpdatedAt());
        return response;
    }
}
