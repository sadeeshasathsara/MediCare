package com.healthcare.payment.dto;

import com.healthcare.payment.model.PaymentStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CreatePaymentIntentResponse {
    private String paymentId;
    private String paymentIntentId;
    private String clientSecret;
    private String publishableKey;
    private PaymentStatus status;
}
