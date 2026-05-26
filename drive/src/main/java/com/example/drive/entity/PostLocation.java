package com.example.drive.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "post_locations")
public class PostLocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @Column(nullable = false, length = 120)
    private String locationName;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(nullable = false)
    private Integer sortOrder;

    protected PostLocation() {
    }

    public PostLocation(Post post, String locationName, Double latitude, Double longitude, Integer sortOrder) {
        this.post = post;
        this.locationName = locationName;
        this.latitude = latitude;
        this.longitude = longitude;
        this.sortOrder = sortOrder;
    }

    public Long getId() { return id; }
    public Post getPost() { return post; }
    public String getLocationName() { return locationName; }
    public Double getLatitude() { return latitude; }
    public Double getLongitude() { return longitude; }
    public Integer getSortOrder() { return sortOrder; }
}
