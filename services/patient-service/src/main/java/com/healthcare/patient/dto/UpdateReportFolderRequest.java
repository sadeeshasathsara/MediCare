package com.healthcare.patient.dto;

public class UpdateReportFolderRequest {

    private String name; // optional

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
