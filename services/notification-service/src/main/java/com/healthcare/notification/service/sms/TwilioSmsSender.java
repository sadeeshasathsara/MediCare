package com.healthcare.notification.service.sms;

import com.healthcare.notification.config.NotificationProperties;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import org.springframework.stereotype.Component;

@Component
public class TwilioSmsSender implements SmsSender {

    private static final String PROVIDER = "twilio";
    private final NotificationProperties properties;

    public TwilioSmsSender(NotificationProperties properties) {
        this.properties = properties;
    }

    @Override
    public String providerName() {
        return PROVIDER;
    }

    @Override
    public SmsSendResult sendSms(SmsMessage message) {
        String sid = properties.getSms().getTwilio().getAccountSid();
        String token = properties.getSms().getTwilio().getAuthToken();
        String fromNumber = properties.getSms().getTwilio().getFromNumber();

        if (sid == null || sid.isBlank()) {
            throw new SmsDeliveryException("TWILIO_ACCOUNT_SID is not configured");
        }
        if (token == null || token.isBlank()) {
            throw new SmsDeliveryException("TWILIO_AUTH_TOKEN is not configured");
        }
        if (fromNumber == null || fromNumber.isBlank()) {
            throw new SmsDeliveryException("TWILIO_FROM_NUMBER is not configured");
        }

        try {
            Twilio.init(sid, token);
            Message twilioMessage = Message.creator(
                    new PhoneNumber(message.to()),
                    new PhoneNumber(fromNumber),
                    message.body()).create();
            return new SmsSendResult(twilioMessage.getSid());
        } catch (Exception ex) {
            throw new SmsDeliveryException("Failed to send SMS via Twilio", ex);
        }
    }
}
