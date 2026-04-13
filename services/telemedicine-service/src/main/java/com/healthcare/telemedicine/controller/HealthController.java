package com.healthcare.telemedicine.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.healthcare.telemedicine.dto.common.ApiResponse;

import java.util.Map;

@RestController
@RequestMapping("/health")
public class HealthController {

    @Value("${spring.application.name}")
    private String serviceName;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, String>>> health() {
        return ResponseEntity.ok(ApiResponse.success(Map.of(
            "status", "UP",
            "service", serviceName
        ), "Service is healthy"));
    }
}
