package com.healthcare.doctor.controller;

import com.healthcare.doctor.dto.DoctorResponse;
import com.healthcare.doctor.dto.UpdateDoctorRequest;
import com.healthcare.doctor.service.DoctorService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/doctors")
public class DoctorController {

    private final DoctorService doctorService;

    public DoctorController(DoctorService doctorService) {
        this.doctorService = doctorService;
    }

    /**
     * GET /doctors – list all verified doctors (filterable by specialty)
     */
    @GetMapping
    public ResponseEntity<List<DoctorResponse>> listDoctors(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestParam(required = false) String specialty) {
        if (!hasAnyRole(role, "ADMIN", "DOCTOR", "PATIENT")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only admin, doctor, or patient roles can list doctors");
        }

        return ResponseEntity.ok(doctorService.listVerifiedDoctors(specialty));
    }

    /**
     * GET /doctors/specialties – list all available specialties
     */
    @GetMapping("/specialties")
    public ResponseEntity<List<String>> listSpecialties() {
        return ResponseEntity.ok(doctorService.listSpecialties());
    }

    /**
     * GET /doctors/:id – retrieve doctor profile
     */
    @GetMapping("/{id}")
    public ResponseEntity<DoctorResponse> getDoctor(@PathVariable String id) {
        return ResponseEntity.ok(doctorService.getDoctorById(id));
    }

    /**
     * PUT /doctors/:id – update bio, qualifications, specialty, consultation fee
     */
    @PutMapping("/{id}")
    public ResponseEntity<DoctorResponse> updateDoctor(
            @PathVariable String id,
            @Valid @RequestBody UpdateDoctorRequest request) {
        return ResponseEntity.ok(doctorService.updateDoctor(id, request));
    }

    private boolean hasAnyRole(String role, String... allowedRoles) {
        if (role == null || role.isBlank()) {
            return false;
        }

        for (String allowedRole : allowedRoles) {
            if (allowedRole.equals(role) || ("ROLE_" + allowedRole).equals(role)) {
                return true;
            }
        }

        return false;
    }
}
