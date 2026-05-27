package com.example.drive.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "post_images")
public class PostImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @Column(nullable = false, length = 500)
    private String storageKey;

    @Column(nullable = false)
    private String contentType;

    @Column(nullable = false)
    private Long fileSize;

    @Column(nullable = false)
    private Integer sortOrder;

    protected PostImage() {
    }

    public PostImage(Post post, String storageKey, String contentType, Long fileSize, Integer sortOrder) {
        this.post = post;
        this.storageKey = storageKey;
        this.contentType = contentType;
        this.fileSize = fileSize;
        this.sortOrder = sortOrder;
    }

    public Long getId() { return id; }
    public Post getPost() { return post; }
    public String getStorageKey() { return storageKey; }
    public String getContentType() { return contentType; }
    public Long getFileSize() { return fileSize; }
    public Integer getSortOrder() { return sortOrder; }
}
