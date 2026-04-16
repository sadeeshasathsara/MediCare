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

@WebMvcTest(controllers = InternalEventController.class)
class InternalEventControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private NotificationEventService notificationEventService;

    @MockBean
    private TelemedicineNotificationEventService telemedicineNotificationEventService;

    @Test
    void shouldReturnAcceptedForValidRequest() throws Exception {
        when(notificationEventService.handleAppointmentConfirmed(any()))
                .thenReturn(new TriggerAcceptedResponse("event-1", NotificationEventType.APPOINTMENT_CONFIRMED, 2, 0));

        mockMvc.perform(post("/internal/events/appointment-confirmed")
                        .header("X-Service-Token", "token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventId": "event-1",
                                  "occurredAt": "2026-04-05T10:00:00Z",
                                  "appointmentId": "apt-1",
                                  "sourceService": "appointment-service",
                                  "patient": { "userId": "p1", "name": "Patient", "email": "patient@medicare.com" },
                                  "doctor": { "userId": "d1", "name": "Doctor", "email": "doctor@medicare.com" },
                                  "appointmentDateTime": "2026-04-06T10:00:00Z",
                                  "channel": "video",
                                  "notes": "N/A"
                                }
                                """))
                .andExpect(status().isAccepted());
    }

    @Test
    void shouldReturnUnauthorizedWhenTokenValidationFails() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid token"))
                .when(notificationEventService)
                .validateInternalToken(any());

        mockMvc.perform(post("/internal/events/appointment-confirmed")
                        .header("X-Service-Token", "bad-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventId": "event-1",
                                  "occurredAt": "2026-04-05T10:00:00Z",
                                  "appointmentId": "apt-1",
                                  "sourceService": "appointment-service",
                                  "patient": { "userId": "p1", "name": "Patient", "email": "patient@medicare.com" },
                                  "doctor": { "userId": "d1", "name": "Doctor", "email": "doctor@medicare.com" },
                                  "appointmentDateTime": "2026-04-06T10:00:00Z",
                                  "channel": "video",
                                  "notes": "N/A"
                                }
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldReturnBadRequestForInvalidPayload() throws Exception {
        mockMvc.perform(post("/internal/events/appointment-confirmed")
                        .header("X-Service-Token", "token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "occurredAt": "2026-04-05T10:00:00Z"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }
}
