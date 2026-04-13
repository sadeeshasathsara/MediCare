package com.healthcare.telemedicine.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import com.healthcare.telemedicine.event.TelemedicineEventPublisher;
import com.healthcare.telemedicine.exception.ConflictException;
import com.healthcare.telemedicine.model.Appointment;
import com.healthcare.telemedicine.model.enums.AppointmentStatus;
import com.healthcare.telemedicine.repository.AppointmentRepository;
import com.healthcare.telemedicine.repository.ConsultationSessionRepository;
import com.healthcare.telemedicine.service.AuditLogService;

class AppointmentServiceImplTest {

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private ConsultationSessionRepository sessionRepository;

    @Mock
    private TelemedicineEventPublisher eventPublisher;

    @Mock
    private AuditLogService auditLogService;

    private AppointmentServiceImpl appointmentService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        appointmentService = new AppointmentServiceImpl(
                appointmentRepository,
                sessionRepository,
                eventPublisher,
                auditLogService);
    }

    @Test
    void acceptAppointment_shouldTransitionFromPendingToAccepted() {
        Appointment pending = Appointment.builder()
                .doctorId("doctor-1")
                .patientId("patient-1")
                .scheduledAt(Instant.now().plusSeconds(3600))
                .status(AppointmentStatus.PENDING)
                .build();
        pending.setId("a1");

        when(appointmentRepository.findByIdAndDeletedAtIsNull("a1")).thenReturn(Optional.of(pending));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Appointment accepted = appointmentService.acceptAppointment("a1", "doctor-1");

        assertEquals(AppointmentStatus.ACCEPTED, accepted.getStatus());
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
        Appointment rejected = Appointment.builder()
                .doctorId("doctor-1")
                .status(AppointmentStatus.REJECTED)
                .build();
        rejected.setId("a2");
        when(appointmentRepository.findByIdAndDeletedAtIsNull("a2")).thenReturn(Optional.of(rejected));

        assertThrows(ConflictException.class, () -> appointmentService.acceptAppointment("a2", "doctor-1"));
    }
}
