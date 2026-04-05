package com.healthcare.notification.service.email;

import com.healthcare.notification.config.NotificationProperties;
import com.healthcare.notification.model.NotificationDelivery;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class NotificationEmailService {

    private final NotificationProperties properties;
    private final Map<String, EmailSender> providerMap = new HashMap<>();

    public NotificationEmailService(NotificationProperties properties, List<EmailSender> senders) {
        this.properties = properties;
        for (EmailSender sender : senders) {
            providerMap.put(sender.providerName().toLowerCase(Locale.ROOT), sender);
        }
    }

    public void send(NotificationDelivery delivery, String htmlBody) {
        String provider = properties.getEmail().getProvider() == null
                ? ""
                : properties.getEmail().getProvider().trim().toLowerCase(Locale.ROOT);
        EmailSender sender = providerMap.get(provider);
        if (sender == null) {
            throw new EmailDeliveryException("Unsupported email provider: " + provider);
        }

        sender.sendEmail(new EmailMessage(
                delivery.getRecipientEmail(),
                delivery.getSubject(),
                htmlBody));
    }
}
