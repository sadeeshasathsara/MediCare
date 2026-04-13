package com.healthcare.telemedicine.service.impl;

import java.util.Map;

import org.springframework.stereotype.Service;

import com.healthcare.telemedicine.model.AuditLog;
import com.healthcare.telemedicine.repository.AuditLogRepository;
import com.healthcare.telemedicine.service.AuditLogService;

@Service
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogServiceImpl(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Override
    public void logStatusChange(
            String entityType,
            String entityId,
            String action,
            String fromStatus,
            String toStatus,
            String actorId,
            Map<String, Object> metadata) {
        AuditLog logEntry = AuditLog.builder()
                .entityType(entityType)
                .entityId(entityId)
                .action(action)
                .fromStatus(fromStatus)
                .toStatus(toStatus)
                .actorId(actorId)
                .metadata(metadata)
                .build();
        auditLogRepository.save(logEntry);
    }
}
