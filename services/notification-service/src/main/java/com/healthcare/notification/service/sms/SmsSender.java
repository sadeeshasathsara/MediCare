package com.healthcare.notification.service.sms;

public interface SmsSender {

    String providerName();

    SmsSendResult sendSms(SmsMessage message);
}
