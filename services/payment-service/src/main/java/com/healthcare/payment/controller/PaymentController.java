package com.healthcare.payment.controller;

import com.healthcare.payment.dto.ConfirmPaymentRequest;
import com.healthcare.payment.dto.CreatePaymentIntentRequest;
import com.healthcare.payment.dto.CreatePaymentIntentResponse;
import com.healthcare.payment.dto.PaymentResponse;
import com.healthcare.payment.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/users/{userId}/intent")
    public ResponseEntity<CreatePaymentIntentResponse> createPaymentIntent(
            @PathVariable String userId,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @Valid @RequestBody CreatePaymentIntentRequest request) {

        validateWriteAccess(userId, currentUserId, role);
        return ResponseEntity.status(HttpStatus.CREATED).body(paymentService.createPaymentIntent(userId, request));
    }

    @PostMapping("/users/{userId}/confirm")
    public ResponseEntity<PaymentResponse> confirmPayment(
            @PathVariable String userId,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @Valid @RequestBody ConfirmPaymentRequest request) {

        validateWriteAccess(userId, currentUserId, role);
        return ResponseEntity.ok(paymentService.confirmPayment(userId, request));
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<List<PaymentResponse>> listPayments(
            @PathVariable String userId,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId,
            @RequestHeader(value = "X-User-Role", required = false) String role) {

        validateReadAccess(userId, currentUserId, role);
        return ResponseEntity.ok(paymentService.getPaymentsByUserId(userId));
    }

    private void validateReadAccess(String requestedUserId, String currentUserId, String role) {
        if (isAdmin(role)) {
            return;
        }

        if (isBlank(currentUserId) || !requestedUserId.equals(currentUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
    }

    private void validateWriteAccess(String requestedUserId, String currentUserId, String role) {
        if (isBlank(currentUserId) || isBlank(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        if (!requestedUserId.equals(currentUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        if (!("PATIENT".equals(role) || isAdmin(role))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only patients can perform payments");
        }
    }

    private boolean isAdmin(String role) {
        return "ADMIN".equals(role);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
