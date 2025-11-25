package com.brandon.dtms2.controller;

import com.brandon.dtms2.entity.User;
import com.brandon.dtms2.service.UserService;
import com.brandon.dtms2.service.WorkoutSessionService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/instructor")
public class InstructorController {

    @Autowired
    private UserService userService;

    @Autowired
    private WorkoutSessionService workoutSessionService;

    @GetMapping("/members")
    public ResponseEntity<?> getAllMembers(HttpSession session) {
        try {
            User user = (User) session.getAttribute("user");
            if (user == null || user.getRole() != User.UserRole.INSTRUCTOR) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Unauthorized"));
            }

            List<User> members = userService.findAllUsers().stream()
                    .filter(u -> u.getRole() == User.UserRole.MEMBER)
                    .toList();

            return ResponseEntity.ok(members);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to fetch members"));
        }
    }

    @GetMapping("/workout-sessions")
    public ResponseEntity<?> getAllWorkoutSessions(HttpSession session) {
        try {
            User user = (User) session.getAttribute("user");
            if (user == null || user.getRole() != User.UserRole.INSTRUCTOR) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Unauthorized"));
            }

            // In a real app, you'd implement this service method
            // List<WorkoutSession> sessions = workoutSessionService.getAllSessions();

            return ResponseEntity.ok(Map.of("success", true, "sessions", List.of()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to fetch sessions"));
        }
    }

    @GetMapping("/dashboard-stats")
    public ResponseEntity<?> getInstructorDashboardStats(HttpSession session) {
        try {
            User user = (User) session.getAttribute("user");
            if (user == null || user.getRole() != User.UserRole.INSTRUCTOR) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Unauthorized"));
            }

            Map<String, Object> stats = new HashMap<>();
            stats.put("totalMembers", userService.findAllUsers().stream()
                    .filter(u -> u.getRole() == User.UserRole.MEMBER)
                    .count());
            stats.put("activeThisWeek", 15); // Example data
            stats.put("avgWorkoutsPerMember", 8.5); // Example data
            stats.put("dataQualityScore", 92); // Example data

            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to fetch dashboard stats"));
        }
    }
}