package com.healthcare.telemedicine.dto.session;

import java.time.Instant;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class JoinTokenResponse {
    String sessionId;
    String roomId;
    String jitsiDomain;
    String role;
    String token;
    Instant expiresAt;
    boolean publicRoom;
}
