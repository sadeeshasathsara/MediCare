package com.healthcare.telemedicine.model;

import java.time.Instant;

import org.springframework.data.mongodb.core.mapping.Document;

import com.healthcare.telemedicine.model.enums.SessionStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "consultation_sessions")
public class ConsultationSession extends BaseDocument {
    private String appointmentId;
    private String patientId;
    private String doctorId;
    private Instant scheduledAt;
    private String jitsiRoomId;
    private String jitsiRoomToken;

    @Builder.Default
    private SessionStatus sessionStatus = SessionStatus.SCHEDULED;

    private Instant startedAt;
    private Instant endedAt;
    private Long durationSeconds;
    private Instant doctorJoinedAt;
    private Instant patientJoinedAt;
}
