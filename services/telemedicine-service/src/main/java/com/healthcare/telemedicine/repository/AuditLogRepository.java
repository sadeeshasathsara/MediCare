package com.healthcare.telemedicine.repository;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.healthcare.telemedicine.model.AuditLog;

public interface AuditLogRepository extends MongoRepository<AuditLog, String> {
}
