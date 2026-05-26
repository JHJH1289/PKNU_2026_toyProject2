package com.example.drive.controller;

import com.example.drive.dto.CommentCreateRequest;
import com.example.drive.dto.PostResponse;
import com.example.drive.dto.PostUpdateRequest;
import com.example.drive.dto.UserStatsResponse;
import com.example.drive.service.PostService;
import com.example.drive.service.PostService.PostFile;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    @GetMapping
    public ResponseEntity<List<PostResponse>> feed(Authentication authentication) {
        return ResponseEntity.ok(postService.getFeed(currentUsername(authentication)));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PostResponse> create(
            Authentication authentication,
            @RequestParam("image") MultipartFile image,
            @RequestParam(value = "caption", required = false) String caption,
            @RequestParam(value = "locationName", required = false) String locationName,
            @RequestParam(value = "categoryTag", required = false) String categoryTag
    ) {
        return ResponseEntity.ok(postService.createPost(authentication.getName(), caption, locationName, categoryTag, image));
    }

    @GetMapping("/me")
    public ResponseEntity<List<PostResponse>> myPosts(Authentication authentication) {
        return ResponseEntity.ok(postService.getMyPosts(authentication.getName()));
    }

    @GetMapping("/me/stats")
    public ResponseEntity<UserStatsResponse> myStats(Authentication authentication) {
        return ResponseEntity.ok(postService.getMyStats(authentication.getName()));
    }

    @GetMapping("/users/{username}")
    public ResponseEntity<List<PostResponse>> userPosts(
            Authentication authentication,
            @PathVariable("username") String username
    ) {
        return ResponseEntity.ok(postService.getUserPosts(username, currentUsername(authentication)));
    }

    @GetMapping("/users/{username}/stats")
    public ResponseEntity<UserStatsResponse> userStats(@PathVariable("username") String username) {
        return ResponseEntity.ok(postService.getUserStats(username));
    }

    @GetMapping("/admin")
    public ResponseEntity<List<PostResponse>> adminPosts(Authentication authentication) {
        requireAdmin(authentication);
        return ResponseEntity.ok(postService.getAllPostsForAdmin(authentication.getName()));
    }

    @PostMapping("/{id}/like")
    public ResponseEntity<PostResponse> like(Authentication authentication, @PathVariable("id") Long id) {
        return ResponseEntity.ok(postService.toggleLike(authentication.getName(), id));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<PostResponse> comment(
            Authentication authentication,
            @PathVariable("id") Long id,
            @RequestBody CommentCreateRequest request
    ) {
        return ResponseEntity.ok(postService.addComment(authentication.getName(), id, request.getContent()));
    }

    @PutMapping("/{postId}/comments/{commentId}")
    public ResponseEntity<PostResponse> updateComment(
            Authentication authentication,
            @PathVariable("postId") Long postId,
            @PathVariable("commentId") Long commentId,
            @RequestBody CommentCreateRequest request
    ) {
        return ResponseEntity.ok(postService.updateComment(authentication.getName(), postId, commentId, request.getContent()));
    }

    @DeleteMapping("/{postId}/comments/{commentId}")
    public ResponseEntity<PostResponse> deleteComment(
            Authentication authentication,
            @PathVariable("postId") Long postId,
            @PathVariable("commentId") Long commentId
    ) {
        return ResponseEntity.ok(postService.deleteComment(authentication.getName(), postId, commentId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PostResponse> update(
            Authentication authentication,
            @PathVariable("id") Long id,
            @RequestBody PostUpdateRequest request
    ) {
        return ResponseEntity.ok(postService.updatePost(
                authentication.getName(),
                id,
                request.getCaption(),
                request.getLocationName(),
                request.getCategoryTag(),
                isAdmin(authentication)
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(Authentication authentication, @PathVariable("id") Long id) {
        postService.deletePost(authentication.getName(), id, isAdmin(authentication));
        return ResponseEntity.ok(Map.of("message", "Post deleted."));
    }

    @GetMapping("/{id}/image")
    public ResponseEntity<Resource> image(Authentication authentication, @PathVariable("id") Long id) {
        PostFile postFile = postService.getPostImage(id, currentUsername(authentication));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(postFile.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .body(postFile.resource());
    }

    private void requireAdmin(Authentication authentication) {
        if (!isAdmin(authentication)) {
            throw new IllegalArgumentException("Admin access is required.");
        }
    }

    private String currentUsername(Authentication authentication) {
        return authentication == null ? null : authentication.getName();
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication != null && authentication.getAuthorities()
                .stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    }
}
