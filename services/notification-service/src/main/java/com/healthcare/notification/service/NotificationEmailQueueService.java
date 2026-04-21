package com.healthcare.notification.service;

import com.healthcare.notification.config.NotificationProperties;
import com.healthcare.notification.model.NotificationChannel;
import com.healthcare.notification.model.NotificationDelivery;
import com.healthcare.notification.model.NotificationEventType;
import com.healthcare.notification.model.NotificationStatus;
import com.healthcare.notification.repository.NotificationDeliveryRepository;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Service
public class NotificationEmailQueueService {

    private final NotificationDeliveryRepository repository;
    private final NotificationProperties properties;

    public NotificationEmailQueueService(
            NotificationDeliveryRepository repository,
            NotificationProperties properties) {
        this.repository = repository;
        this.properties = properties;
    }

    public QueueResult queueEmail(
            NotificationEventType eventType,
            String eventId,
            String appointmentId,
            String sourceService,
            Instant occurredAt,
            String recipientUserId,
            String recipientName,
            String recipientEmail,
            String recipientPhone,
            String recipientRole,
            String subject,
            String templateName,
            Map<String, Object> templateData,
            String summary,
            Instant scheduledAt,
            String failureReason) {

        String normalizedEmail = normalizeEmail(recipientEmail);
        String normalizedPhone = normalizePhone(recipientPhone);
        String resolvedFailureReason = hasText(failureReason)
                ? failureReason
                : (!hasText(normalizedEmail)
                        ? "Recipient email is missing for userId=" + defaultText(recipientUserId, "unknown")
                        : null);

        if (hasText(resolvedFailureReason)) {
            NotificationDelivery failed = baseDelivery(
                    eventType,
                    eventId,
                    appointmentId,
                    sourceService,
                    occurredAt,
                    recipientUserId,
                    recipientName,
                    recipientRole,
                    subject,
                    templateName,
                    templateData,
                    summary,
                    Instant.now());
            failed.setChannel(NotificationChannel.EMAIL);
            failed.setRecipientEmail(normalizedEmail);
            failed.setRecipientPhone(normalizedPhone);
            failed.setSmsType(null);
            failed.setStatus(NotificationStatus.FAILED);
            failed.setAttemptCount(Math.max(1, properties.getWorker().getMaxAttempts()));
            failed.setNextAttemptAt(null);
            failed.setLastError(truncate(defaultText(resolvedFailureReason, "Email delivery failed"), 500));
            failed.setSentAt(null);
            return persist(failed);
        }

        NotificationDelivery delivery = baseDelivery(
                eventType,
                eventId,
                appointmentId,
                sourceService,
                occurredAt,
                recipientUserId,
                recipientName,
                recipientRole,
                subject,
                templateName,
                templateData,
                summary,
                scheduledAt);
        delivery.setChannel(NotificationChannel.EMAIL);
        delivery.setRecipientEmail(normalizedEmail);
        delivery.setRecipientPhone(normalizedPhone);
        delivery.setSmsType(null);
        return persist(delivery);
    }

    private QueueResult persist(NotificationDelivery delivery) {
        try {
            repository.save(delivery);
            return QueueResult.oneAccepted();
        } catch (DuplicateKeyException ex) {
            return QueueResult.oneDuplicate();
        }
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
        delivery.setRecipientUserId(defaultText(recipientUserId, ""));
        delivery.setRecipientName(defaultText(recipientName, ""));
        delivery.setRecipientRole(defaultText(recipientRole, ""));
        delivery.setSubject(defaultText(subject, ""));
        delivery.setTemplateName(defaultText(templateName, ""));
        delivery.setTemplateData(safeTemplateData(templateData));
        delivery.setSummary(defaultText(summary, ""));
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

    private static Map<String, Object> safeTemplateData(Map<String, Object> templateData) {
        if (templateData == null || templateData.isEmpty()) {
            return new LinkedHashMap<>();
        }
        return new LinkedHashMap<>(templateData);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String defaultText(String value, String fallback) {
        if (!hasText(value)) {
            return fallback;
        }
        return value.trim();
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

    public record QueueResult(int accepted, int duplicates) {
        public static QueueResult oneAccepted() {
            return new QueueResult(1, 0);
        }

        public static QueueResult oneDuplicate() {
            return new QueueResult(0, 1);
        }
    }
}
