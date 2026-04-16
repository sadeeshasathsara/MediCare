package com.healthcare.notification.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.healthcare.notification.config.NotificationProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Locale;

@Service
public class RecipientProfileLookupService {

    private final RestClient restClient;
    private final NotificationProperties properties;

    public RecipientProfileLookupService(RestClient.Builder restClientBuilder, NotificationProperties properties) {
        this.properties = properties;

        int timeoutMs = Math.max(1_000, properties.getProfileLookup().getTimeoutMs());
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(timeoutMs);
        requestFactory.setReadTimeout(timeoutMs);
        this.restClient = restClientBuilder.requestFactory(requestFactory).build();
    }

    public ResolvedRecipient resolvePatient(String userId) {
        String safeUserId = requireUserId(userId);
        try {
            String baseUrl = removeTrailingSlash(properties.getProfileLookup().getPatientServiceBaseUrl());
            PatientProfileResponse response = restClient.get()
                    .uri(baseUrl + "/patients/{userId}", safeUserId)
                    .headers(this::applyInternalHeaders)
                    .retrieve()
                    .body(PatientProfileResponse.class);

            if (response == null) {
                throw new IllegalStateException("Patient profile response was empty");
            }

            String phone = response.contact() == null ? null : normalizePhone(response.contact().phone());
            return new ResolvedRecipient(
                    safeUserId,
                    defaultText(response.name(), "Patient"),
                    normalizeEmail(response.email()),
                    phone);
        } catch (RestClientException ex) {
            throw new IllegalStateException("Failed to fetch patient profile for userId=" + safeUserId, ex);
        }
    }

    public ResolvedRecipient resolveDoctor(String userId) {
        String safeUserId = requireUserId(userId);
        try {
            String baseUrl = removeTrailingSlash(properties.getProfileLookup().getDoctorServiceBaseUrl());
            DoctorProfileResponse response = restClient.get()
                    .uri(baseUrl + "/doctors/{userId}", safeUserId)
                    .headers(this::applyInternalHeaders)
                    .retrieve()
                    .body(DoctorProfileResponse.class);

            if (response == null) {
                throw new IllegalStateException("Doctor profile response was empty");
            }

            return new ResolvedRecipient(
                    safeUserId,
                    defaultText(response.fullName(), "Doctor"),
                    normalizeEmail(response.email()),
                    normalizePhone(response.phone()));
        } catch (RestClientException ex) {
            throw new IllegalStateException("Failed to fetch doctor profile for userId=" + safeUserId, ex);
        }
    }

    private void applyInternalHeaders(HttpHeaders headers) {
        headers.set("X-User-Id", properties.getProfileLookup().getActorUserId());
        headers.set("X-User-Role", properties.getProfileLookup().getActorRole());
    }

    private static String requireUserId(String userId) {
        if (!StringUtils.hasText(userId)) {
            throw new IllegalArgumentException("userId is required");
        }
        return userId.trim();
    }

    private static String removeTrailingSlash(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private static String normalizePhone(String phone) {
        return phone == null ? null : phone.trim();
    }

    private static String defaultText(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim();
    }

    public record ResolvedRecipient(
            String userId,
            String name,
            String email,
            String phone) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record PatientProfileResponse(
            String userId,
            String email,
            String name,
            Contact contact) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Contact(String phone) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record DoctorProfileResponse(
            String id,
            String userId,
            String fullName,
            String email,
            String phone) {
    }
}
