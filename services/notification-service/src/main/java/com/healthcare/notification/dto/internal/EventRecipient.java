package com.healthcare.notification.dto.internal;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record EventRecipient(
        @NotBlank String userId,
        @NotBlank String name,
        @NotBlank @Email String email,
        @Pattern(regexp = "^\\+?[1-9]\\d{7,14}$", message = "phoneNumber must be in E.164 format")
        String phoneNumber) {
}
