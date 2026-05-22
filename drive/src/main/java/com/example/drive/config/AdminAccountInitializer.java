package com.example.drive.config;

import com.example.drive.entity.User;
import com.example.drive.entity.Admin;
import com.example.drive.repository.AdminRepository;
import com.example.drive.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
public class AdminAccountInitializer implements CommandLineRunner {

    private final AdminRepository adminRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String adminUsername;
    private final String adminPassword;

    public AdminAccountInitializer(
            AdminRepository adminRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.admin.username:admin}") String adminUsername,
            @Value("${app.admin.password:admin1234}") String adminPassword
    ) {
        this.adminRepository = adminRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminUsername = adminUsername;
        this.adminPassword = adminPassword;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (adminUsername == null || adminUsername.isBlank()) {
            return;
        }

        String username = adminUsername.trim();

        if (!userRepository.existsByUsername(username)) {
            userRepository.save(new User(
                    username,
                    passwordEncoder.encode(adminPassword),
                    "ADMIN"
            ));
        }

        if (!adminRepository.existsByUsername(username)) {
            adminRepository.save(new Admin(username, LocalDateTime.now()));
        }
    }
}
