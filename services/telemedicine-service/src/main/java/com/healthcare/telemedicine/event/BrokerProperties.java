package com.healthcare.telemedicine.event;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Data;

@Data
@Component
@ConfigurationProperties(prefix = "telemedicine.broker")
public class BrokerProperties {
    private boolean enabled = false;
    private String exchange = "telemedicine.events";
    private Routing routing = new Routing();

    @Data
    public static class Routing {
        private String appointmentStatusUpdated = "appointment.status.updated";
        private String consultationCompleted = "consultation.completed";
        private String prescriptionIssued = "prescription.issued";
    }
}
