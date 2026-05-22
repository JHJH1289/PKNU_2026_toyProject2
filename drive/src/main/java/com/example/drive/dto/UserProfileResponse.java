package com.example.drive.dto;

public record UserProfileResponse(
        String username,
        String bio,
        String profileImageUrl
) {
}
