package com.healthcare.telemedicine.integration.appointment;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.healthcare.telemedicine.dto.appointment.TelemedicineAppointmentResponse;
import com.healthcare.telemedicine.dto.appointment.TelemedicineAppointmentStatus;

@Component
public class TelemedicineAppointmentAdapter {

    private static final String RESCHEDULE_PREFIX = "[telemedicine-rescheduled]";

    private final List<String> telemedicineKeywords;

    public TelemedicineAppointmentAdapter(
            @Value("${telemedicine.appointment.telemedicine-keywords:telemedicine,teleconsultation,video consultation,video consult,video call,virtual consultation,online consultation,remote consultation,jitsi}") String telemedicineKeywordsCsv) {
        this.telemedicineKeywords = Arrays.stream(telemedicineKeywordsCsv.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .map(value -> value.toLowerCase(Locale.ROOT))
                .distinct()
                .toList();
    }

    public boolean isTelemedicineAppointment(ExternalAppointment appointment) {
        if (appointment == null) {
            return false;
        }

        String reason = normalize(appointment.reason());
        String notes = normalize(appointment.notes());
        String searchable = reason + " " + notes;

        if (searchable.isBlank()) {
            return false;
        }

        return telemedicineKeywords.stream().anyMatch(searchable::contains);
    }

    public boolean isEligibleForSession(ExternalAppointment appointment) {
        return appointment != null && appointment.status() == ExternalAppointmentStatus.CONFIRMED;
    }

    public TelemedicineAppointmentResponse toTelemedicineAppointment(ExternalAppointment appointment) {
        return TelemedicineAppointmentResponse.builder()
                .id(appointment.id())
                .patientId(appointment.patientId())
                .doctorId(appointment.doctorId())
                .patientName(appointment.patientName())
                .doctorName(appointment.doctorName())
                .doctorSpecialty(appointment.doctorSpecialty())
                .scheduledAt(appointment.scheduledAt())
                .status(toTelemedicineStatus(appointment))
                .reasonForVisit(appointment.reason())
                .notes(appointment.notes())
                .rescheduleReason(extractRescheduleReason(appointment.notes()))
                .createdAt(appointment.createdAt())
                .updatedAt(appointment.updatedAt())
                .build();
    }

    public TelemedicineAppointmentStatus toTelemedicineStatus(ExternalAppointment appointment) {
        ExternalAppointmentStatus status = appointment == null ? null : appointment.status();
        if (status == null) {
            return TelemedicineAppointmentStatus.PENDING;
        }

        return switch (status) {
            case PENDING -> hasRescheduleMarker(appointment.notes())
                    ? TelemedicineAppointmentStatus.RESCHEDULED
                    : TelemedicineAppointmentStatus.PENDING;
            case CONFIRMED -> TelemedicineAppointmentStatus.ACCEPTED;
            case COMPLETED -> TelemedicineAppointmentStatus.COMPLETED;
            case CANCELLED -> TelemedicineAppointmentStatus.REJECTED;
        };
    }

    public String buildRejectionNotes(String reason) {
        return reason == null ? "" : reason.trim();
    }

    public String buildRescheduleNotes(String reason) {
        String normalizedReason = reason == null ? "" : reason.trim();
        if (normalizedReason.isBlank()) {
            return RESCHEDULE_PREFIX;
        }
        return RESCHEDULE_PREFIX + " " + normalizedReason;
    }

    private String extractRescheduleReason(String notes) {
        if (!StringUtils.hasText(notes)) {
            return null;
        }

        String trimmed = notes.trim();
        if (!hasRescheduleMarker(trimmed)) {
            return null;
        }

        if (trimmed.length() == RESCHEDULE_PREFIX.length()) {
            return "Rescheduled by doctor";
        }

        String reason = trimmed.substring(RESCHEDULE_PREFIX.length()).trim();
        return reason.isBlank() ? "Rescheduled by doctor" : reason;
    }

    private boolean hasRescheduleMarker(String notes) {
        if (!StringUtils.hasText(notes)) {
            return false;
        }
        return normalize(notes).startsWith(RESCHEDULE_PREFIX);
    }

    private String normalize(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }
}
