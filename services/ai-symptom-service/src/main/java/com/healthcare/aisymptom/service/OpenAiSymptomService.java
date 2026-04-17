package com.healthcare.aisymptom.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthcare.aisymptom.dto.DoctorCandidateDto;
import com.healthcare.aisymptom.dto.SymptomCheckRequest;
import com.healthcare.aisymptom.dto.SymptomResponse;
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
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class OpenAiSymptomService {

    private static final String DEFAULT_DISCLAIMER =
            "This response is AI-generated and is not a medical diagnosis. For medical advice, consult a licensed doctor.";
    private static final String DEFAULT_SPECIALTY = "General Practice";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

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
            ObjectMapper objectMapper,
            @Value("${openai.timeout-ms:30000}") int timeoutMs
    ) {
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofMillis(timeoutMs))
                .setReadTimeout(Duration.ofMillis(timeoutMs))
                .build();
        this.objectMapper = objectMapper;
    }

    public SymptomResponse analyzeSymptoms(SymptomCheckRequest request) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new AiIntegrationException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "OpenAI API key is not configured for ai-symptom-service");
        }

        List<Map<String, String>> messages = new ArrayList<>();

        // Count conversation turns to know when to force a diagnosis
        int userTurns = 0;
        if (request.history() != null) {
            for (var msg : request.history()) {
                if ("user".equals(msg.role())) userTurns++;
            }
        }
        userTurns++; // current message
        boolean forceDiagnosis = userTurns >= 3;

        // 1. System Prompt
        String dynamicSystemPrompt = "You are 'MediCare AI', a professional and empathetic medical assistant. " +
                "Your goal is to help patients understand their symptoms and recommend the right specialist from our database. " +
                "STRICT RULES: " +
                "1. When asking a follow-up question, ALWAYS set 'isDiagnostic': false AND provide an 'options' array with 3-4 multiple-choice answers relevant to the question. The LAST option should always be 'Other (type your own)'. " +
                "2. After 2-3 exchanges OR when patient says 'give me a doctor' or similar, you MUST conclude: set 'isDiagnostic': true, fill ALL diagnostic fields (possibleConditions, recommendedSpecialty, recommendedDoctorIds, urgencyLevel, advice). " +
                "3. When isDiagnostic is true, you MUST select recommendedDoctorIds from the AVAILABLE DOCTORS list provided. Pick doctors whose specialty matches. " +
                "4. If symptoms sound life-threatening, skip questions and set isDiagnostic to true with urgencyLevel EMERGENCY. " +
                "5. Keep aiMessage concise (2-3 sentences max). " +
                "6. RETURN ONLY valid JSON, no markdown.";

        if (forceDiagnosis) {
            dynamicSystemPrompt += " IMPORTANT: This is the patient's " + userTurns + "th message. You MUST provide your final diagnosis NOW. Set isDiagnostic to true and fill all diagnostic fields including recommendedDoctorIds.";
        }

        messages.add(Map.of("role", "system", "content", dynamicSystemPrompt));

        // 2. Add History
        if (request.history() != null) {
            for (var msg : request.history()) {
                messages.add(Map.of("role", msg.role(), "content", msg.content()));
            }
        }

        // 3. Add Current Input (with demographic context)
        String userContextPrompt = buildUserContextPrompt(request, forceDiagnosis);
        messages.add(Map.of("role", "user", "content", userContextPrompt));

        Map<String, Object> payload = Map.of(
                "model", model,
                "messages", messages,
                "temperature", 0.3,
                "max_tokens", maxResponseTokens,
                "response_format", Map.of("type", "json_object")
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    baseUrl, HttpMethod.POST, entity, JsonNode.class
            );

            JsonNode root = response.getBody();
            if (root == null) throw new AiIntegrationException(HttpStatus.BAD_GATEWAY, "Empty AI response");

            String content = root.path("choices").path(0).path("message").path("content").asText();
            if (content == null || content.isBlank()) throw new AiIntegrationException(HttpStatus.BAD_GATEWAY, "No AI content");
            
            System.out.println("========== OPENAI RAW RESPONSE ==========");
            System.out.println(content);
            System.out.println("=========================================");

            JsonNode structuredResponse = parseStructuredResponse(content.trim());

            SymptomResponse res = new SymptomResponse();
            res.setAiMessage(asTextOrDefault(structuredResponse.path("aiMessage"), "How can I help you today?"));

            boolean diagFlag = structuredResponse.path("isDiagnostic").asBoolean(false);

            // Force diagnosis after enough turns
            if (!diagFlag && forceDiagnosis) {
                diagFlag = true;
            }

            res.setDiagnostic(diagFlag);

            if (res.isDiagnostic()) {
                res.setPossibleConditions(readConditions(structuredResponse.path("possibleConditions")));
                String spec = normalizeSpecialty(asTextOrDefault(structuredResponse.path("recommendedSpecialty"), DEFAULT_SPECIALTY));
                res.setRecommendedSpecialty(spec);
                res.setRecommendedDoctor(asTextOrDefault(structuredResponse.path("recommendedDoctor"), spec));

                List<String> docIds = readRecommendedDoctorIds(structuredResponse.path("recommendedDoctorIds"), request.availableDoctors());
                if (docIds.isEmpty()) docIds = fallbackRecommendationIds(request.availableDoctors(), spec);
                res.setRecommendedDoctorIds(docIds);

                res.setUrgencyLevel(asTextOrDefault(structuredResponse.path("urgencyLevel"), "MODERATE"));
                res.setAdvice(asTextOrDefault(structuredResponse.path("advice"), "Please consult a professional."));
            } else {
                // Parse options for follow-up questions
                res.setOptions(readConditions(structuredResponse.path("options")));
            }

            res.setDisclaimer(DEFAULT_DISCLAIMER);
            return res;

        } catch (RestClientException ex) {
            throw new AiIntegrationException(HttpStatus.BAD_GATEWAY, "AI Service unreachable: " + ex.getMessage());
        }
    }

    private String buildUserContextPrompt(SymptomCheckRequest request, boolean forceDiagnosis) {
        StringBuilder sb = new StringBuilder();
        sb.append("USER INPUT: ").append(request.symptoms()).append("\n\n");

        sb.append("PATIENT CONTEXT:\n");
        if (request.age() != null) sb.append("- Age: ").append(request.age()).append("\n");
        if (request.gender() != null) sb.append("- Gender: ").append(request.gender()).append("\n");
        if (request.medicalHistory() != null) sb.append("- History: ").append(request.medicalHistory()).append("\n");

        String docs = buildDoctorCatalogSnippet(request.availableDoctors());
        if (!docs.isBlank()) sb.append("\nAVAILABLE DOCTORS (use these EXACT IDs in recommendedDoctorIds):\n").append(docs);

        if (forceDiagnosis) {
            sb.append("\n*** YOU MUST PROVIDE A FINAL DIAGNOSIS NOW. Set isDiagnostic=true, fill possibleConditions, recommendedSpecialty, recommendedDoctorIds (pick from available doctors above), urgencyLevel, and advice. ***\n");
        }

        sb.append("\nRETURN ONLY this JSON:\n");
        sb.append("{\n")
          .append("  \"aiMessage\": \"Your response as a doctor\",\n")
          .append("  \"isDiagnostic\": false,\n")
          .append("  \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Other (type your own)\"],\n")
          .append("  \"possibleConditions\": [\"condition1\", \"condition2\"],\n")
          .append("  \"recommendedSpecialty\": \"Neurology\",\n")
          .append("  \"recommendedDoctorIds\": [\"doctor-id-from-list\"],\n")
          .append("  \"urgencyLevel\": \"LOW|MODERATE|HIGH|EMERGENCY\",\n")
          .append("  \"advice\": \"Advice text\"\n")
          .append("}\n")
          .append("RULES: When isDiagnostic=false, include options array. When isDiagnostic=true, include possibleConditions, recommendedSpecialty, recommendedDoctorIds, urgencyLevel, and advice. Omit options when diagnostic.");

        return sb.toString();
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

        String doctorCatalog = buildDoctorCatalogSnippet(request.availableDoctors());
        if (!doctorCatalog.isBlank()) {
            prompt.append("Available doctors (use these exact IDs in recommendations):\n")
                    .append(doctorCatalog)
                    .append("\n");
        }

        prompt.append("\nReturn ONLY valid JSON with this exact schema:\n")
                .append("{")
                .append("\"possibleConditions\":[\"condition1\",\"condition2\",\"condition3\"],")
            .append("\"recommendedSpecialty\":\"one of: Cardiology, Dermatology, Endocrinology, Gastroenterology, General Practice, Neurology, Obstetrics & Gynecology, Oncology, Ophthalmology, Orthopedics, Pediatrics, Psychiatry, Pulmonology, Radiology, Urology\",")
            .append("\"recommendedDoctor\":\"short human-readable specialist description\",")                .append("\"recommendedDoctorIds\":[\"doctor-id-1\",\"doctor-id-2\"],")                .append("\"urgencyLevel\":\"LOW|MODERATE|HIGH|EMERGENCY\",")
                .append("\"advice\":\"concise next actions and red flags\"")
                .append("}\n")
                .append("Do not include markdown or any extra text outside JSON.");

        return prompt.toString();
    }

    private JsonNode parseStructuredResponse(String content) {
        try {
            return objectMapper.readTree(content);
        } catch (Exception ignored) {
            int start = content.indexOf('{');
            int end = content.lastIndexOf('}');
            if (start >= 0 && end > start) {
                try {
                    return objectMapper.readTree(content.substring(start, end + 1));
                } catch (Exception ignoredAgain) {
                    // Fall through to integration exception below.
                }
            }
        }

        throw new AiIntegrationException(HttpStatus.BAD_GATEWAY,
                "OpenAI response format was invalid for SymptomResponse");
    }

    private List<String> readConditions(JsonNode node) {
        if (node == null || !node.isArray()) {
            return Collections.emptyList();
        }

        List<String> conditions = new ArrayList<>();
        node.forEach(item -> {
            String value = item.asText();
            if (value != null && !value.isBlank()) {
                conditions.add(value.trim());
            }
        });

        return conditions;
    }

    private String asTextOrDefault(JsonNode node, String fallback) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return fallback;
        }

        String value = node.asText();
        return (value == null || value.isBlank()) ? fallback : value.trim();
    }

    private String buildDoctorCatalogSnippet(List<DoctorCandidateDto> doctors) {
        if (doctors == null || doctors.isEmpty()) {
            return "";
        }

        StringBuilder builder = new StringBuilder();
        int limit = Math.min(doctors.size(), 80);
        for (int i = 0; i < limit; i++) {
            DoctorCandidateDto doctor = doctors.get(i);
            if (doctor == null || doctor.id() == null || doctor.id().isBlank()) {
                continue;
            }

            builder.append("- id: ").append(doctor.id().trim())
                    .append(", name: ").append(doctor.fullName() == null ? "N/A" : doctor.fullName().trim())
                    .append(", specialty: ").append(doctor.specialty() == null ? "N/A" : doctor.specialty().trim())
                    .append("\n");
        }

        return builder.toString();
    }

    private List<String> readRecommendedDoctorIds(JsonNode node, List<DoctorCandidateDto> availableDoctors) {
        if (node == null || !node.isArray() || availableDoctors == null || availableDoctors.isEmpty()) {
            return Collections.emptyList();
        }

        Set<String> validIds = new LinkedHashSet<>();
        for (DoctorCandidateDto doctor : availableDoctors) {
            if (doctor != null && doctor.id() != null && !doctor.id().isBlank()) {
                validIds.add(doctor.id().trim());
            }
        }

        if (validIds.isEmpty()) {
            return Collections.emptyList();
        }

        List<String> recommended = new ArrayList<>();
        node.forEach(item -> {
            String id = item.asText();
            if (id != null && !id.isBlank()) {
                String normalized = id.trim();
                if (validIds.contains(normalized) && !recommended.contains(normalized) && recommended.size() < 6) {
                    recommended.add(normalized);
                }
            }
        });

        return recommended;
    }

    private List<String> fallbackRecommendationIds(List<DoctorCandidateDto> availableDoctors, String recommendedSpecialty) {
        if (availableDoctors == null || availableDoctors.isEmpty()) {
            return Collections.emptyList();
        }

        String target = normalizeSpecialty(recommendedSpecialty);
        List<String> matches = new ArrayList<>();
        for (DoctorCandidateDto doctor : availableDoctors) {
            if (doctor == null || doctor.id() == null || doctor.id().isBlank()) {
                continue;
            }

            String doctorSpecialty = normalizeSpecialty(doctor.specialty());
            if (target.equalsIgnoreCase(doctorSpecialty)) {
                matches.add(doctor.id().trim());
                if (matches.size() >= 6) {
                    break;
                }
            }
        }

        return matches;
    }

    private String normalizeSpecialty(String value) {
        if (value == null || value.isBlank()) {
            return DEFAULT_SPECIALTY;
        }

        String normalized = value.trim();
        String lower = normalized.toLowerCase();

        if (lower.contains("cardio") || lower.contains("heart")) return "Cardiology";
        if (lower.contains("dermat") || lower.contains("skin") || lower.contains("rash")) return "Dermatology";
        if (lower.contains("endocr") || lower.contains("diabetes") || lower.contains("thyroid")) return "Endocrinology";
        if (lower.contains("gastro") || lower.contains("stomach") || lower.contains("digest")) return "Gastroenterology";
        if (lower.contains("neuro") || lower.contains("headache") || lower.contains("seizure")) return "Neurology";
        if (lower.contains("obstetric") || lower.contains("gynec") || lower.contains("pregnan") || lower.contains("women")) return "Obstetrics & Gynecology";
        if (lower.contains("onco") || lower.contains("cancer")) return "Oncology";
        if (lower.contains("ophthal") || lower.contains("vision") || lower.contains("eye")) return "Ophthalmology";
        if (lower.contains("ortho") || lower.contains("bone") || lower.contains("joint") || lower.contains("fracture")) return "Orthopedics";
        if (lower.contains("pedi") || lower.contains("child") || lower.contains("infant")) return "Pediatrics";
        if (lower.contains("psychi") || lower.contains("mental") || lower.contains("anxiety") || lower.contains("depress")) return "Psychiatry";
        if (lower.contains("pulmon") || lower.contains("lung") || lower.contains("asthma") || lower.contains("breath")) return "Pulmonology";
        if (lower.contains("radiol") || lower.contains("imaging") || lower.contains("scan")) return "Radiology";
        if (lower.contains("uro") || lower.contains("urinary") || lower.contains("kidney")) return "Urology";
        if (lower.contains("general") || lower.contains("primary") || lower.contains("physician") || lower.contains("doctor")) return "General Practice";

        return normalized;
    }
}
