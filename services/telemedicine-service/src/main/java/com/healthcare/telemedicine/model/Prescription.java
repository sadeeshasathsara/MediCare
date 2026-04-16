package com.healthcare.telemedicine.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.mongodb.core.mapping.Document;

import com.healthcare.telemedicine.model.enums.PrescriptionStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "prescriptions")
public class Prescription extends BaseDocument {
    private String consultationId;
    private String patientId;
    private String doctorId;
    private Instant issuedAt;
    private Instant expiresAt;

    @Builder.Default
    private List<MedicationItem> medications = new ArrayList<>();

    @Builder.Default
    private PrescriptionStatus prescriptionStatus = PrescriptionStatus.DRAFT;
}
