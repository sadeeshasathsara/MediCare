package com.healthcare.telemedicine.dto.consultation;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateConsultationRequest {
    @NotBlank(message = "sessionId is required")
    private String sessionId;

    @NotBlank(message = "doctorNotes is required")
    private String doctorNotes;

    @NotBlank(message = "diagnosis is required")
    private String diagnosis;

    private LocalDate followUpDate;
}
