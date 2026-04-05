package com.healthcare.patient.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;

@Component
public class GatewayHeaderAuthenticationFilter extends OncePerRequestFilter {

    public static final String HEADER_USER_ID = "X-User-Id";
    public static final String HEADER_USER_ROLE = "X-User-Role";
    private static final com.fasterxml.jackson.databind.ObjectMapper OBJECT_MAPPER = new com.fasterxml.jackson.databind.ObjectMapper();

    private final boolean acceptBearerJwt;

    public GatewayHeaderAuthenticationFilter(Environment environment) {
        // Security hardening: downstream services should normally trust only
        // gateway-injected headers.
        // Enable this ONLY for local/dev scenarios where you call patient-service
        // directly.
        this.acceptBearerJwt = Boolean.parseBoolean(
                environment.getProperty("patient.security.accept-bearer", "false").trim());
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            String userId = null;
            String role = null;

            // Option A: Gateway-injected headers
            String headerUserId = request.getHeader(HEADER_USER_ID);
            if (headerUserId != null && !headerUserId.isBlank()) {
                userId = headerUserId.trim();
                String headerRole = request.getHeader(HEADER_USER_ROLE);
                if (headerRole != null && !headerRole.isBlank()) {
                    role = headerRole.trim();
                }
            }

            // Option B: Bearer token (web-client uses a fake JWT)
            if (acceptBearerJwt && userId == null) {
                String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    String token = authHeader.substring("Bearer ".length()).trim();
                    DecodedJwtPayload payload = decodeJwtPayload(token);
                    if (payload != null && payload.subject != null && !payload.subject.isBlank()) {
                        userId = payload.subject.trim();
                        role = payload.role;
                    }
                }
            }

            if (userId != null) {
                List<GrantedAuthority> authorities = role != null && !role.isBlank()
                        ? List.of(new SimpleGrantedAuthority("ROLE_" + role.trim()))
                        : List.of();
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userId,
                        null,
                        authorities);
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }

        filterChain.doFilter(request, response);
    }

    private static DecodedJwtPayload decodeJwtPayload(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2)
                return null;

            String payloadPart = parts[1];
            byte[] decoded = base64DecodeLenient(payloadPart);
            if (decoded == null)
                return null;

            var node = OBJECT_MAPPER.readTree(new String(decoded, StandardCharsets.UTF_8));
            String sub = node.hasNonNull("sub") ? node.get("sub").asText() : null;
            String role = node.hasNonNull("role") ? node.get("role").asText() : null;
            return new DecodedJwtPayload(sub, role);
        } catch (Exception ignored) {
            return null;
        }
    }

    private static byte[] base64DecodeLenient(String raw) {
        String s = raw.replace('-', '+').replace('_', '/');
        int mod = s.length() % 4;
        if (mod == 2)
            s = s + "==";
        else if (mod == 3)
            s = s + "=";
        else if (mod != 0)
            return null;

        try {
            return Base64.getDecoder().decode(s);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private record DecodedJwtPayload(String subject, String role) {
    }
}
