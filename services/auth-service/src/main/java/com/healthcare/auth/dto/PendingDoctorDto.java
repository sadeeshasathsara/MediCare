package com.healthcare.auth.dto;

import com.healthcare.auth.model.DoctorVerificationStatus;
import com.healthcare.auth.model.UserStatus;

public class PendingDoctorDto {

    private String id;
    private String email;
    private String fullName;
    private DoctorVerificationStatus doctorVerificationStatus;
    private boolean doctorVerified;
    private UserStatus status;
    private DoctorProfileDto doctorProfile;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public DoctorVerificationStatus getDoctorVerificationStatus() {
        return doctorVerificationStatus;
    }

    public void setDoctorVerificationStatus(DoctorVerificationStatus doctorVerificationStatus) {
        this.doctorVerificationStatus = doctorVerificationStatus;
    }

    public boolean isDoctorVerified() {
        return doctorVerified;
    }

    public void setDoctorVerified(boolean doctorVerified) {
        this.doctorVerified = doctorVerified;
    }

    public UserStatus getStatus() {
        return status;
    }

    public void setStatus(UserStatus status) {
        this.status = status;
    }

    public DoctorProfileDto getDoctorProfile() {
        return doctorProfile;
    }

    public void setDoctorProfile(DoctorProfileDto doctorProfile) {
        this.doctorProfile = doctorProfile;
    }
}
