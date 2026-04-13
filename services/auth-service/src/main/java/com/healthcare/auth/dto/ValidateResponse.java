package com.healthcare.auth.dto;

public class ValidateResponse {
    private boolean valid;
    private String userId;
    private String email;
    private String role;

    public ValidateResponse() {
    }

    public ValidateResponse(boolean valid, String userId, String email, String role) {
        this.valid = valid;
        this.userId = userId;
        this.email = email;
        this.role = role;
    }

    public boolean isValid() {
        return valid;
    }

    public void setValid(boolean valid) {
        this.valid = valid;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
