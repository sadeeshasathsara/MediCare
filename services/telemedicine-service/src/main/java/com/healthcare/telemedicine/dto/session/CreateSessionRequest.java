package com.healthcare.telemedicine.dto.session;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateSessionRequest {
    @NotBlank(message = "appointmentId is required")
    private String appointmentId;
}
