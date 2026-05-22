package com.example.drive.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "posts")
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String ownerId;

    @Column(nullable = false, length = 500)
    private String imageStorageKey;

    @Column(nullable = false)
    private String contentType;

    @Column(nullable = false)
    private Long fileSize;

    @Column(length = 2000)
    private String caption;

    @Column(length = 120)
    private String locationName;

    @Column(length = 200)
    private String categoryTag;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private long viewCount;

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Comment> comments = new ArrayList<>();

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PostLike> likes = new ArrayList<>();

    protected Post() {
    }

    public Post(
            String ownerId,
            String imageStorageKey,
            String contentType,
            Long fileSize,
            String caption,
            String locationName,
            String categoryTag,
            LocalDateTime createdAt
    ) {
        this.ownerId = ownerId;
        this.imageStorageKey = imageStorageKey;
        this.contentType = contentType;
        this.fileSize = fileSize;
        this.caption = caption;
        this.locationName = locationName;
        this.categoryTag = categoryTag;
        this.createdAt = createdAt;
        this.viewCount = 0L;
    }

    public Long getId() { return id; }
    public String getOwnerId() { return ownerId; }
    public String getImageStorageKey() { return imageStorageKey; }
    public String getContentType() { return contentType; }
    public Long getFileSize() { return fileSize; }
    public String getCaption() { return caption; }
    public String getLocationName() { return locationName; }
    public String getCategoryTag() { return categoryTag; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public long getViewCount() { return viewCount; }
    public List<Comment> getComments() { return comments; }
    public List<PostLike> getLikes() { return likes; }

    public void increaseViewCount() {
        this.viewCount += 1L;
    }

    public void updateDetails(String caption, String locationName, String categoryTag) {
        this.caption = caption;
        this.locationName = locationName;
        this.categoryTag = categoryTag;
    }
}
