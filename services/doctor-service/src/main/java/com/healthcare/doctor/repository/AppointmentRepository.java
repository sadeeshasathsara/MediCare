package com.healthcare.doctor.repository;

import com.healthcare.doctor.model.Appointment;
import com.healthcare.doctor.model.AppointmentStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AppointmentRepository extends MongoRepository<Appointment, String> {

    List<Appointment> findByDoctorId(String doctorId);

    List<Appointment> findByDoctorIdAndStatus(String doctorId, AppointmentStatus status);

    List<Appointment> findByDoctorIdAndStatusIn(String doctorId, List<AppointmentStatus> statuses);

    boolean existsByDoctorIdAndPatientId(String doctorId, String patientId);
}
