package com.healthcare.notification.dto.internal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record TelemedicineAppointmentStatusEventRequest(
        @NotBlank String eventId,
        @NotNull Instant occurredAt,
        @NotBlank String appointmentId,
        @NotBlank String sourceService,
        @NotBlank String patientUserId,
        String patientName,
        @NotBlank String doctorUserId,
        String doctorName,
        String appointmentReason,
        @NotNull TelemedicineAppointmentDecisionStatus decisionStatus,
        Instant scheduledAt,
        Instant proposedScheduledAt,
        String rejectionReason,
        String rescheduleReason) {
}
