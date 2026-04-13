package com.healthcare.doctor.repository;

import com.healthcare.doctor.model.PatientReport;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface PatientReportRepository extends MongoRepository<PatientReport, String> {

    List<PatientReport> findByPatientIdAndDoctorId(String patientId, String doctorId);

    List<PatientReport> findByPatientId(String patientId);
}
