package com.healthcare.notification.dto.internal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record TelemedicinePrescriptionIssuedEventRequest(
        @NotBlank String eventId,
        @NotNull Instant occurredAt,
        @NotBlank String appointmentId,
        @NotBlank String sourceService,
        @NotBlank String prescriptionId,
        @NotBlank String consultationId,
        @NotBlank String patientUserId,
        @NotBlank String doctorUserId,
        @NotNull Instant issuedAt,
        Instant expiresAt) {
}
