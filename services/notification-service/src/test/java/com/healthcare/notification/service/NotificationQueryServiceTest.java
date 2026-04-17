package com.healthcare.notification.service;

import com.healthcare.notification.model.NotificationDelivery;
import com.healthcare.notification.model.NotificationEventType;
import com.healthcare.notification.model.NotificationStatus;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationQueryServiceTest {

    @Mock
    private MongoTemplate mongoTemplate;

    @Test
    void shouldFilterByUserIdAndOptionalCriteria() {
        NotificationDelivery delivery = new NotificationDelivery();
        delivery.setRecipientUserId("user-1");
        delivery.setEventType(NotificationEventType.APPOINTMENT_CONFIRMED);
        delivery.setStatus(NotificationStatus.SENT);

        when(mongoTemplate.count(any(Query.class), eq(NotificationDelivery.class))).thenReturn(1L);
        when(mongoTemplate.find(any(Query.class), eq(NotificationDelivery.class))).thenReturn(List.of(delivery));

        NotificationQueryService service = new NotificationQueryService(mongoTemplate);
        Page<NotificationDelivery> page = service.findUserNotifications(
                "user-1",
                0,
                20,
                NotificationEventType.APPOINTMENT_CONFIRMED,
                NotificationStatus.SENT);

        ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
        verify(mongoTemplate).find(queryCaptor.capture(), eq(NotificationDelivery.class));

        Document queryDoc = queryCaptor.getValue().getQueryObject();
        assertEquals("user-1", queryDoc.get("recipientUserId"));
        assertEquals("APPOINTMENT_CONFIRMED", String.valueOf(queryDoc.get("eventType")));
        assertEquals("SENT", String.valueOf(queryDoc.get("status")));
        assertEquals(1, page.getTotalElements());
        assertEquals(1, page.getContent().size());
        assertTrue(page.getContent().stream().allMatch(item -> "user-1".equals(item.getRecipientUserId())));
    }
}
