package com.healthcare.auth.service;

import com.healthcare.auth.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
public class JwtService {

    private final SecretKey signingKey;

    private final long accessTtlMs;
    private final String issuer;

    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration}") long accessTtlMs,
            @Value("${spring.application.name:auth-service}") String issuer) {
        // JJWT requires a sufficiently long secret for HS256 (>= 256 bits).
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTtlMs = accessTtlMs;
        this.issuer = issuer;
    }

    public Claims parseAndValidate(String token) {
        Jws<Claims> jws = Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token);
        return jws.getPayload();
    }

    public String generateAccessToken(User user) {
        Instant now = Instant.now();
        Instant exp = now.plusMillis(accessTtlMs);

        Map<String, Object> claims = new HashMap<>();
        claims.put("role", user.getRole() == null ? null : user.getRole().name());
        claims.put("verified", user.isDoctorVerified());
        claims.put("email", user.getEmail());

        return Jwts.builder()
                .claims(claims)
                .subject(user.getId())
                .issuer(issuer)
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(signingKey)
                .compact();
    }

    public long getAccessTtlMs() {
        return accessTtlMs;
    }
}
