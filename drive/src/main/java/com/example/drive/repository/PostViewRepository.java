package com.example.drive.repository;

import com.example.drive.entity.PostView;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostViewRepository extends JpaRepository<PostView, Long> {
    boolean existsByPostIdAndViewerId(Long postId, String viewerId);
}
