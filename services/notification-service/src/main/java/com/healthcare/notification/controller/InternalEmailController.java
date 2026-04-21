package com.healthcare.notification.controller;

import com.healthcare.notification.dto.internal.AppointmentActivityEventRequest;
import com.healthcare.notification.dto.internal.TelemedicineAppointmentStatusEventRequest;
import com.healthcare.notification.dto.internal.TelemedicineConsultationCompletedEventRequest;
import com.healthcare.notification.dto.internal.TelemedicinePrescriptionIssuedEventRequest;
import com.healthcare.notification.dto.internal.TriggerAcceptedResponse;
import com.healthcare.notification.service.NotificationEventService;
import com.healthcare.notification.service.TelemedicineNotificationEventService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/emails")
public class InternalEmailController {

    private static final String SERVICE_TOKEN_HEADER = "X-Service-Token";
    private final NotificationEventService notificationEventService;
    private final TelemedicineNotificationEventService telemedicineNotificationEventService;

    public InternalEmailController(
            NotificationEventService notificationEventService,
            TelemedicineNotificationEventService telemedicineNotificationEventService) {
        this.notificationEventService = notificationEventService;
        this.telemedicineNotificationEventService = telemedicineNotificationEventService;
    }

    @PostMapping("/appointment-activity")
    public ResponseEntity<TriggerAcceptedResponse> appointmentActivityEmail(
            @RequestHeader(value = SERVICE_TOKEN_HEADER, required = false) String serviceToken,
            @Valid @RequestBody AppointmentActivityEventRequest request) {
        notificationEventService.validateInternalToken(serviceToken);
        return ResponseEntity.accepted().body(notificationEventService.handleAppointmentActivityEmail(request));
    }

    @PostMapping("/telemedicine/appointment-status")
    public ResponseEntity<TriggerAcceptedResponse> telemedicineAppointmentStatusEmail(
            @RequestHeader(value = SERVICE_TOKEN_HEADER, required = false) String serviceToken,
            @Valid @RequestBody TelemedicineAppointmentStatusEventRequest request) {
        notificationEventService.validateInternalToken(serviceToken);
        return ResponseEntity.accepted().body(telemedicineNotificationEventService.handleAppointmentStatusEmail(request));
    }

    @PostMapping("/telemedicine/consultation-completed")
    public ResponseEntity<TriggerAcceptedResponse> telemedicineConsultationCompletedEmail(
            @RequestHeader(value = SERVICE_TOKEN_HEADER, required = false) String serviceToken,
            @Valid @RequestBody TelemedicineConsultationCompletedEventRequest request) {
        notificationEventService.validateInternalToken(serviceToken);
        return ResponseEntity.accepted().body(telemedicineNotificationEventService.handleConsultationCompletedEmail(request));
    }

    @PostMapping("/telemedicine/prescription-issued")
    public ResponseEntity<TriggerAcceptedResponse> telemedicinePrescriptionIssuedEmail(
            @RequestHeader(value = SERVICE_TOKEN_HEADER, required = false) String serviceToken,
            @Valid @RequestBody TelemedicinePrescriptionIssuedEventRequest request) {
        notificationEventService.validateInternalToken(serviceToken);
        return ResponseEntity.accepted().body(telemedicineNotificationEventService.handlePrescriptionIssuedEmail(request));
    }
}
