package com.healthcare.notification.controller;

import com.healthcare.notification.dto.internal.AppointmentCancelledEventRequest;
import com.healthcare.notification.dto.internal.AppointmentConfirmedEventRequest;
import com.healthcare.notification.dto.internal.ConsultationCompletedEventRequest;
import com.healthcare.notification.dto.internal.TriggerAcceptedResponse;
import com.healthcare.notification.service.NotificationEventService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/events")
public class InternalEventController {

    private static final String SERVICE_TOKEN_HEADER = "X-Service-Token";
    private final NotificationEventService notificationEventService;

    public InternalEventController(NotificationEventService notificationEventService) {
        this.notificationEventService = notificationEventService;
    }

    @PostMapping("/appointment-confirmed")
    public ResponseEntity<TriggerAcceptedResponse> appointmentConfirmed(
            @RequestHeader(value = SERVICE_TOKEN_HEADER, required = false) String serviceToken,
            @Valid @RequestBody AppointmentConfirmedEventRequest request) {
        notificationEventService.validateInternalToken(serviceToken);
        return ResponseEntity.accepted().body(notificationEventService.handleAppointmentConfirmed(request));
    }

    @PostMapping("/appointment-cancelled")
    public ResponseEntity<TriggerAcceptedResponse> appointmentCancelled(
            @RequestHeader(value = SERVICE_TOKEN_HEADER, required = false) String serviceToken,
            @Valid @RequestBody AppointmentCancelledEventRequest request) {
        notificationEventService.validateInternalToken(serviceToken);
        return ResponseEntity.accepted().body(notificationEventService.handleAppointmentCancelled(request));
    }

    @PostMapping("/consultation-completed")
    public ResponseEntity<TriggerAcceptedResponse> consultationCompleted(
            @RequestHeader(value = SERVICE_TOKEN_HEADER, required = false) String serviceToken,
            @Valid @RequestBody ConsultationCompletedEventRequest request) {
        notificationEventService.validateInternalToken(serviceToken);
        return ResponseEntity.accepted().body(notificationEventService.handleConsultationCompleted(request));
    }
}
