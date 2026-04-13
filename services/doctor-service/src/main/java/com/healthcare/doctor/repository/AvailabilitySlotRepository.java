package com.healthcare.doctor.repository;

import com.healthcare.doctor.model.AvailabilitySlot;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AvailabilitySlotRepository extends MongoRepository<AvailabilitySlot, String> {

    List<AvailabilitySlot> findByDoctorId(String doctorId);

    List<AvailabilitySlot> findByDoctorIdAndDayOfWeek(String doctorId, String dayOfWeek);
}
