package com.healthcare.auth.dto;

import jakarta.validation.constraints.NotBlank;

public class DoctorProfileDto {

    @NotBlank
    private String licenseNumber;

    @NotBlank
    private String specialty;

    @NotBlank
    private String phone;

    public String getLicenseNumber() {
        return licenseNumber;
    }

    public void setLicenseNumber(String licenseNumber) {
        this.licenseNumber = licenseNumber;
    }

    public String getSpecialty() {
        return specialty;
    }

    public void setSpecialty(String specialty) {
        this.specialty = specialty;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }
}
