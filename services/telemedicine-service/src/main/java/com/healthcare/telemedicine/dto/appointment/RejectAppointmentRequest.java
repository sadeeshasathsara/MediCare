package com.healthcare.telemedicine.dto.appointment;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RejectAppointmentRequest {
    @NotBlank(message = "reason is required")
    private String reason;
}
