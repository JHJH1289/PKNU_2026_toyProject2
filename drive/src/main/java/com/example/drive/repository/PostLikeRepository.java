package com.example.drive.repository;

import com.example.drive.entity.Post;
import com.example.drive.entity.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PostLikeRepository extends JpaRepository<PostLike, Long> {
    Optional<PostLike> findByPostIdAndOwnerId(Long postId, String ownerId);
    long countByPostId(Long postId);
    boolean existsByPostIdAndOwnerId(Long postId, String ownerId);
    void deleteAllByPost(Post post);
}
