package com.healthcare.telemedicine.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.healthcare.telemedicine.dto.common.ApiResponse;
import com.healthcare.telemedicine.dto.session.CreateSessionRequest;
import com.healthcare.telemedicine.dto.session.JoinTokenResponse;
import com.healthcare.telemedicine.dto.session.SessionReadyResponse;
import com.healthcare.telemedicine.model.ConsultationSession;
import com.healthcare.telemedicine.model.enums.SessionStatus;
import com.healthcare.telemedicine.security.SecurityUtils;
import com.healthcare.telemedicine.service.SessionService;

import jakarta.validation.Valid;

@Validated
@RestController
@RequestMapping("/api/v1/sessions")
public class SessionController {

    private final SessionService sessionService;

    public SessionController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @PostMapping
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<ConsultationSession>> createSession(@Valid @RequestBody CreateSessionRequest request) {
        String actorId = SecurityUtils.currentUserId();
        ConsultationSession session = sessionService.createSession(request.getAppointmentId(), actorId);
        return ResponseEntity.ok(ApiResponse.success(session, "Session created"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'PATIENT')")
    public ResponseEntity<ApiResponse<ConsultationSession>> getSession(@PathVariable("id") String id) {
        String actorId = SecurityUtils.currentUserId();
        String actorRole = SecurityUtils.currentRole();
        ConsultationSession session = sessionService.getSessionById(id, actorId, actorRole);
        return ResponseEntity.ok(ApiResponse.success(session, "Session fetched"));
    }

    @GetMapping("/{id}/join-token")
    @PreAuthorize("hasAnyRole('DOCTOR', 'PATIENT')")
    public ResponseEntity<ApiResponse<JoinTokenResponse>> getJoinToken(
            @PathVariable("id") String id,
            @RequestParam String role,
            @RequestParam(defaultValue = "false") boolean markJoined) {
        String actorId = SecurityUtils.currentUserId();
        String actorRole = SecurityUtils.currentRole();
        JoinTokenResponse tokenResponse = sessionService.generateJoinToken(id, role, markJoined, actorId, actorRole);
        return ResponseEntity.ok(ApiResponse.success(tokenResponse, "Join token generated"));
    }

    @PatchMapping("/{id}/start")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<ConsultationSession>> startSession(@PathVariable("id") String id) {
        String actorId = SecurityUtils.currentUserId();
        ConsultationSession session = sessionService.startSession(id, actorId);
        return ResponseEntity.ok(ApiResponse.success(session, "Session started"));
    }

    @PatchMapping("/{id}/end")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<ConsultationSession>> endSession(@PathVariable("id") String id) {
        String actorId = SecurityUtils.currentUserId();
        ConsultationSession session = sessionService.endSession(id, actorId);
        return ResponseEntity.ok(ApiResponse.success(session, "Session completed"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DOCTOR', 'PATIENT')")
    public ResponseEntity<ApiResponse<List<ConsultationSession>>> listSessions(
            @RequestParam(required = false) String doctorId,
            @RequestParam(required = false) String patientId,
            @RequestParam(required = false) SessionStatus status) {
        String actorId = SecurityUtils.currentUserId();
        String actorRole = SecurityUtils.currentRole();
        List<ConsultationSession> sessions = sessionService.listSessions(doctorId, patientId, status, actorId, actorRole);
        return ResponseEntity.ok(ApiResponse.success(sessions, "Sessions fetched"));
    }

    @GetMapping("/{id}/ready")
    @PreAuthorize("hasAnyRole('DOCTOR', 'PATIENT')")
    public ResponseEntity<ApiResponse<SessionReadyResponse>> readiness(@PathVariable("id") String id) {
        String actorId = SecurityUtils.currentUserId();
        String actorRole = SecurityUtils.currentRole();
        SessionReadyResponse readiness = sessionService.readiness(id, actorId, actorRole);
        return ResponseEntity.ok(ApiResponse.success(readiness, "Session readiness fetched"));
    }
}
