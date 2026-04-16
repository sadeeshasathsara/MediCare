package com.healthcare.payment.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "payments")
public class PaymentRecord {

    @Id
    private String id;

    private String userId;
    private String stripePaymentIntentId;
    private String stripeChargeId;

    // Amount is stored in the smallest currency unit (cents for USD/LKR).
    private Long amount;
    private String currency;
    private String description;

    private PaymentStatus status;

    private String cardBrand;
    private String cardLast4;

    private Instant createdAt;
    private Instant updatedAt;
    private Instant paidAt;
}
