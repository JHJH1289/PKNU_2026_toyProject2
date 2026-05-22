package com.example.drive.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "post_views",
        uniqueConstraints = @UniqueConstraint(name = "uk_post_views_post_viewer", columnNames = {"post_id", "viewer_id"})
)
public class PostView {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @Column(name = "viewer_id", nullable = false, length = 50)
    private String viewerId;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    protected PostView() {
    }

    public PostView(Post post, String viewerId, LocalDateTime createdAt) {
        this.post = post;
        this.viewerId = viewerId;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public Post getPost() { return post; }
    public String getViewerId() { return viewerId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
