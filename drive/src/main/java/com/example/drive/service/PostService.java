package com.example.drive.service;

import com.example.drive.dto.CommentResponse;
import com.example.drive.dto.PostLocationRequest;
import com.example.drive.dto.PostLocationResponse;
import com.example.drive.dto.PostResponse;
import com.example.drive.dto.StoredFile;
import com.example.drive.dto.UserStatsResponse;
import com.example.drive.entity.Comment;
import com.example.drive.entity.Post;
import com.example.drive.entity.PostLike;
import com.example.drive.entity.PostLocation;
import com.example.drive.entity.PostView;
import com.example.drive.entity.User;
import com.example.drive.repository.CommentRepository;
import com.example.drive.repository.PostLikeRepository;
import com.example.drive.repository.PostRepository;
import com.example.drive.repository.PostViewRepository;
import com.example.drive.repository.UserRepository;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PostService {

    private final StorageService storageService;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final PostLikeRepository postLikeRepository;
    private final PostViewRepository postViewRepository;
    private final UserRepository userRepository;

    public PostService(
            StorageService storageService,
            PostRepository postRepository,
            CommentRepository commentRepository,
            PostLikeRepository postLikeRepository,
            PostViewRepository postViewRepository,
            UserRepository userRepository
    ) {
        this.storageService = storageService;
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.postLikeRepository = postLikeRepository;
        this.postViewRepository = postViewRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public PostResponse createPost(String ownerId, String caption, String locationName, Double latitude, Double longitude, List<PostLocationRequest> locations, String categoryTag, MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new IllegalArgumentException("Image is required.");
        }

        List<NormalizedLocation> normalizedLocations = normalizeLocations(locations, locationName, latitude, longitude);
        NormalizedLocation primaryLocation = normalizedLocations.isEmpty() ? null : normalizedLocations.get(0);
        StoredFile storedFile = storageService.store(image);
        Post post = new Post(
                normalizeOwnerId(ownerId),
                storedFile.getStorageKey(),
                storedFile.getContentType(),
                storedFile.getSize(),
                normalizeText(caption, 2000),
                primaryLocation == null ? null : primaryLocation.locationName(),
                primaryLocation == null ? null : primaryLocation.latitude(),
                primaryLocation == null ? null : primaryLocation.longitude(),
                normalizeCategoryTag(categoryTag),
                LocalDateTime.now()
        );
        post.replaceLocations(toPostLocations(post, normalizedLocations));

        return toPostResponse(postRepository.save(post), ownerId);
    }

    public List<PostResponse> getFeed(String viewerId) {
        return postRepository.findAllByOrderByCreatedAtDescIdDesc()
                .stream()
                .map(post -> toPostResponse(post, viewerId))
                .toList();
    }

    public List<PostResponse> getMyPosts(String ownerId) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);
        return getUserPosts(normalizedOwnerId, normalizedOwnerId);
    }

    public List<PostResponse> getUserPosts(String ownerId, String viewerId) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);
        String normalizedViewerId = normalizeViewerId(viewerId);
        return postRepository.findAllByOwnerIdOrderByCreatedAtDescIdDesc(normalizedOwnerId)
                .stream()
                .map(post -> toPostResponse(post, normalizedViewerId))
                .toList();
    }

    public List<PostResponse> getAllPostsForAdmin(String viewerId) {
        return getFeed(viewerId);
    }

    public UserStatsResponse getMyStats(String ownerId) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);
        return getUserStats(normalizedOwnerId);
    }

    public UserStatsResponse getUserStats(String ownerId) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);
        long postCount = postRepository.findAllByOwnerIdOrderByCreatedAtDescIdDesc(normalizedOwnerId).size();
        long totalViewCount = postRepository.sumViewCountByOwnerId(normalizedOwnerId);
        return new UserStatsResponse(normalizedOwnerId, postCount, totalViewCount);
    }

    @Transactional
    public PostResponse toggleLike(String ownerId, Long postId) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);
        Post post = findPost(postId);
        postLikeRepository.findByPostIdAndOwnerId(postId, normalizedOwnerId)
                .ifPresentOrElse(
                        postLikeRepository::delete,
                        () -> postLikeRepository.save(new PostLike(post, normalizedOwnerId, LocalDateTime.now()))
                );
        postLikeRepository.flush();
        return toPostResponse(post, normalizedOwnerId);
    }

    @Transactional
    public PostResponse addComment(String ownerId, Long postId, String content) {
        String normalizedContent = normalizeText(content, 1000);
        if (normalizedContent == null || normalizedContent.isBlank()) {
            throw new IllegalArgumentException("Comment is required.");
        }

        Post post = findPost(postId);
        commentRepository.save(new Comment(post, normalizeOwnerId(ownerId), normalizedContent, LocalDateTime.now()));
        return toPostResponse(post, ownerId);
    }

    @Transactional
    public PostResponse updateComment(String ownerId, Long postId, Long commentId, String content) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);
        String normalizedContent = normalizeText(content, 1000);
        if (normalizedContent == null || normalizedContent.isBlank()) {
            throw new IllegalArgumentException("Comment is required.");
        }

        Post post = findPost(postId);
        Comment comment = findComment(postId, commentId);
        if (!normalizedOwnerId.equals(comment.getOwnerId())) {
            throw new IllegalArgumentException("Comment not found.");
        }

        comment.updateContent(normalizedContent);
        return toPostResponse(post, normalizedOwnerId);
    }

    @Transactional
    public PostResponse deleteComment(String ownerId, Long postId, Long commentId) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);
        Post post = findPost(postId);
        Comment comment = findComment(postId, commentId);
        if (!normalizedOwnerId.equals(comment.getOwnerId())) {
            throw new IllegalArgumentException("Comment not found.");
        }

        commentRepository.delete(comment);
        commentRepository.flush();
        return toPostResponse(post, normalizedOwnerId);
    }

    @Transactional
    public PostFile getPostImage(Long id, String viewerId) {
        Post post = findPost(id);
        registerView(post, viewerId);

        String contentType = post.getContentType() != null
                ? post.getContentType()
                : MediaType.APPLICATION_OCTET_STREAM_VALUE;
        return new PostFile(storageService.loadAsResource(post.getImageStorageKey()), contentType);
    }

    private void registerView(Post post, String viewerId) {
        String normalizedViewerId = normalizeViewerId(viewerId);
        if (normalizedViewerId == null) {
            return;
        }

        if (postViewRepository.existsByPostIdAndViewerId(post.getId(), normalizedViewerId)) {
            return;
        }

        postViewRepository.save(new PostView(post, normalizedViewerId, LocalDateTime.now()));
        post.increaseViewCount();
    }

    @Transactional
    public PostResponse updatePost(String ownerId, Long id, String caption, String locationName, Double latitude, Double longitude, List<PostLocationRequest> locations, String categoryTag, boolean admin) {
        Post post = findPost(id);
        if (!admin && !normalizeOwnerId(ownerId).equals(post.getOwnerId())) {
            throw new IllegalArgumentException("Post not found.");
        }

        List<NormalizedLocation> normalizedLocations = normalizeLocations(locations, locationName, latitude, longitude);
        NormalizedLocation primaryLocation = normalizedLocations.isEmpty() ? null : normalizedLocations.get(0);
        post.updateDetails(
                normalizeText(caption, 2000),
                primaryLocation == null ? null : primaryLocation.locationName(),
                primaryLocation == null ? null : primaryLocation.latitude(),
                primaryLocation == null ? null : primaryLocation.longitude(),
                normalizeCategoryTag(categoryTag)
        );
        post.replaceLocations(toPostLocations(post, normalizedLocations));
        return toPostResponse(post, ownerId);
    }

    @Transactional
    public void deletePost(String ownerId, Long id, boolean admin) {
        Post post = findPost(id);
        if (!admin && !normalizeOwnerId(ownerId).equals(post.getOwnerId())) {
            throw new IllegalArgumentException("Post not found.");
        }

        storageService.delete(post.getImageStorageKey());
        postRepository.delete(post);
    }

    private PostResponse toPostResponse(Post post, String viewerId) {
        List<CommentResponse> comments = commentRepository.findAllByPostIdOrderByCreatedAtAscIdAsc(post.getId())
                .stream()
                .map(comment -> new CommentResponse(
                        comment.getId(),
                        comment.getOwnerId(),
                        comment.getContent(),
                        comment.getCreatedAt()
                ))
                .toList();

        return new PostResponse(
                post.getId(),
                post.getOwnerId(),
                ownerProfileImageUrl(post.getOwnerId()),
                post.getCaption(),
                post.getLocationName(),
                post.getLatitude(),
                post.getLongitude(),
                post.getCategoryTag(),
                "/api/posts/" + post.getId() + "/image",
                post.getCreatedAt(),
                post.getViewCount(),
                postLikeRepository.countByPostId(post.getId()),
                viewerId != null && postLikeRepository.existsByPostIdAndOwnerId(post.getId(), viewerId),
                toLocationResponses(post),
                comments
        );
    }

    private Post findPost(Long id) {
        return postRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Post not found."));
    }

    private Comment findComment(Long postId, Long commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("Comment not found."));
        if (!comment.getPost().getId().equals(postId)) {
            throw new IllegalArgumentException("Comment not found.");
        }
        return comment;
    }

    private String ownerProfileImageUrl(String ownerId) {
        return userRepository.findByUsername(ownerId)
                .map(User::getProfileImageStorageKey)
                .filter(value -> value != null && !value.isBlank())
                .map(storageKey -> "/api/users/" + ownerId + "/profile-image?v=" + Math.abs(storageKey.hashCode()))
                .orElse("");
    }

    private String normalizeOwnerId(String ownerId) {
        if (ownerId == null || ownerId.isBlank()) {
            throw new IllegalArgumentException("ownerId is required.");
        }
        return ownerId.trim();
    }

    private String normalizeViewerId(String viewerId) {
        if (viewerId == null || viewerId.isBlank()) {
            return null;
        }
        return viewerId.trim();
    }

    private String normalizeText(String value, int maxLength) {
        if (value == null || value.isBlank()) {
            return null;
        }

        String normalized = value.trim();
        return normalized.length() > maxLength ? normalized.substring(0, maxLength) : normalized;
    }

    private String normalizeCategoryTag(String value) {
        String normalized = normalizeText(value, 200);
        return normalized == null ? "\uC5EC\uD589" : normalized;
    }

    private Double normalizeLatitude(Double value) {
        if (value == null) {
            return null;
        }

        if (value < -90.0 || value > 90.0) {
            throw new IllegalArgumentException("Latitude must be between -90 and 90.");
        }

        return value;
    }

    private Double normalizeLongitude(Double value) {
        if (value == null) {
            return null;
        }

        if (value < -180.0 || value > 180.0) {
            throw new IllegalArgumentException("Longitude must be between -180 and 180.");
        }

        return value;
    }

    private List<NormalizedLocation> normalizeLocations(
            List<PostLocationRequest> locations,
            String fallbackLocationName,
            Double fallbackLatitude,
            Double fallbackLongitude
    ) {
        List<NormalizedLocation> normalizedLocations = locations == null
                ? List.of()
                : locations.stream()
                .filter(location -> location != null
                        && location.getLatitude() != null
                        && location.getLongitude() != null)
                .map(location -> new NormalizedLocation(
                        normalizeText(location.getLocationName(), 120),
                        normalizeLatitude(location.getLatitude()),
                        normalizeLongitude(location.getLongitude())
                ))
                .filter(location -> location.locationName() != null)
                .limit(20)
                .toList();

        if (!normalizedLocations.isEmpty()) {
            return normalizedLocations;
        }

        if (fallbackLatitude != null && fallbackLongitude != null) {
            String normalizedName = normalizeText(fallbackLocationName, 120);
            if (normalizedName != null) {
                return List.of(new NormalizedLocation(
                        normalizedName,
                        normalizeLatitude(fallbackLatitude),
                        normalizeLongitude(fallbackLongitude)
                ));
            }
        }

        return List.of();
    }

    private List<PostLocation> toPostLocations(Post post, List<NormalizedLocation> locations) {
        final int[] index = {0};
        return locations.stream()
                .map(location -> new PostLocation(
                        post,
                        location.locationName(),
                        location.latitude(),
                        location.longitude(),
                        index[0]++
                ))
                .toList();
    }

    private List<PostLocationResponse> toLocationResponses(Post post) {
        if (!post.getLocations().isEmpty()) {
            return post.getLocations()
                    .stream()
                    .map(location -> new PostLocationResponse(
                            location.getId(),
                            location.getLocationName(),
                            location.getLatitude(),
                            location.getLongitude()
                    ))
                    .toList();
        }

        if (post.getLocationName() != null && post.getLatitude() != null && post.getLongitude() != null) {
            return List.of(new PostLocationResponse(
                    null,
                    post.getLocationName(),
                    post.getLatitude(),
                    post.getLongitude()
            ));
        }

        return List.of();
    }

    private record NormalizedLocation(String locationName, Double latitude, Double longitude) {
    }

    public record PostFile(Resource resource, String contentType) {
    }
}
