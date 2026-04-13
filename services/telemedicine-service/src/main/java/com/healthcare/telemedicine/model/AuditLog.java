package com.healthcare.telemedicine.model;

import java.util.Map;

import org.springframework.data.mongodb.core.mapping.Document;

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
@Document(collection = "audit_logs")
public class AuditLog extends BaseDocument {
    private String entityType;
    private String entityId;
    private String action;
    private String fromStatus;
    private String toStatus;
    private String actorId;
    private Map<String, Object> metadata;
}
