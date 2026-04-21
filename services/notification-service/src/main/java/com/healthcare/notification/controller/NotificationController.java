package com.healthcare.notification.controller;

import com.healthcare.notification.dto.api.NotificationItemResponse;
import com.healthcare.notification.dto.api.NotificationMarkAllReadResponse;
import com.healthcare.notification.dto.api.NotificationPageResponse;
import com.healthcare.notification.dto.api.NotificationReadState;
import com.healthcare.notification.dto.api.NotificationUnreadCountResponse;
import com.healthcare.notification.model.NotificationDelivery;
import com.healthcare.notification.model.NotificationEventType;
import com.healthcare.notification.model.NotificationStatus;
import com.healthcare.notification.service.NotificationQueryService;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
            @RequestParam(required = false) NotificationStatus status,
            @RequestParam(defaultValue = "all") String readState) {

        String safeUserId = requireUserId(userId);
        NotificationReadState parsedReadState = parseReadState(readState);

        Page<NotificationDelivery> results = notificationQueryService.findUserNotifications(
                safeUserId,
                page,
                size,
                type,
                status,
                parsedReadState);

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

    @GetMapping("/me/unread-count")
    public ResponseEntity<NotificationUnreadCountResponse> getUnreadCount(
            @RequestHeader(value = USER_ID_HEADER, required = false) String userId) {
        String safeUserId = requireUserId(userId);
        return ResponseEntity.ok(new NotificationUnreadCountResponse(notificationQueryService.countUnread(safeUserId)));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(
            @RequestHeader(value = USER_ID_HEADER, required = false) String userId,
            @PathVariable("id") String notificationId) {
        String safeUserId = requireUserId(userId);
        boolean updated = notificationQueryService.markAsRead(safeUserId, notificationId);
        if (!updated) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "notification not found");
        }
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/me/read-all")
    public ResponseEntity<NotificationMarkAllReadResponse> markAllAsRead(
            @RequestHeader(value = USER_ID_HEADER, required = false) String userId) {
        String safeUserId = requireUserId(userId);
        long modified = notificationQueryService.markAllAsRead(safeUserId);
        return ResponseEntity.ok(new NotificationMarkAllReadResponse(modified));
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
                delivery.getReadAt(),
                delivery.getReadAt() != null,
                delivery.getLastError(),
                delivery.getTemplateData());
    }

    private static String requireUserId(String userId) {
        if (userId == null || userId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "missing X-User-Id");
        }
        return userId.trim();
    }

    private static NotificationReadState parseReadState(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return NotificationReadState.ALL;
        }
        return switch (rawValue.trim().toUpperCase()) {
            case "ALL" -> NotificationReadState.ALL;
            case "UNREAD" -> NotificationReadState.UNREAD;
            case "READ" -> NotificationReadState.READ;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "invalid readState. Allowed values: all, unread, read");
        };
    }
}
