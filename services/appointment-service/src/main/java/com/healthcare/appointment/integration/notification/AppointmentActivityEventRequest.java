package com.healthcare.appointment.integration.notification;

import java.time.Instant;

public record AppointmentActivityEventRequest(
        String eventId,
        String eventType,
        Instant occurredAt,
        String appointmentId,
        String sourceService,
        String patientId,
        String patientName,
        String doctorId,
        String doctorName,
        String appointmentReason,
        Instant appointmentDateTime,
        String actorUserId,
        String actorRole) {
}

