package com.healthcare.telemedicine.integration.appointment;

import java.time.Instant;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthcare.telemedicine.exception.ApiException;
import com.healthcare.telemedicine.exception.BadRequestException;
import com.healthcare.telemedicine.exception.ConflictException;
import com.healthcare.telemedicine.exception.ForbiddenException;
import com.healthcare.telemedicine.exception.NotFoundException;

@Component
public class AppointmentGatewayRestClient implements AppointmentGateway {

    private static final ParameterizedTypeReference<List<ExternalAppointment>> LIST_TYPE =
            new ParameterizedTypeReference<>() {
            };

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public AppointmentGatewayRestClient(
            RestClient.Builder restClientBuilder,
            ObjectMapper objectMapper,
            @Value("${telemedicine.appointment-service.base-url:http://appointment-service:3004}") String baseUrl) {
        this.restClient = restClientBuilder.baseUrl(removeTrailingSlash(baseUrl)).build();
        this.objectMapper = objectMapper;
    }

    @Override
    public List<ExternalAppointment> listByDoctorId(String doctorId, String actorId, String actorRole) {
        try {
            List<ExternalAppointment> appointments = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/appointments")
                            .queryParam("doctorId", doctorId)
                            .build())
                    .headers(headers -> applyActorHeaders(headers, actorId, actorRole))
                    .retrieve()
                    .body(LIST_TYPE);
            return appointments == null ? List.of() : appointments;
        } catch (RestClientResponseException ex) {
            throw translate(ex, "Unable to fetch doctor appointments from appointment-service.");
        } catch (RestClientException ex) {
            throw unavailable("Unable to reach appointment-service for doctor appointments.");
        }
    }

    @Override
    public List<ExternalAppointment> listByPatientId(String patientId, String actorId, String actorRole) {
        try {
            List<ExternalAppointment> appointments = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/appointments")
                            .queryParam("patientId", patientId)
                            .build())
                    .headers(headers -> applyActorHeaders(headers, actorId, actorRole))
                    .retrieve()
                    .body(LIST_TYPE);
            return appointments == null ? List.of() : appointments;
        } catch (RestClientResponseException ex) {
            throw translate(ex, "Unable to fetch patient appointments from appointment-service.");
        } catch (RestClientException ex) {
            throw unavailable("Unable to reach appointment-service for patient appointments.");
        }
    }

    @Override
    public ExternalAppointment getById(String appointmentId, String actorId, String actorRole) {
        try {
            return restClient.get()
                    .uri("/appointments/{id}", appointmentId)
                    .headers(headers -> applyActorHeaders(headers, actorId, actorRole))
                    .retrieve()
                    .body(ExternalAppointment.class);
        } catch (RestClientResponseException ex) {
            throw translate(ex, "Unable to load appointment details from appointment-service.");
        } catch (RestClientException ex) {
            throw unavailable("Unable to reach appointment-service for appointment details.");
        }
    }

    @Override
    public ExternalAppointment updateStatus(
            String appointmentId,
            ExternalAppointmentStatus status,
            String notes,
            String actorId,
            String actorRole) {
        try {
            return restClient.patch()
                    .uri("/appointments/{id}/status", appointmentId)
                    .headers(headers -> applyActorHeaders(headers, actorId, actorRole))
                    .body(new ExternalAppointmentStatusUpdateRequest(status, notes))
                    .retrieve()
                    .body(ExternalAppointment.class);
        } catch (RestClientResponseException ex) {
            throw translate(ex, "Unable to update appointment status in appointment-service.");
        } catch (RestClientException ex) {
            throw unavailable("Unable to reach appointment-service for status updates.");
        }
    }

    @Override
    public ExternalAppointment reschedule(
            String appointmentId,
            Instant scheduledAt,
            String actorId,
            String actorRole) {
        try {
            return restClient.put()
                    .uri("/appointments/{id}", appointmentId)
                    .headers(headers -> applyActorHeaders(headers, actorId, actorRole))
                    .body(new ExternalAppointmentRescheduleRequest(scheduledAt))
                    .retrieve()
                    .body(ExternalAppointment.class);
        } catch (RestClientResponseException ex) {
            throw translate(ex, "Unable to reschedule appointment in appointment-service.");
        } catch (RestClientException ex) {
            throw unavailable("Unable to reach appointment-service for rescheduling.");
        }
    }

    private void applyActorHeaders(HttpHeaders headers, String actorId, String actorRole) {
        headers.set("X-User-Id", actorId);
        headers.set("X-User-Role", actorRole);
    }

    private RuntimeException translate(RestClientResponseException ex, String fallbackMessage) {
        String message = extractMessage(ex.getResponseBodyAsString(), fallbackMessage);
        int rawStatus = ex.getStatusCode().value();

        if (rawStatus == HttpStatus.NOT_FOUND.value()) {
            return new NotFoundException(message);
        }
        if (rawStatus == HttpStatus.FORBIDDEN.value()) {
            return new ForbiddenException(message);
        }
        if (rawStatus == HttpStatus.BAD_REQUEST.value()) {
            return new BadRequestException(message);
        }
        if (rawStatus == HttpStatus.CONFLICT.value()) {
            return new ConflictException(message);
        }

        return unavailable(message);
    }

    private ApiException unavailable(String message) {
        return new ApiException(HttpStatus.BAD_GATEWAY, message);
    }

    private String extractMessage(String responseBody, String fallback) {
        if (!StringUtils.hasText(responseBody)) {
            return fallback;
        }

        try {
            JsonNode root = objectMapper.readTree(responseBody);
            if (root.hasNonNull("reason")) {
                String reason = root.get("reason").asText();
                if (StringUtils.hasText(reason)) {
                    return reason;
                }
            }
            if (root.hasNonNull("message")) {
                String message = root.get("message").asText();
                if (StringUtils.hasText(message)) {
                    return message;
                }
            }
            if (root.hasNonNull("error")) {
                String message = root.get("error").asText();
                if (StringUtils.hasText(message)) {
                    return message;
                }
            }
        } catch (Exception ignored) {
            // Fall through to fallback parsing below.
        }

        String trimmed = responseBody.trim();
        return trimmed.isEmpty() ? fallback : trimmed;
    }

    private String removeTrailingSlash(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
