package com.example.drive.controller;

import com.example.drive.dto.TravelPlanRequest;
import com.example.drive.dto.TravelPlanResponse;
import com.example.drive.service.TravelRecommendationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/recommend")
public class TravelRecommendationController {

    private final TravelRecommendationService travelRecommendationService;

    public TravelRecommendationController(TravelRecommendationService travelRecommendationService) {
        this.travelRecommendationService = travelRecommendationService;
    }

    @PostMapping("/plan")
    public ResponseEntity<TravelPlanResponse> plan(@RequestBody TravelPlanRequest request) {
        return ResponseEntity.ok(travelRecommendationService.createPlan(
                request.getRegion(),
                request.getThemes(),
                request.getAttractions()
        ));
    }
}
