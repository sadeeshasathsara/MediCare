package com.healthcare.telemedicine.dto.consultation;

import java.time.LocalDate;

import lombok.Data;

@Data
public class UpdateConsultationRequest {
    private String doctorNotes;
    private String diagnosis;
    private LocalDate followUpDate;
}
