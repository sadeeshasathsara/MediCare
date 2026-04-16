package com.healthcare.telemedicine.service;

import java.util.List;

import com.healthcare.telemedicine.dto.doctor.DoctorAvailabilityResponse;

public interface DoctorAvailabilityService {
    List<DoctorAvailabilityResponse> getAvailability(String doctorId, String actorId, String actorRole);
}
