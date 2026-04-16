package com.healthcare.appointment.event;

public class AppointmentEvent {

    private String eventType; // e.g. "appointment.confirmed", "appointment.cancelled", "appointment.completed"
    private String appointmentId;
    private String patientId;
    private String doctorId;
    private Object payload;

    public AppointmentEvent(String eventType, String appointmentId, String patientId, String doctorId, Object payload) {
        this.eventType = eventType;
        this.appointmentId = appointmentId;
        this.patientId = patientId;
        this.doctorId = doctorId;
        this.payload = payload;
    }

    public String getEventType() { return eventType; }
    public String getAppointmentId() { return appointmentId; }
    public String getPatientId() { return patientId; }
    public String getDoctorId() { return doctorId; }
    public Object getPayload() { return payload; }
}
