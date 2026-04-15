package com.healthcare.aisymptom.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DoctorCandidateDto(
        @NotBlank(message = "doctor id is required")
        @Size(max = 100, message = "doctor id cannot exceed 100 characters")
        String id,

        @Size(max = 200, message = "doctor name cannot exceed 200 characters")
        String fullName,

        @NotBlank(message = "doctor specialty is required")
        @Size(max = 100, message = "doctor specialty cannot exceed 100 characters")
        String specialty
) {
}
