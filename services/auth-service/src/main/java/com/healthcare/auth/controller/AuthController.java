package com.healthcare.auth.controller;

import com.healthcare.auth.dto.AuthResponse;
import com.healthcare.auth.dto.ChangeEmailRequest;
import com.healthcare.auth.dto.LoginRequest;
import com.healthcare.auth.dto.RegisterRequest;
import com.healthcare.auth.dto.ValidateResponse;
import com.healthcare.auth.service.AuthService;
import com.healthcare.auth.service.JwtService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;

    public AuthController(AuthService authService, JwtService jwtService) {
        this.authService = authService;
        this.jwtService = jwtService;
    }

    @PostMapping({ "/login", "/auth/login" })
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request.getEmail(), request.getPassword()));
    }

    @PostMapping({ "/register", "/auth/register" })
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(201).body(authService.registerPatient(request.getEmail(), request.getPassword()));
    }

    @PostMapping({ "/validate", "/auth/validate" })
    public ResponseEntity<ValidateResponse> validate(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader) {
        String token = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring("Bearer ".length()).trim();
        }
        if (token == null || token.isBlank()) {
            return ResponseEntity.ok(new ValidateResponse(false, null, null, null));
        }

        Claims claims = jwtService.parseClaims(token);
        if (claims == null || claims.getSubject() == null || claims.getSubject().isBlank()) {
            return ResponseEntity.ok(new ValidateResponse(false, null, null, null));
        }
        String email = claims.get("email", String.class);
        String role = claims.get("role", String.class);
        return ResponseEntity.ok(new ValidateResponse(true, claims.getSubject(), email, role));
    }

    @GetMapping({ "/me", "/auth/me" })
    public ResponseEntity<ValidateResponse> me() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String userId = auth != null ? String.valueOf(auth.getPrincipal()) : null;
        String role = auth != null && auth.getAuthorities() != null && !auth.getAuthorities().isEmpty()
                ? auth.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "")
                : null;
        return ResponseEntity.ok(new ValidateResponse(true, userId, null, role));
    }

    @PatchMapping({ "/me/email", "/auth/me/email" })
    public ResponseEntity<AuthResponse> changeEmail(@Valid @RequestBody ChangeEmailRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            return ResponseEntity.status(401).build();
        }
        String userId = String.valueOf(auth.getPrincipal());
        return ResponseEntity.ok(authService.changeEmail(userId, request.getEmail()));
    }
}
