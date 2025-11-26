package com.brandon.dtms2.controller;

import com.brandon.dtms2.dto.WorkoutSessionResponseDTO;
import com.brandon.dtms2.entity.User;
import com.brandon.dtms2.entity.WorkoutSession;
import com.brandon.dtms2.service.UserService;
import com.brandon.dtms2.service.WorkoutSessionService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/instructor")
public class InstructorController {

    private final UserService userService;
    private final WorkoutSessionService workoutSessionService;

    public InstructorController(UserService userService, WorkoutSessionService workoutSessionService) {
        this.userService = userService;
        this.workoutSessionService = workoutSessionService;
    }

    // FIXED: Helper method to check instructor authorization that handles HashMap session user
    private User checkInstructorAuth(HttpSession httpSession) {
        Object sessionUser = httpSession.getAttribute("user");
        User user = null;

        if (sessionUser instanceof User) {
            user = (User) sessionUser;
        } else if (sessionUser instanceof Map) {
            // Convert HashMap to User object
            Map<?, ?> userMap = (Map<?, ?>) sessionUser;
            Long userId = Long.valueOf(userMap.get("id").toString());
            user = userService.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
        }

        if (user == null || user.getRole() != User.UserRole.INSTRUCTOR) {
            throw new RuntimeException("Unauthorized");
        }
        return user;
    }

    @GetMapping("/members")
    public ResponseEntity<?> getAllMembers(HttpSession httpSession) {
        try {
            User instructor = checkInstructorAuth(httpSession);
            List<User> members = userService.findAllMembers();
            return ResponseEntity.ok(members);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to fetch members: " + e.getMessage()));
        }
    }



    @GetMapping("/chart-data")
    public ResponseEntity<?> getChartData(HttpSession httpSession) {
        try {
            User instructor = checkInstructorAuth(httpSession);

            Map<String, Object> chartData = new HashMap<>();

            // Weekly activity data
            LocalDateTime now = LocalDateTime.now();
            Map<String, Long> weeklyActivity = new HashMap<>();
            String[] days = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"};

            for (String day : days) {
                weeklyActivity.put(day, 0L);
            }

            List<WorkoutSession> weekSessions = workoutSessionService.getSessionsBetweenDates(
                    now.minusDays(7), now
            );

            weekSessions.forEach(session -> {
                String day = session.getStartTime().getDayOfWeek().toString().substring(0, 3);
                weeklyActivity.put(day, weeklyActivity.get(day) + 1);
            });

            chartData.put("weeklyActivity", weeklyActivity);

            // Workout type distribution
            Map<String, Long> workoutTypes = new HashMap<>();
            weekSessions.forEach(session -> {
                if (session.getMachine() != null) {
                    String type = session.getMachine().getType();
                    workoutTypes.put(type, workoutTypes.getOrDefault(type, 0L) + 1);
                }
            });
            chartData.put("workoutTypes", workoutTypes);

            // Progress data (last 4 weeks)
            Map<String, Object> progressData = new HashMap<>();
            for (int i = 3; i >= 0; i--) {
                LocalDateTime weekStart = now.minusWeeks(i).withHour(0).withMinute(0).withSecond(0);
                LocalDateTime weekEnd = weekStart.plusDays(7);

                List<WorkoutSession> weekData = workoutSessionService.getSessionsBetweenDates(weekStart, weekEnd);

                double weekAvgCalories = weekData.stream()
                        .filter(s -> s.getCaloriesBurned() != null)
                        .mapToInt(WorkoutSession::getCaloriesBurned)
                        .average()
                        .orElse(0.0);

                double weekAvgDuration = weekData.stream()
                        .filter(s -> s.getDuration() != null)
                        .mapToDouble(s -> s.getDuration().toMinutes())
                        .average()
                        .orElse(0.0);

                progressData.put("Week " + (4-i), Map.of(
                        "avgCalories", Math.round(weekAvgCalories),
                        "avgDuration", Math.round(weekAvgDuration)
                ));
            }
            chartData.put("progressData", progressData);

            return ResponseEntity.ok(chartData);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to fetch chart data: " + e.getMessage()));
        }
    }

    // ... keep other methods the same but use the fixed checkInstructorAuth


    @PutMapping("/sessions/{id}/quality-review")
    public ResponseEntity<?> updateSessionQuality(@PathVariable Long id, @RequestBody Map<String, Object> updates, HttpSession httpSession) {
        try {
            User instructor = checkInstructorAuth(httpSession);

            WorkoutSession session = workoutSessionService.updateSessionQuality(id, updates);
            return ResponseEntity.ok(Map.of("success", true, "session", session));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to update session quality: " + e.getMessage()));
        }
    }


    @GetMapping("/workout-sessions")
    public ResponseEntity<?> getAllWorkoutSessions(HttpSession httpSession) {
        try {
            User instructor = checkInstructorAuth(httpSession);
            List<WorkoutSession> sessions = workoutSessionService.getAllSessions();

            // Convert to your existing DTO
            List<WorkoutSessionResponseDTO> sessionDTOs = sessions.stream()
                    .map(WorkoutSessionResponseDTO::fromWorkoutSession)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of("success", true, "sessions", sessionDTOs));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to fetch sessions: " + e.getMessage()));
        }
    }

    @GetMapping("/dashboard-stats")
    public ResponseEntity<?> getInstructorDashboardStats(HttpSession httpSession) {
        try {
            User instructor = checkInstructorAuth(httpSession);

            // Get real data
            List<User> members = userService.findAllMembers();
            List<WorkoutSession> allSessions = workoutSessionService.getAllSessions();

            // Calculate active members this week
            LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
            long activeThisWeek = members.stream()
                    .filter(member -> {
                        List<WorkoutSession> memberSessions = workoutSessionService.getUserSessions(member);
                        return memberSessions.stream()
                                .anyMatch(session -> session.getStartTime().isAfter(weekAgo));
                    })
                    .count();

            // Calculate data quality score
            long qualitySessions = allSessions.stream()
                    .filter(session -> session.getDataQualityFlag() != null && session.getDataQualityFlag())
                    .count();
            double dataQualityScore = allSessions.isEmpty() ? 100.0 :
                    (double) qualitySessions / allSessions.size() * 100;

            // Calculate average workouts per member
            double avgWorkoutsPerMember = members.isEmpty() ? 0.0 :
                    (double) allSessions.size() / members.size();

            // Calculate average calories across all sessions
            double avgCalories = allSessions.stream()
                    .filter(session -> session.getCaloriesBurned() != null)
                    .mapToInt(WorkoutSession::getCaloriesBurned)
                    .average()
                    .orElse(0.0);

            Map<String, Object> stats = new HashMap<>();
            stats.put("totalMembers", members.size());
            stats.put("activeThisWeek", activeThisWeek);
            stats.put("avgWorkoutsPerMember", Math.round(avgWorkoutsPerMember * 10.0) / 10.0);
            stats.put("dataQualityScore", Math.round(dataQualityScore));
            stats.put("avgCalories", Math.round(avgCalories));
            stats.put("totalSessions", allSessions.size());
            stats.put("sessionsThisWeek", allSessions.stream()
                    .filter(session -> session.getStartTime().isAfter(weekAgo))
                    .count());

            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to fetch dashboard stats: " + e.getMessage()));
        }
    }
}