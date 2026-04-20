package com.healthcare.notification.service;

import com.healthcare.notification.config.NotificationProperties;
import com.healthcare.notification.dto.internal.TelemedicineAppointmentDecisionStatus;
import com.healthcare.notification.dto.internal.TelemedicineAppointmentStatusEventRequest;
import com.healthcare.notification.dto.internal.TelemedicineConsultationCompletedEventRequest;
import com.healthcare.notification.dto.internal.TriggerAcceptedResponse;
import com.healthcare.notification.model.NotificationDelivery;
import com.healthcare.notification.model.NotificationEventType;
import com.healthcare.notification.model.NotificationStatus;
import com.healthcare.notification.model.NotificationChannel;
import com.healthcare.notification.repository.NotificationDeliveryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TelemedicineNotificationEventServiceTest {

    @Mock
    private NotificationDeliveryRepository repository;

    @Mock
    private RecipientProfileLookupService profileLookupService;

    private TelemedicineNotificationEventService service;

    @BeforeEach
    void setUp() {
        NotificationProperties properties = new NotificationProperties();
        properties.setRetentionDays(90);
        service = new TelemedicineNotificationEventService(repository, properties, profileLookupService);
    }

    @Test
    void shouldPersistImmediateFailuresWhenRecipientLookupFails() {
        doThrow(new IllegalStateException("patient lookup down"))
                .when(profileLookupService).resolvePatient(anyString());
        doThrow(new IllegalStateException("doctor lookup down"))
                .when(profileLookupService).resolveDoctor(anyString());
        when(repository.save(any(NotificationDelivery.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TelemedicineAppointmentStatusEventRequest request = new TelemedicineAppointmentStatusEventRequest(
                "tm-appt-1",
                Instant.parse("2026-04-16T10:00:00Z"),
                "apt-1",
                "telemedicine-service",
                "patient-1",
                "Patient One",
                "doctor-1",
                "Doctor One",
                "Follow-up consultation",
                TelemedicineAppointmentDecisionStatus.ACCEPTED,
                Instant.parse("2026-04-20T12:30:00Z"),
                null,
                null,
                null);

        TriggerAcceptedResponse response = service.handleAppointmentStatus(request);

        assertEquals(4, response.acceptedRecipients());
        assertEquals(0, response.duplicateRecipients());

        ArgumentCaptor<NotificationDelivery> captor = ArgumentCaptor.forClass(NotificationDelivery.class);
        verify(repository, times(4)).save(captor.capture());
        List<NotificationDelivery> saved = captor.getAllValues();

        long failedCount = saved.stream().filter(item -> item.getStatus() == NotificationStatus.FAILED).count();
        assertEquals(2, failedCount);
        saved.stream()
                .filter(item -> item.getStatus() == NotificationStatus.FAILED)
                .forEach(item -> {
                    assertNull(item.getNextAttemptAt());
                    assertTrue(item.getLastError().contains("Failed to resolve"));
                });
    }

    @Test
    void shouldQueueEmailAndSmsWhenRecipientProfilesResolveSuccessfully() {
        when(profileLookupService.resolvePatient("patient-1"))
                .thenReturn(new RecipientProfileLookupService.ResolvedRecipient(
                        "patient-1",
                        "Patient One",
                        "patient@medicare.com",
                        "+94770000001"));
        when(profileLookupService.resolveDoctor("doctor-1"))
                .thenReturn(new RecipientProfileLookupService.ResolvedRecipient(
                        "doctor-1",
                        "Doctor One",
                        "doctor@medicare.com",
                        "+94770000002"));
        when(repository.save(any(NotificationDelivery.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TelemedicineConsultationCompletedEventRequest request = new TelemedicineConsultationCompletedEventRequest(
                "tm-session-1-completed",
                Instant.parse("2026-04-16T11:00:00Z"),
                "apt-2",
                "telemedicine-service",
                "session-1",
                "patient-1",
                "Patient One",
                "doctor-1",
                "Doctor One",
                "Diabetes follow-up",
                Instant.parse("2026-04-16T11:20:00Z"),
                1200L);

        TriggerAcceptedResponse response = service.handleConsultationCompleted(request);

        assertEquals(6, response.acceptedRecipients());
        assertEquals(0, response.duplicateRecipients());

        ArgumentCaptor<NotificationDelivery> captor = ArgumentCaptor.forClass(NotificationDelivery.class);
        verify(repository, times(6)).save(captor.capture());
        List<NotificationDelivery> saved = captor.getAllValues();

        long pendingCount = saved.stream().filter(item -> item.getStatus() == NotificationStatus.PENDING).count();
        long sentCount = saved.stream().filter(item -> item.getStatus() == NotificationStatus.SENT).count();
        long smsCount = saved.stream().filter(item -> item.getChannel() == NotificationChannel.SMS).count();
        assertEquals(4, pendingCount);
        assertEquals(2, sentCount);
        assertEquals(2, smsCount);
        saved.forEach(item -> assertEquals(NotificationEventType.TELEMEDICINE_CONSULTATION_COMPLETED, item.getEventType()));
    }
}
