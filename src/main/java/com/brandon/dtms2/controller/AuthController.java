package com.brandon.dtms2.controller;

import com.brandon.dtms2.config.PasswordConfig;
import com.brandon.dtms2.entity.User;
import com.brandon.dtms2.repository.UserRepository;
import com.brandon.dtms2.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@CrossOrigin(origins = "http://localhost:8080")
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(UserService userService, AuthenticationManager authenticationManager, UserRepository userRepository, PasswordEncoder passwordConfig, PasswordEncoder passwordEncoder) {
        this.userService = userService;
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest,
                                   HttpServletRequest request,
                                   HttpSession session) {
        try {
            System.out.println("=== LOGIN ATTEMPT ===");
            System.out.println("Username: " + loginRequest.getUsername());

            // First, check if user exists
            User user = userService.findByUsername(loginRequest.getUsername())
                    .orElseThrow(() -> {
                        System.out.println("❌ User not found: " + loginRequest.getUsername());
                        return new UsernameNotFoundException("User not found");
                    });

            System.out.println("✅ User found: " + user.getUsername());

            // Try to authenticate using Spring Security
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword())
            );

            System.out.println("✅ Authentication successful!");

            // CRITICAL: Create a new security context and set it
            SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
            securityContext.setAuthentication(authentication);
            SecurityContextHolder.setContext(securityContext);

            // ALSO store the security context in the session
            request.getSession().setAttribute("SPRING_SECURITY_CONTEXT", securityContext);

            System.out.println("🔐 Security Context Set: " + SecurityContextHolder.getContext().getAuthentication());
            System.out.println("🔐 Principal: " + (authentication != null ? authentication.getPrincipal() : "null"));
            System.out.println("🔐 Authorities: " + (authentication != null ? authentication.getAuthorities() : "null"));

            // Create safe user data without lazy collections
            Map<String, Object> userData = createSafeUserData(user);

            // Set user in session
            session.setAttribute("user", userData);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("user", userData);
            response.put("redirect", getDashboardRedirect(user.getRole()));

            System.out.println("🎉 Login successful for: " + user.getUsername() + ", role: " + user.getRole());
            System.out.println("Redirecting to: " + getDashboardRedirect(user.getRole()));

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.out.println("❌ Login failed: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Login failed: " + e.getMessage()));
        }
    }

    // Add this helper method to create safe user data without lazy-loaded collections
    private Map<String, Object> createSafeUserData(User user) {
        Map<String, Object> userData = new HashMap<>();
        userData.put("id", user.getId());
        userData.put("username", user.getUsername());
        userData.put("email", user.getEmail());
        userData.put("firstName", user.getFirstName());
        userData.put("lastName", user.getLastName());
        userData.put("role", user.getRole());
        userData.put("createdAt", user.getCreatedAt());
        userData.put("updatedAt", user.getUpdatedAt());
        return userData;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user, HttpSession session) {
        try {
            System.out.println("=== REGISTRATION STARTED ===");
            System.out.println("Username: " + user.getUsername());
            System.out.println("Email: " + user.getEmail());
            System.out.println("First Name: " + user.getFirstName());
            System.out.println("Last Name: " + user.getLastName());
            System.out.println("Password length: " + (user.getPassword() != null ? user.getPassword().length() : "null"));

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
                System.out.println("❌ Username already exists: " + user.getUsername());
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Username already exists"));
            }

            // Check if email already exists
            if (userService.emailExists(user.getEmail())) {
                System.out.println("❌ Email already exists: " + user.getEmail());
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email already exists"));
            }

            // Set role to MEMBER for new registrations
            user.setRole(User.UserRole.MEMBER);

            // Ensure timestamps are set (in case constructor doesn't run)
            user.setCreatedAt(LocalDateTime.now());
            user.setUpdatedAt(LocalDateTime.now());

            System.out.println("✅ Creating user with role: " + user.getRole());

            // Create user
            User savedUser = userService.createUser(user);
            System.out.println("✅ User saved to database with ID: " + savedUser.getId());

            // Return success without auto-login
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Registration successful! Please login.");
            response.put("redirect", "/login.html");

            System.out.println("🎉 Registration completed successfully for: " + savedUser.getUsername());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.out.println("❌ Registration failed: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Registration failed: " + e.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null) {
                new SecurityContextLogoutHandler().logout(request, response, auth);
            }
            SecurityContextHolder.clearContext();
            request.getSession().invalidate();

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

                // Return safe user data without lazy-loaded collections
                Map<String, Object> userData = createSafeUserData(user);
                return ResponseEntity.ok(userData);
            }

            // Fallback to session
            Object user = session.getAttribute("user");
            if (user != null) {
                return ResponseEntity.ok(user);
            }

            return ResponseEntity.ok().body(Map.of("authenticated", false));
        } catch (Exception e) {
            System.out.println("Error getting current user: " + e.getMessage());
            return ResponseEntity.ok().body(Map.of("authenticated", false));
        }
    }

    @GetMapping("/debug-user/{username}")
    public ResponseEntity<?> debugUser(@PathVariable String username) {
        try {
            System.out.println("=== DEBUG USER: " + username + " ===");

            // Check if user exists
            var userOpt = userService.findByUsername(username);
            if (userOpt.isEmpty()) {
                System.out.println("❌ User not found: " + username);
                return ResponseEntity.ok(Map.of("found", false));
            }

            User user = userOpt.get();
            System.out.println("✅ User found: " + user.getUsername());
            System.out.println("📧 Email: " + user.getEmail());
            System.out.println("🎯 Role: " + user.getRole());
            System.out.println("🔑 Password in DB: " + user.getPassword());
            System.out.println("📅 Created: " + user.getCreatedAt());

            // Test password verification
            boolean test1 = userService.verifyPassword("member123", user.getPassword());
            boolean test2 = userService.verifyPassword("wrongpassword", user.getPassword());

            System.out.println("🔐 Password 'member123' matches: " + test1);
            System.out.println("🔐 Password 'wrongpassword' matches: " + test2);

            return ResponseEntity.ok(Map.of(
                    "found", true,
                    "username", user.getUsername(),
                    "email", user.getEmail(),
                    "role", user.getRole(),
                    "passwordMatches_member123", test1,
                    "passwordMatches_wrong", test2
            ));

        } catch (Exception e) {
            System.out.println("❌ Debug error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/test-login")
    public ResponseEntity<?> testLogin(@RequestBody LoginRequest loginRequest) {
        try {
            System.out.println("=== MANUAL LOGIN TEST ===");
            System.out.println("Username: " + loginRequest.getUsername());

            // Check if user exists
            User user = userService.findByUsername(loginRequest.getUsername())
                    .orElseThrow(() -> new UsernameNotFoundException("User not found"));

            System.out.println("User found: " + user.getUsername());
            System.out.println("Stored password: " + user.getPassword());

            // Manual password verification
            boolean passwordValid = userService.verifyPassword(loginRequest.getPassword(), user.getPassword());
            System.out.println("Password valid: " + passwordValid);

            if (passwordValid) {
                return ResponseEntity.ok(Map.of("success", true, "message", "Password is correct"));
            } else {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Password is incorrect"));
            }

        } catch (Exception e) {
            // FIXED: Added missing comma in the line below
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    private String getDashboardRedirect(User.UserRole role) {
        return switch (role) {
            case ADMIN -> "/admin-dashboard";
            case INSTRUCTOR -> "/instructor-dashboard";
            case MEMBER -> "/member-dashboard";
        };
    }

    // DTO classes
    public static class LoginRequest {
        private String username;
        private String password;

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }

    @PostMapping("/test-registration")
    public ResponseEntity<?> testRegistration() {
        try {
            System.out.println("=== TEST REGISTRATION ===");

            User testUser = new User();
            testUser.setUsername("testuser_" + System.currentTimeMillis());
            testUser.setPassword("test123");
            testUser.setEmail("test" + System.currentTimeMillis() + "@test.com");
            testUser.setFirstName("Test");
            testUser.setLastName("User");
            testUser.setRole(User.UserRole.MEMBER);

            System.out.println("Creating test user: " + testUser.getUsername());

            User savedUser = userService.createUser(testUser);

            System.out.println("✅ Test user created successfully!");
            System.out.println("User ID: " + savedUser.getId());
            System.out.println("Username: " + savedUser.getUsername());
            System.out.println("Email: " + savedUser.getEmail());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Test user created successfully",
                    "userId", savedUser.getId()
            ));

        } catch (Exception e) {
            System.out.println("❌ Test registration failed: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/test-db")
    public ResponseEntity<?> testDatabase() {
        try {
            // Try to count users
            long userCount = userRepository.count();
            System.out.println("✅ Database connection working. Total users: " + userCount);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "userCount", userCount,
                    "message", "Database connection is working"
            ));

        } catch (Exception e) {
            System.out.println("❌ Database test failed: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }


    @GetMapping("/debug-auth")
    public ResponseEntity<?> debugAuth(Authentication authentication, HttpSession session) {
        System.out.println("=== AUTH DEBUG ===");
        System.out.println("Authentication: " + authentication);
        System.out.println("Session ID: " + session.getId());
        System.out.println("Session User: " + session.getAttribute("user"));

        // Check Spring Security context
        SecurityContext securityContext = SecurityContextHolder.getContext();
        System.out.println("Security Context Auth: " + securityContext.getAuthentication());

        if (authentication != null && authentication.isAuthenticated()) {
            System.out.println("User: " + authentication.getName());
            System.out.println("Authorities: " + authentication.getAuthorities());

            return ResponseEntity.ok(Map.of(
                    "user", authentication.getName(),
                    "authorities", authentication.getAuthorities().toString(),
                    "authenticated", true
            ));
        } else {
            System.out.println("No authentication found");
            return ResponseEntity.ok(Map.of("authenticated", false));
        }
    }

    @GetMapping("/debug-passwords")
    public ResponseEntity<?> debugPasswords() {
        try {
            List<User> users = userRepository.findAll();
            List<Map<String, Object>> userData = users.stream().map(user -> {
                Map<String, Object> data = new HashMap<>();
                data.put("username", user.getUsername());
                data.put("storedPassword", user.getPassword());
                data.put("isBCrypt", user.getPassword() != null && user.getPassword().startsWith("$2a$"));
                data.put("passwordLength", user.getPassword() != null ? user.getPassword().length() : 0);
                return data;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(userData);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/reset-all-passwords")
    public ResponseEntity<?> resetAllPasswords() {
        try {
            List<User> users = userRepository.findAll();
            Map<String, Object> result = new HashMap<>();

            for (User user : users) {
                String rawPassword = "";

                // Set appropriate default passwords
                switch (user.getRole()) {
                    case ADMIN:
                        rawPassword = "admin123";
                        break;
                    case INSTRUCTOR:
                        rawPassword = "instructor123";
                        break;
                    case MEMBER:
                        rawPassword = "member123";
                        break;
                    default:
                        rawPassword = "password123";
                }

                String newEncodedPassword = passwordEncoder.encode(rawPassword);
                String oldPassword = user.getPassword();
                user.setPassword(newEncodedPassword);
                userRepository.save(user);

                result.put(user.getUsername(), Map.of(
                        "oldPasswordPreview", oldPassword != null ?
                                oldPassword.substring(0, Math.min(10, oldPassword.length())) + "..." : "null",
                        "newPasswordPreview", newEncodedPassword.substring(0, Math.min(10, newEncodedPassword.length())) + "...",
                        "rawPassword", rawPassword,
                        "isBCrypt", newEncodedPassword.startsWith("$2a$")
                ));

                System.out.println("✅ Reset password for " + user.getUsername() +
                        " | Raw: " + rawPassword + " | BCrypt: " + newEncodedPassword.startsWith("$2a$"));
            }

            return ResponseEntity.ok(Map.of("success", true, "resetResults", result));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }


}