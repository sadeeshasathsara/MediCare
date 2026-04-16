package com.healthcare.payment.service;

import com.healthcare.payment.dto.ConfirmPaymentRequest;
import com.healthcare.payment.dto.CreatePaymentIntentRequest;
import com.healthcare.payment.dto.CreatePaymentIntentResponse;
import com.healthcare.payment.dto.PaymentResponse;
import com.healthcare.payment.model.PaymentRecord;
import com.healthcare.payment.model.PaymentStatus;
import com.healthcare.payment.repository.PaymentRecordRepository;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.Charge;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class PaymentService {

    private final PaymentRecordRepository paymentRecordRepository;
    private final String stripeSecretKey;
    private final String publishableKey;

    public PaymentService(
            PaymentRecordRepository paymentRecordRepository,
            @Value("${stripe.secret-key:}") String stripeSecretKey,
            @Value("${stripe.publishable-key:}") String publishableKey) {
        this.paymentRecordRepository = paymentRecordRepository;
        this.stripeSecretKey = stripeSecretKey;
        this.publishableKey = publishableKey;
    }

    public CreatePaymentIntentResponse createPaymentIntent(String userId, CreatePaymentIntentRequest request) {
        ensureStripeConfigured();
        String normalizedCurrency = normalizeCurrency(request.getCurrency());

        Map<String, String> metadata = new HashMap<>();
        metadata.put("userId", userId);

        PaymentIntentCreateParams.Builder paramsBuilder = PaymentIntentCreateParams.builder()
                .setAmount(request.getAmount())
                .setCurrency(normalizedCurrency)
                .setAutomaticPaymentMethods(
                        PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                .setEnabled(true)
                                .build())
                .putAllMetadata(metadata);

        if (StringUtils.hasText(request.getDescription())) {
            paramsBuilder.setDescription(request.getDescription().trim());
        }

        try {
            PaymentIntent paymentIntent = PaymentIntent.create(paramsBuilder.build());
            Instant now = Instant.now();

            PaymentRecord record = PaymentRecord.builder()
                    .userId(userId)
                    .amount(request.getAmount())
                    .currency(normalizedCurrency)
                    .description(request.getDescription())
                    .stripePaymentIntentId(paymentIntent.getId())
                    .status(PaymentStatus.PENDING)
                    .createdAt(now)
                    .updatedAt(now)
                    .build();

            PaymentRecord saved = paymentRecordRepository.save(record);

            return CreatePaymentIntentResponse.builder()
                    .paymentId(saved.getId())
                    .paymentIntentId(paymentIntent.getId())
                    .clientSecret(paymentIntent.getClientSecret())
                    .publishableKey(publishableKey)
                    .status(saved.getStatus())
                    .build();
        } catch (StripeException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Stripe error: " + ex.getMessage());
        }
    }

    public PaymentResponse confirmPayment(String userId, ConfirmPaymentRequest request) {
        ensureStripeConfigured();
        PaymentRecord record = paymentRecordRepository
                .findByUserIdAndStripePaymentIntentId(userId, request.getPaymentIntentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment record not found"));

        try {
            PaymentIntent paymentIntent = PaymentIntent.retrieve(request.getPaymentIntentId());
            updateRecordFromIntent(record, paymentIntent);
            PaymentRecord saved = paymentRecordRepository.save(record);
            return mapToResponse(saved);
        } catch (StripeException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Stripe error: " + ex.getMessage());
        }
    }

    public List<PaymentResponse> getPaymentsByUserId(String userId) {
        return paymentRecordRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    private void updateRecordFromIntent(PaymentRecord record, PaymentIntent paymentIntent) throws StripeException {
        String intentStatus = paymentIntent.getStatus();
        record.setUpdatedAt(Instant.now());

        switch (intentStatus) {
            case "succeeded" -> {
                record.setStatus(PaymentStatus.SUCCEEDED);
                if (record.getPaidAt() == null) {
                    record.setPaidAt(Instant.now());
                }
                enrichCardDetails(record, paymentIntent);
            }
            case "canceled" -> record.setStatus(PaymentStatus.CANCELED);
            case "processing" -> record.setStatus(PaymentStatus.PENDING);
            default -> record.setStatus(PaymentStatus.FAILED);
        }
    }

    private void enrichCardDetails(PaymentRecord record, PaymentIntent paymentIntent) throws StripeException {
        String latestChargeId = paymentIntent.getLatestCharge();
        if (!StringUtils.hasText(latestChargeId)) {
            return;
        }

        Charge charge = Charge.retrieve(latestChargeId);
        record.setStripeChargeId(charge.getId());

        if (charge.getPaymentMethodDetails() != null && charge.getPaymentMethodDetails().getCard() != null) {
            record.setCardBrand(charge.getPaymentMethodDetails().getCard().getBrand());
            record.setCardLast4(charge.getPaymentMethodDetails().getCard().getLast4());
        }
    }

    private String normalizeCurrency(String currency) {
        if (!StringUtils.hasText(currency)) {
            return "usd";
        }
        return currency.trim().toLowerCase(Locale.ROOT);
    }

    private void ensureStripeConfigured() {
        if (!StringUtils.hasText(stripeSecretKey)) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Stripe secret key is not configured");
        }
        Stripe.apiKey = stripeSecretKey;
    }

    private PaymentResponse mapToResponse(PaymentRecord paymentRecord) {
        return PaymentResponse.builder()
                .id(paymentRecord.getId())
                .userId(paymentRecord.getUserId())
                .amount(paymentRecord.getAmount())
                .currency(paymentRecord.getCurrency())
                .description(paymentRecord.getDescription())
                .status(paymentRecord.getStatus())
                .stripePaymentIntentId(paymentRecord.getStripePaymentIntentId())
                .stripeChargeId(paymentRecord.getStripeChargeId())
                .cardBrand(paymentRecord.getCardBrand())
                .cardLast4(paymentRecord.getCardLast4())
                .createdAt(paymentRecord.getCreatedAt())
                .updatedAt(paymentRecord.getUpdatedAt())
                .paidAt(paymentRecord.getPaidAt())
                .build();
    }
}
