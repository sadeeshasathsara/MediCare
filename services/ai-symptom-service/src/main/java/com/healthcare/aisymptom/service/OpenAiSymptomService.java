package com.healthcare.aisymptom.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.healthcare.aisymptom.dto.SymptomCheckRequest;
import com.healthcare.aisymptom.dto.SymptomCheckResponse;
import com.healthcare.aisymptom.exception.AiIntegrationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
public class OpenAiSymptomService {

    private static final String DEFAULT_DISCLAIMER =
            "This response is AI-generated and is not a medical diagnosis. For medical advice, consult a licensed doctor.";

    private final RestTemplate restTemplate;

    @Value("${openai.api-key:}")
    private String apiKey;

    @Value("${openai.base-url}")
    private String baseUrl;

    @Value("${openai.model}")
    private String model;

    @Value("${ai.symptom.max-response-tokens:600}")
    private Integer maxResponseTokens;

    @Value("${ai.symptom.system-prompt}")
    private String systemPrompt;

    public OpenAiSymptomService(
            RestTemplateBuilder restTemplateBuilder,
            @Value("${openai.timeout-ms:30000}") int timeoutMs
    ) {
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofMillis(timeoutMs))
                .setReadTimeout(Duration.ofMillis(timeoutMs))
                .build();
    }

    public SymptomCheckResponse analyzeSymptoms(SymptomCheckRequest request) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new AiIntegrationException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "OpenAI API key is not configured for ai-symptom-service");
        }

        String userPrompt = buildUserPrompt(request);

        Map<String, Object> payload = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)
                ),
                "temperature", 0.2,
                "max_tokens", maxResponseTokens
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    baseUrl,
                    HttpMethod.POST,
                    entity,
                    JsonNode.class
            );

            JsonNode root = response.getBody();
            if (root == null) {
                throw new AiIntegrationException(HttpStatus.BAD_GATEWAY,
                        "OpenAI returned an empty response");
            }

            String content = root.path("choices").path(0).path("message").path("content").asText();
            if (content == null || content.isBlank()) {
                throw new AiIntegrationException(HttpStatus.BAD_GATEWAY,
                        "OpenAI response did not include generated content");
            }

            return new SymptomCheckResponse(content.trim(), model, Instant.now(), DEFAULT_DISCLAIMER);
        } catch (RestClientException ex) {
            throw new AiIntegrationException(HttpStatus.BAD_GATEWAY,
                    "Failed to get response from OpenAI: " + ex.getMessage());
        }
    }

    private String buildUserPrompt(SymptomCheckRequest request) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("Patient symptoms: ").append(request.symptoms()).append("\n");

        if (request.age() != null) {
            prompt.append("Age: ").append(request.age()).append("\n");
        }
        if (request.gender() != null && !request.gender().isBlank()) {
            prompt.append("Gender: ").append(request.gender().trim()).append("\n");
        }
        if (request.medicalHistory() != null && !request.medicalHistory().isBlank()) {
            prompt.append("Medical history: ").append(request.medicalHistory().trim()).append("\n");
        }

        prompt.append("\nProvide output with these sections:\n")
                .append("1) Possible causes (top 3)\n")
                .append("2) Urgency level: LOW/MODERATE/HIGH/EMERGENCY\n")
                .append("3) Recommended next actions\n")
                .append("4) Red-flag symptoms to watch for\n");

        return prompt.toString();
    }
}
