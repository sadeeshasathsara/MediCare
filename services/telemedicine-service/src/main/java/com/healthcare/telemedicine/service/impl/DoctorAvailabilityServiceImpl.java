package com.healthcare.telemedicine.service.impl;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.healthcare.telemedicine.dto.doctor.DoctorAvailabilityResponse;
import com.healthcare.telemedicine.exception.ForbiddenException;
import com.healthcare.telemedicine.model.Appointment;
import com.healthcare.telemedicine.model.enums.AppointmentStatus;
import com.healthcare.telemedicine.repository.AppointmentRepository;
import com.healthcare.telemedicine.service.DoctorAvailabilityService;

@Service
public class DoctorAvailabilityServiceImpl implements DoctorAvailabilityService {

    private final AppointmentRepository appointmentRepository;
    private final int slotMinutes;
    private final int startHour;
    private final int endHour;
    private final int daysAhead;

    public DoctorAvailabilityServiceImpl(
            AppointmentRepository appointmentRepository,
            @Value("${telemedicine.availability.slot-minutes:30}") int slotMinutes,
            @Value("${telemedicine.availability.start-hour:9}") int startHour,
            @Value("${telemedicine.availability.end-hour:17}") int endHour,
            @Value("${telemedicine.availability.days-ahead:7}") int daysAhead) {
        this.appointmentRepository = appointmentRepository;
        this.slotMinutes = slotMinutes;
        this.startHour = startHour;
        this.endHour = endHour;
        this.daysAhead = daysAhead;
    }

    @Override
    public List<DoctorAvailabilityResponse> getAvailability(String doctorId, String actorId, String actorRole) {
        if ("DOCTOR".equals(actorRole) && !Objects.equals(doctorId, actorId)) {
            throw new ForbiddenException("Doctors can only view their own availability");
        }

        Instant now = Instant.now();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        Instant rangeStart = today.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant rangeEnd = today.plusDays(daysAhead + 1L).atStartOfDay().toInstant(ZoneOffset.UTC);

        List<Appointment> acceptedAppointments = appointmentRepository.findByDoctorIdAndStatusAndScheduledAtBetweenAndDeletedAtIsNull(
                doctorId,
                AppointmentStatus.ACCEPTED,
                rangeStart,
                rangeEnd,
                Sort.by(Sort.Direction.ASC, "scheduledAt"));

        List<DoctorAvailabilityResponse> availableSlots = new ArrayList<>();
        for (int dayOffset = 0; dayOffset <= daysAhead; dayOffset++) {
            LocalDate date = today.plusDays(dayOffset);
            LocalDateTime cursor = date.atTime(startHour, 0);
            LocalDateTime endBoundary = date.atTime(endHour, 0);

            while (cursor.isBefore(endBoundary)) {
                LocalDateTime slotEndLocal = cursor.plusMinutes(slotMinutes);
                Instant slotStart = cursor.toInstant(ZoneOffset.UTC);
                Instant slotEnd = slotEndLocal.toInstant(ZoneOffset.UTC);

                boolean past = slotStart.isBefore(now);
                boolean occupied = acceptedAppointments.stream().anyMatch(a -> inSlot(a.getScheduledAt(), slotStart, slotEnd));

                if (!past && !occupied) {
                    availableSlots.add(DoctorAvailabilityResponse.builder()
                            .slotStart(slotStart)
                            .slotEnd(slotEnd)
                            .build());
                }
                cursor = slotEndLocal;
            }
        }
        return availableSlots;
    }

    private boolean inSlot(Instant scheduledAt, Instant slotStart, Instant slotEnd) {
        if (scheduledAt == null) {
            return false;
        }
        return !scheduledAt.isBefore(slotStart) && scheduledAt.isBefore(slotEnd);
    }
}
