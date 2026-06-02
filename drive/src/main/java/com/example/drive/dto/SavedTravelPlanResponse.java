package com.example.drive.dto;

import java.time.LocalDateTime;
import java.util.List;

public record SavedTravelPlanResponse(
        Long id,
        String title,
        String summary,
        String region,
        String status,
        LocalDateTime savedAt,
        LocalDateTime generatedAt,
        List<PlaceResponse> routePlaces,
        List<StepResponse> steps
) {
    public record PlaceResponse(
            Integer orderIndex,
            String name,
            String kind,
            String address,
            Double latitude,
            Double longitude
    ) {
    }

    public record StepResponse(
            String time,
            String place,
            String theme,
            String note
    ) {
    }
}
