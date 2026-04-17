package com.healthcare.notification.dto.internal;

import com.healthcare.notification.model.NotificationEventType;

public record TriggerAcceptedResponse(
        String eventId,
        NotificationEventType eventType,
        int acceptedRecipients,
        int duplicateRecipients) {
}
