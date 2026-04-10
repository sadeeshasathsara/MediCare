package com.healthcare.telemedicine.service.impl;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.healthcare.telemedicine.exception.BadRequestException;
import com.healthcare.telemedicine.exception.ConflictException;
import com.healthcare.telemedicine.exception.ForbiddenException;
import com.healthcare.telemedicine.exception.NotFoundException;
import com.healthcare.telemedicine.model.ConsultationRecord;
import com.healthcare.telemedicine.model.ConsultationSession;
import com.healthcare.telemedicine.model.enums.SessionStatus;
import com.healthcare.telemedicine.repository.ConsultationRecordRepository;
import com.healthcare.telemedicine.repository.ConsultationSessionRepository;
import com.healthcare.telemedicine.service.ConsultationService;

@Service
public class ConsultationServiceImpl implements ConsultationService {

    private final ConsultationRecordRepository consultationRecordRepository;
    private final ConsultationSessionRepository sessionRepository;

    public ConsultationServiceImpl(
            ConsultationRecordRepository consultationRecordRepository,
            ConsultationSessionRepository sessionRepository) {
        this.consultationRecordRepository = consultationRecordRepository;
        this.sessionRepository = sessionRepository;
    }

    @Override
    public ConsultationRecord createRecord(
            String sessionId,
            String doctorNotes,
            String diagnosis,
            LocalDate followUpDate,
            String actorId) {
        ConsultationSession session = sessionRepository.findByIdAndDeletedAtIsNull(sessionId)
                .orElseThrow(() -> new NotFoundException("Session not found"));

        if (!Objects.equals(session.getDoctorId(), actorId)) {
            throw new ForbiddenException("Doctor can only create records for own sessions");
        }
        if (session.getSessionStatus() != SessionStatus.COMPLETED) {
            throw new ConflictException("Consultation record can be created only after session completion");
        }
        consultationRecordRepository.findBySessionIdAndDeletedAtIsNull(sessionId)
                .ifPresent(existing -> {
                    throw new ConflictException("Consultation record already exists for this session");
                });

        ConsultationRecord record = ConsultationRecord.builder()
                .sessionId(session.getId())
                .appointmentId(session.getAppointmentId())
                .doctorId(session.getDoctorId())
                .patientId(session.getPatientId())
                .doctorNotes(doctorNotes)
                .diagnosis(diagnosis)
                .followUpDate(followUpDate)
                .build();

        return consultationRecordRepository.save(record);
    }

    @Override
    public ConsultationRecord getById(String consultationId, String actorId, String actorRole) {
        ConsultationRecord record = findRecord(consultationId);
        validateReadAccess(record, actorId, actorRole);
        return record;
    }

    @Override
    public List<ConsultationRecord> listByPatientOrDoctor(String patientId, String doctorId, String actorId, String actorRole) {
        if ("PATIENT".equals(actorRole)) {
            String resolvedPatientId = StringUtils.hasText(patientId) ? patientId : actorId;
            if (!Objects.equals(resolvedPatientId, actorId)) {
                throw new ForbiddenException("Patients can only access their own consultation records");
            }
            return consultationRecordRepository.findByPatientIdAndDeletedAtIsNullOrderByCreatedAtDesc(resolvedPatientId);
        }

        if ("DOCTOR".equals(actorRole)) {
            String resolvedDoctorId = StringUtils.hasText(doctorId) ? doctorId : actorId;
            if (!Objects.equals(resolvedDoctorId, actorId)) {
                throw new ForbiddenException("Doctors can only access their own consultation records");
            }
            return consultationRecordRepository.findByDoctorIdAndDeletedAtIsNullOrderByCreatedAtDesc(resolvedDoctorId);
        }

        throw new ForbiddenException("Unsupported role for consultation listing");
    }

    @Override
    public ConsultationRecord updateRecord(
            String consultationId,
            String doctorNotes,
            String diagnosis,
            LocalDate followUpDate,
            String actorId) {
        ConsultationRecord record = findRecord(consultationId);
        if (!Objects.equals(record.getDoctorId(), actorId)) {
            throw new ForbiddenException("Doctor can only update own consultation records");
        }
        if (!StringUtils.hasText(doctorNotes) && !StringUtils.hasText(diagnosis) && followUpDate == null) {
            throw new BadRequestException("Provide at least one field to update");
        }

        if (StringUtils.hasText(doctorNotes)) {
            record.setDoctorNotes(doctorNotes);
        }
        if (StringUtils.hasText(diagnosis)) {
            record.setDiagnosis(diagnosis);
        }
        if (followUpDate != null) {
            record.setFollowUpDate(followUpDate);
        }

        return consultationRecordRepository.save(record);
    }

    private ConsultationRecord findRecord(String consultationId) {
        return consultationRecordRepository.findByIdAndDeletedAtIsNull(consultationId)
                .orElseThrow(() -> new NotFoundException("Consultation record not found"));
    }

    private void validateReadAccess(ConsultationRecord record, String actorId, String actorRole) {
        if ("DOCTOR".equals(actorRole) && Objects.equals(record.getDoctorId(), actorId)) {
            return;
        }
        if ("PATIENT".equals(actorRole) && Objects.equals(record.getPatientId(), actorId)) {
            return;
        }
        throw new ForbiddenException("You do not have access to this consultation record");
    }
}
