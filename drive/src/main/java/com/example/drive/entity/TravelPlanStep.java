package com.example.drive.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "TRAVEL_PLAN_STEPS")
public class TravelPlanStep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "PLAN_ID", nullable = false)
    private TravelPlan plan;

    @Column(name = "SORT_ORDER", nullable = false)
    private Integer sortOrder;

    @Column(name = "STEP_TIME", length = 30)
    private String stepTime;

    @Column(name = "PLACE_NAME", length = 300)
    private String placeName;

    @Column(name = "THEME", length = 100)
    private String theme;

    @Column(name = "NOTE", length = 2000)
    private String note;

    protected TravelPlanStep() {
    }

    public TravelPlanStep(
            TravelPlan plan,
            Integer sortOrder,
            String stepTime,
            String placeName,
            String theme,
            String note
    ) {
        this.plan = plan;
        this.sortOrder = sortOrder;
        this.stepTime = stepTime;
        this.placeName = placeName;
        this.theme = theme;
        this.note = note;
    }

    public Long getId() { return id; }
    public Integer getSortOrder() { return sortOrder; }
    public String getStepTime() { return stepTime; }
    public String getPlaceName() { return placeName; }
    public String getTheme() { return theme; }
    public String getNote() { return note; }
}
