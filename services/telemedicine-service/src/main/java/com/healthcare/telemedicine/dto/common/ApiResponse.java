package com.healthcare.telemedicine.dto.common;

import java.time.Instant;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ApiResponse<T> {
    boolean success;
    T data;
    String message;
    Instant timestamp;

    public static <T> ApiResponse<T> success(T data, String message) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .message(message)
                .timestamp(Instant.now())
                .build();
    }

    public static ApiResponse<Void> successMessage(String message) {
        return success(null, message);
    }

    public static ApiResponse<Void> failure(String message) {
        return ApiResponse.<Void>builder()
                .success(false)
                .data(null)
                .message(message)
                .timestamp(Instant.now())
                .build();
    }
}
