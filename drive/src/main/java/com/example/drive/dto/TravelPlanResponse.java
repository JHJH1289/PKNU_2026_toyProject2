package com.example.drive.dto;

import java.util.List;

public record TravelPlanResponse(String title, String summary, List<PlanStep> steps) {

    public record PlanStep(
            String time,
            String place,
            String theme,
            String note
    ) {
    }
}
