package com.healthcare.telemedicine.model;

import java.time.LocalDate;

import org.springframework.data.mongodb.core.mapping.Document;

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
@Document(collection = "consultation_records")
public class ConsultationRecord extends BaseDocument {
    private String sessionId;
    private String appointmentId;
    private String patientId;
    private String doctorId;
    private String doctorNotes;
    private String diagnosis;
    private LocalDate followUpDate;
}
