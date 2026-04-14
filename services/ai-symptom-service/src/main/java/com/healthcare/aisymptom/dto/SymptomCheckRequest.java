package com.healthcare.aisymptom.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SymptomCheckRequest(
        @NotBlank(message = "symptoms is required")
        @Size(max = 2000, message = "symptoms cannot exceed 2000 characters")
        String symptoms,

        @Min(value = 0, message = "age must be >= 0")
        @Max(value = 120, message = "age must be <= 120")
        Integer age,

        @Size(max = 50, message = "gender cannot exceed 50 characters")
        String gender,

        @Size(max = 1000, message = "medicalHistory cannot exceed 1000 characters")
        String medicalHistory
) {
}
