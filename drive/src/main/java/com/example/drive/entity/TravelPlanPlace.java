package com.example.drive.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "TRAVEL_PLAN_PLACES")
public class TravelPlanPlace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "PLAN_ID", nullable = false)
    private TravelPlan plan;

    @Column(name = "SORT_ORDER", nullable = false)
    private Integer sortOrder;

    @Column(name = "PLACE_NAME", nullable = false, length = 300)
    private String placeName;

    @Column(name = "PLACE_KIND", nullable = false, length = 30)
    private String placeKind;

    @Column(name = "ADDRESS", length = 1000)
    private String address;

    @Column(name = "LATITUDE", columnDefinition = "NUMBER(10,7)")
    private Double latitude;

    @Column(name = "LONGITUDE", columnDefinition = "NUMBER(10,7)")
    private Double longitude;

    protected TravelPlanPlace() {
    }

    public TravelPlanPlace(
            TravelPlan plan,
            Integer sortOrder,
            String placeName,
            String placeKind,
            String address,
            Double latitude,
            Double longitude
    ) {
        this.plan = plan;
        this.sortOrder = sortOrder;
        this.placeName = placeName;
        this.placeKind = placeKind;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public Long getId() { return id; }
    public Integer getSortOrder() { return sortOrder; }
    public String getPlaceName() { return placeName; }
    public String getPlaceKind() { return placeKind; }
    public String getAddress() { return address; }
    public Double getLatitude() { return latitude; }
    public Double getLongitude() { return longitude; }
}
