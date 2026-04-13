package com.healthcare.telemedicine.dto.prescription;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MedicationRequest {
    @NotBlank(message = "name is required")
    private String name;

    @NotBlank(message = "dosage is required")
    private String dosage;

    @NotBlank(message = "frequency is required")
    private String frequency;

    @NotNull(message = "durationDays is required")
    @Min(value = 1, message = "durationDays must be at least 1")
    private Integer durationDays;

    private String instructions;
}
