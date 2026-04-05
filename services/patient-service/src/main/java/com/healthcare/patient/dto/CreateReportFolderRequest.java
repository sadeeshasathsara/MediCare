package com.healthcare.patient.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateReportFolderRequest {

    @NotBlank
    private String name;

    private String parentId; // optional

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getParentId() {
        return parentId;
    }

    public void setParentId(String parentId) {
        this.parentId = parentId;
    }
}
