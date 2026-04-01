package com.healthcare.auth.dto;

public class VerifyDoctorResponse {

    private String doctorUserId;
    private boolean doctorVerified;

    public VerifyDoctorResponse() {
    }

    public VerifyDoctorResponse(String doctorUserId, boolean doctorVerified) {
        this.doctorUserId = doctorUserId;
        this.doctorVerified = doctorVerified;
    }

    public String getDoctorUserId() {
        return doctorUserId;
    }

    public void setDoctorUserId(String doctorUserId) {
        this.doctorUserId = doctorUserId;
    }

    public boolean isDoctorVerified() {
        return doctorVerified;
    }

    public void setDoctorVerified(boolean doctorVerified) {
        this.doctorVerified = doctorVerified;
    }
}
