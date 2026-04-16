package com.healthcare.telemedicine.integration.notification;

import java.time.Instant;

public record TelemedicinePrescriptionIssuedEventRequest(
        String eventId,
        Instant occurredAt,
        String appointmentId,
        String sourceService,
        String prescriptionId,
        String consultationId,
        String patientUserId,
        String patientName,
        String doctorUserId,
        String doctorName,
        String appointmentReason,
        Instant issuedAt,
        Instant expiresAt) {
}
