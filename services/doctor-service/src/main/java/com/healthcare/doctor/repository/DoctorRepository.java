package com.healthcare.doctor.repository;

import com.healthcare.doctor.model.Doctor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface DoctorRepository extends MongoRepository<Doctor, String> {

    Optional<Doctor> findByUserId(String userId);

    List<Doctor> findByVerifiedTrue();

    List<Doctor> findByVerifiedTrueAndSpecialtyIgnoreCase(String specialty);

    @Query("{ 'verified': true, $and: [ { $or: [ { 'fullName': { $regex: ?0, $options: 'i' } }, { 'email': { $regex: ?0, $options: 'i' } } ] }, { 'specialty': { $regex: ?1, $options: 'i' } } ] }")
    Page<Doctor> searchDoctors(String searchRegex, String specialtyRegex, Pageable pageable);
}
