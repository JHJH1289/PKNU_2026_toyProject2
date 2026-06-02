package com.example.drive.dto;

import java.util.List;

public class TravelPlanSaveRequest {
    private String title;
    private String summary;
    private String region;
    private List<PlaceRequest> routePlaces;
    private List<StepRequest> steps;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }
    public List<PlaceRequest> getRoutePlaces() { return routePlaces; }
    public void setRoutePlaces(List<PlaceRequest> routePlaces) { this.routePlaces = routePlaces; }
    public List<StepRequest> getSteps() { return steps; }
    public void setSteps(List<StepRequest> steps) { this.steps = steps; }

    public static class PlaceRequest {
        private Integer orderIndex;
        private String name;
        private String kind;
        private String address;
        private Double latitude;
        private Double longitude;

        public Integer getOrderIndex() { return orderIndex; }
        public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getKind() { return kind; }
        public void setKind(String kind) { this.kind = kind; }
        public String getAddress() { return address; }
        public void setAddress(String address) { this.address = address; }
        public Double getLatitude() { return latitude; }
        public void setLatitude(Double latitude) { this.latitude = latitude; }
        public Double getLongitude() { return longitude; }
        public void setLongitude(Double longitude) { this.longitude = longitude; }
    }

    public static class StepRequest {
        private String time;
        private String place;
        private String theme;
        private String note;

        public String getTime() { return time; }
        public void setTime(String time) { this.time = time; }
        public String getPlace() { return place; }
        public void setPlace(String place) { this.place = place; }
        public String getTheme() { return theme; }
        public void setTheme(String theme) { this.theme = theme; }
        public String getNote() { return note; }
        public void setNote(String note) { this.note = note; }
    }
}
