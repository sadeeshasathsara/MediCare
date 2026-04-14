package com.healthcare.aisymptom.controller;

import com.healthcare.aisymptom.dto.SymptomCheckRequest;
import com.healthcare.aisymptom.dto.SymptomCheckResponse;
import com.healthcare.aisymptom.service.OpenAiSymptomService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/symptom-check")
public class SymptomCheckerController {

    private final OpenAiSymptomService openAiSymptomService;

    public SymptomCheckerController(OpenAiSymptomService openAiSymptomService) {
        this.openAiSymptomService = openAiSymptomService;
    }

    @PostMapping
    public ResponseEntity<SymptomCheckResponse> checkSymptoms(@Valid @RequestBody SymptomCheckRequest request) {
        return ResponseEntity.ok(openAiSymptomService.analyzeSymptoms(request));
    }
}
