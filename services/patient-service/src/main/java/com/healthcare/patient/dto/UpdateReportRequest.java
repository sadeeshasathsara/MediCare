package com.healthcare.patient.dto;

public class UpdateReportRequest {
    private String folderId; // null/blank => Uncategorized
    private String displayFileName; // optional

    public String getFolderId() {
        return folderId;
    }

    public void setFolderId(String folderId) {
        this.folderId = folderId;
    }

    public String getDisplayFileName() {
        return displayFileName;
    }

    public void setDisplayFileName(String displayFileName) {
        this.displayFileName = displayFileName;
    }
}
