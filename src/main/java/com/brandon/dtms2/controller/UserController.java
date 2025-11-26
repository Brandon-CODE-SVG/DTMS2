package com.brandon.dtms2.controller;

import com.brandon.dtms2.entity.User;
import com.brandon.dtms2.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated() ||
                    authentication.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Unauthorized"));
            }

            List<User> users = userService.findAllUsers();

            // Convert to DTO to avoid exposing sensitive data
            List<Map<String, Object>> userDTOs = users.stream().map(user -> {
                Map<String, Object> userData = new HashMap<>();
                userData.put("id", user.getId());
                userData.put("username", user.getUsername());
                userData.put("firstName", user.getFirstName());
                userData.put("lastName", user.getLastName());
                userData.put("email", user.getEmail());
                userData.put("role", user.getRole());
                userData.put("status", user.getStatus() != null ? user.getStatus().name() : "ACTIVE");
                userData.put("lastLogin", user.getLastLogin());
                userData.put("createdAt", user.getCreatedAt());
                userData.put("updatedAt", user.getUpdatedAt());
                return userData;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(Map.of("success", true, "users", userDTOs));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to fetch users: " + e.getMessage()));
        }
    }

    @GetMapping("/users/members")
    public ResponseEntity<?> getAllMembers() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated() ||
                    authentication.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Unauthorized"));
            }

            List<User> members = userService.findAllMembers();

            List<Map<String, Object>> memberDTOs = members.stream().map(user -> {
                Map<String, Object> userData = new HashMap<>();
                userData.put("id", user.getId());
                userData.put("username", user.getUsername());
                userData.put("firstName", user.getFirstName());
                userData.put("lastName", user.getLastName());
                userData.put("email", user.getEmail());
                userData.put("role", user.getRole());
                userData.put("status", user.getStatus() != null ? user.getStatus().name() : "ACTIVE");
                userData.put("lastLogin", user.getLastLogin());
                userData.put("createdAt", user.getCreatedAt());
                return userData;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(Map.of("success", true, "members", memberDTOs));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to fetch members: " + e.getMessage()));
        }
    }

    @PutMapping("/users/{userId}/status")
    public ResponseEntity<?> updateUserStatus(@PathVariable Long userId, @RequestBody Map<String, String> statusUpdate) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated() ||
                    authentication.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Unauthorized"));
            }

            User user = userService.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

            String newStatus = statusUpdate.get("status");
            if (newStatus != null && (newStatus.equals("ACTIVE") || newStatus.equals("INACTIVE") || newStatus.equals("SUSPENDED"))) {
                user.setStatus(User.UserStatus.valueOf(newStatus));
                User updatedUser = userService.updateUser(user);

                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "User status updated successfully",
                        "user", Map.of(
                                "id", updatedUser.getId(),
                                "username", updatedUser.getUsername(),
                                "status", updatedUser.getStatus().name()
                        )
                ));
            } else {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid status value. Use ACTIVE, INACTIVE, or SUSPENDED"));
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to update user status: " + e.getMessage()));
        }
    }

    @GetMapping("/users/count")
    public ResponseEntity<?> getUserCounts() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated() ||
                    authentication.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Unauthorized"));
            }

            List<User> allUsers = userService.findAllUsers();
            long totalUsers = allUsers.size();
            long activeUsers = allUsers.stream()
                    .filter(user -> user.getStatus() == User.UserStatus.ACTIVE)
                    .count();
            long adminUsers = allUsers.stream()
                    .filter(user -> user.getRole() == User.UserRole.ADMIN)
                    .count();
            long instructorUsers = allUsers.stream()
                    .filter(user -> user.getRole() == User.UserRole.INSTRUCTOR)
                    .count();
            long memberUsers = userService.countMembers();

            Map<String, Object> counts = new HashMap<>();
            counts.put("totalUsers", totalUsers);
            counts.put("activeUsers", activeUsers);
            counts.put("adminUsers", adminUsers);
            counts.put("instructorUsers", instructorUsers);
            counts.put("memberUsers", memberUsers);

            return ResponseEntity.ok(Map.of("success", true, "counts", counts));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to fetch user counts: " + e.getMessage()));
        }
    }

    // Additional endpoint to update last login
    @PostMapping("/users/{userId}/update-last-login")
    public ResponseEntity<?> updateLastLogin(@PathVariable Long userId) {
        try {
            User user = userService.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

            user.updateLastLogin();
            User updatedUser = userService.updateUser(user);

            return ResponseEntity.ok(Map.of("success", true, "message", "Last login updated"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to update last login: " + e.getMessage()));
        }
    }
}