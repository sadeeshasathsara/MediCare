package com.healthcare.appointment.repository;

import com.healthcare.appointment.model.Appointment;
import com.healthcare.appointment.model.AppointmentStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface AppointmentRepository extends MongoRepository<Appointment, String> {
    List<Appointment> findByPatientId(String patientId);
    List<Appointment> findByDoctorId(String doctorId);
    List<Appointment> findByPatientIdAndStatus(String patientId, AppointmentStatus status);
    List<Appointment> findByDoctorIdAndStatus(String doctorId, AppointmentStatus status);
}
