package com.healthcare.appointment.integration.notification;

import com.healthcare.appointment.model.Appointment;

import java.time.Instant;

public interface AppointmentNotificationClient {

    void notifyRequested(Appointment appointment, String actorUserId, String actorRole);

    void notifyRescheduled(Appointment appointment, Instant previousScheduledAt, String actorUserId, String actorRole);

    void notifyConfirmed(Appointment appointment, String actorUserId, String actorRole);

    void notifyCancelled(Appointment appointment, String actorUserId, String actorRole, String cancellationReason);

    void notifyCompleted(Appointment appointment, String actorUserId, String actorRole);
}

