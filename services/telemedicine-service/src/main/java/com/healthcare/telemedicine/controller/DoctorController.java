package com.healthcare.telemedicine.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.healthcare.telemedicine.dto.common.ApiResponse;
import com.healthcare.telemedicine.dto.doctor.DoctorAvailabilityResponse;
import com.healthcare.telemedicine.security.SecurityUtils;
import com.healthcare.telemedicine.service.DoctorAvailabilityService;

@RestController
@RequestMapping("/api/v1/doctors")
public class DoctorController {

    private final DoctorAvailabilityService doctorAvailabilityService;

    public DoctorController(DoctorAvailabilityService doctorAvailabilityService) {
        this.doctorAvailabilityService = doctorAvailabilityService;
    }

    @GetMapping("/{id}/availability")
    @PreAuthorize("hasAnyRole('DOCTOR', 'PATIENT')")
    public ResponseEntity<ApiResponse<List<DoctorAvailabilityResponse>>> getDoctorAvailability(
            @PathVariable("id") String id) {
        String actorId = SecurityUtils.currentUserId();
        String actorRole = SecurityUtils.currentRole();
        List<DoctorAvailabilityResponse> availability = doctorAvailabilityService.getAvailability(id, actorId, actorRole);
        return ResponseEntity.ok(ApiResponse.success(availability, "Doctor availability fetched"));
    }
}
