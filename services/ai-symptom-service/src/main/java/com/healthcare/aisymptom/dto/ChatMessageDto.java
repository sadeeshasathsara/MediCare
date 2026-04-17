package com.healthcare.aisymptom.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ChatMessageDto(
        @NotBlank(message = "role is required")
        @Pattern(regexp = "user|assistant|system", message = "role must be user, assistant, or system")
        String role,

        @NotBlank(message = "content is required")
        String content
) {
}
