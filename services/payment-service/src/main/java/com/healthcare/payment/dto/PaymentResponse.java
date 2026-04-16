package com.healthcare.payment.dto;

import com.healthcare.payment.model.PaymentStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class PaymentResponse {
    private String id;
    private String userId;
    private Long amount;
    private String currency;
    private String description;
    private PaymentStatus status;
    private String stripePaymentIntentId;
    private String stripeChargeId;
    private String cardBrand;
    private String cardLast4;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant paidAt;
}
