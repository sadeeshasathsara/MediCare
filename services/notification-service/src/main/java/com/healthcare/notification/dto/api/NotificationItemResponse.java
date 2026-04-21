package com.healthcare.notification.dto.api;

import com.healthcare.notification.model.NotificationChannel;
import com.healthcare.notification.model.NotificationEventType;
import com.healthcare.notification.model.NotificationStatus;
import com.healthcare.notification.model.SmsNotificationType;

import java.time.Instant;
import java.util.Map;

public record NotificationItemResponse(
        String id,
        String eventId,
        NotificationChannel channel,
        NotificationEventType eventType,
        SmsNotificationType smsType,
        NotificationStatus status,
        String subject,
        String summary,
        String appointmentId,
        String recipientPhone,
        Instant scheduledAt,
        String providerMessageId,
        String contentText,
        Instant occurredAt,
        Instant createdAt,
        Instant sentAt,
        Instant readAt,
        boolean read,
        String lastError,
        Map<String, Object> templateData) {
}
