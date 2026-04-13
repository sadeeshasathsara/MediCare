package com.healthcare.telemedicine.security;

import java.io.IOException;
import java.util.List;
import java.util.Locale;

import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String GATEWAY_USER_ID_HEADER = "X-User-Id";
    private static final String GATEWAY_USER_ROLE_HEADER = "X-User-Role";

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            if (!authenticateFromGatewayHeaders(request)) {
                authenticateFromBearer(request);
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean authenticateFromGatewayHeaders(HttpServletRequest request) {
        String userId = request.getHeader(GATEWAY_USER_ID_HEADER);
        String role = request.getHeader(GATEWAY_USER_ROLE_HEADER);
        if (isBlank(userId) || isBlank(role)) {
            return false;
        }

        setAuthentication(userId.trim(), role.trim());
        return true;
    }

    private void authenticateFromBearer(HttpServletRequest request) {
        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return;
        }

        String token = authorization.substring("Bearer ".length()).trim();
        if (token.isEmpty()) {
            return;
        }

        try {
            Claims claims = jwtService.parseAndValidate(token);
            String userId = claims.getSubject();
            String role = claims.get("role", String.class);
            if (!isBlank(userId) && !isBlank(role)) {
                setAuthentication(userId, role);
            }
        } catch (JwtException ex) {
            SecurityContextHolder.clearContext();
        }
    }

    private void setAuthentication(String userId, String role) {
        String normalizedRole = role.toUpperCase(Locale.ROOT);
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + normalizedRole));
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                userId,
                null,
                authorities);
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
