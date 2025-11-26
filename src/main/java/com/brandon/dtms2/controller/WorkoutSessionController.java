package com.brandon.dtms2.controller;

import com.brandon.dtms2.dto.WorkoutSessionResponseDTO;
import com.brandon.dtms2.entity.User;
import com.brandon.dtms2.entity.WorkoutSession;
import com.brandon.dtms2.service.UserService;
import com.brandon.dtms2.service.WorkoutSessionService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/workouts")
public class WorkoutSessionController {

    private final WorkoutSessionService workoutSessionService;
    private final UserService userService;

    public WorkoutSessionController(WorkoutSessionService workoutSessionService, UserService userService) {
        this.workoutSessionService = workoutSessionService;
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<?> createWorkoutSession(@RequestBody Map<String, Object> workoutData, HttpSession httpSession) {
        try {
            // FIX: Handle both User object and HashMap cases
            Object sessionUser = httpSession.getAttribute("user");
            User user = null;

            if (sessionUser instanceof User) {
                user = (User) sessionUser;
            } else if (sessionUser instanceof Map) {
                // Convert HashMap to User object
                Map<?, ?> userMap = (Map<?, ?>) sessionUser;
                Long userId = Long.valueOf(userMap.get("id").toString());
                Optional<User> userOpt = userService.findById(userId);
                if (userOpt.isPresent()) {
                    user = userOpt.get();
                } else {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message", "User not found"));
                }
            }

            if (user == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "User not logged in"));
            }

            // Create new workout session
            WorkoutSession session = new WorkoutSession();
            session.setUser(user);

            // Set machine ID - this is crucial
            if (workoutData.get("machineId") != null) {
                Long machineId = Long.valueOf(workoutData.get("machineId").toString());

                // Use the service method that handles machine lookup
                WorkoutSession savedSession = workoutSessionService.saveWorkoutSessionWithMachineId(session, machineId);

                // Set other fields from the workout data
                if (workoutData.get("startTime") != null) {
                    String startTimeStr = workoutData.get("startTime").toString();
                    // Handle both with and without seconds
                    if (startTimeStr.length() == 16) { // YYYY-MM-DDTHH:MM
                        startTimeStr += ":00";
                    }
                    LocalDateTime startTime = LocalDateTime.parse(startTimeStr);
                    savedSession.setStartTime(startTime);
                }

                if (workoutData.get("duration") != null) {
                    Integer duration = Integer.valueOf(workoutData.get("duration").toString());
                    savedSession.setDuration(Duration.ofMinutes(duration));

                    // Calculate end time
                    if (savedSession.getStartTime() != null) {
                        savedSession.setEndTime(savedSession.getStartTime().plusMinutes(duration));
                    }
                }

                if (workoutData.get("caloriesBurned") != null) {
                    savedSession.setCaloriesBurned(Integer.valueOf(workoutData.get("caloriesBurned").toString()));
                }

                if (workoutData.get("avgHeartRate") != null) {
                    savedSession.setAvgHeartRate(Integer.valueOf(workoutData.get("avgHeartRate").toString()));
                }

                if (workoutData.get("distance") != null) {
                    savedSession.setDistance(Double.valueOf(workoutData.get("distance").toString()));
                }

                if (workoutData.get("avgSpeed") != null) {
                    savedSession.setAvgSpeed(Double.valueOf(workoutData.get("avgSpeed").toString()));
                }

                if (workoutData.get("resistanceLevel") != null) {
                    savedSession.setResistanceLevel(Integer.valueOf(workoutData.get("resistanceLevel").toString()));
                }

                if (workoutData.get("notes") != null) {
                    savedSession.setNotes(workoutData.get("notes").toString());
                }

                // Save the updated session
                WorkoutSession finalSession = workoutSessionService.saveWorkoutSession(savedSession);

                return ResponseEntity.ok(Map.of("success", true, "session", finalSession));
            } else {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Machine ID is required"));
            }

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to save workout session: " + e.getMessage()));
        }
    }

    // Alternative simplified version - RECOMMENDED
    @PostMapping("/simple")
    public ResponseEntity<?> createWorkoutSessionSimple(@RequestBody Map<String, Object> workoutData, HttpSession httpSession) {
        try {
            // Get user from session (handle both User and HashMap)
            Object sessionUser = httpSession.getAttribute("user");
            Long userId = null;

            if (sessionUser instanceof User) {
                userId = ((User) sessionUser).getId();
            } else if (sessionUser instanceof Map) {
                Map<?, ?> userMap = (Map<?, ?>) sessionUser;
                userId = Long.valueOf(userMap.get("id").toString());
            }

            if (userId == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "User not logged in"));
            }

            // Extract all required fields
            Long machineId = Long.valueOf(workoutData.get("machineId").toString());

            // Handle start time formatting
            String startTimeStr = workoutData.get("startTime").toString();
            if (startTimeStr.length() == 16) { // YYYY-MM-DDTHH:MM
                startTimeStr += ":00";
            }
            LocalDateTime startTime = LocalDateTime.parse(startTimeStr);

            Integer duration = Integer.valueOf(workoutData.get("duration").toString());
            Integer caloriesBurned = Integer.valueOf(workoutData.get("caloriesBurned").toString());
            Integer avgHeartRate = Integer.valueOf(workoutData.get("avgHeartRate").toString());
            Double distance = Double.valueOf(workoutData.get("distance").toString());

            // Optional fields
            Double avgSpeed = workoutData.get("avgSpeed") != null ?
                    Double.valueOf(workoutData.get("avgSpeed").toString()) : null;
            Integer resistanceLevel = workoutData.get("resistanceLevel") != null ?
                    Integer.valueOf(workoutData.get("resistanceLevel").toString()) : null;
            String notes = workoutData.get("notes") != null ?
                    workoutData.get("notes").toString() : null;

            // Use the service to create the workout
            WorkoutSession savedSession = workoutSessionService.createWorkoutSession(
                    userId, machineId, startTime, duration, caloriesBurned,
                    avgHeartRate, distance, avgSpeed, resistanceLevel, null, notes
            );

            return ResponseEntity.ok(Map.of("success", true, "session", savedSession));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to save workout session: " + e.getMessage()));
        }
    }

    @GetMapping("/my-sessions")
    public ResponseEntity<?> getMySessions(HttpSession httpSession) {
        try {
            Object sessionUser = httpSession.getAttribute("user");
            User user = null;

            if (sessionUser instanceof User) {
                user = (User) sessionUser;
            } else if (sessionUser instanceof Map) {
                Map<?, ?> userMap = (Map<?, ?>) sessionUser;
                Long userId = Long.valueOf(userMap.get("id").toString());
                Optional<User> userOpt = userService.findById(userId);
                if (userOpt.isPresent()) {
                    user = userOpt.get();
                }
            }

            if (user == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "User not logged in"));
            }

            List<WorkoutSession> sessions = workoutSessionService.getUserSessions(user);

            // Convert to DTO to avoid circular references
            List<WorkoutSessionResponseDTO> sessionDTOs = sessions.stream()
                    .map(WorkoutSessionResponseDTO::fromWorkoutSession)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(sessionDTOs);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to fetch sessions"));
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserSessions(@PathVariable Long userId, HttpSession httpSession) {
        try {
            // Handle session user properly
            Object sessionUser = httpSession.getAttribute("user");
            User currentUser = null;

            if (sessionUser instanceof User) {
                currentUser = (User) sessionUser;
            } else if (sessionUser instanceof Map) {
                Map<?, ?> userMap = (Map<?, ?>) sessionUser;
                Long currentUserId = Long.valueOf(userMap.get("id").toString());
                Optional<User> userOpt = userService.findById(currentUserId);
                if (userOpt.isPresent()) {
                    currentUser = userOpt.get();
                }
            }

            if (currentUser == null || (currentUser.getRole() != User.UserRole.ADMIN &&
                    currentUser.getRole() != User.UserRole.INSTRUCTOR)) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Unauthorized"));
            }

            Optional<User> user = userService.findById(userId);
            if (user.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            List<WorkoutSession> sessions = workoutSessionService.getUserSessions(user.get());
            return ResponseEntity.ok(sessions);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to fetch user sessions"));
        }
    }

    @PutMapping("/{id}/quality-review")
    public ResponseEntity<?> updateSessionQuality(@PathVariable Long id, @RequestBody Map<String, Object> updates) {
        try {
            WorkoutSession session = workoutSessionService.updateSessionQuality(id, updates);
            return ResponseEntity.ok(Map.of("success", true, "session", session));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to update session quality"));
        }
    }
}