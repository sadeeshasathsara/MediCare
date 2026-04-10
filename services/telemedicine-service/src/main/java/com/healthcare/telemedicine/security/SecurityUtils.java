package com.healthcare.telemedicine.security;

import java.util.Optional;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import com.healthcare.telemedicine.exception.UnauthorizedException;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static String currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new UnauthorizedException("Missing authenticated user");
        }
        return authentication.getName();
    }

    public static String currentRole() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            throw new UnauthorizedException("Missing authenticated user");
        }

        Optional<String> role = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(auth -> auth != null && auth.startsWith("ROLE_"))
                .map(auth -> auth.substring("ROLE_".length()))
                .findFirst();
        return role.orElseThrow(() -> new UnauthorizedException("Missing authenticated role"));
    }
}
