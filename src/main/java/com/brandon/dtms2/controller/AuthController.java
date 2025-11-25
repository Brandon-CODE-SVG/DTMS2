package com.brandon.dtms2.controller;

import com.brandon.dtms2.entity.User;
import com.brandon.dtms2.service.UserService;
import jakarta.servlet.http.HttpSession;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {


    private final UserService userService;
    private final AuthenticationManager authenticationManager;


    public AuthController(UserService userService, AuthenticationManager authenticationManager) {
        this.userService = userService;
        this.authenticationManager = authenticationManager;
    }



    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user, HttpSession session) {
        try {
            // Validate input
            if (user.getUsername() == null || user.getUsername().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Username is required"));
            }

            if (user.getPassword() == null || user.getPassword().length() < 6) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Password must be at least 6 characters"));
            }

            if (user.getEmail() == null || user.getEmail().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email is required"));
            }

            // Check if username already exists
            if (userService.usernameExists(user.getUsername())) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Username already exists"));
            }

            // Check if email already exists
            if (userService.emailExists(user.getEmail())) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email already exists"));
            }

            // Set role to MEMBER for new registrations
            user.setRole(User.UserRole.MEMBER);

            // Create user (password will be encoded in service)
            User savedUser = userService.createUser(user);

            // Auto-login after registration
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(user.getUsername(), user.getPassword())
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);
            session.setAttribute("user", savedUser);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("user", savedUser);
            response.put("redirect", "/member-dashboard.html");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Registration failed: " + e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest, HttpSession session) {
        try {
            // Authenticate using Spring Security
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword())
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);

            // Get user details
            User user = userService.findByUsername(loginRequest.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            session.setAttribute("user", user);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("user", user);
            response.put("redirect", getDashboardRedirect(user.getRole()));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid credentials"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        try {
            SecurityContextHolder.clearContext();
            session.invalidate();
            return ResponseEntity.ok(Map.of("success", true, "message", "Logged out successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Logout failed"));
        }
    }

    @GetMapping("/current-user")
    public ResponseEntity<?> getCurrentUser(HttpSession session) {
        try {
            // Get from Spring Security context first
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated() &&
                    !authentication.getName().equals("anonymousUser")) {

                User user = userService.findByUsername(authentication.getName())
                        .orElseThrow(() -> new RuntimeException("User not found"));
                return ResponseEntity.ok(user);
            }

            // Fallback to session
            User user = (User) session.getAttribute("user");
            if (user != null) {
                return ResponseEntity.ok(user);
            }

            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to get current user"));
        }
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest request, HttpSession session) {
        try {
            User currentUser = (User) session.getAttribute("user");
            if (currentUser == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Not authenticated"));
            }

            // Verify current password
            User user = userService.findByUsername(currentUser.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (!userService.verifyPassword(request.getCurrentPassword(), user.getPassword())) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Current password is incorrect"));
            }

            // Update password
            userService.changePassword(user.getId(), request.getNewPassword());

            return ResponseEntity.ok(Map.of("success", true, "message", "Password updated successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to change password"));
        }
    }

    private String getDashboardRedirect(User.UserRole role) {
        return switch (role) {
            case ADMIN -> "/admin-dashboard.html";
            case INSTRUCTOR -> "/instructor-dashboard.html";
            case MEMBER -> "/member-dashboard.html";
        };
    }

    // DTO classes
    @Data
    public static class LoginRequest {
        private String username;
        private String password;

    }

    @Data
    public static class ChangePasswordRequest {
        private String currentPassword;
        private String newPassword;


    }
}