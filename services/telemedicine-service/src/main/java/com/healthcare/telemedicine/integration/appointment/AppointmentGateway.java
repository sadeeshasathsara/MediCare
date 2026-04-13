package com.healthcare.telemedicine.integration.appointment;

import java.time.Instant;
import java.util.List;

public interface AppointmentGateway {

    List<ExternalAppointment> listByDoctorId(String doctorId, String actorId, String actorRole);

    List<ExternalAppointment> listByPatientId(String patientId, String actorId, String actorRole);

    ExternalAppointment getById(String appointmentId, String actorId, String actorRole);

    ExternalAppointment updateStatus(
            String appointmentId,
            ExternalAppointmentStatus status,
            String notes,
            String actorId,
            String actorRole);

    ExternalAppointment reschedule(
            String appointmentId,
            Instant scheduledAt,
            String actorId,
            String actorRole);
}
