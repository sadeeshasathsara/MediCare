package com.healthcare.notification.service.sms;

import com.healthcare.notification.config.NotificationProperties;
import com.healthcare.notification.model.NotificationDelivery;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class NotificationSmsServiceTest {

    @Test
    void shouldRouteToConfiguredProvider() {
        NotificationProperties properties = new NotificationProperties();
        properties.getSms().setEnabled(true);
        properties.getSms().setProvider("twilio");

        AtomicReference<SmsMessage> captured = new AtomicReference<>();
        SmsSender sender = new SmsSender() {
            @Override
            public String providerName() {
                return "twilio";
            }

            @Override
            public SmsSendResult sendSms(SmsMessage message) {
                captured.set(message);
                return new SmsSendResult("SM123");
            }
        };

        NotificationSmsService service = new NotificationSmsService(properties, List.of(sender));
        NotificationDelivery delivery = new NotificationDelivery();
        delivery.setRecipientPhone("+94770000001");

        SmsSendResult result = service.send(delivery, "Hello");

        assertEquals("SM123", result.providerMessageId());
        assertEquals("+94770000001", captured.get().to());
        assertEquals("Hello", captured.get().body());
    }

    @Test
    void shouldFailWhenSmsDisabled() {
        NotificationProperties properties = new NotificationProperties();
        properties.getSms().setEnabled(false);

        NotificationSmsService service = new NotificationSmsService(properties, List.of());
        NotificationDelivery delivery = new NotificationDelivery();
        delivery.setRecipientPhone("+94770000001");

        assertThrows(SmsDeliveryException.class, () -> service.send(delivery, "Hello"));
    }
}
