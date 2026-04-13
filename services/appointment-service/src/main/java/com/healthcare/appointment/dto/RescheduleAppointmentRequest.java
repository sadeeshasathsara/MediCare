package com.healthcare.appointment.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public class RescheduleAppointmentRequest {

    @NotNull(message = "scheduledAt is required")
    @Future(message = "scheduledAt must be in the future")
    private Instant scheduledAt;

    public Instant getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(Instant scheduledAt) { this.scheduledAt = scheduledAt; }
}
