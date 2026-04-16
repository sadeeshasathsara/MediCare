package com.healthcare.telemedicine.dto.prescription;

import java.time.Instant;
import java.util.List;

import com.healthcare.telemedicine.model.enums.PrescriptionStatus;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreatePrescriptionRequest {
    @NotBlank(message = "consultationId is required")
    private String consultationId;

    @NotNull(message = "expiresAt is required")
    @Future(message = "expiresAt must be in the future")
    private Instant expiresAt;

    @Valid
    @NotEmpty(message = "medications must have at least one item")
    private List<MedicationRequest> medications;

    private PrescriptionStatus prescriptionStatus;
}
