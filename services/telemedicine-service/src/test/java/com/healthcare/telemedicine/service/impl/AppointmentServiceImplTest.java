package com.healthcare.telemedicine.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import com.healthcare.telemedicine.event.TelemedicineEventPublisher;
import com.healthcare.telemedicine.exception.ConflictException;
import com.healthcare.telemedicine.dto.appointment.TelemedicineAppointmentResponse;
import com.healthcare.telemedicine.dto.appointment.TelemedicineAppointmentStatus;
import com.healthcare.telemedicine.integration.appointment.AppointmentGateway;
import com.healthcare.telemedicine.integration.appointment.ExternalAppointment;
import com.healthcare.telemedicine.integration.appointment.ExternalAppointmentStatus;
import com.healthcare.telemedicine.integration.appointment.TelemedicineAppointmentAdapter;
import com.healthcare.telemedicine.repository.ConsultationSessionRepository;
import com.healthcare.telemedicine.service.AuditLogService;

class AppointmentServiceImplTest {

    @Mock
    private AppointmentGateway appointmentGateway;

    @Mock
    private ConsultationSessionRepository sessionRepository;

    @Mock
    private TelemedicineEventPublisher eventPublisher;

    @Mock
    private AuditLogService auditLogService;

    private TelemedicineAppointmentAdapter appointmentAdapter;
    private AppointmentServiceImpl appointmentService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        appointmentAdapter = new TelemedicineAppointmentAdapter("telemedicine");
        appointmentService = new AppointmentServiceImpl(
                appointmentGateway,
                appointmentAdapter,
                sessionRepository,
                eventPublisher,
                auditLogService);
    }

    @Test
    void acceptAppointment_shouldTransitionFromPendingToAccepted() {
        ExternalAppointment pending = new ExternalAppointment(
                "a1",
                "doctor-1",
                "patient-1",
                "Patient One",
                "Dr. Smith",
                "Cardiology",
                ExternalAppointmentStatus.PENDING,
                Instant.now().plusSeconds(3600),
                "Telemedicine follow-up",
                "",
                Instant.now(),
                Instant.now());

        ExternalAppointment confirmed = new ExternalAppointment(
                "a1",
                "doctor-1",
                "patient-1",
                "Patient One",
                "Dr. Smith",
                "Cardiology",
                ExternalAppointmentStatus.CONFIRMED,
                pending.scheduledAt(),
                "Telemedicine follow-up",
                "",
                pending.createdAt(),
                Instant.now());

        when(appointmentGateway.getById("a1", "doctor-1", "DOCTOR")).thenReturn(pending);
        when(appointmentGateway.updateStatus(
                eq("a1"),
                eq(ExternalAppointmentStatus.CONFIRMED),
                eq(""),
                eq("doctor-1"),
                eq("DOCTOR"))).thenReturn(confirmed);

        TelemedicineAppointmentResponse accepted = appointmentService.acceptAppointment("a1", "doctor-1");

        assertEquals(TelemedicineAppointmentStatus.ACCEPTED, accepted.getStatus());
        verify(eventPublisher).publishAppointmentStatusUpdated(accepted);
        verify(auditLogService).logStatusChange(
                any(String.class),
                any(String.class),
                any(String.class),
                any(),
                any(),
                any(String.class),
                any());
    }

    @Test
    void acceptAppointment_shouldThrowWhenStatusIsRejected() {
        ExternalAppointment cancelled = new ExternalAppointment(
                "a2",
                "doctor-1",
                "patient-1",
                "Patient One",
                "Dr. Smith",
                "Cardiology",
                ExternalAppointmentStatus.CANCELLED,
                Instant.now().plusSeconds(3600),
                "Telemedicine follow-up",
                "",
                Instant.now(),
                Instant.now());
        when(appointmentGateway.getById("a2", "doctor-1", "DOCTOR")).thenReturn(cancelled);

        assertThrows(ConflictException.class, () -> appointmentService.acceptAppointment("a2", "doctor-1"));
    }
}
