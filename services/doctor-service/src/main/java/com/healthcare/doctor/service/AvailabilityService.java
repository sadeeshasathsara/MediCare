package com.healthcare.doctor.service;

import com.healthcare.doctor.dto.AvailabilitySlotResponse;
import com.healthcare.doctor.dto.CreateAvailabilityRequest;
import com.healthcare.doctor.dto.UpdateSlotRequest;
import com.healthcare.doctor.model.AvailabilitySlot;
import com.healthcare.doctor.model.SlotStatus;
import com.healthcare.doctor.repository.AvailabilitySlotRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class AvailabilityService {

    private static final Set<String> VALID_DAYS = Set.of(
            "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"
    );

    private final AvailabilitySlotRepository slotRepository;
    private final DoctorService doctorService;

    public AvailabilityService(AvailabilitySlotRepository slotRepository, DoctorService doctorService) {
        this.slotRepository = slotRepository;
        this.doctorService = doctorService;
    }

    public List<AvailabilitySlotResponse> createAvailability(String doctorId, CreateAvailabilityRequest request) {
        doctorService.ensureDoctorExists(doctorId);

        Instant now = Instant.now();
        List<AvailabilitySlot> slots = new ArrayList<>();

        for (CreateAvailabilityRequest.SlotRequest slotReq : request.getSlots()) {
            String day = slotReq.getDayOfWeek().trim().toUpperCase(Locale.ROOT);
            if (!VALID_DAYS.contains(day)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Invalid dayOfWeek: " + slotReq.getDayOfWeek() + ". Must be one of: " + VALID_DAYS);
            }

            LocalTime start = parseTime(slotReq.getStartTime(), "startTime");
            LocalTime end = parseTime(slotReq.getEndTime(), "endTime");

            if (!end.isAfter(start)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "endTime must be after startTime for slot on " + day);
            }

            AvailabilitySlot slot = new AvailabilitySlot();
            slot.setDoctorId(doctorId);
            slot.setDayOfWeek(day);
            slot.setStartTime(start);
            slot.setEndTime(end);
            slot.setMaxCapacity(slotReq.getMaxCapacity());
            slot.setCurrentBookings(0);
            slot.setStatus(SlotStatus.AVAILABLE);
            slot.setCreatedAt(now);
            slot.setUpdatedAt(now);
            slots.add(slot);
        }

        List<AvailabilitySlot> saved = slotRepository.saveAll(slots);
        return saved.stream().map(this::toResponse).toList();
    }

    public List<AvailabilitySlotResponse> getAvailability(String doctorId) {
        doctorService.ensureDoctorExists(doctorId);
        List<AvailabilitySlot> slots = slotRepository.findByDoctorId(doctorId);
        return slots.stream().map(this::toResponse).toList();
    }

    public AvailabilitySlotResponse incrementBookings(String slotId) {
        AvailabilitySlot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Slot not found"));

        if (slot.getCurrentBookings() >= slot.getMaxCapacity()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Slot is already at maximum capacity");
        }

        slot.setCurrentBookings(slot.getCurrentBookings() + 1);
        if (slot.getCurrentBookings() >= slot.getMaxCapacity()) {
            slot.setStatus(SlotStatus.BOOKED);
        }
        
        slot.setUpdatedAt(Instant.now());
        return toResponse(slotRepository.save(slot));
    }

    public AvailabilitySlotResponse updateSlot(String doctorId, String slotId, UpdateSlotRequest request) {
        doctorService.ensureDoctorExists(doctorId);

        AvailabilitySlot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Slot not found"));

        if (!slot.getDoctorId().equals(doctorId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Slot does not belong to this doctor");
        }

        boolean changed = false;

        if (request.getStartTime() != null) {
            slot.setStartTime(parseTime(request.getStartTime(), "startTime"));
            changed = true;
        }
        if (request.getEndTime() != null) {
            slot.setEndTime(parseTime(request.getEndTime(), "endTime"));
            changed = true;
        }

        if (slot.getEndTime() != null && slot.getStartTime() != null && !slot.getEndTime().isAfter(slot.getStartTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "endTime must be after startTime");
        }

        if (request.getStatus() != null) {
            String statusStr = request.getStatus().trim().toUpperCase(Locale.ROOT);
            try {
                SlotStatus newStatus = SlotStatus.valueOf(statusStr);
                slot.setStatus(newStatus);
                changed = true;
            } catch (IllegalArgumentException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Invalid status: " + request.getStatus() + ". Must be AVAILABLE, BOOKED, or BLOCKED");
            }
        }

        if (!changed) {
            return toResponse(slot);
        }

        slot.setUpdatedAt(Instant.now());
        AvailabilitySlot saved = slotRepository.save(slot);
        return toResponse(saved);
    }

    private LocalTime parseTime(String timeStr, String fieldName) {
        try {
            return LocalTime.parse(timeStr.trim());
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    fieldName + " must be in HH:mm format (e.g. 09:00)");
        }
    }

    private AvailabilitySlotResponse toResponse(AvailabilitySlot slot) {
        AvailabilitySlotResponse response = new AvailabilitySlotResponse();
        response.setId(slot.getId());
        response.setDoctorId(slot.getDoctorId());
        response.setDayOfWeek(slot.getDayOfWeek());
        response.setStartTime(slot.getStartTime() != null ? slot.getStartTime().toString() : null);
        response.setEndTime(slot.getEndTime() != null ? slot.getEndTime().toString() : null);
        response.setStatus(slot.getStatus() != null ? slot.getStatus().name() : null);
        response.setMaxCapacity(slot.getMaxCapacity());
        response.setCurrentBookings(slot.getCurrentBookings());
        response.setCreatedAt(slot.getCreatedAt());
        response.setUpdatedAt(slot.getUpdatedAt());
        return response;
    }
}
