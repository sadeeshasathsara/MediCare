package com.healthcare.telemedicine.service.impl;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.healthcare.telemedicine.dto.appointment.SyncAppointmentRequest;
import com.healthcare.telemedicine.event.TelemedicineEventPublisher;
import com.healthcare.telemedicine.exception.BadRequestException;
import com.healthcare.telemedicine.exception.ConflictException;
import com.healthcare.telemedicine.exception.ForbiddenException;
import com.healthcare.telemedicine.exception.NotFoundException;
import com.healthcare.telemedicine.model.Appointment;
import com.healthcare.telemedicine.model.ConsultationSession;
import com.healthcare.telemedicine.model.enums.AppointmentStatus;
import com.healthcare.telemedicine.model.enums.SessionStatus;
import com.healthcare.telemedicine.repository.AppointmentRepository;
import com.healthcare.telemedicine.repository.ConsultationSessionRepository;
import com.healthcare.telemedicine.service.AppointmentService;
import com.healthcare.telemedicine.service.AuditLogService;

@Service
public class AppointmentServiceImpl implements AppointmentService {

    private static final Sort APPOINTMENT_SORT_ASC = Sort.by(Sort.Direction.ASC, "scheduledAt");

    private final AppointmentRepository appointmentRepository;
    private final ConsultationSessionRepository sessionRepository;
    private final TelemedicineEventPublisher eventPublisher;
    private final AuditLogService auditLogService;

    public AppointmentServiceImpl(
            AppointmentRepository appointmentRepository,
            ConsultationSessionRepository sessionRepository,
            TelemedicineEventPublisher eventPublisher,
            AuditLogService auditLogService) {
        this.appointmentRepository = appointmentRepository;
        this.sessionRepository = sessionRepository;
        this.eventPublisher = eventPublisher;
        this.auditLogService = auditLogService;
    }

    @Override
    public Appointment syncAppointment(SyncAppointmentRequest request, String actorId) {
        Appointment appointment = appointmentRepository.findByIdAndDeletedAtIsNull(request.getId())
                .orElseGet(Appointment::new);

        AppointmentStatus previousStatus = appointment.getStatus();

        appointment.setId(request.getId());
        appointment.setPatientId(request.getPatientId());
        appointment.setDoctorId(request.getDoctorId());
        appointment.setScheduledAt(request.getScheduledAt());
        appointment.setStatus(request.getStatus() == null ? AppointmentStatus.PENDING : request.getStatus());
        appointment.setReasonForVisit(request.getReasonForVisit());
        appointment.setNotes(request.getNotes());

        Appointment saved = appointmentRepository.save(appointment);

        if (previousStatus != null && previousStatus != saved.getStatus()) {
            auditStatusChange(saved, previousStatus, saved.getStatus(), actorId, "appointment.synced");
        }
        return saved;
    }

    @Override
    public List<Appointment> listAppointments(
            String doctorId,
            String patientId,
            AppointmentStatus status,
            LocalDate date,
            String actorId,
            String actorRole) {
        if ("DOCTOR".equals(actorRole)) {
            String resolvedDoctorId = StringUtils.hasText(doctorId) ? doctorId : actorId;
            if (!Objects.equals(resolvedDoctorId, actorId)) {
                throw new ForbiddenException("Doctors can only access their own appointments");
            }
            return listDoctorAppointments(resolvedDoctorId, status, date);
        }

        if ("PATIENT".equals(actorRole)) {
            String resolvedPatientId = StringUtils.hasText(patientId) ? patientId : actorId;
            if (!Objects.equals(resolvedPatientId, actorId)) {
                throw new ForbiddenException("Patients can only access their own appointments");
            }

            List<Appointment> appointments = appointmentRepository.findByPatientIdAndDeletedAtIsNull(
                    resolvedPatientId,
                    APPOINTMENT_SORT_ASC);
            return appointments.stream()
                    .filter(a -> status == null || a.getStatus() == status)
                    .filter(a -> filterByDate(a, date))
                    .toList();
        }

        throw new ForbiddenException("Unsupported role for appointment listing");
    }

    @Override
    public Appointment getAppointmentById(String appointmentId, String actorId, String actorRole) {
        Appointment appointment = findAppointment(appointmentId);
        validateReadAccess(appointment, actorId, actorRole);
        return appointment;
    }

    @Override
    public Appointment acceptAppointment(String appointmentId, String actorId) {
        Appointment appointment = findAppointment(appointmentId);
        enforceDoctorOwner(appointment, actorId);

        AppointmentStatus previousStatus = appointment.getStatus();
        if (!(previousStatus == AppointmentStatus.PENDING || previousStatus == AppointmentStatus.RESCHEDULED)) {
            throw new ConflictException("Only PENDING or RESCHEDULED appointments can be accepted");
        }

        appointment.setStatus(AppointmentStatus.ACCEPTED);
        appointment.setRejectionReason(null);
        appointment.setRescheduleReason(null);
        appointment.setProposedScheduledAt(null);

        Appointment saved = appointmentRepository.save(appointment);
        auditStatusChange(saved, previousStatus, saved.getStatus(), actorId, "appointment.accepted");
        eventPublisher.publishAppointmentStatusUpdated(saved);
        return saved;
    }

