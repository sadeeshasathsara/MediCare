package com.healthcare.auth.controller;

import com.healthcare.auth.dto.AdminAccountDto;
import com.healthcare.auth.dto.CreateAdminRequest;
import com.healthcare.auth.dto.PendingDoctorDto;
import com.healthcare.auth.dto.RegisterResponse;
import com.healthcare.auth.dto.SetUserStatusRequest;
import com.healthcare.auth.dto.UpdateAdminRequest;
import com.healthcare.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@RestController
@RequestMapping("/auth/admin")
public class AdminController {

    private final AuthService authService;

    public AdminController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RegisterResponse> createAdmin(@Valid @RequestBody CreateAdminRequest request) {
        return ResponseEntity.ok(authService.createAdmin(request));
    }

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AdminAccountDto>> listAdmins() {
        return ResponseEntity.ok(authService.listAdminAccounts());
    }

    @PatchMapping("/users/{adminUserId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminAccountDto> updateAdmin(
            @PathVariable String adminUserId,
            @RequestBody UpdateAdminRequest request,
            @AuthenticationPrincipal String actorUserId) {
        return ResponseEntity.ok(authService.updateAdminAccount(adminUserId, request, actorUserId));
    }

    @PatchMapping("/users/{adminUserId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminAccountDto> setAdminStatus(
            @PathVariable String adminUserId,
            @RequestBody SetUserStatusRequest request,
            @AuthenticationPrincipal String actorUserId) {
        return ResponseEntity.ok(authService.setAdminStatus(adminUserId, request, actorUserId));
    }

    @DeleteMapping("/users/{adminUserId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteAdmin(
            @PathVariable String adminUserId,
            @AuthenticationPrincipal String actorUserId) {
        authService.deleteAdminAccount(adminUserId, actorUserId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/pending-doctors")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PendingDoctorDto>> listPendingDoctors() {
        return ResponseEntity.ok(authService.listPendingDoctors());
    }
}
