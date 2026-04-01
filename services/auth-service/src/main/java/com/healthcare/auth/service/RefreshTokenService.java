package com.healthcare.auth.service;

import com.healthcare.auth.model.RefreshToken;
import com.healthcare.auth.repository.RefreshTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;

@Service
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final SecureRandom secureRandom;
    private final long refreshTtlMs;

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            @Value("${jwt.refresh-expiration}") long refreshTtlMs) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshTtlMs = refreshTtlMs;
        this.secureRandom = new SecureRandom();
    }

    public CreatedRefreshToken createForUser(String userId) {
        Instant now = Instant.now();

        String raw = generateOpaqueToken();
        String hash = sha256Base64Url(raw);

        RefreshToken token = new RefreshToken();
        token.setUserId(userId);
        token.setTokenHash(hash);
        token.setCreatedAt(now);
        token.setExpiresAt(now.plusMillis(refreshTtlMs));

        RefreshToken saved = refreshTokenRepository.save(token);
        return new CreatedRefreshToken(saved, raw);
    }

    public Optional<RefreshToken> findByRawToken(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return Optional.empty();
        }
        String hash = sha256Base64Url(rawRefreshToken.trim());
        return refreshTokenRepository.findByTokenHash(hash);
    }

    public String hashRawToken(String rawRefreshToken) {
        return sha256Base64Url(rawRefreshToken);
    }

    public @NonNull RefreshToken save(@NonNull RefreshToken token) {
        return refreshTokenRepository.save(token);
    }

    private String generateOpaqueToken() {
        byte[] bytes = new byte[64];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String sha256Base64Url(String value) {
        if (value == null) {
            return "";
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hashed);
        } catch (NoSuchAlgorithmException e) {
            // Should never happen on a standard JRE.
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    public record CreatedRefreshToken(RefreshToken token, String rawToken) {
    }
}
