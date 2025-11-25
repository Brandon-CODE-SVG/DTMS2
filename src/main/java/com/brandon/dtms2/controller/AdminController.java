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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MachineRepository machineRepository;

    @Autowired
    private WorkoutSessionRepository workoutSessionRepository;

    @GetMapping("/dashboard-stats")
    public ResponseEntity<?> getDashboardStats(HttpSession session) {
        try {
            User user = (User) session.getAttribute("user");
            if (user == null || user.getRole() != User.UserRole.ADMIN) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Unauthorized"));
            }

            long totalUsers = userRepository.count();
            long totalMachines = machineRepository.count();
            long totalSessions = workoutSessionRepository.count();

            LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
            List<WorkoutSession> recentSessions = workoutSessionRepository.findSessionsBetweenDates(weekAgo, LocalDateTime.now());

            Map<String, Object> stats = new HashMap<>();
            stats.put("totalUsers", totalUsers);
            stats.put("totalMachines", totalMachines);
            stats.put("totalSessions", totalSessions);
            stats.put("recentSessions", recentSessions.size());

            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to fetch dashboard stats"));
        }
    }

    @GetMapping("/machine-usage")
    public ResponseEntity<?> getMachineUsage(HttpSession session) {
        try {
            User user = (User) session.getAttribute("user");
            if (user == null || user.getRole() != User.UserRole.ADMIN) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Unauthorized"));
            }

            List<Machine> machines = machineRepository.findAll();
            List<Map<String, Object>> usageData = machines.stream().map(machine -> {
                Map<String, Object> data = new HashMap<>();
                data.put("machineName", machine.getName());
                data.put("machineType", machine.getType());
                data.put("totalSessions", workoutSessionRepository.countSessionsByMachine(machine));
                data.put("avgCalories", workoutSessionRepository.findAverageCaloriesByMachine(machine));
                data.put("status", machine.getStatus());
                return data;
            }).toList();

            return ResponseEntity.ok(usageData);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to fetch machine usage"));
        }
    }
}
