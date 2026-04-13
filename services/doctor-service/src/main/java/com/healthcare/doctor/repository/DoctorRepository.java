package com.healthcare.doctor.repository;

import com.healthcare.doctor.model.Doctor;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface DoctorRepository extends MongoRepository<Doctor, String> {

    Optional<Doctor> findByUserId(String userId);

    List<Doctor> findByVerifiedTrue();

    List<Doctor> findByVerifiedTrueAndSpecialtyIgnoreCase(String specialty);
}
