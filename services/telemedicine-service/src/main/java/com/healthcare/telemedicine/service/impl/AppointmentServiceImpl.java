package com.healthcare.telemedicine.service.impl;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.healthcare.telemedicine.dto.appointment.TelemedicineAppointmentResponse;
import com.healthcare.telemedicine.dto.appointment.TelemedicineAppointmentStatus;
import com.healthcare.telemedicine.event.TelemedicineEventPublisher;
import com.healthcare.telemedicine.exception.BadRequestException;
import com.healthcare.telemedicine.exception.ConflictException;
import com.healthcare.telemedicine.exception.ForbiddenException;
import com.healthcare.telemedicine.exception.NotFoundException;
import com.healthcare.telemedicine.integration.appointment.AppointmentGateway;
import com.healthcare.telemedicine.integration.appointment.ExternalAppointment;
import com.healthcare.telemedicine.integration.appointment.ExternalAppointmentStatus;
import com.healthcare.telemedicine.integration.appointment.TelemedicineAppointmentAdapter;
import com.healthcare.telemedicine.integration.notification.TelemedicineNotificationClient;
import com.healthcare.telemedicine.model.ConsultationSession;
import com.healthcare.telemedicine.model.enums.SessionStatus;
import com.healthcare.telemedicine.repository.ConsultationSessionRepository;
import com.healthcare.telemedicine.service.AppointmentService;
import com.healthcare.telemedicine.service.AuditLogService;

@Service
public class AppointmentServiceImpl implements AppointmentService {

    private static final String DOCTOR_ROLE = "DOCTOR";
    private static final String PATIENT_ROLE = "PATIENT";

    private final AppointmentGateway appointmentGateway;
    private final TelemedicineAppointmentAdapter appointmentAdapter;
    private final ConsultationSessionRepository sessionRepository;
    private final TelemedicineEventPublisher eventPublisher;
    private final AuditLogService auditLogService;
    private final TelemedicineNotificationClient notificationClient;

    public AppointmentServiceImpl(
            AppointmentGateway appointmentGateway,
            TelemedicineAppointmentAdapter appointmentAdapter,
            ConsultationSessionRepository sessionRepository,
            TelemedicineEventPublisher eventPublisher,
            AuditLogService auditLogService,
            TelemedicineNotificationClient notificationClient) {
        this.appointmentGateway = appointmentGateway;
        this.appointmentAdapter = appointmentAdapter;
        this.sessionRepository = sessionRepository;
        this.eventPublisher = eventPublisher;
        this.auditLogService = auditLogService;
        this.notificationClient = notificationClient;
    }

