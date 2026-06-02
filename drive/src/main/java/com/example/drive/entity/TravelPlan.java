package com.example.drive.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "TRAVEL_PLANS")
public class TravelPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "OWNER_ID", nullable = false, length = 50)
    private String ownerId;

    @Column(name = "TITLE", nullable = false, length = 300)
    private String title;

    @Column(name = "SUMMARY", length = 2000)
    private String summary;

    @Column(name = "REGION", length = 200)
    private String region;

    @Column(name = "PLAN_STATUS", nullable = false, length = 20)
    private String planStatus;

    @Column(name = "GENERATED_AT")
    private LocalDateTime generatedAt;

    @Column(name = "CREATED_AT", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "UPDATED_AT", nullable = false)
    private LocalDateTime updatedAt;

    @OrderBy("sortOrder ASC, id ASC")
    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TravelPlanPlace> places = new ArrayList<>();

    @OrderBy("sortOrder ASC, id ASC")
    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TravelPlanStep> steps = new ArrayList<>();

    protected TravelPlan() {
    }

    public TravelPlan(String ownerId, String title, String summary, String region, LocalDateTime createdAt) {
        this.ownerId = ownerId;
        this.title = title;
        this.summary = summary;
        this.region = region;
        this.planStatus = "DRAFT";
        this.createdAt = createdAt;
        this.updatedAt = createdAt;
    }

    public Long getId() { return id; }
    public String getOwnerId() { return ownerId; }
    public String getTitle() { return title; }
    public String getSummary() { return summary; }
    public String getRegion() { return region; }
    public String getPlanStatus() { return planStatus; }
    public LocalDateTime getGeneratedAt() { return generatedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public List<TravelPlanPlace> getPlaces() { return places; }
    public List<TravelPlanStep> getSteps() { return steps; }

    public void replacePlaces(List<TravelPlanPlace> nextPlaces) {
        places.clear();
        places.addAll(nextPlaces);
    }

    public void replaceSteps(List<TravelPlanStep> nextSteps) {
        steps.clear();
        steps.addAll(nextSteps);
    }

    public void applyGeneratedPlan(String title, String summary, List<TravelPlanStep> nextSteps, LocalDateTime generatedAt) {
        if (title != null && !title.isBlank()) {
            this.title = title;
        }
        this.summary = summary;
        this.planStatus = "GENERATED";
        this.generatedAt = generatedAt;
        this.updatedAt = generatedAt;
        replaceSteps(nextSteps);
    }
}
