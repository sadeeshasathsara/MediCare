package com.healthcare.telemedicine.dto.session;

import com.healthcare.telemedicine.model.enums.SessionStatus;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SessionReadyResponse {
    String sessionId;
    boolean doctorJoined;
    boolean patientJoined;
    boolean ready;
    SessionStatus sessionStatus;
}
