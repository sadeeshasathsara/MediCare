package com.healthcare.notification.dto.internal;

import java.math.BigDecimal;
import java.time.Instant;

public record RefundInfo(
        String status,
        BigDecimal amount,
        String currency,
        String reference,
        Instant expectedAt) {
}
