package com.example.drive.dto;

import java.time.LocalDateTime;

public record CommentResponse(
        Long id,
        String ownerId,
        String content,
        LocalDateTime createdAt
) {
}
