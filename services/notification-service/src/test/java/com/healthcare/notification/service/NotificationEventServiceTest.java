package com.healthcare.notification.service;

import com.healthcare.notification.config.NotificationProperties;
import com.healthcare.notification.dto.internal.AppointmentActivityEventRequest;
import com.healthcare.notification.dto.internal.AppointmentConfirmedEventRequest;
import com.healthcare.notification.dto.internal.EventRecipient;
import com.healthcare.notification.dto.internal.TriggerAcceptedResponse;
import com.healthcare.notification.model.NotificationEventType;
import com.healthcare.notification.repository.NotificationDeliveryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;

@ExtendWith(MockitoExtension.class)
class NotificationEventServiceTest {

    @Mock
    private NotificationDeliveryRepository repository;

    @Mock
    private RecipientProfileLookupService profileLookupService;

    private NotificationEventService service;

    @BeforeEach
    void setUp() {
        NotificationProperties properties = new NotificationProperties();
        properties.setInternalToken("secret-token");
        properties.setRetentionDays(90);
        service = new NotificationEventService(repository, properties, profileLookupService);
    }

    @Test
    void shouldRejectInvalidInternalToken() {
        assertThrows(ResponseStatusException.class, () -> service.validateInternalToken("wrong"));
    }

    @Test
    void shouldTreatDuplicateEventAsDuplicateRecipients() {
        doThrow(new DuplicateKeyException("duplicate")).when(repository).save(any());

        AppointmentConfirmedEventRequest request = new AppointmentConfirmedEventRequest(
                "event-1",
                Instant.parse("2026-04-05T10:00:00Z"),
                "apt-1",
                "appointment-service",
                new EventRecipient("patient-1", "Patient One", "patient@medicare.com", null),
                new EventRecipient("doctor-1", "Doctor One", "doctor@medicare.com", null),
                Instant.parse("2026-04-06T10:00:00Z"),
                "General checkup",
                "video",
                "N/A");

        TriggerAcceptedResponse response = service.handleAppointmentConfirmed(request);

        assertEquals(0, response.acceptedRecipients());
        assertEquals(4, response.duplicateRecipients());
    }

    @Test
    void shouldCreateEmailAndSmsRecordsWhenPhonesAreProvided() {
        AppointmentConfirmedEventRequest request = new AppointmentConfirmedEventRequest(
                "event-2",
                Instant.parse("2026-04-05T10:00:00Z"),
                "apt-2",
                "appointment-service",
                new EventRecipient("patient-1", "Patient One", "patient@medicare.com", "+94770000001"),
                new EventRecipient("doctor-1", "Doctor One", "doctor@medicare.com", "+94770000002"),
                Instant.parse("2026-04-06T10:00:00Z"),
                "General checkup",
                "video",
                "N/A");

        TriggerAcceptedResponse response = service.handleAppointmentConfirmed(request);

        assertEquals(8, response.acceptedRecipients());
        assertEquals(0, response.duplicateRecipients());
    }

    @Test
    void shouldCreateDoctorOnlyRecordsForAppointmentRequestedActivity() {
        org.mockito.Mockito.when(profileLookupService.resolvePatient("patient-1"))
                .thenReturn(new RecipientProfileLookupService.ResolvedRecipient(
                        "patient-1", "Patient One", "patient@medicare.com", "+94770000001"));
        org.mockito.Mockito.when(profileLookupService.resolveDoctor("doctor-1"))
                .thenReturn(new RecipientProfileLookupService.ResolvedRecipient(
                        "doctor-1", "Doctor One", "doctor@medicare.com", "+94770000002"));

        AppointmentActivityEventRequest request = new AppointmentActivityEventRequest(
                "activity-1",
                NotificationEventType.APPOINTMENT_REQUESTED,
                Instant.parse("2026-04-18T10:00:00Z"),
                "apt-3",
                "appointment-service",
                "patient-1",
                "Patient One",
                "doctor-1",
                "Doctor One",
                "General checkup",
                Instant.parse("2026-04-19T09:00:00Z"),
                "patient-1",
                "PATIENT");

        TriggerAcceptedResponse response = service.handleAppointmentActivity(request);

        assertEquals(3, response.acceptedRecipients());
        assertEquals(0, response.duplicateRecipients());
    }

    @Test
    void shouldSkipSmsWhenPhoneMissingInAppointmentActivity() {
        org.mockito.Mockito.when(profileLookupService.resolvePatient("patient-1"))
                .thenReturn(new RecipientProfileLookupService.ResolvedRecipient(
                        "patient-1", "Patient One", "patient@medicare.com", null));
        org.mockito.Mockito.when(profileLookupService.resolveDoctor("doctor-1"))
                .thenReturn(new RecipientProfileLookupService.ResolvedRecipient(
                        "doctor-1", "Doctor One", "doctor@medicare.com", "+94770000002"));

        AppointmentActivityEventRequest request = new AppointmentActivityEventRequest(
                "activity-2",
                NotificationEventType.APPOINTMENT_RESCHEDULED,
                Instant.parse("2026-04-18T12:00:00Z"),
                "apt-4",
                "appointment-service",
                "patient-1",
                "Patient One",
                "doctor-1",
                "Doctor One",
                "Follow-up",
                Instant.parse("2026-04-20T09:00:00Z"),
                "doctor-1",
                "DOCTOR");

        TriggerAcceptedResponse response = service.handleAppointmentActivity(request);

        assertEquals(5, response.acceptedRecipients());
        assertEquals(0, response.duplicateRecipients());
    }
}
