package com.healthcare.aisymptom.dto;

import java.time.Instant;

public record SymptomCheckResponse(
        String analysis,
        String model,
        Instant generatedAt,
        String disclaimer
) {
}
