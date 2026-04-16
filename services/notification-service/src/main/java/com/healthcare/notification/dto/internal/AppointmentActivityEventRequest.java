package com.healthcare.notification.dto.internal;

import com.healthcare.notification.model.NotificationEventType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record AppointmentActivityEventRequest(
        @NotBlank String eventId,
        @NotNull NotificationEventType eventType,
        @NotNull Instant occurredAt,
        @NotBlank String appointmentId,
        @NotBlank String sourceService,
        @NotBlank String patientId,
        String patientName,
        @NotBlank String doctorId,
        String doctorName,
        String appointmentReason,
        Instant appointmentDateTime,
        String actorUserId,
        String actorRole) {
}

