package com.example.drive.service;

import com.example.drive.dto.PostLocationRequest;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeType;
import org.springframework.util.MimeTypeUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class AiTagSuggestionService {

    private static final Pattern TAG_SEPARATOR = Pattern.compile("[,\\s#]+");

    private final ChatClient chatClient;
    private final boolean enabled;
    private final int maxTags;

    public AiTagSuggestionService(
            ChatClient.Builder chatClientBuilder,
            @Value("${app.ai.tags.enabled:true}") boolean enabled,
            @Value("${app.ai.tags.max-tags:5}") int maxTags
    ) {
        this.chatClient = chatClientBuilder.build();
        this.enabled = enabled;
        this.maxTags = Math.max(1, Math.min(maxTags, 8));
    }

    public List<String> suggestTags(
            String caption,
            List<PostLocationRequest> locations,
            String currentTag,
            MultipartFile imageFile
    ) {
        if (!enabled) {
            return List.of();
        }

        try {
            return mergeTags(normalizeTags(currentTag), parseTags(suggestWithImage(caption, locations, currentTag, imageFile)));
        } catch (Exception error) {
            try {
                return mergeTags(normalizeTags(currentTag), parseTags(suggestWithText(caption, locations, currentTag)));
            } catch (Exception ignored) {
                return List.of();
            }
        }
    }

    private String suggestWithImage(
            String caption,
            List<PostLocationRequest> locations,
            String currentTag,
            MultipartFile imageFile
    ) throws Exception {
        if (imageFile == null || imageFile.isEmpty()) {
            return suggestWithText(caption, locations, currentTag);
        }

        ByteArrayResource imageResource = new ByteArrayResource(imageFile.getBytes());
        MimeType mimeType = parseMimeType(imageFile.getContentType());

        return chatClient.prompt()
                .user(user -> user
                        .text(buildPrompt(caption, locations, currentTag, true))
                        .media(mimeType, imageResource))
                .call()
                .content();
    }

    private String suggestWithText(String caption, List<PostLocationRequest> locations, String currentTag) {
        return chatClient.prompt()
                .user(buildPrompt(caption, locations, currentTag, false))
                .call()
                .content();
    }

    private String buildPrompt(String caption, List<PostLocationRequest> locations, String currentTag, boolean includesImage) {
        return """
                You are an AI tag helper for a travel photo post.

                Use the attached image when present, plus the post text and places.
                Create 3 to %d short tags.
                Return tags separated only by commas.
                Do not write explanations.
                Never use file names, storage paths, usernames, or ids as tags.
                Prefer Korean travel-friendly nouns when possible.

                Image attached: %s
                Caption: %s
                Places: %s
                Existing tags: %s
                """.formatted(
                maxTags,
                includesImage ? "yes" : "no",
                safeText(caption),
                describeLocations(locations),
                safeText(currentTag)
        );
    }

    private String describeLocations(List<PostLocationRequest> locations) {
        if (locations == null || locations.isEmpty()) {
            return "(none)";
        }

        return locations.stream()
                .filter(location -> location != null)
                .limit(5)
                .map(location -> safeText(location.getLocationName()) + " " + safeText(location.getAddress()))
                .filter(value -> !value.isBlank())
                .toList()
                .toString();
    }

    private List<String> parseTags(String content) {
        if (content == null || content.isBlank()) {
            return List.of();
        }

        return Arrays.stream(content.split(","))
                .flatMap(value -> Arrays.stream(TAG_SEPARATOR.split(value)))
                .map(String::trim)
                .map(tag -> tag.replaceAll("^[\\p{Punct}]+|[\\p{Punct}]+$", ""))
                .filter(tag -> !tag.isBlank())
                .limit(maxTags)
                .toList();
    }

    private List<String> normalizeTags(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }

        return Arrays.stream(TAG_SEPARATOR.split(value))
                .map(String::trim)
                .map(tag -> tag.replaceAll("^[\\p{Punct}]+|[\\p{Punct}]+$", ""))
                .filter(tag -> !tag.isBlank())
                .limit(maxTags)
                .toList();
    }

    private List<String> mergeTags(List<String> baseTags, List<String> aiTags) {
        Set<String> merged = new LinkedHashSet<>();
        baseTags.forEach(merged::add);
        aiTags.forEach(merged::add);
        return merged.stream().limit(maxTags).toList();
    }

    private String safeText(String value) {
        return value == null || value.isBlank() ? "(none)" : value.trim();
    }

    private MimeType parseMimeType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return MimeTypeUtils.IMAGE_JPEG;
        }

        return MimeTypeUtils.parseMimeType(contentType);
    }
}
