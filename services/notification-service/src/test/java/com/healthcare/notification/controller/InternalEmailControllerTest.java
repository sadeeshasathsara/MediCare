package com.healthcare.notification.controller;

import com.healthcare.notification.dto.internal.TriggerAcceptedResponse;
import com.healthcare.notification.model.NotificationEventType;
import com.healthcare.notification.service.NotificationEventService;
import com.healthcare.notification.service.TelemedicineNotificationEventService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = InternalEmailController.class)
class InternalEmailControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private NotificationEventService notificationEventService;

    @MockBean
    private TelemedicineNotificationEventService telemedicineNotificationEventService;

    @Test
    void shouldReturnAcceptedForAppointmentActivityEmailEndpoint() throws Exception {
        when(notificationEventService.handleAppointmentActivityEmail(any()))
                .thenReturn(new TriggerAcceptedResponse("event-2", NotificationEventType.APPOINTMENT_REQUESTED, 2, 0));

        mockMvc.perform(post("/internal/emails/appointment-activity")
                        .header("X-Service-Token", "token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventId": "event-2",
                                  "eventType": "APPOINTMENT_REQUESTED",
                                  "occurredAt": "2026-04-05T10:00:00Z",
                                  "appointmentId": "apt-2",
                                  "sourceService": "appointment-service",
                                  "patientId": "p1",
                                  "patientName": "Patient",
                                  "doctorId": "d1",
                                  "doctorName": "Doctor",
                                  "appointmentReason": "General",
                                  "appointmentDateTime": "2026-04-06T10:00:00Z",
                                  "actorUserId": "p1",
                                  "actorRole": "PATIENT"
                                }
                                """))
                .andExpect(status().isAccepted());
    }

    @Test
    void shouldReturnAcceptedForTelemedicineAppointmentStatusEmailEndpoint() throws Exception {
        when(telemedicineNotificationEventService.handleAppointmentStatusEmail(any()))
                .thenReturn(new TriggerAcceptedResponse("event-3", NotificationEventType.TELEMEDICINE_APPOINTMENT_ACCEPTED, 2, 0));

        mockMvc.perform(post("/internal/emails/telemedicine/appointment-status")
                        .header("X-Service-Token", "token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventId": "event-3",
                                  "occurredAt": "2026-04-05T10:00:00Z",
                                  "appointmentId": "apt-3",
                                  "sourceService": "telemedicine-service",
                                  "patientUserId": "p1",
                                  "patientName": "Patient",
                                  "doctorUserId": "d1",
                                  "doctorName": "Doctor",
                                  "appointmentReason": "General",
                                  "decisionStatus": "ACCEPTED",
                                  "scheduledAt": "2026-04-06T10:00:00Z"
                                }
                                """))
                .andExpect(status().isAccepted());
    }

    @Test
    void shouldReturnAcceptedForTelemedicineConsultationCompletedEmailEndpoint() throws Exception {
        when(telemedicineNotificationEventService.handleConsultationCompletedEmail(any()))
                .thenReturn(new TriggerAcceptedResponse("event-4", NotificationEventType.TELEMEDICINE_CONSULTATION_COMPLETED, 0, 0));

        mockMvc.perform(post("/internal/emails/telemedicine/consultation-completed")
                        .header("X-Service-Token", "token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventId": "event-4",
                                  "occurredAt": "2026-04-05T10:00:00Z",
                                  "appointmentId": "apt-4",
                                  "sourceService": "telemedicine-service",
                                  "sessionId": "session-1",
                                  "patientUserId": "p1",
                                  "patientName": "Patient",
                                  "doctorUserId": "d1",
                                  "doctorName": "Doctor",
                                  "appointmentReason": "General",
                                  "endedAt": "2026-04-05T10:20:00Z",
                                  "durationSeconds": 1200
                                }
                                """))
                .andExpect(status().isAccepted());
    }

    @Test
    void shouldReturnAcceptedForTelemedicinePrescriptionIssuedEmailEndpoint() throws Exception {
        when(telemedicineNotificationEventService.handlePrescriptionIssuedEmail(any()))
                .thenReturn(new TriggerAcceptedResponse("event-5", NotificationEventType.TELEMEDICINE_PRESCRIPTION_ISSUED, 2, 0));

        mockMvc.perform(post("/internal/emails/telemedicine/prescription-issued")
                        .header("X-Service-Token", "token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventId": "event-5",
                                  "occurredAt": "2026-04-05T10:00:00Z",
                                  "appointmentId": "apt-5",
                                  "sourceService": "telemedicine-service",
                                  "prescriptionId": "rx-1",
                                  "consultationId": "con-1",
                                  "patientUserId": "p1",
                                  "patientName": "Patient",
                                  "doctorUserId": "d1",
                                  "doctorName": "Doctor",
                                  "appointmentReason": "General",
                                  "issuedAt": "2026-04-05T10:05:00Z"
                                }
                                """))
                .andExpect(status().isAccepted());
    }

    @Test
    void shouldReturnUnauthorizedWhenTokenValidationFails() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid token"))
                .when(notificationEventService)
                .validateInternalToken(any());

        mockMvc.perform(post("/internal/emails/appointment-activity")
                        .header("X-Service-Token", "bad-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventId": "event-2",
                                  "eventType": "APPOINTMENT_REQUESTED",
                                  "occurredAt": "2026-04-05T10:00:00Z",
                                  "appointmentId": "apt-2",
                                  "sourceService": "appointment-service",
                                  "patientId": "p1",
                                  "doctorId": "d1"
                                }
                                """))
                .andExpect(status().isUnauthorized());
    }
}
