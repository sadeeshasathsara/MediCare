package com.healthcare.telemedicine.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.time.Instant;

import javax.crypto.SecretKey;

import org.junit.jupiter.api.Test;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

class JitsiServiceImplTest {

    @Test
    void generateJoinToken_shouldIncludeExpectedClaims() {
        String secret = "01234567890123456789012345678901";
        JitsiServiceImpl service = new JitsiServiceImpl(
                "meet.jit.si",
                "telemedicine-app",
                secret,
                120);

        Instant scheduledAt = Instant.now().plusSeconds(3600);
        String token = service.generateJoinToken(
                "consult-a1",
                "doctor-1",
                "Dr. Test",
                "doctor@test.com",
                true,
                scheduledAt);

        SecretKey key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();

        assertEquals("doctor-1", claims.getSubject());
        assertEquals("consult-a1", claims.get("room", String.class));
        assertTrue(claims.getExpiration().toInstant().isAfter(scheduledAt));
    }

    @Test
    void roomNameForAppointment_shouldFollowConvention() {
        JitsiServiceImpl service = new JitsiServiceImpl(
                "meet.jit.si",
                "telemedicine-app",
                "01234567890123456789012345678901",
                120);

        assertEquals("consult-apt-123", service.roomNameForAppointment("apt-123"));
    }

    @Test
    void isJwtConfigured_shouldBeFalseWhenCredentialsAreMissing() {
        JitsiServiceImpl service = new JitsiServiceImpl(
                "meet.jit.si",
                "",
                "",
                120);

        assertFalse(service.isJwtConfigured());
    }
}
