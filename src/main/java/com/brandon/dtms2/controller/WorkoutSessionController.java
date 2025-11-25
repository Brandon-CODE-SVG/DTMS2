package com.brandon.dtms2.controller;

import com.brandon.dtms2.entity.User;
import com.brandon.dtms2.entity.WorkoutSession;
import com.brandon.dtms2.service.UserService;
import com.brandon.dtms2.service.WorkoutSessionService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/workouts")
public class WorkoutSessionController {

    @Autowired
    private WorkoutSessionService workoutSessionService;

    @Autowired
    private UserService userService;

    @PostMapping
    public ResponseEntity<?> createWorkoutSession(@RequestBody WorkoutSession session, HttpSession httpSession) {
        try {
            User user = (User) httpSession.getAttribute("user");
            if (user == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "User not logged in"));
            }

            session.setUser(user);
            WorkoutSession savedSession = workoutSessionService.saveWorkoutSession(session);

            return ResponseEntity.ok(Map.of("success", true, "session", savedSession));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to save workout session"));
        }
    }

    @GetMapping("/my-sessions")
    public ResponseEntity<?> getMySessions(HttpSession httpSession) {
        try {
            User user = (User) httpSession.getAttribute("user");
            if (user == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "User not logged in"));
            }

            List<WorkoutSession> sessions = workoutSessionService.getUserSessions(user);
            return ResponseEntity.ok(sessions);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to fetch sessions"));
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserSessions(@PathVariable Long userId, HttpSession httpSession) {
        try {
            User currentUser = (User) httpSession.getAttribute("user");
            if (currentUser == null || (currentUser.getRole() != User.UserRole.ADMIN &&
                    currentUser.getRole() != User.UserRole.INSTRUCTOR)) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Unauthorized"));
            }

            Optional<User> user = userService.findById(userId);
            if (user.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            List<WorkoutSession> sessions = workoutSessionService.getUserSessions((User) user.get());
            return ResponseEntity.ok(sessions);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to fetch user sessions"));
        }
    }
}