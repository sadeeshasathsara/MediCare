package com.healthcare.patient.service;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

public final class AccessGuard {

    private AccessGuard() {
    }

    public static String requireAuthenticatedUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "unauthorized");
        }
        String userId = String.valueOf(auth.getPrincipal());
        if (userId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "unauthorized");
        }
        return userId;
    }

    public static boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null)
            return false;
        for (GrantedAuthority a : auth.getAuthorities()) {
            if (a != null && "ROLE_ADMIN".equalsIgnoreCase(a.getAuthority())) {
                return true;
            }
        }
        return false;
    }

    public static boolean isDoctor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null)
            return false;
        for (GrantedAuthority a : auth.getAuthorities()) {
            if (a != null && "ROLE_DOCTOR".equalsIgnoreCase(a.getAuthority())) {
                return true;
            }
        }
        return false;
    }

    public static void requireSelfOrAdmin(String targetUserId) {
        String actor = requireAuthenticatedUserId();
        if (!isAdmin() && !actor.equals(targetUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "forbidden");
        }
    }

    public static void requireSelfOrAdminOrDoctor(String targetUserId) {
        String actor = requireAuthenticatedUserId();
        if (!isAdmin() && !isDoctor() && !actor.equals(targetUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "forbidden: requires patient self-access, doctor, or admin");
        }
    }

    public static void requireAdmin() {
        if (!isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "admin access required");
        }
    }
}
