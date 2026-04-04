package com.healthcare.patient.controller;

import com.healthcare.patient.service.AccessGuard;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/patients")
public class PatientInsightsController {

    @GetMapping("/{id}/history")
    public ResponseEntity<Map<String, Object>> history(@PathVariable("id") String userId) {
        AccessGuard.requireSelfOrAdmin(userId);
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of(
                        "message", "Appointment history is not available yet",
                        "dependency", "appointment-service"));
    }

    @GetMapping("/{id}/prescriptions")
    public ResponseEntity<Map<String, Object>> prescriptions(@PathVariable("id") String userId) {
        AccessGuard.requireSelfOrAdmin(userId);
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of(
                        "message", "Prescriptions are not available yet",
                        "dependency", "doctor-service"));
    }
}
