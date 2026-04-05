package com.healthcare.notification.service.sms;

public record SmsMessage(
        String to,
        String body) {
}
