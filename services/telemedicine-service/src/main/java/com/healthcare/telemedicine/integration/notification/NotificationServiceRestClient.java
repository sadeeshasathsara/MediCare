package com.healthcare.telemedicine.integration.notification;

import com.healthcare.telemedicine.dto.appointment.TelemedicineAppointmentResponse;
import com.healthcare.telemedicine.dto.appointment.TelemedicineAppointmentStatus;
import com.healthcare.telemedicine.model.ConsultationSession;
import com.healthcare.telemedicine.model.Prescription;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.time.Instant;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class NotificationServiceRestClient implements TelemedicineNotificationClient {

    private static final String SOURCE_SERVICE = "telemedicine-service";
    private static final String SERVICE_TOKEN_HEADER = "X-Service-Token";

    private static final String PATH_APPOINTMENT_STATUS = "/internal/events/telemedicine/appointment-status";
    private static final String PATH_CONSULTATION_COMPLETED = "/internal/events/telemedicine/consultation-completed";
    private static final String PATH_PRESCRIPTION_ISSUED = "/internal/events/telemedicine/prescription-issued";

    private final RestClient restClient;
    private final TelemedicineNotificationProperties properties;

    public NotificationServiceRestClient(
            RestClient.Builder restClientBuilder,
            TelemedicineNotificationProperties properties) {
        this.properties = properties;

        int timeoutMs = Math.max(1_000, properties.getTimeoutMs());
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(timeoutMs);
        requestFactory.setReadTimeout(timeoutMs);

        this.restClient = restClientBuilder
                .baseUrl(removeTrailingSlash(properties.getBaseUrl()))
                .requestFactory(requestFactory)
                .build();
    }

    @Override
    public void notifyAppointmentStatus(TelemedicineAppointmentResponse appointment) {
        if (!isEnabledWithToken() || appointment == null || !StringUtils.hasText(appointment.getId())) {
            return;
        }

        TelemedicineAppointmentDecisionStatus decisionStatus = mapDecisionStatus(appointment.getStatus());
        if (decisionStatus == null) {
            return;
        }

        Instant occurredAt = appointment.getUpdatedAt() != null ? appointment.getUpdatedAt() : Instant.now();
        String eventId = "tm-appt-%s-%s-%d".formatted(
                appointment.getId(),
                decisionStatus.name(),
                occurredAt.toEpochMilli());

        TelemedicineAppointmentStatusEventRequest request = new TelemedicineAppointmentStatusEventRequest(
                eventId,
                occurredAt,
                appointment.getId(),
                SOURCE_SERVICE,
                appointment.getPatientId(),
                appointment.getDoctorId(),
                decisionStatus,
                appointment.getScheduledAt(),
                appointment.getProposedScheduledAt(),
                appointment.getRejectionReason(),
                appointment.getRescheduleReason());

        post(PATH_APPOINTMENT_STATUS, request);
    }

    @Override
    public void notifyConsultationCompleted(ConsultationSession session) {
        if (!isEnabledWithToken() || session == null || !StringUtils.hasText(session.getId())) {
            return;
        }

        Instant occurredAt = session.getEndedAt() != null ? session.getEndedAt() : Instant.now();
        String eventId = "tm-session-%s-completed-%d".formatted(
                session.getId(),
                occurredAt.toEpochMilli());

        TelemedicineConsultationCompletedEventRequest request = new TelemedicineConsultationCompletedEventRequest(
                eventId,
                occurredAt,
                session.getAppointmentId(),
                SOURCE_SERVICE,
                session.getId(),
                session.getPatientId(),
                session.getDoctorId(),
                occurredAt,
                session.getDurationSeconds());

        post(PATH_CONSULTATION_COMPLETED, request);
    }

    @Override
    public void notifyPrescriptionIssued(Prescription prescription, String appointmentId) {
        if (!isEnabledWithToken()
                || prescription == null
                || !StringUtils.hasText(prescription.getId())
                || !StringUtils.hasText(appointmentId)) {
            return;
        }

        Instant issuedAt = prescription.getIssuedAt() != null ? prescription.getIssuedAt() : Instant.now();
        String eventId = "tm-rx-%s-issued-%d".formatted(
                prescription.getId(),
                issuedAt.toEpochMilli());

        TelemedicinePrescriptionIssuedEventRequest request = new TelemedicinePrescriptionIssuedEventRequest(
                eventId,
                issuedAt,
                appointmentId,
                SOURCE_SERVICE,
                prescription.getId(),
                prescription.getConsultationId(),
                prescription.getPatientId(),
                prescription.getDoctorId(),
                issuedAt,
                prescription.getExpiresAt());

        post(PATH_PRESCRIPTION_ISSUED, request);
    }

    private void post(String path, Object payload) {
        try {
            restClient.post()
                    .uri(path)
                    .header(SERVICE_TOKEN_HEADER, properties.getInternalToken())
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ex) {
            // Notification integration is intentionally best-effort and non-blocking.
            log.warn("Telemedicine notification request failed for path={}: {}", path, ex.getMessage());
        }
    }

    private boolean isEnabledWithToken() {
        return properties.isEnabled() && StringUtils.hasText(properties.getInternalToken());
    }

    private static TelemedicineAppointmentDecisionStatus mapDecisionStatus(TelemedicineAppointmentStatus status) {
        if (status == null) {
            return null;
        }
        return switch (status) {
            case ACCEPTED -> TelemedicineAppointmentDecisionStatus.ACCEPTED;
            case REJECTED -> TelemedicineAppointmentDecisionStatus.REJECTED;
            case RESCHEDULED -> TelemedicineAppointmentDecisionStatus.RESCHEDULED;
            case PENDING, COMPLETED -> null;
        };
    }

    private static String removeTrailingSlash(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
