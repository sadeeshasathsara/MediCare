package com.healthcare.auth.dto;

import com.healthcare.auth.model.Role;

public class UserInfoDto {

    private String id;
    private Role role;
    private boolean doctorVerified;

    public UserInfoDto() {
    }

    public UserInfoDto(String id, Role role, boolean doctorVerified) {
        this.id = id;
        this.role = role;
        this.doctorVerified = doctorVerified;
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
}
