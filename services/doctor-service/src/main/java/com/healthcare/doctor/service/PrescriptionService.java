package com.healthcare.doctor.service;

import com.healthcare.doctor.dto.CreatePrescriptionRequest;
import com.healthcare.doctor.dto.MedicationDto;
import com.healthcare.doctor.dto.PrescriptionResponse;
import com.healthcare.doctor.model.Medication;
import com.healthcare.doctor.model.Prescription;
import com.healthcare.doctor.repository.PrescriptionRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final DoctorService doctorService;

    public PrescriptionService(PrescriptionRepository prescriptionRepository, DoctorService doctorService) {
        this.prescriptionRepository = prescriptionRepository;
        this.doctorService = doctorService;
    }

    public PrescriptionResponse createPrescription(String doctorId, CreatePrescriptionRequest request) {
        doctorService.ensureDoctorExists(doctorId);

        Instant now = Instant.now();

        List<Medication> medications = request.getMedications().stream()
                .map(this::toMedication)
                .toList();

        Prescription prescription = new Prescription();
        prescription.setDoctorId(doctorId);
        prescription.setPatientId(request.getPatientId());
        prescription.setAppointmentId(request.getAppointmentId());
        prescription.setDiagnosis(request.getDiagnosis().trim());
        prescription.setMedications(medications);
        prescription.setNotes(request.getNotes() != null ? request.getNotes().trim() : null);
        prescription.setIssuedAt(now);
        prescription.setCreatedAt(now);

        Prescription saved = prescriptionRepository.save(prescription);
        return toResponse(saved);
    }

    public List<PrescriptionResponse> getDoctorPrescriptions(String doctorId) {
        doctorService.ensureDoctorExists(doctorId);
        List<Prescription> prescriptions = prescriptionRepository.findByDoctorId(doctorId);
        return prescriptions.stream().map(this::toResponse).toList();
    }

    /**
     * For Patient Service read-only access: get prescriptions by patientId.
     */
    public List<PrescriptionResponse> getPatientPrescriptions(String patientId) {
        List<Prescription> prescriptions = prescriptionRepository.findByPatientId(patientId);
        return prescriptions.stream().map(this::toResponse).toList();
    }

    public List<PrescriptionResponse> getAppointmentPrescriptions(String appointmentId, String userId, String userRole) {
        List<Prescription> prescriptions = prescriptionRepository.findByAppointmentId(appointmentId);
        
        return prescriptions.stream()
            .filter(p -> {
                if ("ADMIN".equals(userRole)) return true;
                if ("DOCTOR".equals(userRole)) return p.getDoctorId().equals(userId);
                return p.getPatientId().equals(userId); // Patient access
            })
            .map(this::toResponse)
            .toList();
    }

    private Medication toMedication(MedicationDto dto) {
        Medication medication = new Medication();
        medication.setName(dto.getName().trim());
        medication.setDosage(dto.getDosage().trim());
        medication.setFrequency(dto.getFrequency().trim());
        medication.setDuration(dto.getDuration() != null ? dto.getDuration().trim() : null);
        medication.setInstructions(dto.getInstructions() != null ? dto.getInstructions().trim() : null);
        return medication;
    }

    private MedicationDto toMedicationDto(Medication medication) {
        MedicationDto dto = new MedicationDto();
        dto.setName(medication.getName());
        dto.setDosage(medication.getDosage());
        dto.setFrequency(medication.getFrequency());
        dto.setDuration(medication.getDuration());
        dto.setInstructions(medication.getInstructions());
        return dto;
    }

    private PrescriptionResponse toResponse(Prescription prescription) {
        PrescriptionResponse response = new PrescriptionResponse();
        response.setId(prescription.getId());
        response.setDoctorId(prescription.getDoctorId());
        response.setPatientId(prescription.getPatientId());
        response.setAppointmentId(prescription.getAppointmentId());
        response.setDiagnosis(prescription.getDiagnosis());
        response.setNotes(prescription.getNotes());
        response.setIssuedAt(prescription.getIssuedAt());
        response.setCreatedAt(prescription.getCreatedAt());

        if (prescription.getMedications() != null) {
            response.setMedications(prescription.getMedications().stream()
                    .map(this::toMedicationDto)
                    .toList());
        }

        return response;
    }
}
