package com.healthcare.telemedicine.integration.appointment;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ExternalAppointment(
        String id,
        String doctorId,
        String patientId,
        String patientName,
        String doctorName,
        String doctorSpecialty,
        ExternalAppointmentStatus status,
        Instant scheduledAt,
        String reason,
        String notes,
        Instant createdAt,
        Instant updatedAt) {
}
