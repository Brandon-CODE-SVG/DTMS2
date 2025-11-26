package com.brandon.dtms2.controller;

import com.brandon.dtms2.entity.Machine;
import com.brandon.dtms2.entity.User;
import com.brandon.dtms2.entity.WorkoutSession;
import com.brandon.dtms2.repository.MachineRepository;
import com.brandon.dtms2.repository.UserRepository;
import com.brandon.dtms2.repository.WorkoutSessionRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final MachineRepository machineRepository;
    private final WorkoutSessionRepository workoutSessionRepository;

    public AdminController(UserRepository userRepository,
                           MachineRepository machineRepository,
                           WorkoutSessionRepository workoutSessionRepository) {
        this.userRepository = userRepository;
        this.machineRepository = machineRepository;
        this.workoutSessionRepository = workoutSessionRepository;
    }

    @GetMapping("/dashboard-stats")
    public ResponseEntity<?> getDashboardStats(HttpSession session) {
        try {
            // Use Spring Security authentication instead of session
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated() ||
                    authentication.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Unauthorized"));
            }

            long totalUsers = userRepository.count();
            long totalMachines = machineRepository.count();
            long totalSessions = workoutSessionRepository.count();

            LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
            List<WorkoutSession> recentSessions = workoutSessionRepository.findSessionsBetweenDates(weekAgo, LocalDateTime.now());

            // Count active machines
            long activeMachines = machineRepository.findByStatus("ACTIVE").size();

            // Calculate system health based on machine status
            long totalActiveMachines = machineRepository.findByStatus("ACTIVE").size();
            long totalAllMachines = machineRepository.count();
            double systemHealth = totalAllMachines > 0 ?
                    (double) totalActiveMachines / totalAllMachines * 100 : 100;

            Map<String, Object> stats = new HashMap<>();
            stats.put("totalUsers", totalUsers);
            stats.put("totalMachines", totalMachines);
            stats.put("totalSessions", totalSessions);
            stats.put("recentSessions", recentSessions.size());
            stats.put("activeMachines", activeMachines);
            stats.put("systemHealth", Math.round(systemHealth));

            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to fetch dashboard stats: " + e.getMessage()));
        }
    }

    @GetMapping("/machine-usage")
    public ResponseEntity<?> getMachineUsage(HttpSession session) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated() ||
                    authentication.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Unauthorized"));
            }

            List<Machine> machines = machineRepository.findAll();
            List<Map<String, Object>> usageData = machines.stream().map(machine -> {
                Map<String, Object> data = new HashMap<>();
                data.put("id", machine.getId());
                data.put("machineName", machine.getName());
                data.put("machineType", machine.getType());
                data.put("totalSessions", workoutSessionRepository.countSessionsByMachine(machine));

                Double avgCalories = workoutSessionRepository.findAverageCaloriesByMachine(machine);
                data.put("avgCalories", avgCalories != null ? Math.round(avgCalories) : 0);

                data.put("status", machine.getStatus());
                data.put("location", machine.getLocation());
                data.put("lastMaintenance", machine.getLastMaintenance());

                return data;
            }).toList();

            return ResponseEntity.ok(usageData);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to fetch machine usage: " + e.getMessage()));
        }
    }

    @GetMapping("/user-activity")
    public ResponseEntity<?> getUserActivity() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated() ||
                    authentication.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Unauthorized"));
            }

            // Get user activity for the last 7 days
            LocalDateTime startDate = LocalDateTime.now().minusDays(7);
            LocalDateTime endDate = LocalDateTime.now();

            List<WorkoutSession> recentSessions = workoutSessionRepository.findSessionsBetweenDates(startDate, endDate);

            // Group by day
            Map<String, Long> dailyActivity = recentSessions.stream()
                    .collect(Collectors.groupingBy(
                            session -> session.getStartTime().toLocalDate().toString(),
                            Collectors.counting()
                    ));

            // Fill in missing days
            List<String> last7Days = new ArrayList<>();
            List<Long> activityCounts = new ArrayList<>();

            for (int i = 6; i >= 0; i--) {
                String date = LocalDate.now().minusDays(i).toString();
                last7Days.add(date);
                activityCounts.add(dailyActivity.getOrDefault(date, 0L));
            }

            Map<String, Object> activityData = new HashMap<>();
            activityData.put("labels", last7Days);
            activityData.put("data", activityCounts);

            return ResponseEntity.ok(activityData);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to fetch user activity"));
        }
    }
}
