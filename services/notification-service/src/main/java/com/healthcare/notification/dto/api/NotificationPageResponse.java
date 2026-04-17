package com.healthcare.notification.dto.api;

import java.util.List;

public record NotificationPageResponse(
        List<NotificationItemResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext) {
}
