package com.healthcare.telemedicine.service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.healthcare.telemedicine.dto.appointment.SyncAppointmentRequest;
import com.healthcare.telemedicine.model.Appointment;
import com.healthcare.telemedicine.model.enums.AppointmentStatus;

public interface AppointmentService {
    Appointment syncAppointment(SyncAppointmentRequest request, String actorId);

    List<Appointment> listAppointments(
            String doctorId,
            String patientId,
            AppointmentStatus status,
            LocalDate date,
            String actorId,
            String actorRole);

    Appointment getAppointmentById(String appointmentId, String actorId, String actorRole);

    Appointment acceptAppointment(String appointmentId, String actorId);

    Appointment rejectAppointment(String appointmentId, String actorId, String reason);

    Appointment rescheduleAppointment(String appointmentId, String actorId, Instant newScheduledAt, String reason);

    List<Appointment> listUpcomingAppointments(String doctorId, String actorId);
}
