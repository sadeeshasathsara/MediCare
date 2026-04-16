package com.healthcare.appointment.event;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

@Component
public class AppointmentEventPublisher {

    private final ApplicationEventPublisher applicationEventPublisher;

    public AppointmentEventPublisher(ApplicationEventPublisher applicationEventPublisher) {
        this.applicationEventPublisher = applicationEventPublisher;
    }

    public void publishEvent(String eventType, String appointmentId, String patientId, String doctorId, Object payload) {
        AppointmentEvent event = new AppointmentEvent(eventType, appointmentId, patientId, doctorId, payload);
        
        // In a real microservice with Kafka/RabbitMQ, you would convert this to JSON
        // and send it to the message broker. For this architecture, we use Spring's internal event bus
        // and log it to simulate the external broadcast to Notification Service and Payment Service.
        System.out.println(">>> [EVENT PUBLISHED] " + eventType + " for Appointment: " + appointmentId);
        
        applicationEventPublisher.publishEvent(event);
    }
}
