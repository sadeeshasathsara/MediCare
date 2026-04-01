package com.healthcare.auth.dto;

import com.healthcare.auth.model.UserStatus;

public class SetUserStatusRequest {

    private UserStatus status;

    public UserStatus getStatus() {
        return status;
    }

    public void setStatus(UserStatus status) {
        this.status = status;
    }
}
