package com.healthcare.telemedicine.service;

import java.time.Instant;
import java.util.List;

import com.healthcare.telemedicine.dto.prescription.MedicationRequest;
import com.healthcare.telemedicine.model.Prescription;
import com.healthcare.telemedicine.model.enums.PrescriptionStatus;

public interface PrescriptionService {
    Prescription createPrescription(
            String consultationId,
            Instant expiresAt,
            List<MedicationRequest> medications,
            PrescriptionStatus status,
            String actorId);

    Prescription getById(String prescriptionId, String actorId, String actorRole);

    List<Prescription> listByPatientOrConsultation(
            String patientId,
            String consultationId,
            String actorId,
            String actorRole);

    Prescription cancelPrescription(String prescriptionId, String actorId);

    Prescription updateStatus(String prescriptionId, PrescriptionStatus status, String actorId);
}
