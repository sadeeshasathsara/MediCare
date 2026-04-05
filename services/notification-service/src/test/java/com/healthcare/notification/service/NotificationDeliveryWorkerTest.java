package com.healthcare.notification.service;

import com.healthcare.notification.config.NotificationProperties;
import com.healthcare.notification.model.NotificationChannel;
import com.healthcare.notification.model.NotificationDelivery;
import com.healthcare.notification.model.NotificationStatus;
import com.healthcare.notification.repository.NotificationDeliveryRepository;
import com.healthcare.notification.service.email.NotificationEmailService;
import com.healthcare.notification.service.sms.NotificationSmsService;
import com.healthcare.notification.service.sms.SmsSendResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationDeliveryWorkerTest {

    @Mock
    private NotificationDeliveryRepository repository;

    @Mock
    private EmailTemplateRenderer emailTemplateRenderer;

    @Mock
    private SmsTemplateRenderer smsTemplateRenderer;

    @Mock
    private NotificationEmailService emailService;

    @Mock
    private NotificationSmsService smsService;

    private NotificationDeliveryWorker worker;

    @BeforeEach
    void setUp() {
        NotificationProperties properties = new NotificationProperties();
        properties.getWorker().setBatchSize(10);
        properties.getWorker().setMaxAttempts(3);
        properties.getWorker().setRetryBaseDelayMs(1_000);
        worker = new NotificationDeliveryWorker(properties, repository, emailTemplateRenderer, smsTemplateRenderer, emailService,
                smsService);
    }

    @Test
    void shouldMarkDeliveryAsSentOnSuccess() {
        NotificationDelivery delivery = buildPendingDelivery();

        when(repository.findByStatusInAndNextAttemptAtLessThanEqualOrderByNextAttemptAtAsc(
                anyList(), any(Instant.class), any(Pageable.class)))
                .thenReturn(List.of(delivery));
        when(emailTemplateRenderer.render(any(), any())).thenReturn("<p>ok</p>");

        worker.processPendingNotifications();

        ArgumentCaptor<NotificationDelivery> captor = ArgumentCaptor.forClass(NotificationDelivery.class);
        verify(repository).save(captor.capture());
        NotificationDelivery saved = captor.getValue();

        assertEquals(NotificationStatus.SENT, saved.getStatus());
        assertNotNull(saved.getSentAt());
        assertNull(saved.getNextAttemptAt());
    }

    @Test
    void shouldScheduleRetryOnFailure() {
        NotificationDelivery delivery = buildPendingDelivery();

        when(repository.findByStatusInAndNextAttemptAtLessThanEqualOrderByNextAttemptAtAsc(
                anyList(), any(Instant.class), any(Pageable.class)))
                .thenReturn(List.of(delivery));
        when(emailTemplateRenderer.render(any(), any())).thenReturn("<p>ok</p>");
        doThrow(new RuntimeException("temporary send error")).when(emailService).send(any(), any());

        worker.processPendingNotifications();

        ArgumentCaptor<NotificationDelivery> captor = ArgumentCaptor.forClass(NotificationDelivery.class);
        verify(repository).save(captor.capture());
        NotificationDelivery saved = captor.getValue();

        assertEquals(NotificationStatus.FAILED, saved.getStatus());
        assertEquals(1, saved.getAttemptCount());
        assertNotNull(saved.getNextAttemptAt());
    }

    @Test
    void shouldSendSmsWhenChannelIsSms() {
        NotificationDelivery delivery = buildPendingDelivery();
        delivery.setChannel(NotificationChannel.SMS);
        delivery.setTemplateName("booking-confirmation");
        delivery.setRecipientPhone("+94770000001");

        when(repository.findByStatusInAndNextAttemptAtLessThanEqualOrderByNextAttemptAtAsc(
                anyList(), any(Instant.class), any(Pageable.class)))
                .thenReturn(List.of(delivery));
        when(smsTemplateRenderer.render(any(), any())).thenReturn("sms body");
        when(smsService.send(any(), any())).thenReturn(new SmsSendResult("SM12345"));

        worker.processPendingNotifications();

        ArgumentCaptor<NotificationDelivery> captor = ArgumentCaptor.forClass(NotificationDelivery.class);
        verify(repository).save(captor.capture());
        NotificationDelivery saved = captor.getValue();

        assertEquals(NotificationStatus.SENT, saved.getStatus());
        assertEquals("SM12345", saved.getProviderMessageId());
        assertTrue(saved.getContentText().contains("sms body"));
    }

    private NotificationDelivery buildPendingDelivery() {
        NotificationDelivery delivery = new NotificationDelivery();
        delivery.setId("delivery-1");
        delivery.setChannel(NotificationChannel.EMAIL);
        delivery.setStatus(NotificationStatus.PENDING);
        delivery.setTemplateName("appointment-confirmed");
        delivery.setTemplateData(Map.of("recipientName", "Jane"));
        delivery.setRecipientEmail("patient@medicare.com");
        delivery.setSubject("Appointment confirmed");
        delivery.setNextAttemptAt(Instant.now());
        delivery.setAttemptCount(0);
        return delivery;
    }
}
