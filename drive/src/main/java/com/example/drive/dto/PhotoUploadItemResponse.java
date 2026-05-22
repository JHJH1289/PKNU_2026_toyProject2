package com.example.drive.dto;

import java.time.LocalDateTime;
import java.util.List;

public class PhotoUploadItemResponse {

    private final Long id;
    private final String ownerId;
    private final String folderPath;
    private final String originalName;
    private final String storageKey;
    private final long size;
    private final String imageUrl;
    private final String thumbnailUrl;
    private final Integer width;
    private final Integer height;
    private final LocalDateTime takenAt;
    private final String cameraMake;
    private final String cameraModel;
    private final String focalLength;
    private final String fNumber;
    private final String exposureTime;
    private final Integer iso;
    private final String lensModel;
    private final Double gpsLatitude;
    private final Double gpsLongitude;
    private final List<String> tags;

    public PhotoUploadItemResponse(
            Long id,
            String ownerId,
            String folderPath,
            String originalName,
            String storageKey,
            long size,
            String imageUrl,
            String thumbnailUrl,
            Integer width,
            Integer height,
            LocalDateTime takenAt,
            String cameraMake,
            String cameraModel,
            String focalLength,
            String fNumber,
            String exposureTime,
            Integer iso,
            String lensModel,
            Double gpsLatitude,
            Double gpsLongitude,
            List<String> tags
    ) {
        this.id = id;
        this.ownerId = ownerId;
        this.folderPath = folderPath;
        this.originalName = originalName;
        this.storageKey = storageKey;
        this.size = size;
        this.imageUrl = imageUrl;
        this.thumbnailUrl = thumbnailUrl;
        this.width = width;
        this.height = height;
        this.takenAt = takenAt;
        this.cameraMake = cameraMake;
        this.cameraModel = cameraModel;
        this.focalLength = focalLength;
        this.fNumber = fNumber;
        this.exposureTime = exposureTime;
        this.iso = iso;
        this.lensModel = lensModel;
        this.gpsLatitude = gpsLatitude;
        this.gpsLongitude = gpsLongitude;
        this.tags = tags;
    }

    public Long getId() {
        return id;
    }

    public String getOwnerId() {
        return ownerId;
    }

    public String getFolderPath() {
        return folderPath;
    }

    public String getOriginalName() {
        return originalName;
    }

    public String getStorageKey() {
        return storageKey;
    }

    public long getSize() {
        return size;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public String getThumbnailUrl() {
        return thumbnailUrl;
    }

    public Integer getWidth() {
        return width;
    }

    public Integer getHeight() {
        return height;
    }

    public LocalDateTime getTakenAt() {
        return takenAt;
    }

    public String getCameraMake() {
        return cameraMake;
    }

    public String getCameraModel() {
        return cameraModel;
    }

    public String getFocalLength() {
        return focalLength;
    }

    public String getFNumber() {
        return fNumber;
    }

    public String getExposureTime() {
        return exposureTime;
    }

    public Integer getIso() {
        return iso;
    }

    public String getLensModel() {
        return lensModel;
    }

    public Double getGpsLatitude() {
        return gpsLatitude;
    }

    public Double getGpsLongitude() {
        return gpsLongitude;
    }

    public List<String> getTags() {
        return tags;
    }
}
