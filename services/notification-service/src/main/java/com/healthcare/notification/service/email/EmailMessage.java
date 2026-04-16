package com.healthcare.notification.service.email;

public record EmailMessage(
        String to,
        String subject,
        String htmlBody) {
}
