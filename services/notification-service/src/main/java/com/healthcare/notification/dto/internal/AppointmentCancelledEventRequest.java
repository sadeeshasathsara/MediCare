package com.healthcare.notification.dto.internal;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record AppointmentCancelledEventRequest(
        @NotBlank String eventId,
        @NotNull Instant occurredAt,
        @NotBlank String appointmentId,
        @NotBlank String sourceService,
        @NotNull @Valid EventRecipient patient,
        @NotNull @Valid EventRecipient doctor,
        @NotBlank String cancellationReason,
        @Valid RefundInfo refund) {
}
