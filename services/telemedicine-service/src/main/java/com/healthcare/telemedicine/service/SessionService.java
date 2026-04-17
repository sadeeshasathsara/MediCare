package com.healthcare.telemedicine.service;

import java.util.List;

import com.healthcare.telemedicine.dto.session.JoinTokenResponse;
import com.healthcare.telemedicine.dto.session.SessionReadyResponse;
import com.healthcare.telemedicine.model.ConsultationSession;
import com.healthcare.telemedicine.model.enums.SessionStatus;

public interface SessionService {
    ConsultationSession createSession(String appointmentId, String actorId, String actorRole);

    ConsultationSession getSessionById(String sessionId, String actorId, String actorRole);

    JoinTokenResponse generateJoinToken(String sessionId, String role, boolean markJoined, String actorId,
            String actorRole);

    ConsultationSession startSession(String sessionId, String actorId);

    ConsultationSession endSession(String sessionId, String actorId);

    List<ConsultationSession> listSessions(
            String doctorId,
            String patientId,
            SessionStatus status,
            String actorId,
            String actorRole);

    SessionReadyResponse readiness(String sessionId, String actorId, String actorRole);

    int markMissedSessions();
}
