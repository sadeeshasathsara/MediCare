package com.healthcare.doctor.dto;

import jakarta.validation.constraints.NotBlank;

public class UpdateAppointmentStatusRequest {

    @NotBlank(message = "status is required (ACCEPTED or REJECTED)")
    private String status;

    private String notes;

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
