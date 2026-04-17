package com.healthcare.doctor.repository;

import com.healthcare.doctor.model.Prescription;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface PrescriptionRepository extends MongoRepository<Prescription, String> {

    List<Prescription> findByDoctorId(String doctorId);

    List<Prescription> findByDoctorIdAndPatientId(String doctorId, String patientId);

    List<Prescription> findByPatientId(String patientId);

    List<Prescription> findByAppointmentId(String appointmentId);
}
