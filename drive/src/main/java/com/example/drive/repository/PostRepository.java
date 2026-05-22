package com.example.drive.repository;

import com.example.drive.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {
    List<Post> findAllByOrderByCreatedAtDescIdDesc();
    List<Post> findAllByOwnerIdOrderByCreatedAtDescIdDesc(String ownerId);

    @Query("select coalesce(sum(p.viewCount), 0) from Post p where p.ownerId = :ownerId")
    long sumViewCountByOwnerId(String ownerId);
}
