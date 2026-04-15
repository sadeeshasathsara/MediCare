package com.healthcare.telemedicine.integration.appointment;

import java.time.Instant;

public record ExternalAppointmentRescheduleRequest(Instant scheduledAt) {
}
