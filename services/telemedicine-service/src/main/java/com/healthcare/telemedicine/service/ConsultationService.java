package com.healthcare.telemedicine.service;

import java.time.LocalDate;
import java.util.List;

import com.healthcare.telemedicine.model.ConsultationRecord;

public interface ConsultationService {
    ConsultationRecord createRecord(
            String sessionId,
            String doctorNotes,
            String diagnosis,
            LocalDate followUpDate,
            String actorId);

    ConsultationRecord getById(String consultationId, String actorId, String actorRole);

    List<ConsultationRecord> listByPatientOrDoctor(String patientId, String doctorId, String actorId, String actorRole);

    ConsultationRecord updateRecord(
            String consultationId,
            String doctorNotes,
            String diagnosis,
            LocalDate followUpDate,
            String actorId);
}
