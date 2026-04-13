package com.healthcare.telemedicine.integration.appointment;

public record ExternalAppointmentStatusUpdateRequest(
        ExternalAppointmentStatus status,
        String notes) {
}
