package com.healthcare.auth.dto;

import jakarta.validation.constraints.NotBlank;

public class VerifyDoctorRequest {

    @NotBlank
    private String doctorUserId;

    @NotBlank
    private String decision;

    private String reason;

    public String getDoctorUserId() {
        return doctorUserId;
    }

    public void setDoctorUserId(String doctorUserId) {
        this.doctorUserId = doctorUserId;
    }

    public String getDecision() {
        return decision;
    }

    public void setDecision(String decision) {
        this.decision = decision;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
