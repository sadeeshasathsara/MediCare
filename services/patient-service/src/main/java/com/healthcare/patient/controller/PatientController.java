package com.healthcare.patient.controller;

import com.healthcare.patient.dto.PatientProfileDto;
import com.healthcare.patient.dto.UpdatePatientProfileRequest;
import com.healthcare.patient.service.PatientProfileService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/patients")
public class PatientController {

    private final PatientProfileService patientProfileService;

    public PatientController(PatientProfileService patientProfileService) {
        this.patientProfileService = patientProfileService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<PatientProfileDto> getProfile(@PathVariable("id") String userId) {
        return ResponseEntity.ok(patientProfileService.getProfile(userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PatientProfileDto> updateProfile(
            @PathVariable("id") String userId,
            @Valid @RequestBody UpdatePatientProfileRequest request) {
        return ResponseEntity.ok(patientProfileService.updateProfile(userId, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePatient(@PathVariable("id") String userId) {
        patientProfileService.softDeletePatient(userId);
        return ResponseEntity.noContent().build();
    }
}
