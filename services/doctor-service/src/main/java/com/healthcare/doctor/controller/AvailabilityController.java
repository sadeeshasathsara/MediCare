package com.healthcare.doctor.controller;

import com.healthcare.doctor.dto.AvailabilitySlotResponse;
import com.healthcare.doctor.dto.CreateAvailabilityRequest;
import com.healthcare.doctor.dto.UpdateSlotRequest;
import com.healthcare.doctor.service.AvailabilityService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/doctors/{doctorId}/availability")
public class AvailabilityController {

    private final AvailabilityService availabilityService;

    public AvailabilityController(AvailabilityService availabilityService) {
        this.availabilityService = availabilityService;
    }

    /**
     * POST /doctors/:id/availability – set weekly availability slots
     */
    @PostMapping
    public ResponseEntity<List<AvailabilitySlotResponse>> createAvailability(
            @PathVariable String doctorId,
            @Valid @RequestBody CreateAvailabilityRequest request) {
        List<AvailabilitySlotResponse> slots = availabilityService.createAvailability(doctorId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(slots);
    }

    /**
     * GET /doctors/:id/availability – retrieve available time slots
     */
    @GetMapping
    public ResponseEntity<List<AvailabilitySlotResponse>> getAvailability(@PathVariable String doctorId) {
        return ResponseEntity.ok(availabilityService.getAvailability(doctorId));
    }

    /**
     * PUT /doctors/:id/availability/:slotId – update or block a slot
     */
    @PutMapping("/{slotId}")
    public ResponseEntity<AvailabilitySlotResponse> updateSlot(
            @PathVariable String doctorId,
            @PathVariable String slotId,
            @RequestBody UpdateSlotRequest request) {
        return ResponseEntity.ok(availabilityService.updateSlot(doctorId, slotId, request));
    }

    /**
     * POST /doctors/:id/availability/:slotId/book – increment booking count for a slot
     */
    @PostMapping("/{slotId}/book")
    public ResponseEntity<AvailabilitySlotResponse> bookSlot(
            @PathVariable String doctorId,
            @PathVariable String slotId) {
        return ResponseEntity.ok(availabilityService.incrementBookings(slotId));
    }
}
