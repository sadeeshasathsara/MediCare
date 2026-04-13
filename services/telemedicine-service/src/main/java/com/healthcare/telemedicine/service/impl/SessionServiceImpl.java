package com.healthcare.telemedicine.service.impl;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.healthcare.telemedicine.dto.session.JoinTokenResponse;
import com.healthcare.telemedicine.dto.session.SessionReadyResponse;
import com.healthcare.telemedicine.event.TelemedicineEventPublisher;
import com.healthcare.telemedicine.exception.ApiException;
import com.healthcare.telemedicine.exception.BadRequestException;
import com.healthcare.telemedicine.exception.ConflictException;
import com.healthcare.telemedicine.exception.ForbiddenException;
import com.healthcare.telemedicine.exception.NotFoundException;
import com.healthcare.telemedicine.integration.appointment.AppointmentGateway;
import com.healthcare.telemedicine.integration.appointment.ExternalAppointment;
import com.healthcare.telemedicine.integration.appointment.ExternalAppointmentStatus;
import com.healthcare.telemedicine.integration.appointment.TelemedicineAppointmentAdapter;
import com.healthcare.telemedicine.model.ConsultationSession;
import com.healthcare.telemedicine.model.enums.SessionStatus;
import com.healthcare.telemedicine.repository.ConsultationSessionRepository;
import com.healthcare.telemedicine.service.AuditLogService;
import com.healthcare.telemedicine.service.JitsiService;
import com.healthcare.telemedicine.service.SessionService;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class SessionServiceImpl implements SessionService {

    private static final Sort SESSION_SORT_DESC = Sort.by(Sort.Direction.DESC, "scheduledAt");
    private static final String DOCTOR_ROLE = "DOCTOR";
    private static final String PATIENT_ROLE = "PATIENT";

    private final AppointmentGateway appointmentGateway;
    private final TelemedicineAppointmentAdapter appointmentAdapter;
    private final ConsultationSessionRepository sessionRepository;
    private final JitsiService jitsiService;
    private final AuditLogService auditLogService;
    private final TelemedicineEventPublisher eventPublisher;
    private final int sessionGraceMinutes;

    public SessionServiceImpl(
            AppointmentGateway appointmentGateway,
            TelemedicineAppointmentAdapter appointmentAdapter,
            ConsultationSessionRepository sessionRepository,
            JitsiService jitsiService,
            AuditLogService auditLogService,
            TelemedicineEventPublisher eventPublisher,
            @Value("${telemedicine.session.grace-minutes:15}") int sessionGraceMinutes) {
        this.appointmentGateway = appointmentGateway;
        this.appointmentAdapter = appointmentAdapter;
        this.sessionRepository = sessionRepository;
        this.jitsiService = jitsiService;
        this.auditLogService = auditLogService;
        this.eventPublisher = eventPublisher;
        this.sessionGraceMinutes = sessionGraceMinutes;
    }

    @Override
    public ConsultationSession createSession(String appointmentId, String actorId) {
        ExternalAppointment appointment = appointmentGateway.getById(appointmentId, actorId, DOCTOR_ROLE);

        if (!Objects.equals(appointment.doctorId(), actorId)) {
            throw new ForbiddenException("Doctor can only create sessions for own appointments");
        }
        if (!appointmentAdapter.isTelemedicineAppointment(appointment)) {
            throw new NotFoundException("Appointment not found");
        }
        if (!appointmentAdapter.isEligibleForSession(appointment)) {
            throw new ConflictException("Session can only be created for confirmed appointments");
        }

        sessionRepository.findByAppointmentIdAndDeletedAtIsNull(appointmentId).ifPresent(existing -> {
            throw new ConflictException("Session already exists for this appointment");
        });

        String roomId = jitsiService.roomNameForAppointment(appointmentId);
        String roomToken = null;

        ConsultationSession session = ConsultationSession.builder()
                .appointmentId(appointmentId)
                .patientId(appointment.patientId())
                .doctorId(appointment.doctorId())
                .scheduledAt(appointment.scheduledAt())
                .jitsiRoomId(roomId)
                .jitsiRoomToken(roomToken)
                .sessionStatus(SessionStatus.SCHEDULED)
                .build();

        ConsultationSession saved = sessionRepository.save(session);
        auditStatusChange(saved, null, SessionStatus.SCHEDULED, actorId, "session.created", null);
        return saved;
    }

    @Override
    public ConsultationSession getSessionById(String sessionId, String actorId, String actorRole) {
        ConsultationSession session = findSession(sessionId);
        validateReadAccess(session, actorId, actorRole);
        return session;
    }

    @Override
    public JoinTokenResponse generateJoinToken(String sessionId, String role, boolean markJoined, String actorId, String actorRole) {
        ConsultationSession session = findSession(sessionId);

        String normalizedRequestedRole = normalizeRole(role);
        validateRoleForSession(session, normalizedRequestedRole, actorId, actorRole);

        boolean moderator = "DOCTOR".equals(normalizedRequestedRole);
        boolean publicRoom = true;
        String token = null;

        if (markJoined) {
            SessionStatus before = session.getSessionStatus();
            if (moderator) {
                session.setDoctorJoinedAt(Instant.now());
            } else {
                session.setPatientJoinedAt(Instant.now());
            }
            if (before == SessionStatus.SCHEDULED) {
                session.setSessionStatus(SessionStatus.WAITING);
            }
            ConsultationSession saved = sessionRepository.save(session);
            if (before != saved.getSessionStatus()) {
                auditStatusChange(saved, before, saved.getSessionStatus(), actorId, "session.waiting", null);
            }
        }

        return JoinTokenResponse.builder()
                .sessionId(session.getId())
                .roomId(session.getJitsiRoomId())
                .jitsiDomain(jitsiService.getDomain())
                .role(normalizedRequestedRole.toLowerCase())
                .token(token)
                .expiresAt(null)
                .publicRoom(publicRoom)
                .build();
    }

    @Override
    public ConsultationSession startSession(String sessionId, String actorId) {
        ConsultationSession session = findSession(sessionId);
        enforceDoctorOwner(session, actorId);

        SessionStatus previous = session.getSessionStatus();
        if (!(previous == SessionStatus.SCHEDULED || previous == SessionStatus.WAITING)) {
            throw new ConflictException("Only SCHEDULED or WAITING sessions can be started");
        }

        session.setSessionStatus(SessionStatus.LIVE);
        session.setStartedAt(Instant.now());
        ConsultationSession saved = sessionRepository.save(session);
        auditStatusChange(saved, previous, saved.getSessionStatus(), actorId, "session.started", null);
        return saved;
    }

    @Override
    public ConsultationSession endSession(String sessionId, String actorId) {
        ConsultationSession session = findSession(sessionId);
        enforceDoctorOwner(session, actorId);

        if (session.getSessionStatus() != SessionStatus.LIVE) {
            throw new ConflictException("Only LIVE sessions can be ended");
        }

        SessionStatus previous = session.getSessionStatus();
        Instant endTime = Instant.now();
        session.setEndedAt(endTime);
        session.setSessionStatus(SessionStatus.COMPLETED);
        session.setDurationSeconds(session.getStartedAt() == null ? 0L : session.getStartedAt().until(endTime, ChronoUnit.SECONDS));

        ConsultationSession saved = sessionRepository.save(session);
        auditStatusChange(saved, previous, saved.getSessionStatus(), actorId, "session.ended", null);
        eventPublisher.publishConsultationCompleted(saved);
        syncAppointmentCompletion(saved, actorId);
        return saved;
    }

    @Override
    public List<ConsultationSession> listSessions(
            String doctorId,
            String patientId,
            SessionStatus status,
            String actorId,
            String actorRole) {
        if (DOCTOR_ROLE.equals(actorRole)) {
            String resolvedDoctorId = StringUtils.hasText(doctorId) ? doctorId : actorId;
            if (!Objects.equals(resolvedDoctorId, actorId)) {
                throw new ForbiddenException("Doctors can only access their own sessions");
            }
            return status == null
                    ? sessionRepository.findByDoctorIdAndDeletedAtIsNull(resolvedDoctorId, SESSION_SORT_DESC)
                    : sessionRepository.findByDoctorIdAndSessionStatusAndDeletedAtIsNull(
                            resolvedDoctorId,
                            status,
                            SESSION_SORT_DESC);
        }

        if (PATIENT_ROLE.equals(actorRole)) {
            String resolvedPatientId = StringUtils.hasText(patientId) ? patientId : actorId;
            if (!Objects.equals(resolvedPatientId, actorId)) {
                throw new ForbiddenException("Patients can only access their own sessions");
            }
            return status == null
                    ? sessionRepository.findByPatientIdAndDeletedAtIsNull(resolvedPatientId, SESSION_SORT_DESC)
                    : sessionRepository.findByPatientIdAndSessionStatusAndDeletedAtIsNull(
                            resolvedPatientId,
                            status,
                            SESSION_SORT_DESC);
        }

        throw new ForbiddenException("Unsupported role for session listing");
    }

    @Override
    public SessionReadyResponse readiness(String sessionId, String actorId, String actorRole) {
        ConsultationSession session = findSession(sessionId);
        validateReadAccess(session, actorId, actorRole);

        boolean doctorJoined = session.getDoctorJoinedAt() != null;
        boolean patientJoined = session.getPatientJoinedAt() != null;
        return SessionReadyResponse.builder()
                .sessionId(session.getId())
                .doctorJoined(doctorJoined)
                .patientJoined(patientJoined)
                .ready(doctorJoined && patientJoined)
                .sessionStatus(session.getSessionStatus())
                .build();
    }

    @Override
    public int markMissedSessions() {
        Instant cutoff = Instant.now().minus(sessionGraceMinutes, ChronoUnit.MINUTES);
        List<ConsultationSession> staleSessions = sessionRepository.findBySessionStatusInAndScheduledAtBeforeAndDeletedAtIsNull(
                List.of(SessionStatus.SCHEDULED, SessionStatus.WAITING),
                cutoff);

        int updated = 0;
        for (ConsultationSession session : staleSessions) {
            SessionStatus previous = session.getSessionStatus();
            session.setSessionStatus(SessionStatus.MISSED);
            session.setEndedAt(Instant.now());
            session.setDurationSeconds(0L);
            sessionRepository.save(session);
            auditStatusChange(session, previous, SessionStatus.MISSED, "system", "session.auto_missed", Map.of("cutoff", cutoff));
            updated++;
        }
        return updated;
    }

    private ConsultationSession findSession(String sessionId) {
        return sessionRepository.findByIdAndDeletedAtIsNull(sessionId)
                .orElseThrow(() -> new NotFoundException("Session not found"));
    }

    private void validateReadAccess(ConsultationSession session, String actorId, String actorRole) {
        if (DOCTOR_ROLE.equals(actorRole) && Objects.equals(session.getDoctorId(), actorId)) {
            return;
        }
        if (PATIENT_ROLE.equals(actorRole) && canReadPatientOwnedResource(actorId, session.getPatientId())) {
            return;
        }
        throw new ForbiddenException("You do not have access to this session");
    }

    private void validateRoleForSession(
            ConsultationSession session,
            String requestedRole,
            String actorId,
            String actorRole) {
        if (!requestedRole.equals(actorRole)) {
            throw new ForbiddenException("Requested join role does not match authenticated role");
        }
        if (DOCTOR_ROLE.equals(requestedRole) && !Objects.equals(session.getDoctorId(), actorId)) {
            throw new ForbiddenException("Doctor can only join own sessions");
        }
        if (PATIENT_ROLE.equals(requestedRole) && !canReadPatientOwnedResource(actorId, session.getPatientId())) {
            throw new ForbiddenException("Patient can only join own sessions");
        }
    }

    private boolean canReadPatientOwnedResource(String actorId, String resourcePatientId) {
        return Objects.equals(actorId, resourcePatientId);
    }

    private void enforceDoctorOwner(ConsultationSession session, String actorId) {
        if (!Objects.equals(session.getDoctorId(), actorId)) {
            throw new ForbiddenException("Doctor can only modify own sessions");
        }
    }

    private String normalizeRole(String role) {
        if (!StringUtils.hasText(role)) {
            throw new BadRequestException("role query param is required");
        }
        String normalized = role.trim().toUpperCase();
        if (!"DOCTOR".equals(normalized) && !"PATIENT".equals(normalized)) {
            throw new BadRequestException("role must be doctor or patient");
        }
        return normalized;
    }

    private void auditStatusChange(
            ConsultationSession session,
            SessionStatus fromStatus,
            SessionStatus toStatus,
            String actorId,
            String action,
            Map<String, Object> extraMetadata) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("appointmentId", session.getAppointmentId());
        metadata.put("doctorId", session.getDoctorId());
        metadata.put("patientId", session.getPatientId());
        metadata.put("scheduledAt", session.getScheduledAt());
        if (extraMetadata != null) {
            metadata.putAll(extraMetadata);
        }

        auditLogService.logStatusChange(
                "ConsultationSession",
                session.getId(),
                action,
                fromStatus == null ? null : fromStatus.name(),
                toStatus == null ? null : toStatus.name(),
                actorId,
                metadata);
    }

    private void syncAppointmentCompletion(ConsultationSession session, String actorId) {
        try {
            appointmentGateway.updateStatus(
                    session.getAppointmentId(),
                    ExternalAppointmentStatus.COMPLETED,
                    "Telemedicine consultation completed",
                    actorId,
                    DOCTOR_ROLE);
        } catch (ApiException ex) {
            log.warn(
                    "Session {} completed, but appointment {} completion status update failed: {}",
                    session.getId(),
                    session.getAppointmentId(),
                    ex.getMessage());
        }
    }
}
