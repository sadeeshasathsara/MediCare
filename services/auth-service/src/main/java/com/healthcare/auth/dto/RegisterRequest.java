package com.healthcare.auth.dto;

import com.healthcare.auth.model.Role;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class RegisterRequest {

    @Email
    @NotBlank
    private String email;

    @NotBlank
    private String password;

    @NotNull
    private Role role;

    @NotBlank
    private String fullName;

    @Valid
    private DoctorProfileDto doctorProfile;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
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
