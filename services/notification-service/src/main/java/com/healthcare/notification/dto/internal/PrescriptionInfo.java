package com.healthcare.notification.dto.internal;

import jakarta.validation.constraints.NotBlank;

public record PrescriptionInfo(
        @NotBlank String url,
        String label) {
}
