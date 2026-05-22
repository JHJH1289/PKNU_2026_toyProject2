package com.example.drive.controller;

import com.example.drive.dto.UserProfileResponse;
import com.example.drive.service.UserProfileService;
import com.example.drive.service.UserProfileService.ProfileImage;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class UserProfileController {

    private final UserProfileService userProfileService;

    public UserProfileController(UserProfileService userProfileService) {
        this.userProfileService = userProfileService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> profile(Authentication authentication) {
        return ResponseEntity.ok(userProfileService.getProfile(authentication.getName()));
    }

    @PostMapping(value = "/me/profile", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserProfileResponse> updateProfile(
            Authentication authentication,
            @RequestParam(value = "bio", required = false) String bio,
            @RequestParam(value = "profileImage", required = false) MultipartFile profileImage
    ) {
        return ResponseEntity.ok(userProfileService.updateProfile(authentication.getName(), bio, profileImage));
    }

    @GetMapping("/me/profile-image")
    public ResponseEntity<Resource> profileImage(Authentication authentication) {
        ProfileImage profileImage = userProfileService.getProfileImage(authentication.getName());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(profileImage.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .body(profileImage.resource());
    }

    @GetMapping("/users/{username}")
    public ResponseEntity<UserProfileResponse> userProfile(@PathVariable("username") String username) {
        return ResponseEntity.ok(userProfileService.getUserProfile(username));
    }

    @GetMapping("/users/{username}/profile-image")
    public ResponseEntity<Resource> userProfileImage(@PathVariable("username") String username) {
        ProfileImage profileImage = userProfileService.getUserProfileImage(username);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(profileImage.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .body(profileImage.resource());
    }
}
