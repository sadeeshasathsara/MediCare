package com.healthcare.telemedicine.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicationItem {
    private String name;
    private String dosage;
    private String frequency;
    private Integer durationDays;
    private String instructions;
}
