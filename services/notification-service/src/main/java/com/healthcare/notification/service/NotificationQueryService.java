package com.healthcare.notification.service;

import com.healthcare.notification.dto.api.NotificationReadState;
import com.healthcare.notification.model.NotificationChannel;
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
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
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
            NotificationStatus status,
            NotificationReadState readState) {

        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, 100));

        List<Criteria> criteriaList = new ArrayList<>();
        criteriaList.add(Criteria.where("recipientUserId").is(userId));
        criteriaList.add(Criteria.where("channel").is(NotificationChannel.IN_APP));

        if (eventType != null) {
            criteriaList.add(Criteria.where("eventType").is(eventType));
        }
        if (status != null) {
            criteriaList.add(Criteria.where("status").is(status));
        }

        NotificationReadState effectiveReadState = readState == null ? NotificationReadState.ALL : readState;
        if (effectiveReadState == NotificationReadState.UNREAD) {
            criteriaList.add(Criteria.where("readAt").is(null));
        } else if (effectiveReadState == NotificationReadState.READ) {
            criteriaList.add(Criteria.where("readAt").ne(null));
        }

        Criteria allCriteria = new Criteria().andOperator(criteriaList.toArray(new Criteria[0]));
        Query query = new Query(allCriteria);
        long total = mongoTemplate.count(query, NotificationDelivery.class);

        query.with(Sort.by(Sort.Direction.DESC, "createdAt"));
        query.skip((long) safePage * safeSize);
        query.limit(safeSize);

        List<NotificationDelivery> items = mongoTemplate.find(query, NotificationDelivery.class);
        return new PageImpl<>(items, PageRequest.of(safePage, safeSize), total);
    }

    public long countUnread(String userId) {
        Query query = new Query(new Criteria().andOperator(
                Criteria.where("recipientUserId").is(userId),
                Criteria.where("channel").is(NotificationChannel.IN_APP),
                Criteria.where("readAt").is(null)));
        return mongoTemplate.count(query, NotificationDelivery.class);
    }

    public boolean markAsRead(String userId, String notificationId) {
        Query query = new Query(new Criteria().andOperator(
                Criteria.where("_id").is(notificationId),
                Criteria.where("recipientUserId").is(userId),
                Criteria.where("channel").is(NotificationChannel.IN_APP),
                Criteria.where("readAt").is(null)));

        Instant now = Instant.now();
        Update update = new Update()
                .set("readAt", now)
                .set("updatedAt", now);

        return mongoTemplate.updateFirst(query, update, NotificationDelivery.class).getModifiedCount() > 0;
    }

    public long markAllAsRead(String userId) {
        Query query = new Query(new Criteria().andOperator(
                Criteria.where("recipientUserId").is(userId),
                Criteria.where("channel").is(NotificationChannel.IN_APP),
                Criteria.where("readAt").is(null)));

        Instant now = Instant.now();
        Update update = new Update()
                .set("readAt", now)
                .set("updatedAt", now);

        return mongoTemplate.updateMulti(query, update, NotificationDelivery.class).getModifiedCount();
    }
}
