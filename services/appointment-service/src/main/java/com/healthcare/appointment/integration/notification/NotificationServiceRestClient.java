package com.healthcare.appointment.integration.notification;

import com.healthcare.appointment.model.Appointment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.time.Instant;

@Service
public class NotificationServiceRestClient implements AppointmentNotificationClient {

    private static final Logger log = LoggerFactory.getLogger(NotificationServiceRestClient.class);
    private static final String SOURCE_SERVICE = "appointment-service";
    private static final String SERVICE_TOKEN_HEADER = "X-Service-Token";
    private static final String PATH_APPOINTMENT_ACTIVITY = "/internal/events/appointment-activity";

    private final RestClient restClient;
    private final AppointmentNotificationProperties properties;

    public NotificationServiceRestClient(
            RestClient.Builder restClientBuilder,
            AppointmentNotificationProperties properties) {
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
    public void notifyRequested(Appointment appointment, String actorUserId, String actorRole) {
        publishActivity(appointment, AppointmentActivityType.APPOINTMENT_REQUESTED, actorUserId, actorRole);
    }

    @Override
    public void notifyRescheduled(Appointment appointment, Instant previousScheduledAt, String actorUserId, String actorRole) {
        publishActivity(appointment, AppointmentActivityType.APPOINTMENT_RESCHEDULED, actorUserId, actorRole);
    }

    @Override
    public void notifyConfirmed(Appointment appointment, String actorUserId, String actorRole) {
        publishActivity(appointment, AppointmentActivityType.APPOINTMENT_CONFIRMED, actorUserId, actorRole);
    }

    @Override
    public void notifyCancelled(Appointment appointment, String actorUserId, String actorRole, String cancellationReason) {
        publishActivity(appointment, AppointmentActivityType.APPOINTMENT_CANCELLED, actorUserId, actorRole);
    }

    @Override
    public void notifyCompleted(Appointment appointment, String actorUserId, String actorRole) {
        publishActivity(appointment, AppointmentActivityType.APPOINTMENT_COMPLETED, actorUserId, actorRole);
    }

    private void publishActivity(
            Appointment appointment,
            AppointmentActivityType eventType,
            String actorUserId,
            String actorRole) {
        if (!isEnabledWithToken() || appointment == null || !StringUtils.hasText(appointment.getId())) {
            return;
        }

        Instant occurredAt = appointment.getUpdatedAt() != null ? appointment.getUpdatedAt() : Instant.now();
        String eventId = "apt-%s-%s-%d".formatted(
                appointment.getId(),
                eventType.name().toLowerCase(),
                occurredAt.toEpochMilli());

        AppointmentActivityEventRequest request = new AppointmentActivityEventRequest(
                eventId,
                eventType.name(),
                occurredAt,
                appointment.getId(),
                SOURCE_SERVICE,
                appointment.getPatientId(),
                appointment.getPatientName(),
                appointment.getDoctorId(),
                appointment.getDoctorName(),
                appointment.getReason(),
                appointment.getScheduledAt(),
                defaultText(actorUserId, ""),
                defaultText(actorRole, ""));

        try {
            restClient.post()
                    .uri(PATH_APPOINTMENT_ACTIVITY)
                    .header(SERVICE_TOKEN_HEADER, properties.getInternalToken())
                    .body(request)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ex) {
            log.warn("Appointment notification request failed for eventType={} appointmentId={}: {}",
                    eventType, appointment.getId(), ex.getMessage());
        }
    }

    private boolean isEnabledWithToken() {
        return properties.isEnabled() && StringUtils.hasText(properties.getInternalToken());
    }

    private static String removeTrailingSlash(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private static String defaultText(String value, String fallback) {
        if (!StringUtils.hasText(value)) {
            return fallback;
        }
        return value.trim();
    }

    private enum AppointmentActivityType {
        APPOINTMENT_REQUESTED,
        APPOINTMENT_CONFIRMED,
        APPOINTMENT_RESCHEDULED,
        APPOINTMENT_CANCELLED,
        APPOINTMENT_COMPLETED
    }
}
