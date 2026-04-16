package com.healthcare.telemedicine.dto.doctor;

import java.time.Instant;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class DoctorAvailabilityResponse {
    Instant slotStart;
    Instant slotEnd;
}
