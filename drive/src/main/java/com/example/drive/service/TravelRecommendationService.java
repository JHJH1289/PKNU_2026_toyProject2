package com.example.drive.service;

import com.example.drive.dto.TravelPlanResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TravelRecommendationService {

    private static final Logger log = LoggerFactory.getLogger(TravelRecommendationService.class);

    private final ChatClient chatClient;
    private final ObjectMapper objectMapper;

    public TravelRecommendationService(ChatClient.Builder chatClientBuilder, ObjectMapper objectMapper) {
        this.chatClient = chatClientBuilder.build();
        this.objectMapper = objectMapper;
    }

    public TravelPlanResponse createPlan(String region, List<String> themes, List<String> attractions) {
        String normalizedRegion = normalizeRegion(region);
        List<String> normalizedThemes = normalizeList(themes);
        List<String> normalizedAttractions = normalizeList(attractions);
        if (normalizedAttractions.isEmpty()) {
            return new TravelPlanResponse("", "", List.of());
        }

        long startedAt = System.nanoTime();
        String content;
        try {
            content = chatClient.prompt()
                    .user(buildPlanPrompt(normalizedRegion, normalizedThemes, normalizedAttractions))
                    .call()
                    .content();
        } finally {
            long elapsedMillis = (System.nanoTime() - startedAt) / 1_000_000L;
            log.info(
                    "Travel plan AI generation took {} ms. region={}, places={}",
                    elapsedMillis,
                    normalizedRegion,
                    normalizedAttractions.size()
            );
        }

        try {
            TravelPlanResponse response = objectMapper.readValue(stripJsonFence(content), TravelPlanResponse.class);
            return new TravelPlanResponse(
                    response.title() == null ? "" : response.title(),
                    response.summary() == null ? "" : response.summary(),
                    response.steps() == null ? List.of() : response.steps()
            );
        } catch (Exception error) {
            return new TravelPlanResponse("", "", List.of());
        }
    }

    private String buildPlanPrompt(String region, List<String> themes, List<String> attractions) {
        return """
                You are a Korean travel planner.
                Create an optimized one-day route using the selected attractions.
                Return only JSON with this shape:
                {"title":"plan title","summary":"short route summary","steps":[{"time":"09:30","place":"place","theme":"theme","note":"what to do"}]}

                Rules:
                - Use every selected attraction at least once.
                - Keep the route practical and avoid backtracking when possible.
                - Write Korean text.
                - Do not include explanations outside JSON.
                - Do not invent exact ticket prices or opening hours.

                Region: %s
                Preferred themes: %s
                Selected attractions: %s
                """.formatted(region, themes, attractions);
    }

    private String normalizeRegion(String region) {
        if (region == null || region.isBlank()) {
            throw new IllegalArgumentException("Region is required.");
        }

        return region.trim();
    }

    private List<String> normalizeList(List<String> values) {
        if (values == null) {
            return List.of();
        }

        return values.stream()
                .filter(value -> value != null && !value.isBlank())
                .map(String::trim)
                .distinct()
                .limit(20)
                .toList();
    }

    private String stripJsonFence(String content) {
        if (content == null || content.isBlank()) {
            return "{}";
        }

        String trimmed = content.trim();
        if (trimmed.startsWith("```")) {
            trimmed = trimmed.replaceFirst("^```(?:json)?\\s*", "");
            trimmed = trimmed.replaceFirst("\\s*```$", "");
        }
        return trimmed.trim();
    }
}
