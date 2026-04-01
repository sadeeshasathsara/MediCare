package com.healthcare.auth.controller;

import com.healthcare.auth.dto.CreateAdminRequest;
import com.healthcare.auth.dto.PendingDoctorDto;
import com.healthcare.auth.dto.RegisterResponse;
import com.healthcare.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

    @GetMapping("/pending-doctors")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PendingDoctorDto>> listPendingDoctors() {
        return ResponseEntity.ok(authService.listPendingDoctors());
    }
}
