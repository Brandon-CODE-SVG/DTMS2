package com.brandon.dtms2.service;

import com.brandon.dtms2.entity.WorkoutSession;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class DataQualityService {

    public void validateWorkoutData(WorkoutSession session) {
        List<String> issues = new ArrayList<>();

        // Calorie validation
        if (session.getCaloriesBurned() != null) {
            if (session.getCaloriesBurned() < 1) {
                issues.add("Calories burned cannot be less than 1");
            }
            if (session.getCaloriesBurned() > 1500) {
                issues.add("Calories burned cannot exceed 1500 per session");
            }
        } else {
            issues.add("Calories burned is required");
        }

        // Heart rate validation
        if (session.getAvgHeartRate() != null) {
            if (session.getAvgHeartRate() < 40) {
                issues.add("Heart rate cannot be less than 40 bpm");
            }
            if (session.getAvgHeartRate() > 220) {
                issues.add("Heart rate cannot exceed 220 bpm");
            }
        }

        // Distance validation
        if (session.getDistance() != null) {
            if (session.getDistance() < 0) {
                issues.add("Distance cannot be negative");
            }
            if (session.getDistance() > 50) {
                issues.add("Distance cannot exceed 50 km per session");
            }
        }

        // Speed validation
        if (session.getAvgSpeed() != null) {
            if (session.getAvgSpeed() < 0) {
                issues.add("Speed cannot be negative");
            }
            if (session.getAvgSpeed() > 30) {
                issues.add("Speed cannot exceed 30 km/h");
            }
        }

        // Duration validation
        if (session.getDuration() != null) {
            long minutes = session.getDuration().toMinutes();
            if (minutes > 180) { // 3 hours max
                issues.add("Workout duration cannot exceed 3 hours");
            }
            if (minutes < 1) {
                issues.add("Workout duration must be at least 1 minute");
            }
        } else {
            issues.add("Workout duration is required");
        }

        // Start time validation
        if (session.getStartTime() != null) {
            if (session.getStartTime().isAfter(LocalDateTime.now())) {
                issues.add("Start time cannot be in the future");
            }
            // Check if start time is too far in the past (more than 1 year)
            if (session.getStartTime().isBefore(LocalDateTime.now().minusYears(1))) {
                issues.add("Start time is too far in the past");
            }
        } else {
            issues.add("Start time is required");
        }

        // Machine validation
        if (session.getMachine() == null) {
            issues.add("Machine information is required");
        }

        // User validation
        if (session.getUser() == null) {
            issues.add("User information is required");
        }

        // Set quality flag
        if (!issues.isEmpty()) {
            session.setDataQualityFlag(false);
            session.setQualityIssues(String.join("; ", issues));

            // Log quality issues for monitoring
            System.out.println("Data quality issues detected for session: " +
                    (session.getId() != null ? session.getId() : "new") + " - " + String.join(", ", issues));
        } else {
            session.setDataQualityFlag(true);
            session.setQualityIssues(null);
        }
    }

    /**
     * Additional method to validate specific field ranges
     */
    public boolean validateCaloriesRange(Integer calories) {
        return calories != null && calories >= 1 && calories <= 1500;
    }

    public boolean validateHeartRateRange(Integer heartRate) {
        return heartRate == null || (heartRate >= 40 && heartRate <= 220);
    }

    public boolean validateDurationRange(Long minutes) {
        return minutes != null && minutes >= 1 && minutes <= 180;
    }

    /**
     * Calculate overall data quality score for multiple sessions
     */
    public double calculateDataQualityScore(List<WorkoutSession> sessions) {
        if (sessions.isEmpty()) {
            return 100.0;
        }

        long validSessions = sessions.stream()
                .filter(session -> session.getDataQualityFlag() != null && session.getDataQualityFlag())
                .count();

        return (double) validSessions / sessions.size() * 100;
    }
}