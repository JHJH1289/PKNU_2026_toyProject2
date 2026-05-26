package com.example.drive.dto;

public class PostUpdateRequest {
    private String caption;
    private String locationName;
    private Double latitude;
    private Double longitude;
    private String categoryTag;

    public String getCaption() {
        return caption;
    }

    public String getLocationName() {
        return locationName;
    }

    public Double getLatitude() {
        return latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public String getCategoryTag() {
        return categoryTag;
    }
}
