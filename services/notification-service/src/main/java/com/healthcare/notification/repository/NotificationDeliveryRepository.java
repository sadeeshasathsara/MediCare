package com.healthcare.notification.repository;

import com.healthcare.notification.model.NotificationDelivery;
import com.healthcare.notification.model.NotificationStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;

public interface NotificationDeliveryRepository extends MongoRepository<NotificationDelivery, String> {

    List<NotificationDelivery> findByStatusInAndNextAttemptAtLessThanEqualOrderByNextAttemptAtAsc(
            List<NotificationStatus> statuses,
            Instant nextAttemptAt,
            Pageable pageable);
}
