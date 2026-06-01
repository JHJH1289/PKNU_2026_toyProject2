package com.example.drive.dto;

import java.util.List;

public class PostUpdateRequest {
    private String caption;
    private String locationName;
    private Double latitude;
    private Double longitude;
    private String categoryTag;
    private List<PostLocationRequest> locations;
    private List<Integer> imageOrder;

    public String getCaption() {
        return caption;
    }

    public void setCaption(String caption) {
        this.caption = caption;
    }

    public String getLocationName() {
        return locationName;
    }

    public void setLocationName(String locationName) {
        this.locationName = locationName;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public String getCategoryTag() {
        return categoryTag;
    }

    public void setCategoryTag(String categoryTag) {
        this.categoryTag = categoryTag;
    }

    public List<PostLocationRequest> getLocations() {
        return locations;
    }

    public void setLocations(List<PostLocationRequest> locations) {
        this.locations = locations;
    }

    public List<Integer> getImageOrder() {
        return imageOrder;
    }

    public void setImageOrder(List<Integer> imageOrder) {
        this.imageOrder = imageOrder;
    }
}
