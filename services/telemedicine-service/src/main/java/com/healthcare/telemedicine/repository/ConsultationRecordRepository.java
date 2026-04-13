package com.healthcare.telemedicine.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.healthcare.telemedicine.model.ConsultationRecord;

public interface ConsultationRecordRepository extends MongoRepository<ConsultationRecord, String> {
    Optional<ConsultationRecord> findByIdAndDeletedAtIsNull(String id);

    Optional<ConsultationRecord> findBySessionIdAndDeletedAtIsNull(String sessionId);

    List<ConsultationRecord> findByPatientIdAndDeletedAtIsNullOrderByCreatedAtDesc(String patientId);

    List<ConsultationRecord> findByDoctorIdAndDeletedAtIsNullOrderByCreatedAtDesc(String doctorId);
}
