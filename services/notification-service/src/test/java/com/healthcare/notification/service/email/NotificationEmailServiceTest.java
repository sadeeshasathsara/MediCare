package com.healthcare.notification.service.email;

import com.healthcare.notification.config.NotificationProperties;
import com.healthcare.notification.model.NotificationDelivery;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class NotificationEmailServiceTest {

    @Test
    void shouldRouteToConfiguredProvider() {
        NotificationProperties properties = new NotificationProperties();
        properties.getEmail().setProvider("sendgrid");

        AtomicReference<EmailMessage> captured = new AtomicReference<>();
        EmailSender sender = new EmailSender() {
            @Override
            public String providerName() {
                return "sendgrid";
            }

            @Override
            public void sendEmail(EmailMessage message) {
                captured.set(message);
            }
        };

        NotificationEmailService service = new NotificationEmailService(properties, List.of(sender));
        NotificationDelivery delivery = new NotificationDelivery();
        delivery.setRecipientEmail("patient@medicare.com");
        delivery.setSubject("Test Subject");

        service.send(delivery, "<p>Hello</p>");

        assertEquals("patient@medicare.com", captured.get().to());
        assertEquals("Test Subject", captured.get().subject());
    }

    @Test
    void shouldFailForUnsupportedProvider() {
        NotificationProperties properties = new NotificationProperties();
        properties.getEmail().setProvider("ses");

        NotificationEmailService service = new NotificationEmailService(properties, List.of());
        NotificationDelivery delivery = new NotificationDelivery();
        delivery.setRecipientEmail("patient@medicare.com");
        delivery.setSubject("Test Subject");

        assertThrows(EmailDeliveryException.class, () -> service.send(delivery, "<p>Hello</p>"));
    }
}
