package com.healthcare.telemedicine.dto.appointment;

import java.time.Instant;

import com.healthcare.telemedicine.model.enums.AppointmentStatus;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SyncAppointmentRequest {
    @NotBlank(message = "id is required")
    private String id;

    @NotBlank(message = "patientId is required")
    private String patientId;

    @NotBlank(message = "doctorId is required")
    private String doctorId;

    @NotNull(message = "scheduledAt is required")
    private Instant scheduledAt;

    private AppointmentStatus status;
    private String reasonForVisit;
    private String notes;
}
