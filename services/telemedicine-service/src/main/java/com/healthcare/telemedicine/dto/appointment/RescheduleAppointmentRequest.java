package com.healthcare.telemedicine.dto.appointment;

import java.time.Instant;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RescheduleAppointmentRequest {
    @NotNull(message = "newScheduledAt is required")
    @Future(message = "newScheduledAt must be in the future")
    private Instant newScheduledAt;

    @NotBlank(message = "reason is required")
    private String reason;
}
