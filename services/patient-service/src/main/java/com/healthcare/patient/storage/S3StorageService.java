package com.healthcare.patient.storage;

import org.springframework.core.env.Environment;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.core.sync.RequestBody;

import java.io.InputStream;
import java.net.URI;

public class S3StorageService implements StorageService {

    private final S3Client s3;
    private final String bucket;

    public S3StorageService(Environment environment) {
        this.bucket = environment.getProperty("patient.storage.s3.bucket", "").trim();
        String regionRaw = environment.getProperty("patient.storage.s3.region", "us-east-1").trim();
        String endpointRaw = environment.getProperty("patient.storage.s3.endpoint", "").trim();

        AwsCredentialsProvider credentialsProvider = resolveCredentialsProvider(environment);

        var builder = S3Client.builder()
                .region(Region.of(regionRaw))
                .credentialsProvider(credentialsProvider);

        if (!endpointRaw.isEmpty()) {
            builder = builder.endpointOverride(URI.create(endpointRaw));
        }

        this.s3 = builder.build();
    }

    @Override
    public void put(String key, InputStream inputStream, long contentLength, String contentType) {
        if (bucket.isEmpty()) {
            throw new IllegalStateException("S3 bucket is not configured (patient.storage.s3.bucket)");
        }

        PutObjectRequest req = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType)
                .contentLength(contentLength)
                .build();

        s3.putObject(req, RequestBody.fromInputStream(inputStream, contentLength));
    }

    @Override
    public StoredObject get(String key) {
        if (bucket.isEmpty()) {
            throw new IllegalStateException("S3 bucket is not configured (patient.storage.s3.bucket)");
        }

        try {
            GetObjectRequest req = GetObjectRequest.builder().bucket(bucket).key(key).build();
            var res = s3.getObject(req);
            long contentLength = res.response().contentLength() != null ? res.response().contentLength() : -1;
            String contentType = res.response().contentType();
            return new StoredObject(res, contentLength, contentType);
        } catch (NoSuchKeyException e) {
            throw new IllegalArgumentException("Object not found", e);
        }
    }

    @Override
    public void delete(String key) {
        if (bucket.isEmpty()) {
            throw new IllegalStateException("S3 bucket is not configured (patient.storage.s3.bucket)");
        }

        DeleteObjectRequest req = DeleteObjectRequest.builder().bucket(bucket).key(key).build();
        s3.deleteObject(req);
    }

    private static AwsCredentialsProvider resolveCredentialsProvider(Environment environment) {
        String accessKey = environment.getProperty("S3_ACCESS_KEY_ID", "").trim();
        String secretKey = environment.getProperty("S3_SECRET_ACCESS_KEY", "").trim();
        if (!accessKey.isEmpty() && !secretKey.isEmpty()) {
            return StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey));
        }
        return DefaultCredentialsProvider.create();
    }
}
