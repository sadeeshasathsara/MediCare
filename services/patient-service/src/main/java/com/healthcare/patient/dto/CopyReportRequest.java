package com.healthcare.patient.dto;

public class CopyReportRequest {
    private String folderId; // optional
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
