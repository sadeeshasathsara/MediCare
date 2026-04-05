package com.healthcare.patient.config;

import com.healthcare.patient.storage.LocalStorageService;
import com.healthcare.patient.storage.S3StorageService;
import com.healthcare.patient.storage.StorageService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class StorageConfig {

    @Bean
    public LocalStorageService localStorageService(org.springframework.core.env.Environment environment) {
        return new LocalStorageService(environment);
    }

    @Bean
    public S3StorageService s3StorageService(org.springframework.core.env.Environment environment) {
        return new S3StorageService(environment);
    }

    @Bean
    public StorageService storageService(
            org.springframework.core.env.Environment environment,
            LocalStorageService localStorageService,
            S3StorageService s3StorageService) {

        String provider = environment.getProperty("patient.storage.provider", "local").trim().toLowerCase();
        return switch (provider) {
            case "s3" -> s3StorageService;
            case "local" -> localStorageService;
            default -> localStorageService;
        };
    }
}
