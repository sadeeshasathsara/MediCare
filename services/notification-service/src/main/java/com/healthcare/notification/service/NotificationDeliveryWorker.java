package com.healthcare.notification.service;

import com.healthcare.notification.config.NotificationProperties;
import com.healthcare.notification.model.NotificationChannel;
import com.healthcare.notification.model.NotificationDelivery;
import com.healthcare.notification.model.NotificationStatus;
import com.healthcare.notification.repository.NotificationDeliveryRepository;
import com.healthcare.notification.service.email.NotificationEmailService;
import com.healthcare.notification.service.sms.NotificationSmsService;
import com.healthcare.notification.service.sms.SmsSendResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Component
public class NotificationDeliveryWorker {

    private static final Logger logger = LoggerFactory.getLogger(NotificationDeliveryWorker.class);
    private static final long MAX_RETRY_DELAY_MS = Duration.ofHours(24).toMillis();

    private final NotificationProperties properties;
    private final NotificationDeliveryRepository repository;
    private final EmailTemplateRenderer emailTemplateRenderer;
    private final SmsTemplateRenderer smsTemplateRenderer;
    private final NotificationEmailService notificationEmailService;
    private final NotificationSmsService notificationSmsService;

    public NotificationDeliveryWorker(
            NotificationProperties properties,
            NotificationDeliveryRepository repository,
            EmailTemplateRenderer emailTemplateRenderer,
            SmsTemplateRenderer smsTemplateRenderer,
            NotificationEmailService notificationEmailService,
            NotificationSmsService notificationSmsService) {
        this.properties = properties;
        this.repository = repository;
        this.emailTemplateRenderer = emailTemplateRenderer;
        this.smsTemplateRenderer = smsTemplateRenderer;
        this.notificationEmailService = notificationEmailService;
        this.notificationSmsService = notificationSmsService;
    }

    @Scheduled(fixedDelayString = "${notification.worker.fixed-delay-ms:5000}")
    public void processPendingNotifications() {
        int batchSize = Math.max(1, properties.getWorker().getBatchSize());
        List<NotificationDelivery> deliveries = repository
                .findByStatusInAndNextAttemptAtLessThanEqualOrderByNextAttemptAtAsc(
                        List.of(NotificationStatus.PENDING, NotificationStatus.FAILED),
                        Instant.now(),
                        PageRequest.of(0, batchSize));

        for (NotificationDelivery delivery : deliveries) {
            processDelivery(delivery);
        }
    }

    private void processDelivery(NotificationDelivery delivery) {
        Instant now = Instant.now();
        try {
            NotificationChannel channel = delivery.getChannel() == null ? NotificationChannel.EMAIL : delivery.getChannel();
            if (channel == NotificationChannel.IN_APP) {
                delivery.setContentText(delivery.getSummary());
            } else if (channel == NotificationChannel.SMS) {
                String smsBody = smsTemplateRenderer.render(delivery.getTemplateName(), delivery.getTemplateData());
                SmsSendResult smsResult = notificationSmsService.send(delivery, smsBody);
                delivery.setContentText(smsBody);
                delivery.setProviderMessageId(smsResult.providerMessageId());
            } else {
                String htmlBody = emailTemplateRenderer.render(delivery.getTemplateName(), delivery.getTemplateData());
                notificationEmailService.send(delivery, htmlBody);
            }

            delivery.setStatus(NotificationStatus.SENT);
            delivery.setSentAt(now);
            delivery.setLastError(null);
            delivery.setNextAttemptAt(null);
            delivery.setUpdatedAt(now);
            repository.save(delivery);
        } catch (Exception ex) {
            markFailedDelivery(delivery, ex, now);
        }
    }

    private void markFailedDelivery(NotificationDelivery delivery, Exception ex, Instant now) {
        int attemptCount = delivery.getAttemptCount() + 1;
        int maxAttempts = Math.max(1, properties.getWorker().getMaxAttempts());

        delivery.setAttemptCount(attemptCount);
        delivery.setStatus(NotificationStatus.FAILED);
        delivery.setLastError(truncate(ex.getMessage(), 500));
        delivery.setUpdatedAt(now);

        if (attemptCount >= maxAttempts) {
            delivery.setNextAttemptAt(null);
            logger.warn("Notification {} exhausted attempts ({})", delivery.getId(), attemptCount);
        } else {
            long delayMs = computeBackoffDelayMs(attemptCount);
            delivery.setNextAttemptAt(now.plusMillis(delayMs));
            logger.warn("Notification {} failed attempt {}. Retrying in {} ms", delivery.getId(), attemptCount, delayMs);
        }

        repository.save(delivery);
    }

    private long computeBackoffDelayMs(int attemptCount) {
        long base = Math.max(1L, properties.getWorker().getRetryBaseDelayMs());
        int power = Math.max(0, Math.min(attemptCount - 1, 20));
        long factor = 1L << power;
        long raw;
        try {
            raw = Math.multiplyExact(base, factor);
        } catch (ArithmeticException ex) {
            raw = Long.MAX_VALUE;
        }
        return Math.min(raw, MAX_RETRY_DELAY_MS);
    }

    private static String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength) + "...";
    }
}
