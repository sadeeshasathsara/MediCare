package com.healthcare.patient.repository;

import com.healthcare.patient.model.PatientReport;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;
import java.util.Collection;

public interface PatientReportRepository extends MongoRepository<PatientReport, String> {
    List<PatientReport> findByUserIdAndDeletedAtIsNullOrderByUploadedAtDesc(String userId);

    Optional<PatientReport> findByIdAndUserIdAndDeletedAtIsNull(String id, String userId);

    List<PatientReport> findByUserIdAndFolderIdInAndDeletedAtIsNull(String userId, Collection<String> folderIds);
}
