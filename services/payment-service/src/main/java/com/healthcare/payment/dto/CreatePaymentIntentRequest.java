package com.healthcare.payment.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreatePaymentIntentRequest {

    @NotNull(message = "amount is required")
    @Min(value = 1, message = "amount must be at least 1")
    private Long amount;

    private String currency;
    private String description;
}
