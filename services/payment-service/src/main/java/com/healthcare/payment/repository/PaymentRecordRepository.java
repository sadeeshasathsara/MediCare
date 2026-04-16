package com.healthcare.payment.repository;

import com.healthcare.payment.model.PaymentRecord;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRecordRepository extends MongoRepository<PaymentRecord, String> {
    List<PaymentRecord> findByUserIdOrderByCreatedAtDesc(String userId);

    Optional<PaymentRecord> findByUserIdAndStripePaymentIntentId(String userId, String paymentIntentId);
}
