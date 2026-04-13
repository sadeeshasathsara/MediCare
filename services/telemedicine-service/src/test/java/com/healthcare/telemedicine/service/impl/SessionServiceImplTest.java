package com.healthcare.telemedicine.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import com.healthcare.telemedicine.dto.session.JoinTokenResponse;
import com.healthcare.telemedicine.event.TelemedicineEventPublisher;
import com.healthcare.telemedicine.model.Appointment;
import com.healthcare.telemedicine.model.ConsultationSession;
import com.healthcare.telemedicine.model.enums.AppointmentStatus;
import com.healthcare.telemedicine.model.enums.SessionStatus;
import com.healthcare.telemedicine.repository.AppointmentRepository;
import com.healthcare.telemedicine.repository.ConsultationSessionRepository;
import com.healthcare.telemedicine.service.AuditLogService;
import com.healthcare.telemedicine.service.JitsiService;

class SessionServiceImplTest {

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private ConsultationSessionRepository sessionRepository;

    @Mock
    private JitsiService jitsiService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private TelemedicineEventPublisher eventPublisher;

    private SessionServiceImpl sessionService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        sessionService = new SessionServiceImpl(
                appointmentRepository,
                sessionRepository,
                jitsiService,
                auditLogService,
                eventPublisher,
                15);
    }

    @Test
    void createSession_shouldCreatePublicRoomWithoutJwtToken() {
        Appointment appointment = Appointment.builder()
                .doctorId("doctor-1")
                .patientId("patient-1")
                .scheduledAt(Instant.parse("2026-04-13T10:00:00Z"))
                .status(AppointmentStatus.ACCEPTED)
                .build();
        appointment.setId("apt-1");

        when(appointmentRepository.findByIdAndDeletedAtIsNull("apt-1")).thenReturn(Optional.of(appointment));
        when(sessionRepository.findByAppointmentIdAndDeletedAtIsNull("apt-1")).thenReturn(Optional.empty());
        when(jitsiService.roomNameForAppointment("apt-1")).thenReturn("consult-apt-1");
        when(sessionRepository.save(any(ConsultationSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ConsultationSession created = sessionService.createSession("apt-1", "doctor-1");

        assertEquals("consult-apt-1", created.getJitsiRoomId());
        assertNull(created.getJitsiRoomToken());
        assertEquals(SessionStatus.SCHEDULED, created.getSessionStatus());
        verify(jitsiService, never()).generateJoinToken(any(), any(), any(), any(), any(Boolean.class), any());
    }

    @Test
    void generateJoinToken_shouldReturnPublicRoomAccess() {
        ConsultationSession session = ConsultationSession.builder()
                .appointmentId("apt-1")
                .doctorId("doctor-1")
                .patientId("patient-1")
                .scheduledAt(Instant.parse("2026-04-13T10:00:00Z"))
                .jitsiRoomId("consult-apt-1")
                .sessionStatus(SessionStatus.SCHEDULED)
                .build();
        session.setId("session-1");

        when(sessionRepository.findByIdAndDeletedAtIsNull("session-1")).thenReturn(Optional.of(session));
        when(jitsiService.getDomain()).thenReturn("meet.jit.si");

        JoinTokenResponse response = sessionService.generateJoinToken("session-1", "doctor", false, "doctor-1", "DOCTOR");

        assertEquals("session-1", response.getSessionId());
        assertEquals("consult-apt-1", response.getRoomId());
        assertEquals("meet.jit.si", response.getJitsiDomain());
        assertNull(response.getToken());
        assertNull(response.getExpiresAt());
        assertTrue(response.isPublicRoom());
        verify(jitsiService, never()).generateJoinToken(any(), any(), any(), any(), any(Boolean.class), any());
    }
}
