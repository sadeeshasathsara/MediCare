package com.healthcare.telemedicine.integration.notification;

import com.healthcare.telemedicine.dto.appointment.TelemedicineAppointmentResponse;
import com.healthcare.telemedicine.model.ConsultationSession;
import com.healthcare.telemedicine.model.Prescription;

public interface TelemedicineNotificationClient {

    void notifyAppointmentStatus(TelemedicineAppointmentResponse appointment);

    void notifyConsultationCompleted(ConsultationSession session);

    void notifyPrescriptionIssued(Prescription prescription, String appointmentId);
}
