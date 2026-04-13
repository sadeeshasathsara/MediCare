package com.healthcare.telemedicine.service;

import java.util.Map;

public interface AuditLogService {
    void logStatusChange(
            String entityType,
            String entityId,
            String action,
            String fromStatus,
            String toStatus,
            String actorId,
            Map<String, Object> metadata);
}
