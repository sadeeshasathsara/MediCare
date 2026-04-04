package com.healthcare.patient.storage;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;

public class LocalStorageService implements StorageService {

    private final Path baseDir;

    public LocalStorageService(org.springframework.core.env.Environment environment) {
        String dir = environment.getProperty("patient.storage.local-dir", "./data/patient-reports");
        this.baseDir = Path.of(dir).toAbsolutePath().normalize();
    }

    @Override
    public void put(String key, InputStream inputStream, long contentLength, String contentType) {
        try {
            Path dest = resolveKeyPath(key);
            Files.createDirectories(dest.getParent());
            try (OutputStream out = Files.newOutputStream(dest)) {
                inputStream.transferTo(out);
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file", e);
        }
    }

    @Override
    public StoredObject get(String key) {
        try {
            Path path = resolveKeyPath(key);
            if (!Files.exists(path)) {
                throw new IllegalArgumentException("Object not found");
            }
            long size = Files.size(path);
            InputStream in = Files.newInputStream(path);
            String contentType = Files.probeContentType(path);
            return new StoredObject(in, size, contentType);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read file", e);
        }
    }

    private Path resolveKeyPath(String key) {
        String safeKey = key.replace('\\', '/');
        while (safeKey.startsWith("/"))
            safeKey = safeKey.substring(1);
        Path resolved = baseDir.resolve(safeKey).normalize();
        if (!resolved.startsWith(baseDir)) {
            throw new IllegalArgumentException("Invalid storage key");
        }
        return resolved;
    }
}
