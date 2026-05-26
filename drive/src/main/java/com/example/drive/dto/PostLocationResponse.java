package com.example.drive.dto;

public record PostLocationResponse(
        Long id,
        String locationName,
        Double latitude,
        Double longitude
) {
}
