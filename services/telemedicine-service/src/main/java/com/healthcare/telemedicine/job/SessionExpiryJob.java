package com.healthcare.telemedicine.job;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.healthcare.telemedicine.service.SessionService;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class SessionExpiryJob {

    private final SessionService sessionService;

    public SessionExpiryJob(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @Scheduled(fixedDelayString = "${telemedicine.session.expiry-job-delay-ms:60000}")
    public void markMissedSessions() {
        int updated = sessionService.markMissedSessions();
        if (updated > 0) {
            log.info("Auto-marked {} sessions as MISSED", updated);
        }
    }
}
