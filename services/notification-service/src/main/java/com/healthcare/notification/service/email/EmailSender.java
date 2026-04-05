package com.healthcare.notification.service.email;

public interface EmailSender {

    String providerName();

    void sendEmail(EmailMessage message);
}
