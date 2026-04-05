package com.healthcare.patient.repository;

import com.healthcare.patient.model.Patient;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface PatientRepository extends MongoRepository<Patient, String> {
    Optional<Patient> findByUserId(String userId);
}
