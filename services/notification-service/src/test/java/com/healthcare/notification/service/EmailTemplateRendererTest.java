package com.healthcare.notification.service;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;

class EmailTemplateRendererTest {

    @Test
    void shouldReplaceTemplatePlaceholders() {
        EmailTemplateRenderer renderer = new EmailTemplateRenderer(new DefaultResourceLoader());

        String html = renderer.render("appointment-confirmed", Map.of(
                "recipientName", "Jane",
                "appointmentId", "APT-1",
                "appointmentDateTime", "2026-04-10 10:00 UTC",
                "channel", "video",
                "counterpartRole", "Doctor",
                "counterpartName", "Dr. Smith",
                "notes", "Please join 5 minutes early"));

        assertTrue(html.contains("Jane"));
        assertTrue(html.contains("APT-1"));
        assertTrue(html.contains("Dr. Smith"));
    }
}
