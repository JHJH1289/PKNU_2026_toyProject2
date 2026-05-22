package com.example.drive.dto;

import java.time.LocalDateTime;
import java.util.List;

public record PostResponse(
        Long id,
        String ownerId,
        String ownerProfileImageUrl,
        String caption,
        String locationName,
        String categoryTag,
        String imageUrl,
        LocalDateTime createdAt,
        long viewCount,
        long likeCount,
        boolean likedByMe,
        List<CommentResponse> comments
) {
}
