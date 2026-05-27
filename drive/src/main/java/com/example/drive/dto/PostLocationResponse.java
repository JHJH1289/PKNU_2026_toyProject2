package com.example.drive.dto;

public record PostLocationResponse(
        Long id,
        String locationName,
        String address,
        Double latitude,
        Double longitude
) {
}
