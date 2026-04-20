package com.healthcare.notification.service;

import com.healthcare.notification.config.NotificationProperties;
import com.healthcare.notification.dto.internal.TelemedicineAppointmentDecisionStatus;
import com.healthcare.notification.dto.internal.TelemedicineAppointmentStatusEventRequest;
import com.healthcare.notification.dto.internal.TelemedicineConsultationCompletedEventRequest;
import com.healthcare.notification.dto.internal.TelemedicinePrescriptionIssuedEventRequest;
import com.healthcare.notification.dto.internal.TriggerAcceptedResponse;
import com.healthcare.notification.model.NotificationChannel;
import com.healthcare.notification.model.NotificationDelivery;
import com.healthcare.notification.model.NotificationEventType;
import com.healthcare.notification.model.NotificationStatus;
import com.healthcare.notification.model.SmsNotificationType;
import com.healthcare.notification.repository.NotificationDeliveryRepository;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class TelemedicineNotificationEventService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter
            .ofPattern("yyyy-MM-dd HH:mm 'UTC'")
            .withZone(ZoneOffset.UTC);

    private static final String TEMPLATE_APPOINTMENT_ACCEPTED = "telemedicine-appointment-accepted";
    private static final String TEMPLATE_APPOINTMENT_REJECTED = "telemedicine-appointment-rejected";
    private static final String TEMPLATE_APPOINTMENT_RESCHEDULED = "telemedicine-appointment-rescheduled";
    private static final String TEMPLATE_CONSULTATION_COMPLETED = "telemedicine-consultation-completed";
    private static final String TEMPLATE_PRESCRIPTION_ISSUED = "telemedicine-prescription-issued";
    private static final String TEMPLATE_SMS_TELEMEDICINE_UPDATE = "telemedicine-update";
    private static final Pattern E164_PATTERN = Pattern.compile("^\\+?[1-9]\\d{7,14}$");

    private final NotificationDeliveryRepository repository;
    private final NotificationProperties properties;
    private final RecipientProfileLookupService recipientProfileLookupService;

    public TelemedicineNotificationEventService(
            NotificationDeliveryRepository repository,
            NotificationProperties properties,
            RecipientProfileLookupService recipientProfileLookupService) {
        this.repository = repository;
        this.properties = properties;
        this.recipientProfileLookupService = recipientProfileLookupService;
    }

    public TriggerAcceptedResponse handleAppointmentStatus(TelemedicineAppointmentStatusEventRequest request) {
        NotificationEventType eventType = mapAppointmentEventType(request.decisionStatus());
        String subject = switch (request.decisionStatus()) {
            case ACCEPTED -> "Telemedicine appointment accepted - " + request.appointmentId();
            case REJECTED -> "Telemedicine appointment rejected - " + request.appointmentId();
            case RESCHEDULED -> "Telemedicine appointment rescheduled - " + request.appointmentId();
        };
        String templateName = switch (request.decisionStatus()) {
            case ACCEPTED -> TEMPLATE_APPOINTMENT_ACCEPTED;
            case REJECTED -> TEMPLATE_APPOINTMENT_REJECTED;
            case RESCHEDULED -> TEMPLATE_APPOINTMENT_RESCHEDULED;
        };
        Instant scheduledAt = Instant.now();

        RecipientContext patient = resolvePatientRecipient(request.patientUserId(), request.patientName());
        RecipientContext doctor = resolveDoctorRecipient(request.doctorUserId(), request.doctorName());

        Map<String, Object> patientData = createCommonTemplateData(
                request.eventId(),
                request.appointmentId(),
                request.occurredAt(),
                request.sourceService(),
                patient.displayName(),
                doctor.displayName(),
                "Doctor");
        augmentAppointmentStatusTemplateData(patientData, request);

        Map<String, Object> doctorData = createCommonTemplateData(
                request.eventId(),
                request.appointmentId(),
                request.occurredAt(),
                request.sourceService(),
                doctor.displayName(),
                patient.displayName(),
                "Patient");
        augmentAppointmentStatusTemplateData(doctorData, request);

        String appointmentReason = defaultText(request.appointmentReason(), "General consultation");
        String patientSummary = switch (request.decisionStatus()) {
            case ACCEPTED -> "Telemedicine appointment " + request.appointmentId()
                    + " accepted by " + doctor.displayName() + ". Reason: " + appointmentReason + ".";
            case REJECTED -> "Telemedicine appointment " + request.appointmentId()
                    + " rejected. Reason: " + defaultText(request.rejectionReason(), "N/A")
                    + ". Visit reason: " + appointmentReason + ".";
            case RESCHEDULED -> "Telemedicine appointment " + request.appointmentId()
                    + " rescheduled. Proposed time: " + formatInstant(request.proposedScheduledAt())
                    + ". Visit reason: " + appointmentReason + ".";
        };
        String doctorSummary = switch (request.decisionStatus()) {
            case ACCEPTED -> "You accepted telemedicine appointment " + request.appointmentId()
                    + " with " + patient.displayName() + ". Reason: " + appointmentReason + ".";
            case REJECTED -> "You rejected telemedicine appointment " + request.appointmentId()
                    + " with " + patient.displayName() + ". Reason: " + appointmentReason + ".";
            case RESCHEDULED -> "You rescheduled telemedicine appointment " + request.appointmentId()
                    + " with " + patient.displayName() + ". Reason: " + appointmentReason + ".";
        };
        patientData.put("smsMessage", patientSummary);
        doctorData.put("smsMessage", doctorSummary);

        DeliveryCount counts = DeliveryCount.zero();
        counts = counts.add(persistInAppForRecipient(
                eventType,
                request.eventId(),
                request.appointmentId(),
                request.sourceService(),
                request.occurredAt(),
                patient,
                "PATIENT",
                subject,
                patientData,
                patientSummary));

        counts = counts.add(persistInAppForRecipient(
                eventType,
                request.eventId(),
                request.appointmentId(),
                request.sourceService(),
                request.occurredAt(),
                doctor,
                "DOCTOR",
                subject,
                doctorData,
                doctorSummary));

        counts = counts.add(persistEmailForRecipient(
                eventType,
                request.eventId(),
                request.appointmentId(),
                request.sourceService(),
                request.occurredAt(),
                patient,
                "PATIENT",
                subject,
                templateName,
                patientData,
                patientSummary,
                scheduledAt));

        counts = counts.add(persistEmailForRecipient(
                eventType,
                request.eventId(),
                request.appointmentId(),
                request.sourceService(),
                request.occurredAt(),
                doctor,
                "DOCTOR",
                subject,
                templateName,
                doctorData,
                doctorSummary,
                scheduledAt));

        if (properties.getSms().isEnabled()) {
            counts = counts.add(persistSmsForRecipient(
                    eventType,
                    request.eventId(),
                    request.appointmentId(),
                    request.sourceService(),
                    request.occurredAt(),
                    patient,
                    "PATIENT",
                    "Telemedicine update SMS",
                    TEMPLATE_SMS_TELEMEDICINE_UPDATE,
                    patientData,
                    patientSummary,
                    SmsNotificationType.BOOKING_CONFIRMATION,
                    scheduledAt));

            counts = counts.add(persistSmsForRecipient(
                    eventType,
                    request.eventId(),
                    request.appointmentId(),
                    request.sourceService(),
                    request.occurredAt(),
                    doctor,
                    "DOCTOR",
                    "Telemedicine update SMS",
                    TEMPLATE_SMS_TELEMEDICINE_UPDATE,
                    doctorData,
                    doctorSummary,
                    SmsNotificationType.BOOKING_CONFIRMATION,
                    scheduledAt));
        }

        return new TriggerAcceptedResponse(request.eventId(), eventType, counts.accepted(), counts.duplicates());
    }

    public TriggerAcceptedResponse handleConsultationCompleted(TelemedicineConsultationCompletedEventRequest request) {
        NotificationEventType eventType = NotificationEventType.TELEMEDICINE_CONSULTATION_COMPLETED;
        String subject = "Telemedicine consultation completed - " + request.appointmentId();
        Instant scheduledAt = Instant.now();

        RecipientContext patient = resolvePatientRecipient(request.patientUserId(), request.patientName());
        RecipientContext doctor = resolveDoctorRecipient(request.doctorUserId(), request.doctorName());

        Map<String, Object> patientData = createCommonTemplateData(
                request.eventId(),
                request.appointmentId(),
                request.occurredAt(),
                request.sourceService(),
                patient.displayName(),
                doctor.displayName(),
                "Doctor");
        augmentConsultationTemplateData(patientData, request);

        Map<String, Object> doctorData = createCommonTemplateData(
                request.eventId(),
                request.appointmentId(),
                request.occurredAt(),
                request.sourceService(),
                doctor.displayName(),
                patient.displayName(),
                "Patient");
        augmentConsultationTemplateData(doctorData, request);

        String appointmentReason = defaultText(request.appointmentReason(), "General consultation");
        String patientSummary = "Telemedicine consultation completed for appointment " + request.appointmentId()
                + ". Session ID: " + request.sessionId() + ". Reason: " + appointmentReason + ".";
        String doctorSummary = "Telemedicine consultation completed for appointment " + request.appointmentId()
                + " with " + patient.displayName() + ". Reason: " + appointmentReason + ".";
        patientData.put("smsMessage", patientSummary);
        doctorData.put("smsMessage", doctorSummary);

        DeliveryCount counts = DeliveryCount.zero();
        counts = counts.add(persistInAppForRecipient(
                eventType,
                request.eventId(),
                request.appointmentId(),
                request.sourceService(),
                request.occurredAt(),
                patient,
                "PATIENT",
                subject,
                patientData,
                patientSummary));

        counts = counts.add(persistInAppForRecipient(
                eventType,
                request.eventId(),
                request.appointmentId(),
                request.sourceService(),
                request.occurredAt(),
                doctor,
                "DOCTOR",
                subject,
                doctorData,
                doctorSummary));

        counts = counts.add(persistEmailForRecipient(
                eventType,
                request.eventId(),
                request.appointmentId(),
                request.sourceService(),
                request.occurredAt(),
                patient,
                "PATIENT",
                subject,
                TEMPLATE_CONSULTATION_COMPLETED,
                patientData,
                patientSummary,
                scheduledAt));

        counts = counts.add(persistEmailForRecipient(
                eventType,
                request.eventId(),
                request.appointmentId(),
                request.sourceService(),
                request.occurredAt(),
                doctor,
                "DOCTOR",
                subject,
                TEMPLATE_CONSULTATION_COMPLETED,
                doctorData,
                doctorSummary,
                scheduledAt));

        if (properties.getSms().isEnabled()) {
            counts = counts.add(persistSmsForRecipient(
                    eventType,
                    request.eventId(),
                    request.appointmentId(),
                    request.sourceService(),
                    request.occurredAt(),
                    patient,
                    "PATIENT",
                    "Telemedicine update SMS",
                    TEMPLATE_SMS_TELEMEDICINE_UPDATE,
                    patientData,
                    patientSummary,
                    SmsNotificationType.BOOKING_CONFIRMATION,
                    scheduledAt));

            counts = counts.add(persistSmsForRecipient(
                    eventType,
                    request.eventId(),
                    request.appointmentId(),
                    request.sourceService(),
                    request.occurredAt(),
                    doctor,
                    "DOCTOR",
                    "Telemedicine update SMS",
                    TEMPLATE_SMS_TELEMEDICINE_UPDATE,
                    doctorData,
                    doctorSummary,
                    SmsNotificationType.BOOKING_CONFIRMATION,
                    scheduledAt));
        }

        return new TriggerAcceptedResponse(request.eventId(), eventType, counts.accepted(), counts.duplicates());
    }

    public TriggerAcceptedResponse handlePrescriptionIssued(TelemedicinePrescriptionIssuedEventRequest request) {
        NotificationEventType eventType = NotificationEventType.TELEMEDICINE_PRESCRIPTION_ISSUED;
        String subject = "Telemedicine prescription issued - " + request.appointmentId();
        Instant scheduledAt = Instant.now();

        RecipientContext patient = resolvePatientRecipient(request.patientUserId(), request.patientName());
        RecipientContext doctor = resolveDoctorRecipient(request.doctorUserId(), request.doctorName());

        Map<String, Object> patientData = createCommonTemplateData(
                request.eventId(),
                request.appointmentId(),
                request.occurredAt(),
                request.sourceService(),
                patient.displayName(),
                doctor.displayName(),
                "Doctor");
        augmentPrescriptionTemplateData(patientData, request);

        Map<String, Object> doctorData = createCommonTemplateData(
                request.eventId(),
                request.appointmentId(),
                request.occurredAt(),
                request.sourceService(),
                doctor.displayName(),
                patient.displayName(),
                "Patient");
        augmentPrescriptionTemplateData(doctorData, request);

        String appointmentReason = defaultText(request.appointmentReason(), "General consultation");
        String patientSummary = "A telemedicine prescription was issued for appointment "
                + request.appointmentId() + ". Reason: " + appointmentReason + ".";
        String doctorSummary = "You issued a telemedicine prescription for appointment "
                + request.appointmentId() + ". Reason: " + appointmentReason + ".";
        patientData.put("smsMessage", patientSummary);
        doctorData.put("smsMessage", doctorSummary);

        DeliveryCount counts = DeliveryCount.zero();
        counts = counts.add(persistInAppForRecipient(
                eventType,
                request.eventId(),
                request.appointmentId(),
                request.sourceService(),
                request.occurredAt(),
                patient,
                "PATIENT",
                subject,
                patientData,
                patientSummary));

        counts = counts.add(persistInAppForRecipient(
                eventType,
                request.eventId(),
                request.appointmentId(),
                request.sourceService(),
                request.occurredAt(),
                doctor,
                "DOCTOR",
                subject,
                doctorData,
                doctorSummary));

        counts = counts.add(persistEmailForRecipient(
                eventType,
                request.eventId(),
                request.appointmentId(),
                request.sourceService(),
                request.occurredAt(),
                patient,
                "PATIENT",
                subject,
                TEMPLATE_PRESCRIPTION_ISSUED,
                patientData,
                patientSummary,
                scheduledAt));

        counts = counts.add(persistEmailForRecipient(
                eventType,
                request.eventId(),
                request.appointmentId(),
                request.sourceService(),
                request.occurredAt(),
                doctor,
                "DOCTOR",
                subject,
                TEMPLATE_PRESCRIPTION_ISSUED,
                doctorData,
                doctorSummary,
                scheduledAt));

        if (properties.getSms().isEnabled()) {
            counts = counts.add(persistSmsForRecipient(
                    eventType,
                    request.eventId(),
                    request.appointmentId(),
                    request.sourceService(),
                    request.occurredAt(),
                    patient,
                    "PATIENT",
                    "Telemedicine update SMS",
                    TEMPLATE_SMS_TELEMEDICINE_UPDATE,
                    patientData,
                    patientSummary,
                    SmsNotificationType.BOOKING_CONFIRMATION,
                    scheduledAt));

            counts = counts.add(persistSmsForRecipient(
                    eventType,
                    request.eventId(),
                    request.appointmentId(),
                    request.sourceService(),
                    request.occurredAt(),
                    doctor,
                    "DOCTOR",
                    "Telemedicine update SMS",
                    TEMPLATE_SMS_TELEMEDICINE_UPDATE,
                    doctorData,
                    doctorSummary,
                    SmsNotificationType.BOOKING_CONFIRMATION,
                    scheduledAt));
        }

        return new TriggerAcceptedResponse(request.eventId(), eventType, counts.accepted(), counts.duplicates());
    }

    private DeliveryCount persistEmailForRecipient(
            NotificationEventType eventType,
            String eventId,
            String appointmentId,
            String sourceService,
            Instant occurredAt,
            RecipientContext recipient,
            String recipientRole,
            String subject,
            String templateName,
            Map<String, Object> templateData,
            String summary,
            Instant scheduledAt) {

        if (recipient.errorMessage() != null) {
            return persistFailedEmail(
                    eventType,
                    eventId,
                    appointmentId,
                    sourceService,
                    occurredAt,
                    recipient,
                    recipientRole,
                    subject,
                    templateName,
                    templateData,
                    summary,
                    recipient.errorMessage());
        }

        if (!hasText(recipient.email())) {
            return persistFailedEmail(
                    eventType,
                    eventId,
                    appointmentId,
                    sourceService,
                    occurredAt,
                    recipient,
                    recipientRole,
                    subject,
                    templateName,
                    templateData,
                    summary,
                    "Recipient email is missing for userId=" + recipient.userId());
        }

        NotificationDelivery delivery = baseDelivery(
                eventType,
                eventId,
                appointmentId,
                sourceService,
                occurredAt,
                recipient.userId(),
                recipient.displayName(),
                recipientRole,
                subject,
                templateName,
                templateData,
                summary,
                scheduledAt);

        delivery.setChannel(NotificationChannel.EMAIL);
        delivery.setRecipientEmail(normalizeEmail(recipient.email()));
        delivery.setRecipientPhone(normalizePhone(recipient.phone()));
        delivery.setSmsType(null);

        return persistDelivery(delivery);
    }

    private DeliveryCount persistSmsForRecipient(
            NotificationEventType eventType,
            String eventId,
            String appointmentId,
            String sourceService,
            Instant occurredAt,
            RecipientContext recipient,
            String recipientRole,
            String subject,
            String templateName,
            Map<String, Object> templateData,
            String summary,
            SmsNotificationType smsType,
            Instant scheduledAt) {

        if (!isPhoneValid(recipient.phone())) {
            return DeliveryCount.zero();
        }

        NotificationDelivery delivery = baseDelivery(
                eventType,
                eventId,
                appointmentId,
                sourceService,
                occurredAt,
                recipient.userId(),
                recipient.displayName(),
                recipientRole,
                subject,
                templateName,
                templateData,
                summary,
                scheduledAt);

        delivery.setChannel(NotificationChannel.SMS);
        delivery.setRecipientEmail(normalizeEmail(recipient.email()));
        delivery.setRecipientPhone(normalizePhone(recipient.phone()));
        delivery.setSmsType(smsType);

        return persistDelivery(delivery);
    }

    private DeliveryCount persistInAppForRecipient(
            NotificationEventType eventType,
            String eventId,
            String appointmentId,
            String sourceService,
            Instant occurredAt,
            RecipientContext recipient,
            String recipientRole,
            String subject,
            Map<String, Object> templateData,
            String summary) {

        NotificationDelivery delivery = baseDelivery(
                eventType,
                eventId,
                appointmentId,
                sourceService,
                occurredAt,
                recipient.userId(),
                recipient.displayName(),
                recipientRole,
                subject,
                "in-app",
                templateData,
                summary,
                Instant.now());

        delivery.setChannel(NotificationChannel.IN_APP);
        delivery.setRecipientEmail(normalizeEmail(recipient.email()));
        delivery.setRecipientPhone(normalizePhone(recipient.phone()));
        delivery.setSmsType(null);
        delivery.setStatus(NotificationStatus.SENT);
        delivery.setAttemptCount(1);
        delivery.setNextAttemptAt(null);
        delivery.setSentAt(Instant.now());
        delivery.setReadAt(null);

        return persistDelivery(delivery);
    }

    private DeliveryCount persistFailedEmail(
            NotificationEventType eventType,
            String eventId,
            String appointmentId,
            String sourceService,
            Instant occurredAt,
            RecipientContext recipient,
            String recipientRole,
            String subject,
            String templateName,
            Map<String, Object> templateData,
            String summary,
            String failureReason) {

        NotificationDelivery failed = baseDelivery(
                eventType,
                eventId,
                appointmentId,
                sourceService,
                occurredAt,
                recipient.userId(),
                recipient.displayName(),
                recipientRole,
                subject,
                templateName,
                templateData,
                summary,
                Instant.now());

        failed.setChannel(NotificationChannel.EMAIL);
        failed.setRecipientEmail(normalizeEmail(recipient.email()));
        failed.setRecipientPhone(normalizePhone(recipient.phone()));
        failed.setSmsType(null);
        failed.setStatus(NotificationStatus.FAILED);
        failed.setAttemptCount(Math.max(1, properties.getWorker().getMaxAttempts()));
        failed.setNextAttemptAt(null);
        failed.setLastError(truncate(defaultText(failureReason, "Recipient resolution failed"), 500));
        failed.setSentAt(null);

        return persistDelivery(failed);
    }

    private NotificationDelivery baseDelivery(
            NotificationEventType eventType,
            String eventId,
            String appointmentId,
            String sourceService,
            Instant occurredAt,
            String recipientUserId,
            String recipientName,
            String recipientRole,
            String subject,
            String templateName,
            Map<String, Object> templateData,
            String summary,
            Instant scheduledAt) {

        Instant now = Instant.now();
        Instant initialAttemptAt = scheduledAt == null ? now : scheduledAt;

        NotificationDelivery delivery = new NotificationDelivery();
        delivery.setEventId(eventId);
        delivery.setEventType(eventType);
        delivery.setAppointmentId(appointmentId);
        delivery.setSourceService(sourceService);
        delivery.setOccurredAt(occurredAt);
        delivery.setRecipientUserId(recipientUserId);
        delivery.setRecipientName(recipientName);
        delivery.setRecipientRole(recipientRole);
        delivery.setSubject(subject);
        delivery.setTemplateName(templateName);
        delivery.setTemplateData(templateData);
        delivery.setSummary(summary);
        delivery.setContentText(null);
        delivery.setProviderMessageId(null);
        delivery.setScheduledAt(initialAttemptAt);
        delivery.setStatus(NotificationStatus.PENDING);
        delivery.setAttemptCount(0);
        delivery.setNextAttemptAt(initialAttemptAt);
        delivery.setLastError(null);
        delivery.setSentAt(null);
        delivery.setReadAt(now);
        delivery.setCreatedAt(now);
        delivery.setUpdatedAt(now);
        delivery.setExpireAt(now.plus(Duration.ofDays(Math.max(1, properties.getRetentionDays()))));
        return delivery;
    }

    private DeliveryCount persistDelivery(NotificationDelivery delivery) {
        try {
            repository.save(delivery);
            return DeliveryCount.oneAccepted();
        } catch (DuplicateKeyException ex) {
            return DeliveryCount.oneDuplicate();
        }
    }

    private RecipientContext resolvePatientRecipient(String userId, String preferredName) {
        String safeUserId = defaultText(userId, "");
        try {
            RecipientProfileLookupService.ResolvedRecipient resolved = recipientProfileLookupService.resolvePatient(safeUserId);
            return RecipientContext.success(
                    safeUserId,
                    resolved.name(),
                    resolved.email(),
                    resolved.phone(),
                    "Patient");
        } catch (Exception ex) {
            return RecipientContext.failure(
                    safeUserId,
                    defaultText(preferredName, "Patient"),
                    "Failed to resolve patient contact for userId=" + safeUserId + ": " + ex.getMessage());
        }
    }

    private RecipientContext resolveDoctorRecipient(String userId, String preferredName) {
        String safeUserId = defaultText(userId, "");
        try {
            RecipientProfileLookupService.ResolvedRecipient resolved = recipientProfileLookupService.resolveDoctor(safeUserId);
            return RecipientContext.success(
                    safeUserId,
                    resolved.name(),
                    resolved.email(),
                    resolved.phone(),
                    "Doctor");
        } catch (Exception ex) {
            return RecipientContext.failure(
                    safeUserId,
                    defaultText(preferredName, "Doctor"),
                    "Failed to resolve doctor contact for userId=" + safeUserId + ": " + ex.getMessage());
        }
    }

    private static NotificationEventType mapAppointmentEventType(TelemedicineAppointmentDecisionStatus decisionStatus) {
        return switch (decisionStatus) {
            case ACCEPTED -> NotificationEventType.TELEMEDICINE_APPOINTMENT_ACCEPTED;
            case REJECTED -> NotificationEventType.TELEMEDICINE_APPOINTMENT_REJECTED;
            case RESCHEDULED -> NotificationEventType.TELEMEDICINE_APPOINTMENT_RESCHEDULED;
        };
    }

    private static Map<String, Object> createCommonTemplateData(
            String eventId,
            String appointmentId,
            Instant occurredAt,
            String sourceService,
            String recipientName,
            String counterpartName,
            String counterpartRole) {

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("eventId", eventId);
        data.put("appointmentId", appointmentId);
        data.put("occurredAt", formatInstant(occurredAt));
        data.put("sourceService", sourceService);
        data.put("recipientName", recipientName);
        data.put("counterpartName", counterpartName);
        data.put("counterpartRole", counterpartRole);
        return data;
    }

    private static void augmentAppointmentStatusTemplateData(
            Map<String, Object> templateData,
            TelemedicineAppointmentStatusEventRequest request) {
        templateData.put("patientName", defaultText(request.patientName(), "Patient"));
        templateData.put("doctorName", defaultText(request.doctorName(), "Doctor"));
        templateData.put("appointmentReason", defaultText(request.appointmentReason(), "General consultation"));
        templateData.put("decisionStatus", request.decisionStatus().name());
        templateData.put("appointmentDateTime", formatInstant(request.scheduledAt()));
        templateData.put("proposedAppointmentDateTime", formatInstant(request.proposedScheduledAt()));
        templateData.put("rejectionReason", defaultText(request.rejectionReason(), "N/A"));
        templateData.put("rescheduleReason", defaultText(request.rescheduleReason(), "N/A"));
    }

    private static void augmentConsultationTemplateData(
            Map<String, Object> templateData,
            TelemedicineConsultationCompletedEventRequest request) {
        templateData.put("patientName", defaultText(request.patientName(), "Patient"));
        templateData.put("doctorName", defaultText(request.doctorName(), "Doctor"));
        templateData.put("appointmentReason", defaultText(request.appointmentReason(), "General consultation"));
        templateData.put("sessionId", request.sessionId());
        templateData.put("endedAt", formatInstant(request.endedAt()));
        templateData.put("durationSeconds", request.durationSeconds() == null ? 0 : request.durationSeconds());
    }

    private static void augmentPrescriptionTemplateData(
            Map<String, Object> templateData,
            TelemedicinePrescriptionIssuedEventRequest request) {
        templateData.put("patientName", defaultText(request.patientName(), "Patient"));
        templateData.put("doctorName", defaultText(request.doctorName(), "Doctor"));
        templateData.put("appointmentReason", defaultText(request.appointmentReason(), "General consultation"));
        templateData.put("prescriptionId", request.prescriptionId());
        templateData.put("consultationId", request.consultationId());
        templateData.put("issuedAt", formatInstant(request.issuedAt()));
        templateData.put("expiresAt", formatInstant(request.expiresAt()));
    }

    private static String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength) + "...";
    }

    private static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private static String normalizePhone(String phone) {
        return phone == null ? null : phone.trim();
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static boolean isPhoneValid(String phoneNumber) {
        if (!hasText(phoneNumber)) {
            return false;
        }
        return E164_PATTERN.matcher(phoneNumber.trim()).matches();
    }

    private static String defaultText(String value, String fallback) {
        if (!hasText(value)) {
            return fallback;
        }
        return value.trim();
    }

    private static String formatInstant(Instant instant) {
        if (instant == null) {
            return "N/A";
        }
        return DATE_TIME_FORMATTER.format(instant);
    }

    private record DeliveryCount(int accepted, int duplicates) {
        static DeliveryCount zero() {
            return new DeliveryCount(0, 0);
        }

        static DeliveryCount oneAccepted() {
            return new DeliveryCount(1, 0);
        }

        static DeliveryCount oneDuplicate() {
            return new DeliveryCount(0, 1);
        }

        DeliveryCount add(DeliveryCount other) {
            return new DeliveryCount(this.accepted + other.accepted, this.duplicates + other.duplicates);
        }
    }

    private record RecipientContext(
            String userId,
            String fallbackLabel,
            String name,
            String email,
            String phone,
            String errorMessage) {

        static RecipientContext success(String userId, String name, String email, String phone, String fallbackLabel) {
            return new RecipientContext(userId, fallbackLabel, name, email, phone, null);
        }

        static RecipientContext failure(String userId, String fallbackLabel, String errorMessage) {
            return new RecipientContext(userId, fallbackLabel, fallbackLabel, "", null, errorMessage);
        }

        String displayName() {
            if (name == null || name.isBlank()) {
                return fallbackLabel;
            }
            return name.trim();
        }
    }
}
