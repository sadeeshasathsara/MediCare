package com.healthcare.doctor.storage;

import java.io.InputStream;

public interface StorageService {
    void put(String key, InputStream inputStream, long contentLength, String contentType);
    StoredObject get(String key);
    void delete(String key);
}
