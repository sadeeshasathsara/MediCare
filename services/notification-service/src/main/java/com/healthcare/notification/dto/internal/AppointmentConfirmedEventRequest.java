package com.healthcare.notification.dto.internal;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record AppointmentConfirmedEventRequest(
        @NotBlank String eventId,
        @NotNull Instant occurredAt,
        @NotBlank String appointmentId,
        @NotBlank String sourceService,
        @NotNull @Valid EventRecipient patient,
        @NotNull @Valid EventRecipient doctor,
        @NotNull Instant appointmentDateTime,
        String appointmentReason,
        @NotBlank String channel,
        String notes) {
}
