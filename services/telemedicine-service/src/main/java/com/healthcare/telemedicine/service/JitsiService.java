package com.healthcare.telemedicine.service;

import java.time.Instant;

public interface JitsiService {
    String roomNameForAppointment(String appointmentId);

    String generateJoinToken(
            String roomId,
            String userId,
            String name,
            String email,
            boolean moderator,
            Instant scheduledAt);

    String getDomain();

    Instant tokenExpiry(Instant scheduledAt);
}
