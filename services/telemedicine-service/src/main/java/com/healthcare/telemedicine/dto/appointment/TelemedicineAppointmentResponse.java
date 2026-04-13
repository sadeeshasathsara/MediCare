package com.healthcare.telemedicine.dto.appointment;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TelemedicineAppointmentResponse {
    private String id;
    private String patientId;
    private String doctorId;
    private String patientName;
    private String doctorName;
    private String doctorSpecialty;
    private Instant scheduledAt;
    private TelemedicineAppointmentStatus status;
    private String reasonForVisit;
    private String notes;
    private String rejectionReason;
    private String rescheduleReason;
    private Instant proposedScheduledAt;
    private Instant createdAt;
    private Instant updatedAt;
}
