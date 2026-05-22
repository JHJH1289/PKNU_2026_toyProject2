package com.example.drive.service;

import com.example.drive.dto.StoredFile;
import com.example.drive.dto.UserProfileResponse;
import com.example.drive.entity.User;
import com.example.drive.repository.UserRepository;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class UserProfileService {

    private final UserRepository userRepository;
    private final StorageService storageService;

    public UserProfileService(UserRepository userRepository, StorageService storageService) {
        this.userRepository = userRepository;
        this.storageService = storageService;
    }

    public UserProfileResponse getProfile(String username) {
        return toResponse(findUser(username));
    }

    public UserProfileResponse getUserProfile(String username) {
        return toResponse(findUser(username));
    }

    @Transactional
    public UserProfileResponse updateProfile(String username, String bio, MultipartFile profileImage) {
        User user = findUser(username);
        String profileImageStorageKey = null;

        if (profileImage != null && !profileImage.isEmpty()) {
            StoredFile storedFile = storageService.store(profileImage);
            profileImageStorageKey = storedFile.getStorageKey();
        }

        user.updateProfile(normalizeBio(bio), profileImageStorageKey);
        return toResponse(user);
    }

    public ProfileImage getProfileImage(String username) {
        User user = findUser(username);
        if (user.getProfileImageStorageKey() == null || user.getProfileImageStorageKey().isBlank()) {
            throw new IllegalArgumentException("Profile image not found.");
        }

        return new ProfileImage(
                storageService.loadAsResource(user.getProfileImageStorageKey()),
                MediaType.IMAGE_JPEG_VALUE
        );
    }

    public ProfileImage getUserProfileImage(String username) {
        return getProfileImage(username);
    }

    private User findUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found."));
    }

    private UserProfileResponse toResponse(User user) {
        String imageUrl = user.getProfileImageStorageKey() == null || user.getProfileImageStorageKey().isBlank()
                ? ""
                : "/api/users/" + user.getUsername() + "/profile-image?v=" + Math.abs(user.getProfileImageStorageKey().hashCode());
        return new UserProfileResponse(user.getUsername(), user.getBio(), imageUrl);
    }

    private String normalizeBio(String bio) {
        if (bio == null || bio.isBlank()) {
            return null;
        }

        String normalized = bio.trim();
        return normalized.length() > 500 ? normalized.substring(0, 500) : normalized;
    }

    public record ProfileImage(Resource resource, String contentType) {
    }
}
