package com.healthcare.telemedicine.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;

import com.healthcare.telemedicine.model.ConsultationSession;
import com.healthcare.telemedicine.model.enums.SessionStatus;

public interface ConsultationSessionRepository extends MongoRepository<ConsultationSession, String> {
    Optional<ConsultationSession> findByIdAndDeletedAtIsNull(String id);

    Optional<ConsultationSession> findByAppointmentIdAndDeletedAtIsNull(String appointmentId);

    List<ConsultationSession> findByDoctorIdAndDeletedAtIsNull(String doctorId, Sort sort);

    List<ConsultationSession> findByPatientIdAndDeletedAtIsNull(String patientId, Sort sort);

    List<ConsultationSession> findByDoctorIdAndSessionStatusAndDeletedAtIsNull(
            String doctorId,
            SessionStatus sessionStatus,
            Sort sort);

    List<ConsultationSession> findByPatientIdAndSessionStatusAndDeletedAtIsNull(
            String patientId,
            SessionStatus sessionStatus,
            Sort sort);

    List<ConsultationSession> findBySessionStatusInAndScheduledAtBeforeAndDeletedAtIsNull(
            List<SessionStatus> statuses,
            Instant scheduledAt);
}
