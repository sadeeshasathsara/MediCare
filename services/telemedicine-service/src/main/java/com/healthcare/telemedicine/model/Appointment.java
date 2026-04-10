package com.healthcare.telemedicine.model;

import java.time.Instant;

import org.springframework.data.mongodb.core.mapping.Document;

import com.healthcare.telemedicine.model.enums.AppointmentStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "appointments")
public class Appointment extends BaseDocument {
    private String patientId;
    private String doctorId;
    private Instant scheduledAt;

    @Builder.Default
    private AppointmentStatus status = AppointmentStatus.PENDING;

    private String reasonForVisit;
    private String notes;
    private String rejectionReason;
    private String rescheduleReason;
    private Instant proposedScheduledAt;
}
