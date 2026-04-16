package com.healthcare.telemedicine.service.impl;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.healthcare.telemedicine.dto.prescription.MedicationRequest;
import com.healthcare.telemedicine.event.TelemedicineEventPublisher;
import com.healthcare.telemedicine.exception.BadRequestException;
import com.healthcare.telemedicine.exception.ConflictException;
import com.healthcare.telemedicine.exception.ForbiddenException;
import com.healthcare.telemedicine.exception.NotFoundException;
import com.healthcare.telemedicine.model.ConsultationRecord;
import com.healthcare.telemedicine.model.MedicationItem;
import com.healthcare.telemedicine.model.Prescription;
import com.healthcare.telemedicine.model.enums.PrescriptionStatus;
import com.healthcare.telemedicine.repository.ConsultationRecordRepository;
import com.healthcare.telemedicine.repository.PrescriptionRepository;
import com.healthcare.telemedicine.service.AuditLogService;
import com.healthcare.telemedicine.service.PrescriptionService;

@Service
public class PrescriptionServiceImpl implements PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final ConsultationRecordRepository consultationRecordRepository;
    private final AuditLogService auditLogService;
    private final TelemedicineEventPublisher eventPublisher;

    public PrescriptionServiceImpl(
            PrescriptionRepository prescriptionRepository,
            ConsultationRecordRepository consultationRecordRepository,
            AuditLogService auditLogService,
            TelemedicineEventPublisher eventPublisher) {
        this.prescriptionRepository = prescriptionRepository;
        this.consultationRecordRepository = consultationRecordRepository;
        this.auditLogService = auditLogService;
        this.eventPublisher = eventPublisher;
    }

    @Override
    public Prescription createPrescription(
            String consultationId,
            Instant expiresAt,
            List<MedicationRequest> medications,
            PrescriptionStatus status,
            String actorId) {
        ConsultationRecord consultation = consultationRecordRepository.findByIdAndDeletedAtIsNull(consultationId)
                .orElseThrow(() -> new NotFoundException("Consultation record not found"));

        if (!Objects.equals(consultation.getDoctorId(), actorId)) {
            throw new ForbiddenException("Doctor can only issue prescriptions for own consultations");
        }
        if (medications == null || medications.isEmpty()) {
            throw new BadRequestException("At least one medication is required");
        }
        if (expiresAt == null || !expiresAt.isAfter(Instant.now())) {
            throw new BadRequestException("expiresAt must be in the future");
        }

        PrescriptionStatus resolvedStatus = status == null ? PrescriptionStatus.ISSUED : status;
        if (!(resolvedStatus == PrescriptionStatus.DRAFT || resolvedStatus == PrescriptionStatus.ISSUED)) {
            throw new BadRequestException("Prescription creation supports DRAFT or ISSUED status only");
        }

        List<MedicationItem> medicationItems = medications.stream()
                .map(this::toMedicationItem)
                .toList();

        Prescription prescription = Prescription.builder()
                .consultationId(consultation.getId())
                .patientId(consultation.getPatientId())
                .doctorId(consultation.getDoctorId())
                .issuedAt(Instant.now())
                .expiresAt(expiresAt)
                .medications(medicationItems)
                .prescriptionStatus(resolvedStatus)
                .build();

        Prescription saved = prescriptionRepository.save(prescription);
        auditStatusChange(saved, null, saved.getPrescriptionStatus(), actorId, "prescription.created");
        if (saved.getPrescriptionStatus() == PrescriptionStatus.ISSUED) {
            eventPublisher.publishPrescriptionIssued(saved);
        }
        return saved;
    }

    @Override
    public Prescription getById(String prescriptionId, String actorId, String actorRole) {
        Prescription prescription = findPrescription(prescriptionId);
        validateReadAccess(prescription, actorId, actorRole);
        return prescription;
    }

    @Override
    public List<Prescription> listByPatientOrConsultation(
            String patientId,
            String consultationId,
            String actorId,
            String actorRole) {
        if ("PATIENT".equals(actorRole)) {
            String resolvedPatientId = StringUtils.hasText(patientId) ? patientId : actorId;
            if (!Objects.equals(resolvedPatientId, actorId)) {
                throw new ForbiddenException("Patients can only access their own prescriptions");
            }
            return prescriptionRepository.findByPatientIdAndDeletedAtIsNullOrderByCreatedAtDesc(resolvedPatientId);
        }

        if ("DOCTOR".equals(actorRole)) {
            if (!StringUtils.hasText(consultationId)) {
                throw new BadRequestException("consultationId is required for doctor listing");
            }
            ConsultationRecord consultation = consultationRecordRepository.findByIdAndDeletedAtIsNull(consultationId)
                    .orElseThrow(() -> new NotFoundException("Consultation record not found"));
            if (!Objects.equals(consultation.getDoctorId(), actorId)) {
                throw new ForbiddenException("Doctor can only access own consultation prescriptions");
            }
            return prescriptionRepository.findByConsultationIdAndDeletedAtIsNullOrderByCreatedAtDesc(consultationId);
        }

        throw new ForbiddenException("Unsupported role for prescription listing");
    }

    @Override
    public Prescription cancelPrescription(String prescriptionId, String actorId) {
        Prescription prescription = findPrescription(prescriptionId);
        enforceDoctorOwner(prescription, actorId);

        if (prescription.getPrescriptionStatus() == PrescriptionStatus.DISPENSED) {
            throw new ConflictException("Dispensed prescription cannot be cancelled");
        }
        if (prescription.getPrescriptionStatus() == PrescriptionStatus.CANCELLED) {
            return prescription;
        }

        PrescriptionStatus previous = prescription.getPrescriptionStatus();
        prescription.setPrescriptionStatus(PrescriptionStatus.CANCELLED);
        Prescription saved = prescriptionRepository.save(prescription);
        auditStatusChange(saved, previous, saved.getPrescriptionStatus(), actorId, "prescription.cancelled");
        return saved;
    }

    @Override
    public Prescription updateStatus(String prescriptionId, PrescriptionStatus status, String actorId) {
        if (status == null) {
            throw new BadRequestException("status is required");
        }
        if (status == PrescriptionStatus.CANCELLED) {
            throw new BadRequestException("Use cancel endpoint to cancel prescriptions");
        }

        Prescription prescription = findPrescription(prescriptionId);
        enforceDoctorOwner(prescription, actorId);

        PrescriptionStatus current = prescription.getPrescriptionStatus();
        if (current == status) {
            return prescription;
        }

        boolean validTransition = (current == PrescriptionStatus.DRAFT && status == PrescriptionStatus.ISSUED)
                || (current == PrescriptionStatus.ISSUED && status == PrescriptionStatus.DISPENSED);
        if (!validTransition) {
            throw new ConflictException("Invalid prescription status transition");
        }

        prescription.setPrescriptionStatus(status);
        if (status == PrescriptionStatus.ISSUED && prescription.getIssuedAt() == null) {
            prescription.setIssuedAt(Instant.now());
        }

        Prescription saved = prescriptionRepository.save(prescription);
        auditStatusChange(saved, current, saved.getPrescriptionStatus(), actorId, "prescription.status_updated");
        if (saved.getPrescriptionStatus() == PrescriptionStatus.ISSUED) {
            eventPublisher.publishPrescriptionIssued(saved);
        }
        return saved;
    }

    private MedicationItem toMedicationItem(MedicationRequest request) {
        return MedicationItem.builder()
                .name(request.getName())
                .dosage(request.getDosage())
                .frequency(request.getFrequency())
                .durationDays(request.getDurationDays())
                .instructions(request.getInstructions())
                .build();
    }

    private Prescription findPrescription(String prescriptionId) {
        return prescriptionRepository.findByIdAndDeletedAtIsNull(prescriptionId)
                .orElseThrow(() -> new NotFoundException("Prescription not found"));
    }

    private void enforceDoctorOwner(Prescription prescription, String actorId) {
        if (!Objects.equals(prescription.getDoctorId(), actorId)) {
            throw new ForbiddenException("Doctor can only modify own prescriptions");
        }
    }

    private void validateReadAccess(Prescription prescription, String actorId, String actorRole) {
        if ("DOCTOR".equals(actorRole) && Objects.equals(prescription.getDoctorId(), actorId)) {
            return;
        }
        if ("PATIENT".equals(actorRole) && Objects.equals(prescription.getPatientId(), actorId)) {
            return;
        }
        throw new ForbiddenException("You do not have access to this prescription");
    }

    private void auditStatusChange(
            Prescription prescription,
            PrescriptionStatus fromStatus,
            PrescriptionStatus toStatus,
            String actorId,
            String action) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("consultationId", prescription.getConsultationId());
        metadata.put("patientId", prescription.getPatientId());
        metadata.put("doctorId", prescription.getDoctorId());
        metadata.put("expiresAt", prescription.getExpiresAt());

        auditLogService.logStatusChange(
                "Prescription",
                prescription.getId(),
                action,
                fromStatus == null ? null : fromStatus.name(),
                toStatus == null ? null : toStatus.name(),
                actorId,
                metadata);
    }
}
