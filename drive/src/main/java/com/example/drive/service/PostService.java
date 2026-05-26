package com.example.drive.service;

import com.example.drive.dto.CommentResponse;
import com.example.drive.dto.PostResponse;
import com.example.drive.dto.StoredFile;
import com.example.drive.dto.UserStatsResponse;
import com.example.drive.entity.Comment;
import com.example.drive.entity.Post;
import com.example.drive.entity.PostLike;
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
    public PostResponse createPost(String ownerId, String caption, String locationName, String categoryTag, MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new IllegalArgumentException("Image is required.");
        }

        StoredFile storedFile = storageService.store(image);
        Post post = new Post(
                normalizeOwnerId(ownerId),
                storedFile.getStorageKey(),
                storedFile.getContentType(),
                storedFile.getSize(),
                normalizeText(caption, 2000),
                normalizeText(locationName, 120),
                normalizeCategoryTag(categoryTag),
                LocalDateTime.now()
        );

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
    public PostResponse updatePost(String ownerId, Long id, String caption, String locationName, String categoryTag, boolean admin) {
        Post post = findPost(id);
        if (!admin && !normalizeOwnerId(ownerId).equals(post.getOwnerId())) {
            throw new IllegalArgumentException("Post not found.");
        }

        post.updateDetails(
                normalizeText(caption, 2000),
                normalizeText(locationName, 120),
                normalizeCategoryTag(categoryTag)
        );
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
                post.getCategoryTag(),
                "/api/posts/" + post.getId() + "/image",
                post.getCreatedAt(),
                post.getViewCount(),
                postLikeRepository.countByPostId(post.getId()),
                viewerId != null && postLikeRepository.existsByPostIdAndOwnerId(post.getId(), viewerId),
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

    public record PostFile(Resource resource, String contentType) {
    }
}