    @Override
    public List<TelemedicineAppointmentResponse> listAppointments(
            String doctorId,
            String patientId,
            TelemedicineAppointmentStatus status,
            LocalDate date,
            String actorId,
            String actorRole) {
        List<ExternalAppointment> externalAppointments;

        if (DOCTOR_ROLE.equals(actorRole)) {
            String resolvedDoctorId = StringUtils.hasText(doctorId) ? doctorId : actorId;
            if (!Objects.equals(resolvedDoctorId, actorId)) {
                throw new ForbiddenException("Doctors can only access their own appointments");
            }
            externalAppointments = appointmentGateway.listByDoctorId(resolvedDoctorId, actorId, actorRole);
        } else if (PATIENT_ROLE.equals(actorRole)) {
            String resolvedPatientId = StringUtils.hasText(patientId) ? patientId : actorId;
            if (!Objects.equals(resolvedPatientId, actorId)) {
                throw new ForbiddenException("Patients can only access their own appointments");
            }
            externalAppointments = appointmentGateway.listByPatientId(resolvedPatientId, actorId, actorRole);
        } else {
            throw new ForbiddenException("Unsupported role for appointment listing");
        }

        return externalAppointments.stream()
                .filter(appointmentAdapter::isTelemedicineAppointment)
                .map(appointmentAdapter::toTelemedicineAppointment)
                .filter(appointment -> status == null || appointment.getStatus() == status)
                .filter(appointment -> filterByDate(appointment, date))
                .sorted(Comparator.comparing(
                        TelemedicineAppointmentResponse::getScheduledAt,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    @Override
    public TelemedicineAppointmentResponse getAppointmentById(String appointmentId, String actorId, String actorRole) {
        ExternalAppointment externalAppointment = appointmentGateway.getById(appointmentId, actorId, actorRole);
        if (!appointmentAdapter.isTelemedicineAppointment(externalAppointment)) {
            throw new NotFoundException("Appointment not found");
        }
        return appointmentAdapter.toTelemedicineAppointment(externalAppointment);
    }

    @Override
    public TelemedicineAppointmentResponse acceptAppointment(String appointmentId, String actorId) {
        ExternalAppointment current = getDoctorOwnedTelemedicineAppointment(appointmentId, actorId);
        TelemedicineAppointmentStatus previousStatus = appointmentAdapter.toTelemedicineStatus(current);
        if (!(previousStatus == TelemedicineAppointmentStatus.PENDING || previousStatus == TelemedicineAppointmentStatus.RESCHEDULED)) {
            throw new ConflictException("Only pending or rescheduled appointments can be accepted");
        }

        ExternalAppointment updated = appointmentGateway.updateStatus(
                appointmentId,
                ExternalAppointmentStatus.CONFIRMED,
                current.notes(),
                actorId,
                DOCTOR_ROLE);
        TelemedicineAppointmentResponse mapped = appointmentAdapter.toTelemedicineAppointment(updated);
        auditStatusChange(mapped, previousStatus, mapped.getStatus(), actorId, "appointment.accepted");
        eventPublisher.publishAppointmentStatusUpdated(mapped);
        notificationClient.notifyAppointmentStatus(mapped);
        return mapped;
    }

    @Override
    public TelemedicineAppointmentResponse rejectAppointment(String appointmentId, String actorId, String reason) {
        if (!StringUtils.hasText(reason)) {
            throw new BadRequestException("Reject reason is required");
        }

        ExternalAppointment current = getDoctorOwnedTelemedicineAppointment(appointmentId, actorId);
        TelemedicineAppointmentStatus previousStatus = appointmentAdapter.toTelemedicineStatus(current);
        if (previousStatus == TelemedicineAppointmentStatus.REJECTED
                || previousStatus == TelemedicineAppointmentStatus.COMPLETED) {
            throw new ConflictException("Appointment cannot be rejected from current status");
        }

        ExternalAppointment updated = appointmentGateway.updateStatus(
                appointmentId,
                ExternalAppointmentStatus.CANCELLED,
                appointmentAdapter.buildRejectionNotes(reason),
                actorId,
                DOCTOR_ROLE);

        TelemedicineAppointmentResponse mapped = appointmentAdapter.toTelemedicineAppointment(updated);
        mapped.setRejectionReason(reason);
        cancelLinkedSession(mapped, actorId, "appointment.rejected");
        auditStatusChange(mapped, previousStatus, mapped.getStatus(), actorId, "appointment.rejected");
        eventPublisher.publishAppointmentStatusUpdated(mapped);
        notificationClient.notifyAppointmentStatus(mapped);
        return mapped;
    }

    @Override
    public TelemedicineAppointmentResponse rescheduleAppointment(
            String appointmentId,
            String actorId,
            Instant newScheduledAt,
            String reason) {
        if (newScheduledAt == null || !newScheduledAt.isAfter(Instant.now())) {
            throw new BadRequestException("newScheduledAt must be in the future");
        }
        if (!StringUtils.hasText(reason)) {
            throw new BadRequestException("Reschedule reason is required");
        }

        ExternalAppointment current = getDoctorOwnedTelemedicineAppointment(appointmentId, actorId);
        TelemedicineAppointmentStatus previousStatus = appointmentAdapter.toTelemedicineStatus(current);
        if (previousStatus == TelemedicineAppointmentStatus.REJECTED
                || previousStatus == TelemedicineAppointmentStatus.COMPLETED) {
            throw new ConflictException("Appointment cannot be rescheduled from current status");
        }

        appointmentGateway.reschedule(appointmentId, newScheduledAt, actorId, DOCTOR_ROLE);
        ExternalAppointment updated = appointmentGateway.updateStatus(
                appointmentId,
                ExternalAppointmentStatus.PENDING,
                appointmentAdapter.buildRescheduleNotes(reason),
                actorId,
                DOCTOR_ROLE);

        TelemedicineAppointmentResponse mapped = appointmentAdapter.toTelemedicineAppointment(updated);
        mapped.setStatus(TelemedicineAppointmentStatus.RESCHEDULED);
        mapped.setRescheduleReason(reason);
        mapped.setProposedScheduledAt(newScheduledAt);

        cancelLinkedSession(mapped, actorId, "appointment.rescheduled");
        auditStatusChange(mapped, previousStatus, mapped.getStatus(), actorId, "appointment.rescheduled");
        eventPublisher.publishAppointmentStatusUpdated(mapped);
        notificationClient.notifyAppointmentStatus(mapped);
        return mapped;
    }

    @Override
    public List<TelemedicineAppointmentResponse> listUpcomingAppointments(String doctorId, String actorId) {
        String resolvedDoctorId = StringUtils.hasText(doctorId) ? doctorId : actorId;
        if (!Objects.equals(resolvedDoctorId, actorId)) {
            throw new ForbiddenException("Doctors can only access their own upcoming appointments");
        }
        Instant now = Instant.now();
        List<ExternalAppointment> appointments = appointmentGateway.listByDoctorId(resolvedDoctorId, actorId, DOCTOR_ROLE);

        return appointments.stream()
                .filter(appointmentAdapter::isTelemedicineAppointment)
                .filter(appointmentAdapter::isEligibleForSession)
                .filter(appointment -> appointment.scheduledAt() != null && appointment.scheduledAt().isAfter(now))
                .map(appointmentAdapter::toTelemedicineAppointment)
                .sorted(Comparator.comparing(TelemedicineAppointmentResponse::getScheduledAt))
                .toList();
    }

    private boolean filterByDate(TelemedicineAppointmentResponse appointment, LocalDate date) {
        if (date == null || appointment.getScheduledAt() == null) {
            return true;
        }
        LocalDate scheduledDate = appointment.getScheduledAt().atZone(ZoneOffset.UTC).toLocalDate();
        return scheduledDate.equals(date);
    }

    private ExternalAppointment getDoctorOwnedTelemedicineAppointment(String appointmentId, String actorId) {
        ExternalAppointment appointment = appointmentGateway.getById(appointmentId, actorId, DOCTOR_ROLE);
        if (!Objects.equals(appointment.doctorId(), actorId)) {
            throw new ForbiddenException("Doctor can only modify their own appointments");
        }
        if (!appointmentAdapter.isTelemedicineAppointment(appointment)) {
            throw new NotFoundException("Appointment not found");
        }
        return appointment;
    }

    private void cancelLinkedSession(TelemedicineAppointmentResponse appointment, String actorId, String reason) {
        sessionRepository.findByAppointmentIdAndDeletedAtIsNull(appointment.getId())
                .ifPresent(session -> cancelSession(session, actorId, reason));
    }

    private void cancelSession(ConsultationSession session, String actorId, String reason) {
        if (session.getSessionStatus() == SessionStatus.COMPLETED || session.getSessionStatus() == SessionStatus.MISSED) {
            return;
        }
        SessionStatus previous = session.getSessionStatus();
        session.setSessionStatus(SessionStatus.CANCELLED);
        sessionRepository.save(session);

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("reason", reason);
        metadata.put("appointmentId", session.getAppointmentId());
        auditLogService.logStatusChange(
                "ConsultationSession",
                session.getId(),
                "session.cancelled",
                previous.name(),
                session.getSessionStatus().name(),
                actorId,
                metadata);
    }

    private void auditStatusChange(
            TelemedicineAppointmentResponse appointment,
            TelemedicineAppointmentStatus fromStatus,
            TelemedicineAppointmentStatus toStatus,
            String actorId,
            String action) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("patientId", appointment.getPatientId());
        metadata.put("doctorId", appointment.getDoctorId());
        metadata.put("scheduledAt", appointment.getScheduledAt());
        metadata.put("rejectionReason", appointment.getRejectionReason());
        metadata.put("rescheduleReason", appointment.getRescheduleReason());

        auditLogService.logStatusChange(
                "Appointment",
                appointment.getId(),
                action,
                fromStatus == null ? null : fromStatus.name(),
                toStatus == null ? null : toStatus.name(),
                actorId,
                metadata);
    }
}
