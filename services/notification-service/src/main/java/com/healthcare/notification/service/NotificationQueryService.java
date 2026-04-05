package com.healthcare.notification.service;

import com.healthcare.notification.model.NotificationDelivery;
import com.healthcare.notification.model.NotificationEventType;
import com.healthcare.notification.model.NotificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationQueryService {

    private final MongoTemplate mongoTemplate;

    public NotificationQueryService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public Page<NotificationDelivery> findUserNotifications(
            String userId,
            int page,
            int size,
            NotificationEventType eventType,
            NotificationStatus status) {

        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, 100));

        Query query = new Query(Criteria.where("recipientUserId").is(userId));
        if (eventType != null) {
            query.addCriteria(Criteria.where("eventType").is(eventType));
        }
        if (status != null) {
            query.addCriteria(Criteria.where("status").is(status));
        }

        long total = mongoTemplate.count(query, NotificationDelivery.class);

        query.with(Sort.by(Sort.Direction.DESC, "createdAt"));
        query.skip((long) safePage * safeSize);
        query.limit(safeSize);

        List<NotificationDelivery> items = mongoTemplate.find(query, NotificationDelivery.class);
        return new PageImpl<>(items, PageRequest.of(safePage, safeSize), total);
    }
}
