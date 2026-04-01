package com.healthcare.auth.controller;

import com.healthcare.auth.service.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthValidationController {

    private final JwtService jwtService;

    public AuthValidationController(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    /**
     * Used by the API gateway (Nginx) via auth_request.
     *
     * Expected header: Authorization: Bearer <JWT>
     *
     * On success:
     * - 200 OK
     * - X-User-Id, X-User-Role, X-User-Verified response headers
     *
     * On failure:
     * - 401 Unauthorized
     */
    @GetMapping("/validate")
    public ResponseEntity<Void> validate(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String token = authorization.substring("Bearer ".length()).trim();
        if (token.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            Claims claims = jwtService.parseAndValidate(token);

            String userId = claims.getSubject();
            String role = claims.get("role", String.class);
            Object verifiedRaw = claims.get("verified");
            String verified = verifiedRaw == null ? "false" : String.valueOf(verifiedRaw);

            return ResponseEntity.ok()
                    .header("X-User-Id", userId == null ? "" : userId)
                    .header("X-User-Role", role == null ? "" : role)
                    .header("X-User-Verified", verified)
                    .build();
        } catch (JwtException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }
}
