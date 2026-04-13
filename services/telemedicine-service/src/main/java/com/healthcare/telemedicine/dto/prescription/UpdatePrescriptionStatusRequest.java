package com.healthcare.telemedicine.dto.prescription;

import com.healthcare.telemedicine.model.enums.PrescriptionStatus;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdatePrescriptionStatusRequest {
    @NotNull(message = "status is required")
    private PrescriptionStatus status;
}
