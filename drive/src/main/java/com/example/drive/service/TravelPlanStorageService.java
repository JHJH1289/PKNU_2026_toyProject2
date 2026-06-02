package com.example.drive.service;

import com.example.drive.dto.SavedTravelPlanResponse;
import com.example.drive.dto.TravelPlanResponse;
import com.example.drive.dto.TravelPlanSaveRequest;
import com.example.drive.entity.TravelPlan;
import com.example.drive.entity.TravelPlanPlace;
import com.example.drive.entity.TravelPlanStep;
import com.example.drive.repository.TravelPlanRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class TravelPlanStorageService {

    private final TravelPlanRepository travelPlanRepository;

    public TravelPlanStorageService(TravelPlanRepository travelPlanRepository) {
        this.travelPlanRepository = travelPlanRepository;
    }

    @Transactional(readOnly = true)
    public List<SavedTravelPlanResponse> getPlans(String ownerId) {
        return travelPlanRepository.findAllByOwnerIdOrderByCreatedAtDescIdDesc(ownerId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public SavedTravelPlanResponse savePlan(String ownerId, TravelPlanSaveRequest request) {
        String title = normalizeText(request.getTitle(), 300);
        if (title.isBlank()) {
            title = "Route travel plan";
        }

        TravelPlan plan = new TravelPlan(
                ownerId,
                title,
                normalizeNullableText(request.getSummary(), 2000),
                normalizeNullableText(request.getRegion(), 200),
                LocalDateTime.now()
        );

        plan.replacePlaces(toPlaces(plan, request.getRoutePlaces()));
        plan.replaceSteps(toSteps(plan, request.getSteps()));

        return toResponse(travelPlanRepository.save(plan));
    }

    @Transactional(readOnly = true)
    public SavedTravelPlanResponse getPlan(String ownerId, Long planId) {
        return toResponse(findOwnedPlan(ownerId, planId));
    }

    @Transactional
    public SavedTravelPlanResponse updateGeneratedPlan(String ownerId, Long planId, TravelPlanResponse generatedPlan) {
        TravelPlan plan = findOwnedPlan(ownerId, planId);
        LocalDateTime now = LocalDateTime.now();
        plan.applyGeneratedPlan(
                normalizeNullableText(generatedPlan.title(), 300),
                normalizeNullableText(generatedPlan.summary(), 2000),
                toGeneratedSteps(plan, generatedPlan.steps()),
                now
        );
        return toResponse(plan);
    }

    @Transactional
    public void deletePlan(String ownerId, Long planId) {
        travelPlanRepository.delete(findOwnedPlan(ownerId, planId));
    }

    private List<TravelPlanPlace> toPlaces(TravelPlan plan, List<TravelPlanSaveRequest.PlaceRequest> places) {
        if (places == null) {
            return List.of();
        }

        return places.stream()
                .filter(place -> place != null && place.getName() != null && !place.getName().isBlank())
                .map(place -> new TravelPlanPlace(
                        plan,
                        place.getOrderIndex() == null ? 0 : place.getOrderIndex(),
                        normalizeText(place.getName(), 300),
                        normalizePlaceKind(place.getKind()),
                        normalizeNullableText(place.getAddress(), 1000),
                        place.getLatitude(),
                        place.getLongitude()
                ))
                .toList();
    }

    private List<TravelPlanStep> toSteps(TravelPlan plan, List<TravelPlanSaveRequest.StepRequest> steps) {
        if (steps == null) {
            return List.of();
        }

        return java.util.stream.IntStream.range(0, steps.size())
                .mapToObj(index -> {
                    TravelPlanSaveRequest.StepRequest step = steps.get(index);
                    if (step == null) {
                        return null;
                    }
                    return new TravelPlanStep(
                        plan,
                        index,
                        normalizeNullableText(step.getTime(), 30),
                        normalizeNullableText(step.getPlace(), 300),
                        normalizeNullableText(step.getTheme(), 100),
                        normalizeNullableText(step.getNote(), 2000)
                    );
                })
                .filter(step -> step != null)
                .toList();
    }

    private List<TravelPlanStep> toGeneratedSteps(TravelPlan plan, List<TravelPlanResponse.PlanStep> steps) {
        if (steps == null) {
            return List.of();
        }

        return java.util.stream.IntStream.range(0, steps.size())
                .mapToObj(index -> {
                    TravelPlanResponse.PlanStep step = steps.get(index);
                    if (step == null) {
                        return null;
                    }
                    return new TravelPlanStep(
                            plan,
                            index,
                            normalizeNullableText(step.time(), 30),
                            normalizeNullableText(step.place(), 300),
                            normalizeNullableText(step.theme(), 100),
                            normalizeNullableText(step.note(), 2000)
                    );
                })
                .filter(step -> step != null)
                .toList();
    }

    private SavedTravelPlanResponse toResponse(TravelPlan plan) {
        return new SavedTravelPlanResponse(
                plan.getId(),
                plan.getTitle(),
                plan.getSummary(),
                plan.getRegion(),
                plan.getPlanStatus(),
                plan.getCreatedAt(),
                plan.getGeneratedAt(),
                plan.getPlaces().stream()
                        .map(place -> new SavedTravelPlanResponse.PlaceResponse(
                                place.getSortOrder(),
                                place.getPlaceName(),
                                place.getPlaceKind(),
                                place.getAddress(),
                                place.getLatitude(),
                                place.getLongitude()
                        ))
                        .toList(),
                plan.getSteps().stream()
                        .map(step -> new SavedTravelPlanResponse.StepResponse(
                                step.getStepTime(),
                                step.getPlaceName(),
                                step.getTheme(),
                                step.getNote()
                        ))
                        .toList()
        );
    }

    private TravelPlan findOwnedPlan(String ownerId, Long planId) {
        return travelPlanRepository.findByIdAndOwnerId(planId, ownerId)
                .orElseThrow(() -> new IllegalArgumentException("Plan not found."));
    }

    private String normalizePlaceKind(String kind) {
        if ("restaurant".equalsIgnoreCase(kind) || "RESTAURANT".equalsIgnoreCase(kind)) {
            return "RESTAURANT";
        }

        return "ATTRACTION";
    }

    private String normalizeText(String value, int maxLength) {
        if (value == null) {
            return "";
        }

        String trimmed = value.trim();
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }

    private String normalizeNullableText(String value, int maxLength) {
        String normalized = normalizeText(value, maxLength);
        return normalized.isBlank() ? null : normalized;
    }
}
