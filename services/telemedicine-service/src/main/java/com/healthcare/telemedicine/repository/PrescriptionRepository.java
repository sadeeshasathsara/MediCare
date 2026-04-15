package com.healthcare.telemedicine.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.healthcare.telemedicine.model.Prescription;

public interface PrescriptionRepository extends MongoRepository<Prescription, String> {
    Optional<Prescription> findByIdAndDeletedAtIsNull(String id);

    List<Prescription> findByPatientIdAndDeletedAtIsNullOrderByCreatedAtDesc(String patientId);

    List<Prescription> findByConsultationIdAndDeletedAtIsNullOrderByCreatedAtDesc(String consultationId);
}
