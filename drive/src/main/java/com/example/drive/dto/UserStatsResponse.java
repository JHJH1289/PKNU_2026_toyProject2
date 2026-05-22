package com.example.drive.dto;

public record UserStatsResponse(
        String ownerId,
        long postCount,
        long totalViewCount
) {
}
