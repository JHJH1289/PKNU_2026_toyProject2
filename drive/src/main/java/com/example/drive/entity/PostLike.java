package com.example.drive.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "post_likes",
        uniqueConstraints = @UniqueConstraint(name = "uk_post_likes_post_owner", columnNames = {"post_id", "owner_id"})
)
public class PostLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @Column(name = "owner_id", nullable = false, length = 50)
    private String ownerId;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    protected PostLike() {
    }

    public PostLike(Post post, String ownerId, LocalDateTime createdAt) {
        this.post = post;
        this.ownerId = ownerId;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public Post getPost() { return post; }
    public String getOwnerId() { return ownerId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
