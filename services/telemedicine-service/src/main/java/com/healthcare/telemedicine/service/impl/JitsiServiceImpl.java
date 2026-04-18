package com.healthcare.telemedicine.service.impl;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.healthcare.telemedicine.exception.BadRequestException;
import com.healthcare.telemedicine.service.JitsiService;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SecureDigestAlgorithm;

@Service
public class JitsiServiceImpl implements JitsiService {

    private final String domain;
    private final String appId;
    private final String appSecret;
    private final int tokenValidityMinutes;

    public JitsiServiceImpl(
            @Value("${jitsi.domain}") String domain,
            @Value("${jitsi.app-id}") String appId,
            @Value("${jitsi.app-secret}") String appSecret,
            @Value("${jitsi.token-validity-minutes:120}") int tokenValidityMinutes) {
        this.domain = domain;
        this.appId = appId;
        this.appSecret = appSecret;
        this.tokenValidityMinutes = tokenValidityMinutes;
    }

    @Override
    public String roomNameForAppointment(String appointmentId) {
        return "consult-" + appointmentId;
    }

    @Override
    public boolean isJwtConfigured() {
        if (domain != null && domain.trim().equalsIgnoreCase("meet.jit.si")) {
            // Public meet.jit.si does not support validating custom JWTs signed with your private secret.
            return false;
        }
        return appId != null && !appId.isBlank() && appSecret != null && !appSecret.isBlank();
    }

    @Override
    public String generateJoinToken(
            String roomId,
            String userId,
            String name,
            String email,
            boolean moderator,
            Instant scheduledAt) {
        if (!isJwtConfigured()) {
            throw new BadRequestException("Jitsi credentials are not configured");
        }

        SecretKey signingKey = Keys.hmacShaKeyFor(appSecret.getBytes(StandardCharsets.UTF_8));
        SecureDigestAlgorithm<SecretKey, ?> algorithm = Jwts.SIG.HS256;
        Instant now = Instant.now();
        Instant exp = tokenExpiry(scheduledAt);

        Map<String, Object> userContext = new LinkedHashMap<>();
        userContext.put("id", userId);
        userContext.put("name", (name == null || name.isBlank()) ? userId : name);
        userContext.put("email", (email == null || email.isBlank()) ? (userId + "@medicare.local") : email);
        userContext.put("moderator", moderator);

        Map<String, Object> context = new LinkedHashMap<>();
        context.put("user", userContext);

        String resolvedName = (String) userContext.get("name");
        String resolvedEmail = (String) userContext.get("email");

        return Jwts.builder()
                .issuer(appId)
                .subject(userId)
                .audience().add("jitsi").and()
                .claim("room", roomId)
                .claim("name", resolvedName)
                .claim("email", resolvedEmail)
                .claim("moderator", moderator)
                .claim("context", context)
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
            .signWith(signingKey, algorithm)
                .compact();
    }

    @Override
    public String getDomain() {
        return domain;
    }

    @Override
    public Instant tokenExpiry(Instant scheduledAt) {
        Instant base = scheduledAt == null ? Instant.now() : scheduledAt;
        Instant exp = base.plus(tokenValidityMinutes, ChronoUnit.MINUTES);
        Instant minimum = Instant.now().plus(5, ChronoUnit.MINUTES);
        return exp.isBefore(minimum) ? minimum : exp;
    }
}
