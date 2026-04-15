package com.healthcare.telemedicine.service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.healthcare.telemedicine.dto.appointment.TelemedicineAppointmentResponse;
import com.healthcare.telemedicine.dto.appointment.TelemedicineAppointmentStatus;

public interface AppointmentService {
    List<TelemedicineAppointmentResponse> listAppointments(
            String doctorId,
            String patientId,
            TelemedicineAppointmentStatus status,
            LocalDate date,
            String actorId,
            String actorRole);

    TelemedicineAppointmentResponse getAppointmentById(String appointmentId, String actorId, String actorRole);

    TelemedicineAppointmentResponse acceptAppointment(String appointmentId, String actorId);

    TelemedicineAppointmentResponse rejectAppointment(String appointmentId, String actorId, String reason);

    TelemedicineAppointmentResponse rescheduleAppointment(String appointmentId, String actorId, Instant newScheduledAt, String reason);

    List<TelemedicineAppointmentResponse> listUpcomingAppointments(String doctorId, String actorId);
}
