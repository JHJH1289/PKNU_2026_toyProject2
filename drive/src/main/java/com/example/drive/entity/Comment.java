package com.example.drive.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "comments")
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @Column(nullable = false, length = 50)
    private String ownerId;

    @Column(nullable = false, length = 1000)
    private String content;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    protected Comment() {
    }

    public Comment(Post post, String ownerId, String content, LocalDateTime createdAt) {
        this.post = post;
        this.ownerId = ownerId;
        this.content = content;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public Post getPost() { return post; }
    public String getOwnerId() { return ownerId; }
    public String getContent() { return content; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public void updateContent(String content) {
        this.content = content;
    }
}
