package com.healthcare.aisymptom.dto;

import java.util.List;

public class SymptomResponse {

    private List<String> possibleConditions;
    private String aiMessage;
    private boolean isDiagnostic;
    private String recommendedSpecialty;
    private String recommendedDoctor;
    private List<String> recommendedDoctorIds;
    private String urgencyLevel;
    private String advice;
    private String disclaimer;

    public SymptomResponse() {
    }

    public SymptomResponse(List<String> possibleConditions, String recommendedSpecialty, String recommendedDoctor,
                           List<String> recommendedDoctorIds, String urgencyLevel, String advice, String disclaimer) {
        this.possibleConditions = possibleConditions;
        this.recommendedSpecialty = recommendedSpecialty;
        this.recommendedDoctor = recommendedDoctor;
        this.recommendedDoctorIds = recommendedDoctorIds;
        this.urgencyLevel = urgencyLevel;
        this.advice = advice;
        this.disclaimer = disclaimer;
    }

    public List<String> getPossibleConditions() {
        return possibleConditions;
    }

    public void setPossibleConditions(List<String> possibleConditions) {
        this.possibleConditions = possibleConditions;
    }

    public String getAiMessage() {
        return aiMessage;
    }

    public void setAiMessage(String aiMessage) {
        this.aiMessage = aiMessage;
    }

    public boolean isDiagnostic() {
        return isDiagnostic;
    }

    public void setDiagnostic(boolean diagnostic) {
        isDiagnostic = diagnostic;
    }

    public String getRecommendedSpecialty() {
        return recommendedSpecialty;
    }

    public void setRecommendedSpecialty(String recommendedSpecialty) {
        this.recommendedSpecialty = recommendedSpecialty;
    }

    public String getRecommendedDoctor() {
        return recommendedDoctor;
    }

    public void setRecommendedDoctor(String recommendedDoctor) {
        this.recommendedDoctor = recommendedDoctor;
    }

    public List<String> getRecommendedDoctorIds() {
        return recommendedDoctorIds;
    }

    public void setRecommendedDoctorIds(List<String> recommendedDoctorIds) {
        this.recommendedDoctorIds = recommendedDoctorIds;
    }

    public String getUrgencyLevel() {
        return urgencyLevel;
    }

    public void setUrgencyLevel(String urgencyLevel) {
        this.urgencyLevel = urgencyLevel;
    }

    public String getAdvice() {
        return advice;
    }

    public void setAdvice(String advice) {
        this.advice = advice;
    }

    public String getDisclaimer() {
        return disclaimer;
    }

    public void setDisclaimer(String disclaimer) {
        this.disclaimer = disclaimer;
    }
}