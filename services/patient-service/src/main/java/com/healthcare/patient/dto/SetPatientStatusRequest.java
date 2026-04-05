package com.healthcare.patient.dto;

import com.healthcare.patient.model.PatientStatus;
import jakarta.validation.constraints.NotNull;

public class SetPatientStatusRequest {

    @NotNull
    private PatientStatus status;

    public PatientStatus getStatus() {
        return status;
    }

    public void setStatus(PatientStatus status) {
        this.status = status;
    }
}
