package com.healthcare.appointment.repository;

import com.healthcare.appointment.model.Appointment;
import com.healthcare.appointment.model.AppointmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.time.Instant;
import java.util.List;

public interface AppointmentRepository extends MongoRepository<Appointment, String> {
    List<Appointment> findByPatientId(String patientId);
    List<Appointment> findByDoctorId(String doctorId);
    List<Appointment> findByPatientIdAndStatus(String patientId, AppointmentStatus status);
    List<Appointment> findByDoctorIdAndStatus(String doctorId, AppointmentStatus status);

    Page<Appointment> findByPatientId(String patientId, Pageable pageable);
    Page<Appointment> findByDoctorId(String doctorId, Pageable pageable);

    // Queries to separate UPCOMING vs PAST based on scheduled timestamp
    Page<Appointment> findByPatientIdAndScheduledAtGreaterThanEqual(String patientId, Instant time, Pageable pageable);
    Page<Appointment> findByPatientIdAndScheduledAtLessThan(String patientId, Instant time, Pageable pageable);

    Page<Appointment> findByDoctorIdAndScheduledAtGreaterThanEqual(String doctorId, Instant time, Pageable pageable);
    Page<Appointment> findByDoctorIdAndScheduledAtLessThan(String doctorId, Instant time, Pageable pageable);
}
