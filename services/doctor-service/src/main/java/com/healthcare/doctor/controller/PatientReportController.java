package com.healthcare.doctor.controller;

import com.healthcare.doctor.dto.PatientReportResponse;
import com.healthcare.doctor.service.PatientReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/doctors/{doctorId}/patients/{patientId}/reports")
public class PatientReportController {

    private final PatientReportService patientReportService;

    public PatientReportController(PatientReportService patientReportService) {
        this.patientReportService = patientReportService;
    }

    /**
     * GET /doctors/:id/patients/:patientId/reports – view patient-uploaded reports
     * Access controlled: only doctor assigned to appointment can view reports
     */
    @GetMapping
    public ResponseEntity<List<PatientReportResponse>> getPatientReports(
            @PathVariable String doctorId,
            @PathVariable String patientId) {
        return ResponseEntity.ok(patientReportService.getPatientReports(doctorId, patientId));
    }
}
