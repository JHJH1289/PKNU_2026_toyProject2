package com.example.drive.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, length = 255)
    private String password;

    @Column(length = 20)
    private String role;

    @Column(length = 500)
    private String profileImageStorageKey;

    @Column(length = 500)
    private String bio;

    protected User() {
    }

    public User(String username, String password) {
        this(username, password, "USER");
    }

    public User(String username, String password, String role) {
        this.username = username;
        this.password = password;
        this.role = role;
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getPassword() {
        return password;
    }

    public String getRole() {
        return role;
    }

    public String getProfileImageStorageKey() {
        return profileImageStorageKey;
    }

    public String getBio() {
        return bio;
    }

    public void updateProfile(String bio, String profileImageStorageKey) {
        this.bio = bio;
        if (profileImageStorageKey != null && !profileImageStorageKey.isBlank()) {
            this.profileImageStorageKey = profileImageStorageKey;
        }
    }
}
