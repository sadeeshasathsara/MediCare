package com.healthcare.patient.repository;

import com.healthcare.patient.model.PatientReportFolder;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PatientReportFolderRepository extends MongoRepository<PatientReportFolder, String> {
    List<PatientReportFolder> findByUserIdOrderByNameAsc(String userId);

    Optional<PatientReportFolder> findByIdAndUserId(String id, String userId);
}
