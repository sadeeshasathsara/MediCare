package com.healthcare.telemedicine.integration.notification;

import java.time.Instant;

public record TelemedicineAppointmentStatusEventRequest(
        String eventId,
        Instant occurredAt,
        String appointmentId,
        String sourceService,
        String patientUserId,
        String doctorUserId,
        TelemedicineAppointmentDecisionStatus decisionStatus,
        Instant scheduledAt,
        Instant proposedScheduledAt,
        String rejectionReason,
        String rescheduleReason) {
}
