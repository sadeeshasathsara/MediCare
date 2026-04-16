package com.healthcare.notification.service.email;

import com.healthcare.notification.config.NotificationProperties;
import com.sendgrid.Method;
import com.sendgrid.Request;
import com.sendgrid.Response;
import com.sendgrid.SendGrid;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class SendGridEmailSender implements EmailSender {

    private static final String PROVIDER = "sendgrid";
    private final NotificationProperties properties;

    public SendGridEmailSender(NotificationProperties properties) {
        this.properties = properties;
    }

    @Override
    public String providerName() {
        return PROVIDER;
    }

    @Override
    public void sendEmail(EmailMessage message) {
        String apiKey = properties.getEmail().getSendgrid().getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new EmailDeliveryException("SendGrid API key is not configured");
        }

        String fromAddress = properties.getEmail().getFrom();
        if (fromAddress == null || fromAddress.isBlank()) {
            throw new EmailDeliveryException("notification.email.from is not configured");
        }

        Mail mail = new Mail(
                new Email(fromAddress),
                message.subject(),
                new Email(message.to()),
                new Content("text/html", message.htmlBody()));

        try {
            Request request = new Request();
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());

            SendGrid client = new SendGrid(apiKey);
            Response response = client.api(request);
            if (response.getStatusCode() < 200 || response.getStatusCode() >= 300) {
                throw new EmailDeliveryException("SendGrid non-success status " + response.getStatusCode()
                        + " - " + truncate(response.getBody(), 300));
            }
        } catch (IOException ex) {
            throw new EmailDeliveryException("Failed to send email via SendGrid", ex);
        }
    }

    private static String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength) + "...";
    }
}
