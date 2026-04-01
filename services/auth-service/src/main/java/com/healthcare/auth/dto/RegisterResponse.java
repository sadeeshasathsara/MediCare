package com.healthcare.auth.dto;

import com.healthcare.auth.model.Role;

public class RegisterResponse {

    private String id;
    private String email;
    private String fullName;
    private Role role;
    private boolean doctorVerified;
    private DoctorProfileDto doctorProfile;

    public RegisterResponse() {
    }

    public RegisterResponse(String id, String email, String fullName, Role role, boolean doctorVerified,
            DoctorProfileDto doctorProfile) {
        this.id = id;
        this.email = email;
        this.fullName = fullName;
        this.role = role;
        this.doctorVerified = doctorVerified;
        this.doctorProfile = doctorProfile;
    }

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

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public boolean isDoctorVerified() {
        return doctorVerified;
    }

    public void setDoctorVerified(boolean doctorVerified) {
        this.doctorVerified = doctorVerified;
    }

    public DoctorProfileDto getDoctorProfile() {
        return doctorProfile;
    }

    public void setDoctorProfile(DoctorProfileDto doctorProfile) {
        this.doctorProfile = doctorProfile;
    }
}
