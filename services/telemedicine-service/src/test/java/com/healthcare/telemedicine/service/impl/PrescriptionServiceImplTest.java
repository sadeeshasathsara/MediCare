package com.healthcare.telemedicine.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import com.healthcare.telemedicine.dto.prescription.MedicationRequest;
import com.healthcare.telemedicine.event.TelemedicineEventPublisher;
import com.healthcare.telemedicine.exception.ForbiddenException;
import com.healthcare.telemedicine.integration.notification.TelemedicineNotificationClient;
import com.healthcare.telemedicine.model.ConsultationRecord;
import com.healthcare.telemedicine.model.Prescription;
import com.healthcare.telemedicine.model.enums.PrescriptionStatus;
import com.healthcare.telemedicine.repository.ConsultationRecordRepository;
import com.healthcare.telemedicine.repository.PrescriptionRepository;
import com.healthcare.telemedicine.service.AuditLogService;

class PrescriptionServiceImplTest {

    @Mock
    private PrescriptionRepository prescriptionRepository;

    @Mock
    private ConsultationRecordRepository consultationRecordRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private TelemedicineEventPublisher eventPublisher;

    @Mock
    private TelemedicineNotificationClient notificationClient;

    private PrescriptionServiceImpl prescriptionService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        prescriptionService = new PrescriptionServiceImpl(
                prescriptionRepository,
                consultationRecordRepository,
                auditLogService,
                eventPublisher,
                notificationClient);
    }

    @Test
    void createPrescription_shouldPersistAndPublishWhenIssued() {
        ConsultationRecord consultation = ConsultationRecord.builder()
                .doctorId("doctor-1")
                .patientId("patient-1")
                .build();
        consultation.setId("c1");
        when(consultationRecordRepository.findByIdAndDeletedAtIsNull("c1")).thenReturn(Optional.of(consultation));
        when(prescriptionRepository.save(any(Prescription.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MedicationRequest medication = new MedicationRequest();
        medication.setName("Paracetamol");
        medication.setDosage("500mg");
        medication.setFrequency("Twice daily");
        medication.setDurationDays(5);
        medication.setInstructions("After meals");

        Prescription created = prescriptionService.createPrescription(
                "c1",
                Instant.now().plusSeconds(86_400),
                List.of(medication),
                PrescriptionStatus.ISSUED,
                "doctor-1");

        assertEquals("patient-1", created.getPatientId());
        assertEquals(PrescriptionStatus.ISSUED, created.getPrescriptionStatus());
        verify(eventPublisher).publishPrescriptionIssued(created);
        verify(notificationClient).notifyPrescriptionIssued(created, null);
    }

    @Test
    void createPrescription_shouldFailForAnotherDoctor() {
        ConsultationRecord consultation = ConsultationRecord.builder()
                .doctorId("doctor-1")
                .patientId("patient-1")
                .build();
        consultation.setId("c1");
        when(consultationRecordRepository.findByIdAndDeletedAtIsNull("c1")).thenReturn(Optional.of(consultation));

        MedicationRequest medication = new MedicationRequest();
        medication.setName("Paracetamol");
        medication.setDosage("500mg");
        medication.setFrequency("Twice daily");
        medication.setDurationDays(5);

        assertThrows(
                ForbiddenException.class,
                () -> prescriptionService.createPrescription(
                        "c1",
                        Instant.now().plusSeconds(86_400),
                        List.of(medication),
                        PrescriptionStatus.ISSUED,
                        "doctor-2"));
    }
}
