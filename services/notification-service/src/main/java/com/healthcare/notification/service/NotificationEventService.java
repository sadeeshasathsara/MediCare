package com.healthcare.notification.service;

import com.healthcare.notification.config.NotificationProperties;
import com.healthcare.notification.dto.internal.AppointmentCancelledEventRequest;
import com.healthcare.notification.dto.internal.AppointmentConfirmedEventRequest;
import com.healthcare.notification.dto.internal.ConsultationCompletedEventRequest;
import com.healthcare.notification.dto.internal.EventRecipient;
import com.healthcare.notification.dto.internal.RefundInfo;
import com.healthcare.notification.dto.internal.TriggerAcceptedResponse;
import com.healthcare.notification.model.NotificationChannel;
import com.healthcare.notification.model.NotificationDelivery;
import com.healthcare.notification.model.NotificationEventType;
import com.healthcare.notification.model.NotificationStatus;
import com.healthcare.notification.model.SmsNotificationType;
import com.healthcare.notification.repository.NotificationDeliveryRepository;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class NotificationEventService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter
            .ofPattern("yyyy-MM-dd HH:mm 'UTC'")
            .withZone(ZoneOffset.UTC);
    private static final Pattern E164_PATTERN = Pattern.compile("^\\+?[1-9]\\d{7,14}$");

    private static final String TEMPLATE_EMAIL_APPOINTMENT_CONFIRMED = "appointment-confirmed";
    private static final String TEMPLATE_EMAIL_APPOINTMENT_CANCELLED = "appointment-cancelled";
    private static final String TEMPLATE_EMAIL_CONSULTATION_COMPLETED = "consultation-completed";

    private static final String TEMPLATE_SMS_BOOKING_CONFIRMATION = "booking-confirmation";
    private static final String TEMPLATE_SMS_APPOINTMENT_REMINDER = "appointment-reminder";

    private final NotificationDeliveryRepository repository;
    private final NotificationProperties properties;

    public NotificationEventService(NotificationDeliveryRepository repository, NotificationProperties properties) {
        this.repository = repository;
        this.properties = properties;
    }

    public void validateInternalToken(String providedToken) {
        String expectedToken = properties.getInternalToken();
        if (expectedToken == null || expectedToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "notification internal token is not configured");
        }
        if (providedToken == null || providedToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "missing X-Service-Token");
        }

        boolean valid = MessageDigest.isEqual(
                expectedToken.getBytes(StandardCharsets.UTF_8),
                providedToken.getBytes(StandardCharsets.UTF_8));
        if (!valid) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid X-Service-Token");
        }
    }

    public TriggerAcceptedResponse handleAppointmentConfirmed(AppointmentConfirmedEventRequest request) {
        NotificationEventType eventType = NotificationEventType.APPOINTMENT_CONFIRMED;
        String appointmentDateTime = formatInstant(request.appointmentDateTime());
        String notes = defaultText(request.notes(), "N/A");
        String emailSubject = "Appointment confirmed - " + request.appointmentId();
        Instant now = Instant.now();
        Instant reminderTime = scheduleReminderTime(request.appointmentDateTime(), now);

        Map<String, Object> patientData = createCommonTemplateData(
                request.eventId(), request.appointmentId(), request.occurredAt(), request.sourceService(),
                request.patient().name(), request.doctor().name(), "Doctor");
        patientData.put("appointmentDateTime", appointmentDateTime);
        patientData.put("channel", request.channel());
        patientData.put("notes", notes);

        Map<String, Object> doctorData = createCommonTemplateData(
                request.eventId(), request.appointmentId(), request.occurredAt(), request.sourceService(),
                request.doctor().name(), request.patient().name(), "Patient");
        doctorData.put("appointmentDateTime", appointmentDateTime);
        doctorData.put("channel", request.channel());
        doctorData.put("notes", notes);

        String patientSummary = "Appointment " + request.appointmentId() + " confirmed for " + appointmentDateTime
                + " with " + request.doctor().name() + ".";
        String doctorSummary = "Appointment " + request.appointmentId() + " confirmed for " + appointmentDateTime
                + " with " + request.patient().name() + ".";

        DeliveryCount emailResult = persistEmailForRecipients(
                eventType, request.eventId(), request.appointmentId(), request.sourceService(), request.occurredAt(),
                request.patient(), request.doctor(), emailSubject, TEMPLATE_EMAIL_APPOINTMENT_CONFIRMED,
                patientData, doctorData, patientSummary, doctorSummary, now);

        if (!properties.getSms().isEnabled()) {
            return buildResponse(request.eventId(), eventType, emailResult);
        }

        DeliveryCount bookingSmsResult = persistSmsForRecipients(
                eventType, request.eventId(), request.appointmentId(), request.sourceService(), request.occurredAt(),
                request.patient(), request.doctor(), "Booking confirmation SMS",
                TEMPLATE_SMS_BOOKING_CONFIRMATION, patientData, doctorData,
                "Booking confirmation SMS queued for appointment " + request.appointmentId() + ".",
                "Booking confirmation SMS queued for appointment " + request.appointmentId() + ".",
                SmsNotificationType.BOOKING_CONFIRMATION, now);

        DeliveryCount reminderSmsResult = persistSmsForRecipients(
                eventType, request.eventId(), request.appointmentId(), request.sourceService(), request.occurredAt(),
                request.patient(), request.doctor(), "Appointment reminder SMS",
                TEMPLATE_SMS_APPOINTMENT_REMINDER, patientData, doctorData,
                "Appointment reminder SMS scheduled for " + appointmentDateTime + ".",
                "Appointment reminder SMS scheduled for " + appointmentDateTime + ".",
                SmsNotificationType.APPOINTMENT_REMINDER, reminderTime);

        return buildResponse(
                request.eventId(),
                eventType,
                emailResult.add(bookingSmsResult).add(reminderSmsResult));
    }

    public TriggerAcceptedResponse handleAppointmentCancelled(AppointmentCancelledEventRequest request) {
        NotificationEventType eventType = NotificationEventType.APPOINTMENT_CANCELLED;
        String subject = "Appointment cancelled - " + request.appointmentId();
        Instant now = Instant.now();

        RefundInfo refund = request.refund();
        String refundStatus = refund == null ? "Pending" : defaultText(refund.status(), "Pending");
        String refundAmount = refund == null || refund.amount() == null ? "" : refund.amount().toPlainString();
        String refundCurrency = refund == null ? "" : defaultText(refund.currency(), "");
        String refundReference = refund == null ? "" : defaultText(refund.reference(), "");
        String refundExpectedAt = refund == null || refund.expectedAt() == null ? "" : formatInstant(refund.expectedAt());

        Map<String, Object> patientData = createCommonTemplateData(
                request.eventId(), request.appointmentId(), request.occurredAt(), request.sourceService(),
                request.patient().name(), request.doctor().name(), "Doctor");
        patientData.put("cancellationReason", request.cancellationReason());
        patientData.put("refundStatus", refundStatus);
        patientData.put("refundAmount", refundAmount);
        patientData.put("refundCurrency", refundCurrency);
        patientData.put("refundReference", refundReference);
        patientData.put("refundExpectedAt", refundExpectedAt);

        Map<String, Object> doctorData = createCommonTemplateData(
                request.eventId(), request.appointmentId(), request.occurredAt(), request.sourceService(),
                request.doctor().name(), request.patient().name(), "Patient");
        doctorData.put("cancellationReason", request.cancellationReason());
        doctorData.put("refundStatus", refundStatus);
        doctorData.put("refundAmount", refundAmount);
        doctorData.put("refundCurrency", refundCurrency);
        doctorData.put("refundReference", refundReference);
        doctorData.put("refundExpectedAt", refundExpectedAt);

        String patientSummary = "Appointment " + request.appointmentId() + " cancelled. Refund status: "
                + refundStatus + ".";
        String doctorSummary = "Appointment " + request.appointmentId() + " cancelled for patient "
                + request.patient().name() + ".";

        DeliveryCount result = persistEmailForRecipients(
                eventType, request.eventId(), request.appointmentId(), request.sourceService(), request.occurredAt(),
                request.patient(), request.doctor(), subject, TEMPLATE_EMAIL_APPOINTMENT_CANCELLED,
                patientData, doctorData, patientSummary, doctorSummary, now);
        return buildResponse(request.eventId(), eventType, result);
    }

    public TriggerAcceptedResponse handleConsultationCompleted(ConsultationCompletedEventRequest request) {
        NotificationEventType eventType = NotificationEventType.CONSULTATION_COMPLETED;
        String subject = "Consultation completed - prescription available";
        Instant now = Instant.now();

        String prescriptionLabel = defaultText(request.prescription().label(), "View prescription");
        String prescriptionUrl = request.prescription().url();

        Map<String, Object> patientData = createCommonTemplateData(
                request.eventId(), request.appointmentId(), request.occurredAt(), request.sourceService(),
                request.patient().name(), request.doctor().name(), "Doctor");
        patientData.put("prescriptionLabel", prescriptionLabel);
        patientData.put("prescriptionUrl", prescriptionUrl);

        Map<String, Object> doctorData = createCommonTemplateData(
                request.eventId(), request.appointmentId(), request.occurredAt(), request.sourceService(),
                request.doctor().name(), request.patient().name(), "Patient");
        doctorData.put("prescriptionLabel", prescriptionLabel);
        doctorData.put("prescriptionUrl", prescriptionUrl);

        String patientSummary = "Consultation completed for appointment " + request.appointmentId()
                + ". Prescription link is available.";
        String doctorSummary = "Consultation completed for appointment " + request.appointmentId()
                + ". Prescription was shared with patient.";

        DeliveryCount result = persistEmailForRecipients(
                eventType, request.eventId(), request.appointmentId(), request.sourceService(), request.occurredAt(),
                request.patient(), request.doctor(), subject, TEMPLATE_EMAIL_CONSULTATION_COMPLETED,
                patientData, doctorData, patientSummary, doctorSummary, now);
        return buildResponse(request.eventId(), eventType, result);
    }

    private TriggerAcceptedResponse buildResponse(String eventId, NotificationEventType eventType, DeliveryCount counts) {
        return new TriggerAcceptedResponse(eventId, eventType, counts.accepted(), counts.duplicates());
    }

    private DeliveryCount persistEmailForRecipients(
            NotificationEventType eventType,
            String eventId,
            String appointmentId,
            String sourceService,
            Instant occurredAt,
            EventRecipient patient,
            EventRecipient doctor,
            String subject,
            String templateName,
            Map<String, Object> patientTemplateData,
            Map<String, Object> doctorTemplateData,
            String patientSummary,
            String doctorSummary,
            Instant scheduledAt) {

        DeliveryCount counts = DeliveryCount.zero();

        counts = counts.add(persistEmailDelivery(
                eventType, eventId, appointmentId, sourceService, occurredAt,
                patient, "PATIENT", subject, templateName, patientTemplateData, patientSummary, scheduledAt));

        counts = counts.add(persistEmailDelivery(
                eventType, eventId, appointmentId, sourceService, occurredAt,
                doctor, "DOCTOR", subject, templateName, doctorTemplateData, doctorSummary, scheduledAt));

        return counts;
    }

    private DeliveryCount persistSmsForRecipients(
            NotificationEventType eventType,
            String eventId,
            String appointmentId,
            String sourceService,
            Instant occurredAt,
            EventRecipient patient,
            EventRecipient doctor,
            String subject,
            String templateName,
            Map<String, Object> patientTemplateData,
            Map<String, Object> doctorTemplateData,
            String patientSummary,
            String doctorSummary,
            SmsNotificationType smsType,
            Instant scheduledAt) {

        DeliveryCount counts = DeliveryCount.zero();

        if (isPhoneValid(patient.phoneNumber())) {
            counts = counts.add(persistSmsDelivery(
                    eventType, eventId, appointmentId, sourceService, occurredAt,
                    patient, "PATIENT", subject, templateName, patientTemplateData, patientSummary,
                    smsType, scheduledAt));
        }

        if (isPhoneValid(doctor.phoneNumber())) {
            counts = counts.add(persistSmsDelivery(
                    eventType, eventId, appointmentId, sourceService, occurredAt,
                    doctor, "DOCTOR", subject, templateName, doctorTemplateData, doctorSummary,
                    smsType, scheduledAt));
        }

        return counts;
    }

    private DeliveryCount persistEmailDelivery(
            NotificationEventType eventType,
            String eventId,
            String appointmentId,
            String sourceService,
            Instant occurredAt,
            EventRecipient recipient,
            String recipientRole,
            String subject,
            String templateName,
            Map<String, Object> templateData,
            String summary,
            Instant scheduledAt) {

        NotificationDelivery delivery = baseDelivery(
                eventType, eventId, appointmentId, sourceService, occurredAt, recipient, recipientRole,
                subject, templateName, templateData, summary, scheduledAt);
        delivery.setChannel(NotificationChannel.EMAIL);
        delivery.setRecipientEmail(normalizeEmail(recipient.email()));
        delivery.setRecipientPhone(normalizePhone(recipient.phoneNumber()));
        delivery.setSmsType(null);

        return persistDelivery(delivery);
    }

    private DeliveryCount persistSmsDelivery(
            NotificationEventType eventType,
            String eventId,
            String appointmentId,
            String sourceService,
            Instant occurredAt,
            EventRecipient recipient,
            String recipientRole,
            String subject,
            String templateName,
            Map<String, Object> templateData,
            String summary,
            SmsNotificationType smsType,
            Instant scheduledAt) {

        NotificationDelivery delivery = baseDelivery(
                eventType, eventId, appointmentId, sourceService, occurredAt, recipient, recipientRole,
                subject, templateName, templateData, summary, scheduledAt);
        delivery.setChannel(NotificationChannel.SMS);
        delivery.setRecipientEmail(normalizeEmail(recipient.email()));
        delivery.setRecipientPhone(normalizePhone(recipient.phoneNumber()));
        delivery.setSmsType(smsType);

        return persistDelivery(delivery);
    }

    private NotificationDelivery baseDelivery(
            NotificationEventType eventType,
            String eventId,
            String appointmentId,
            String sourceService,
            Instant occurredAt,
            EventRecipient recipient,
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
        delivery.setRecipientUserId(recipient.userId());
        delivery.setRecipientName(recipient.name());
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
        delivery.setCreatedAt(now);
        delivery.setUpdatedAt(now);
        delivery.setExpireAt(now.plus(Duration.ofDays(Math.max(1, properties.getRetentionDays()))));
        return delivery;
    }

    private DeliveryCount persistDelivery(NotificationDelivery delivery) {
        try {
            repository.save(delivery);
            return DeliveryCount.accepted();
        } catch (DuplicateKeyException ex) {
            return DeliveryCount.duplicate();
        }
    }

    private Map<String, Object> createCommonTemplateData(
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

    private static Instant scheduleReminderTime(Instant appointmentDateTime, Instant now) {
        if (appointmentDateTime == null) {
            return now;
        }
        Instant reminderAt = appointmentDateTime.minus(Duration.ofHours(1));
        return reminderAt.isBefore(now) ? now : reminderAt;
    }

    private static boolean isPhoneValid(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            return false;
        }
        return E164_PATTERN.matcher(phoneNumber.trim()).matches();
    }

    private static String defaultText(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim();
    }

    private static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private static String normalizePhone(String phone) {
        return phone == null ? null : phone.trim();
    }

    private static String formatInstant(Instant instant) {
        if (instant == null) {
            return "";
        }
        return DATE_TIME_FORMATTER.format(instant);
    }

    private record DeliveryCount(int accepted, int duplicates) {
        static DeliveryCount zero() {
            return new DeliveryCount(0, 0);
        }

        static DeliveryCount accepted() {
            return new DeliveryCount(1, 0);
        }

        static DeliveryCount duplicate() {
            return new DeliveryCount(0, 1);
        }

        DeliveryCount add(DeliveryCount other) {
            return new DeliveryCount(this.accepted + other.accepted, this.duplicates + other.duplicates);
        }
    }
}
