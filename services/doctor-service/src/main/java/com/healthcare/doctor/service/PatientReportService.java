package com.healthcare.doctor.service;

import com.healthcare.doctor.dto.PatientReportResponse;
import com.healthcare.doctor.model.PatientReport;
import com.healthcare.doctor.repository.PatientReportRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class PatientReportService {

    private final PatientReportRepository reportRepository;
    private final AppointmentService appointmentService;
    private final DoctorService doctorService;

    public PatientReportService(PatientReportRepository reportRepository,
                                 AppointmentService appointmentService,
                                 DoctorService doctorService) {
        this.reportRepository = reportRepository;
        this.appointmentService = appointmentService;
        this.doctorService = doctorService;
    }

    public List<PatientReportResponse> getPatientReports(String doctorId, String patientId) {
        doctorService.ensureDoctorExists(doctorId);

        // Access control: only doctors assigned to patient via appointment can view reports
        boolean hasRelationship = appointmentService.hasDoctorPatientRelationship(doctorId, patientId);
        if (!hasRelationship) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Access denied: you do not have an appointment with this patient");
        }

        List<PatientReport> reports = reportRepository.findByPatientIdAndDoctorId(patientId, doctorId);
        return reports.stream().map(this::toResponse).toList();
    }

    private PatientReportResponse toResponse(PatientReport report) {
        PatientReportResponse response = new PatientReportResponse();
        response.setId(report.getId());
        response.setPatientId(report.getPatientId());
        response.setDoctorId(report.getDoctorId());
        response.setAppointmentId(report.getAppointmentId());
        response.setReportType(report.getReportType());
        response.setTitle(report.getTitle());
        response.setDescription(report.getDescription());
        response.setFileUrl(report.getFileUrl());
        response.setUploadedAt(report.getUploadedAt());
        return response;
    }
}
