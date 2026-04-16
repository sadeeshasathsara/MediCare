package com.healthcare.telemedicine.event;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import com.healthcare.telemedicine.dto.appointment.TelemedicineAppointmentResponse;
import com.healthcare.telemedicine.model.ConsultationSession;
import com.healthcare.telemedicine.model.Prescription;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class TelemedicineEventPublisher {

    private final RabbitTemplate rabbitTemplate;
    private final BrokerProperties brokerProperties;

    public TelemedicineEventPublisher(RabbitTemplate rabbitTemplate, BrokerProperties brokerProperties) {
        this.rabbitTemplate = rabbitTemplate;
        this.brokerProperties = brokerProperties;
    }

    public void publishAppointmentStatusUpdated(TelemedicineAppointmentResponse appointment) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("appointmentId", appointment.getId());
        payload.put("newStatus", appointment.getStatus());
        payload.put("patientId", appointment.getPatientId());
        payload.put("doctorId", appointment.getDoctorId());
        payload.put("scheduledAt", appointment.getScheduledAt());
        payload.put("timestamp", Instant.now());

        publish(brokerProperties.getRouting().getAppointmentStatusUpdated(), payload);
    }

    public void publishConsultationCompleted(ConsultationSession session) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("sessionId", session.getId());
        payload.put("appointmentId", session.getAppointmentId());
        payload.put("patientId", session.getPatientId());
        payload.put("doctorId", session.getDoctorId());
        payload.put("endedAt", session.getEndedAt());
        payload.put("durationSeconds", session.getDurationSeconds());
        payload.put("timestamp", Instant.now());

        publish(brokerProperties.getRouting().getConsultationCompleted(), payload);
    }

    public void publishPrescriptionIssued(Prescription prescription) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("prescriptionId", prescription.getId());
        payload.put("consultationId", prescription.getConsultationId());
        payload.put("patientId", prescription.getPatientId());
        payload.put("doctorId", prescription.getDoctorId());
        payload.put("issuedAt", prescription.getIssuedAt());
        payload.put("timestamp", Instant.now());

        publish(brokerProperties.getRouting().getPrescriptionIssued(), payload);
    }

    private void publish(String routingKey, Map<String, Object> payload) {
        if (!brokerProperties.isEnabled()) {
            log.info("Broker disabled. Event [{}] payload={}", routingKey, payload);
            return;
        }

        try {
            rabbitTemplate.convertAndSend(brokerProperties.getExchange(), routingKey, payload);
            log.info("Published event [{}] payload={}", routingKey, payload);
        } catch (Exception ex) {
            log.error("Failed publishing event [{}] payload={}", routingKey, payload, ex);
        }
    }
}
