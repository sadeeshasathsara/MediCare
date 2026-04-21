package com.healthcare.appointment.service;

import com.healthcare.appointment.dto.AppointmentResponse;
import com.healthcare.appointment.dto.CreateAppointmentRequest;
import com.healthcare.appointment.dto.RescheduleAppointmentRequest;
import com.healthcare.appointment.dto.UpdateAppointmentStatusRequest;
import com.healthcare.appointment.event.AppointmentEventPublisher;
import com.healthcare.appointment.integration.notification.AppointmentNotificationClient;
import com.healthcare.appointment.model.Appointment;
import com.healthcare.appointment.model.AppointmentStatus;
import com.healthcare.appointment.repository.AppointmentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final AppointmentEventPublisher eventPublisher;
    private final AppointmentNotificationClient notificationClient;

    public AppointmentService(
            AppointmentRepository appointmentRepository,
            AppointmentEventPublisher eventPublisher,
            AppointmentNotificationClient notificationClient) {
        this.appointmentRepository = appointmentRepository;
        this.eventPublisher = eventPublisher;
        this.notificationClient = notificationClient;
    }

    public AppointmentResponse createAppointment(String patientId, CreateAppointmentRequest request) {
        Appointment appointment = new Appointment();
        appointment.setPatientId(patientId);
        appointment.setPatientName(request.getPatientName().trim());
        appointment.setDoctorId(request.getDoctorId());
        appointment.setDoctorName(request.getDoctorName().trim());
        appointment.setDoctorSpecialty(request.getDoctorSpecialty().trim());
        appointment.setScheduledAt(request.getScheduledAt());
        appointment.setReason(request.getReason().trim());
        appointment.setStatus(AppointmentStatus.PENDING);

        Instant now = Instant.now();
        appointment.setCreatedAt(now);
        appointment.setUpdatedAt(now);

        Appointment saved = appointmentRepository.save(appointment);
        notificationClient.notifyRequested(saved, patientId, "PATIENT");
        return toResponse(saved);
    }

    public AppointmentResponse getAppointmentById(String id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));
        return toResponse(appointment);
    }

    public Page<AppointmentResponse> getAppointmentsByPatientId(String patientId, String filter, int page, int limit) {
        Pageable pageable = createPageable(filter, page, limit);
        Instant now = Instant.now();

        if ("UPCOMING".equals(filter)) {
            return appointmentRepository.findByPatientIdAndScheduledAtGreaterThanEqual(patientId, now, pageable)
                    .map(this::toResponse);
        } else if ("PAST".equals(filter)) {
            return appointmentRepository.findByPatientIdAndScheduledAtLessThan(patientId, now, pageable)
                    .map(this::toResponse);
        }
        return appointmentRepository.findByPatientId(patientId, pageable).map(this::toResponse);
    }

    public Page<AppointmentResponse> getAppointmentsByDoctorId(String doctorId, String filter, int page, int limit) {
        Pageable pageable = createPageable(filter, page, limit);
        Instant now = Instant.now();

        if ("UPCOMING".equals(filter)) {
            return appointmentRepository.findByDoctorIdAndScheduledAtGreaterThanEqual(doctorId, now, pageable)
                    .map(this::toResponse);
        } else if ("PAST".equals(filter)) {
            return appointmentRepository.findByDoctorIdAndScheduledAtLessThan(doctorId, now, pageable)
                    .map(this::toResponse);
        }
        return appointmentRepository.findByDoctorId(doctorId, pageable).map(this::toResponse);
    }

    private Pageable createPageable(String filter, int page, int limit) {
        Sort sort = Sort.by(Sort.Direction.DESC, "scheduledAt"); // Default to DESC (newest past)
        if ("UPCOMING".equals(filter)) {
            sort = Sort.by(Sort.Direction.ASC, "scheduledAt"); // ASC for upcoming (soonest first)
        }
        return PageRequest.of(page, limit, sort);
    }

    public AppointmentResponse rescheduleAppointment(String id, RescheduleAppointmentRequest request, String userId,
            boolean isDoctor) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));

        if (!isDoctor && !userId.equals(appointment.getPatientId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Access denied. You can only reschedule your own appointments");
        } else if (isDoctor && !userId.equals(appointment.getDoctorId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Access denied. Appointment is not assigned to you");
        }

        if (appointment.getStatus() != AppointmentStatus.PENDING
                && appointment.getStatus() != AppointmentStatus.CONFIRMED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only PENDING or CONFIRMED appointments can be rescheduled");
        }

        Instant previousScheduledAt = appointment.getScheduledAt();
        appointment.setScheduledAt(request.getScheduledAt());
        appointment.setUpdatedAt(Instant.now());

        Appointment saved = appointmentRepository.save(appointment);
        notificationClient.notifyRescheduled(saved, previousScheduledAt, userId, isDoctor ? "DOCTOR" : "PATIENT");
        return toResponse(saved);
    }

    public AppointmentResponse updateStatus(String id, UpdateAppointmentStatusRequest request, String doctorId) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));

        if (!doctorId.equals(appointment.getDoctorId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Access denied. Appointment is not assigned to you");
        }

        AppointmentStatus oldStatus = appointment.getStatus();
        appointment.setStatus(request.getStatus());
        if (request.getNotes() != null) {
            appointment.setNotes(request.getNotes());
        }
        appointment.setUpdatedAt(Instant.now());

        Appointment saved = appointmentRepository.save(appointment);

        // Publish events based on status changes
        if (oldStatus != AppointmentStatus.CONFIRMED && request.getStatus() == AppointmentStatus.CONFIRMED) {
            eventPublisher.publishEvent("appointment.confirmed", saved.getId(), saved.getPatientId(),
                    saved.getDoctorId(), toResponse(saved));
            notificationClient.notifyConfirmed(saved, doctorId, "DOCTOR");
        } else if (oldStatus != AppointmentStatus.COMPLETED && request.getStatus() == AppointmentStatus.COMPLETED) {
            eventPublisher.publishEvent("appointment.completed", saved.getId(), saved.getPatientId(),
                    saved.getDoctorId(), toResponse(saved));
            notificationClient.notifyCompleted(saved, doctorId, "DOCTOR");
        } else if (oldStatus != AppointmentStatus.CANCELLED && request.getStatus() == AppointmentStatus.CANCELLED) {
            eventPublisher.publishEvent("appointment.cancelled", saved.getId(), saved.getPatientId(),
                    saved.getDoctorId(), toResponse(saved));
            String cancellationReason = defaultText(request.getNotes(), "Cancelled by doctor");
            notificationClient.notifyCancelled(saved, doctorId, "DOCTOR", cancellationReason);
        }

        return toResponse(saved);
    }

    public AppointmentResponse confirmAfterPayment(String id, String patientId) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));

        if (!patientId.equals(appointment.getPatientId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Access denied. You can only confirm your own appointments");
        }

        if (appointment.getStatus() == AppointmentStatus.CANCELLED
                || appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cannot confirm a cancelled or completed appointment");
        }

        AppointmentStatus oldStatus = appointment.getStatus();
        appointment.setStatus(AppointmentStatus.CONFIRMED);
        appointment.setUpdatedAt(Instant.now());

        Appointment saved = appointmentRepository.save(appointment);

        if (oldStatus != AppointmentStatus.CONFIRMED) {
            eventPublisher.publishEvent("appointment.confirmed", saved.getId(), saved.getPatientId(),
                    saved.getDoctorId(), toResponse(saved));
            notificationClient.notifyConfirmed(saved, patientId, "PATIENT");
        }

        return toResponse(saved);
    }

    public void cancelAppointment(String id, String userId, boolean isDoctor) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));

        if (!isDoctor && !userId.equals(appointment.getPatientId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Access denied. You can only cancel your own appointments");
        } else if (isDoctor && !userId.equals(appointment.getDoctorId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Access denied. Appointment is not assigned to you");
        }

        if (appointment.getStatus() == AppointmentStatus.CANCELLED
                || appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Appointment is already cancelled or completed");
        }

        appointment.setStatus(AppointmentStatus.CANCELLED);
        appointment.setUpdatedAt(Instant.now());
        Appointment saved = appointmentRepository.save(appointment);

        eventPublisher.publishEvent("appointment.cancelled", saved.getId(), saved.getPatientId(), saved.getDoctorId(),
                toResponse(saved));
        String cancellationReason = isDoctor ? "Cancelled by doctor" : "Cancelled by patient";
        notificationClient.notifyCancelled(saved, userId, isDoctor ? "DOCTOR" : "PATIENT", cancellationReason);
    }

    // A simulated external cross-service call placeholder, because Appointment
    // Service does not own the Doctor data.
    // Real implementation would either query the DB or call doctor-service for
    // search capability.
    public Object searchAvailableDoctors(String specialty, String dateStr) {
        try {
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            String url = "http://doctor-service:3003/doctors";
            if (specialty != null && !specialty.trim().isEmpty()) {
                url += "?specialty=" + specialty.trim();
            }
            return restTemplate.getForObject(url, java.util.List.class);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Doctor service is unavailable or returned an error");
        }
    }

    private AppointmentResponse toResponse(Appointment appointment) {
        AppointmentResponse response = new AppointmentResponse();
        response.setId(appointment.getId());
        response.setDoctorId(appointment.getDoctorId());
        response.setPatientId(appointment.getPatientId());
        response.setPatientName(appointment.getPatientName());
        response.setDoctorName(appointment.getDoctorName());
        response.setDoctorSpecialty(appointment.getDoctorSpecialty());
        response.setScheduledAt(appointment.getScheduledAt());
        response.setReason(appointment.getReason());
        response.setNotes(appointment.getNotes());
        response.setStatus(appointment.getStatus());
        response.setCreatedAt(appointment.getCreatedAt());
        response.setUpdatedAt(appointment.getUpdatedAt());
        return response;
    }

    private static String defaultText(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim();
    }
}