    @Override
    public Appointment rejectAppointment(String appointmentId, String actorId, String reason) {
        if (!StringUtils.hasText(reason)) {
            throw new BadRequestException("Reject reason is required");
        }

        Appointment appointment = findAppointment(appointmentId);
        enforceDoctorOwner(appointment, actorId);

        AppointmentStatus previousStatus = appointment.getStatus();
        if (!(previousStatus == AppointmentStatus.PENDING
                || previousStatus == AppointmentStatus.ACCEPTED
                || previousStatus == AppointmentStatus.RESCHEDULED)) {
            throw new ConflictException("Appointment cannot be rejected from current status");
        }

        appointment.setStatus(AppointmentStatus.REJECTED);
        appointment.setRejectionReason(reason);
        appointment.setProposedScheduledAt(null);
        appointment.setRescheduleReason(null);

        Appointment saved = appointmentRepository.save(appointment);
        cancelLinkedSession(saved, actorId, "appointment.rejected");
        auditStatusChange(saved, previousStatus, saved.getStatus(), actorId, "appointment.rejected");
        eventPublisher.publishAppointmentStatusUpdated(saved);
        return saved;
    }

    @Override
    public Appointment rescheduleAppointment(String appointmentId, String actorId, Instant newScheduledAt, String reason) {
        if (newScheduledAt == null || !newScheduledAt.isAfter(Instant.now())) {
            throw new BadRequestException("newScheduledAt must be in the future");
        }
        if (!StringUtils.hasText(reason)) {
            throw new BadRequestException("Reschedule reason is required");
        }

        Appointment appointment = findAppointment(appointmentId);
        enforceDoctorOwner(appointment, actorId);

        AppointmentStatus previousStatus = appointment.getStatus();
        if (!(previousStatus == AppointmentStatus.PENDING
                || previousStatus == AppointmentStatus.ACCEPTED
                || previousStatus == AppointmentStatus.RESCHEDULED)) {
            throw new ConflictException("Appointment cannot be rescheduled from current status");
        }

        appointment.setStatus(AppointmentStatus.RESCHEDULED);
        appointment.setScheduledAt(newScheduledAt);
        appointment.setProposedScheduledAt(newScheduledAt);
        appointment.setRescheduleReason(reason);
        appointment.setRejectionReason(null);

        Appointment saved = appointmentRepository.save(appointment);
        cancelLinkedSession(saved, actorId, "appointment.rescheduled");
        auditStatusChange(saved, previousStatus, saved.getStatus(), actorId, "appointment.rescheduled");
        eventPublisher.publishAppointmentStatusUpdated(saved);
        return saved;
    }

    @Override
    public List<Appointment> listUpcomingAppointments(String doctorId, String actorId) {
        String resolvedDoctorId = StringUtils.hasText(doctorId) ? doctorId : actorId;
        if (!Objects.equals(resolvedDoctorId, actorId)) {
            throw new ForbiddenException("Doctors can only access their own upcoming appointments");
        }
        return appointmentRepository.findByDoctorIdAndStatusAndScheduledAtAfterAndDeletedAtIsNull(
                resolvedDoctorId,
                AppointmentStatus.ACCEPTED,
                Instant.now(),
                APPOINTMENT_SORT_ASC);
    }

    private List<Appointment> listDoctorAppointments(String doctorId, AppointmentStatus status, LocalDate date) {
        if (status != null && date != null) {
            Instant start = date.atStartOfDay().toInstant(ZoneOffset.UTC);
            Instant end = date.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
            return appointmentRepository.findByDoctorIdAndStatusAndScheduledAtBetweenAndDeletedAtIsNull(
                    doctorId,
                    status,
                    start,
                    end,
                    APPOINTMENT_SORT_ASC);
        }

        if (status != null) {
            return appointmentRepository.findByDoctorIdAndStatusAndDeletedAtIsNull(
                    doctorId,
                    status,
                    APPOINTMENT_SORT_ASC);
        }

        List<Appointment> appointments = appointmentRepository.findByDoctorIdAndDeletedAtIsNull(doctorId, APPOINTMENT_SORT_ASC);
        if (date == null) {
            return appointments;
        }
        return appointments.stream().filter(a -> filterByDate(a, date)).toList();
    }

    private boolean filterByDate(Appointment appointment, LocalDate date) {
        if (date == null || appointment.getScheduledAt() == null) {
            return true;
        }
        LocalDate scheduledDate = appointment.getScheduledAt().atZone(ZoneOffset.UTC).toLocalDate();
        return scheduledDate.equals(date);
    }

    private Appointment findAppointment(String appointmentId) {
        return appointmentRepository.findByIdAndDeletedAtIsNull(appointmentId)
                .orElseThrow(() -> new NotFoundException("Appointment not found"));
    }

    private void enforceDoctorOwner(Appointment appointment, String actorId) {
        if (!Objects.equals(appointment.getDoctorId(), actorId)) {
            throw new ForbiddenException("Doctor can only modify their own appointments");
        }
    }

    private void validateReadAccess(Appointment appointment, String actorId, String actorRole) {
        if ("DOCTOR".equals(actorRole) && Objects.equals(appointment.getDoctorId(), actorId)) {
            return;
        }
        if ("PATIENT".equals(actorRole) && Objects.equals(appointment.getPatientId(), actorId)) {
            return;
        }
        throw new ForbiddenException("You do not have access to this appointment");
    }

    private void cancelLinkedSession(Appointment appointment, String actorId, String reason) {
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
            Appointment appointment,
            AppointmentStatus fromStatus,
            AppointmentStatus toStatus,
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
