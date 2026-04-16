package com.healthcare.payment.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ConfirmPaymentRequest {

    @NotBlank(message = "paymentIntentId is required")
    private String paymentIntentId;
}
