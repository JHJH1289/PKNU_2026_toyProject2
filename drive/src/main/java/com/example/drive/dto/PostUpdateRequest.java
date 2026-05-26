package com.example.drive.dto;

import java.util.List;

public class PostUpdateRequest {
    private String caption;
    private String locationName;
    private Double latitude;
    private Double longitude;
    private String categoryTag;
    private List<PostLocationRequest> locations;

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

    public List<PostLocationRequest> getLocations() {
        return locations;
    }
}
