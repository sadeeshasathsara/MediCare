package com.healthcare.notification.service.sms;

import com.healthcare.notification.config.NotificationProperties;
import com.healthcare.notification.model.NotificationDelivery;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class NotificationSmsService {

    private final NotificationProperties properties;
    private final Map<String, SmsSender> providerMap = new HashMap<>();

    public NotificationSmsService(NotificationProperties properties, List<SmsSender> senders) {
        this.properties = properties;
        for (SmsSender sender : senders) {
            providerMap.put(sender.providerName().toLowerCase(Locale.ROOT), sender);
        }
    }

    public SmsSendResult send(NotificationDelivery delivery, String messageBody) {
        if (!properties.getSms().isEnabled()) {
            throw new SmsDeliveryException("SMS delivery is disabled (NOTIFICATION_SMS_ENABLED=false)");
        }

        String provider = properties.getSms().getProvider() == null
                ? ""
                : properties.getSms().getProvider().trim().toLowerCase(Locale.ROOT);

        SmsSender sender = providerMap.get(provider);
        if (sender == null) {
            throw new SmsDeliveryException("Unsupported SMS provider: " + provider + ". Implement provider adapter.");
        }

        return sender.sendSms(new SmsMessage(delivery.getRecipientPhone(), messageBody));
    }
}
