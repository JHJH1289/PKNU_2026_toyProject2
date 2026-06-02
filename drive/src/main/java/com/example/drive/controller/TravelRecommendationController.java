package com.example.drive.controller;

import com.example.drive.dto.SavedTravelPlanResponse;
import com.example.drive.dto.TravelPlanRequest;
import com.example.drive.dto.TravelPlanResponse;
import com.example.drive.dto.TravelPlanSaveRequest;
import com.example.drive.service.TravelRecommendationService;
import com.example.drive.service.TravelPlanStorageService;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/recommend")
public class TravelRecommendationController {

    private final TravelRecommendationService travelRecommendationService;
    private final TravelPlanStorageService travelPlanStorageService;

    public TravelRecommendationController(
            TravelRecommendationService travelRecommendationService,
            TravelPlanStorageService travelPlanStorageService
    ) {
        this.travelRecommendationService = travelRecommendationService;
        this.travelPlanStorageService = travelPlanStorageService;
    }

    @PostMapping("/plan")
    public ResponseEntity<TravelPlanResponse> plan(@RequestBody TravelPlanRequest request) {
        return ResponseEntity.ok(travelRecommendationService.createPlan(
                request.getRegion(),
                request.getThemes(),
                request.getAttractions()
        ));
    }

    @GetMapping("/plans")
    public ResponseEntity<List<SavedTravelPlanResponse>> savedPlans(Authentication authentication) {
        return ResponseEntity.ok(travelPlanStorageService.getPlans(authentication.getName()));
    }

    @PostMapping("/plans")
    public ResponseEntity<SavedTravelPlanResponse> savePlan(
            Authentication authentication,
            @RequestBody TravelPlanSaveRequest request
    ) {
        return ResponseEntity.ok(travelPlanStorageService.savePlan(authentication.getName(), request));
    }

    @PostMapping("/plans/{id}/generate")
    public ResponseEntity<SavedTravelPlanResponse> generateSavedPlan(Authentication authentication, @PathVariable Long id) {
        SavedTravelPlanResponse savedPlan = travelPlanStorageService.getPlan(authentication.getName(), id);
        List<String> routePlaces = savedPlan.routePlaces().stream()
                .map(place -> "%s: %s".formatted(
                        "RESTAURANT".equalsIgnoreCase(place.kind()) ? "맛집" : "관광지",
                        place.name()
                ))
                .toList();

        TravelPlanResponse generatedPlan = travelRecommendationService.createPlan(
                savedPlan.region() == null || savedPlan.region().isBlank() ? "Travel route" : savedPlan.region(),
                List.of(),
                routePlaces
        );
        if (generatedPlan.steps() == null || generatedPlan.steps().isEmpty()) {
            throw new IllegalStateException("Plan could not be generated.");
        }

        return ResponseEntity.ok(
                travelPlanStorageService.updateGeneratedPlan(authentication.getName(), id, generatedPlan)
        );
    }

    @DeleteMapping("/plans/{id}")
    public ResponseEntity<Void> deletePlan(Authentication authentication, @PathVariable Long id) {
        travelPlanStorageService.deletePlan(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }
}
