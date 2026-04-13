package com.healthcare.appointment.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public class CreateAppointmentRequest {

    @NotBlank(message = "doctorId is required")
    private String doctorId;

    @NotBlank(message = "doctorName is required")
    private String doctorName;

    @NotBlank(message = "doctorSpecialty is required")
    private String doctorSpecialty;

    @NotBlank(message = "patientName is required")
    private String patientName;

    @NotNull(message = "scheduledAt is required")
    @Future(message = "scheduledAt must be in the future")
    private Instant scheduledAt;

    @NotBlank(message = "reason is required")
    private String reason;

    // Getters and Setters
    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getDoctorSpecialty() { return doctorSpecialty; }
    public void setDoctorSpecialty(String doctorSpecialty) { this.doctorSpecialty = doctorSpecialty; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public Instant getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(Instant scheduledAt) { this.scheduledAt = scheduledAt; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
