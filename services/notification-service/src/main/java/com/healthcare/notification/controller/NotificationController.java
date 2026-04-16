package com.healthcare.notification.controller;

import com.healthcare.notification.dto.api.NotificationItemResponse;
import com.healthcare.notification.dto.api.NotificationPageResponse;
import com.healthcare.notification.model.NotificationDelivery;
import com.healthcare.notification.model.NotificationEventType;
import com.healthcare.notification.model.NotificationStatus;
import com.healthcare.notification.service.NotificationQueryService;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private static final String USER_ID_HEADER = "X-User-Id";
    private final NotificationQueryService notificationQueryService;

    public NotificationController(NotificationQueryService notificationQueryService) {
        this.notificationQueryService = notificationQueryService;
    }

    @GetMapping("/me")
    public ResponseEntity<NotificationPageResponse> getMyNotifications(
            @RequestHeader(value = USER_ID_HEADER, required = false) String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) NotificationEventType type,
            @RequestParam(required = false) NotificationStatus status) {

        if (userId == null || userId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "missing X-User-Id");
        }

        Page<NotificationDelivery> results = notificationQueryService.findUserNotifications(
                userId.trim(),
                page,
                size,
                type,
                status);

        List<NotificationItemResponse> items = results.getContent().stream()
                .map(this::toItemResponse)
                .toList();

        NotificationPageResponse response = new NotificationPageResponse(
                items,
                results.getNumber(),
                results.getSize(),
                results.getTotalElements(),
                results.getTotalPages(),
                results.hasNext());

        return ResponseEntity.ok(response);
    }

    private NotificationItemResponse toItemResponse(NotificationDelivery delivery) {
        return new NotificationItemResponse(
                delivery.getId(),
                delivery.getEventId(),
                delivery.getChannel(),
                delivery.getEventType(),
                delivery.getSmsType(),
                delivery.getStatus(),
                delivery.getSubject(),
                delivery.getSummary(),
                delivery.getAppointmentId(),
                delivery.getRecipientPhone(),
                delivery.getScheduledAt(),
                delivery.getProviderMessageId(),
                delivery.getContentText(),
                delivery.getOccurredAt(),
                delivery.getCreatedAt(),
                delivery.getSentAt(),
                delivery.getLastError(),
                delivery.getTemplateData());
    }
}
