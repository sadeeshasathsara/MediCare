package com.healthcare.aisymptom.dto;

import java.util.List;

public class SymptomResponse {

    private List<String> possibleConditions;
    private String recommendedDoctor;
    private String urgencyLevel;
    private String advice;
    private String disclaimer;

    public SymptomResponse() {
    }

    public SymptomResponse(List<String> possibleConditions, String recommendedDoctor, String urgencyLevel, String advice,
                           String disclaimer) {
        this.possibleConditions = possibleConditions;
        this.recommendedDoctor = recommendedDoctor;
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

    public String getRecommendedDoctor() {
        return recommendedDoctor;
    }

    public void setRecommendedDoctor(String recommendedDoctor) {
        this.recommendedDoctor = recommendedDoctor;
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