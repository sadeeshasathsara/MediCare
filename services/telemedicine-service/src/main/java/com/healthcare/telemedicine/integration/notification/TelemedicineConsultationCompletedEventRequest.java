package com.healthcare.telemedicine.integration.notification;

import java.time.Instant;

public record TelemedicineConsultationCompletedEventRequest(
        String eventId,
        Instant occurredAt,
        String appointmentId,
        String sourceService,
        String sessionId,
        String patientUserId,
        String patientName,
        String doctorUserId,
        String doctorName,
        String appointmentReason,
        Instant endedAt,
        Long durationSeconds) {
}
