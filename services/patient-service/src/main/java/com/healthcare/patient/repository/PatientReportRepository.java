package com.healthcare.patient.repository;

import com.healthcare.patient.model.PatientReport;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PatientReportRepository extends MongoRepository<PatientReport, String> {
    List<PatientReport> findByUserIdOrderByUploadedAtDesc(String userId);

    Optional<PatientReport> findByIdAndUserId(String id, String userId);
}
