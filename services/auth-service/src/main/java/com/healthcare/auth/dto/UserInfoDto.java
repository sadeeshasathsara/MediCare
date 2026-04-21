package com.healthcare.auth.dto;

import com.healthcare.auth.model.Role;

public class UserInfoDto {

    private String id;
    private Role role;
    private boolean doctorVerified;
    private String email;
    private String fullName;
    private DoctorProfileDto doctorProfile;

    public UserInfoDto() {
    }

    public UserInfoDto(String id, Role role, boolean doctorVerified, String email, String fullName, DoctorProfileDto doctorProfile) {
        this.id = id;
        this.role = role;
        this.doctorVerified = doctorVerified;
        this.email = email;
        this.fullName = fullName;
        this.doctorProfile = doctorProfile;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
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

    public DoctorProfileDto getDoctorProfile() {
        return doctorProfile;
    }

    public void setDoctorProfile(DoctorProfileDto doctorProfile) {
        this.doctorProfile = doctorProfile;
    }
}
