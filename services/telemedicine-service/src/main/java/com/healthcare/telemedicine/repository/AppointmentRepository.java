package com.healthcare.telemedicine.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;

import com.healthcare.telemedicine.model.Appointment;
import com.healthcare.telemedicine.model.enums.AppointmentStatus;

public interface AppointmentRepository extends MongoRepository<Appointment, String> {
    Optional<Appointment> findByIdAndDeletedAtIsNull(String id);

    List<Appointment> findByDoctorIdAndDeletedAtIsNull(String doctorId, Sort sort);

    List<Appointment> findByPatientIdAndDeletedAtIsNull(String patientId, Sort sort);

    List<Appointment> findByDoctorIdAndStatusAndDeletedAtIsNull(String doctorId, AppointmentStatus status, Sort sort);

    List<Appointment> findByDoctorIdAndStatusAndScheduledAtAfterAndDeletedAtIsNull(
            String doctorId,
            AppointmentStatus status,
            Instant scheduledAt,
            Sort sort);

    List<Appointment> findByDoctorIdAndStatusAndScheduledAtBetweenAndDeletedAtIsNull(
            String doctorId,
            AppointmentStatus status,
            Instant start,
            Instant end,
            Sort sort);
}
