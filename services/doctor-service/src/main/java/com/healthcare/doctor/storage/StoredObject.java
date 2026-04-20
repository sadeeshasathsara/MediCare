package com.healthcare.doctor.storage;

import java.io.InputStream;

public class StoredObject {
    private final InputStream inputStream;
    private final long contentLength;
    private final String contentType;

    public StoredObject(InputStream inputStream, long contentLength, String contentType) {
        this.inputStream = inputStream;
        this.contentLength = contentLength;
        this.contentType = contentType;
    }

    public InputStream getInputStream() {
        return inputStream;
    }

    public long getContentLength() {
        return contentLength;
    }

    public String getContentType() {
        return contentType;
    }
}
