package com.brandon.dtms2.service;

import com.brandon.dtms2.entity.WorkoutSession;
import org.springframework.stereotype.Service;
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
        }

        // Set quality flag
        if (!issues.isEmpty()) {
            session.setDataQualityFlag(false);
            session.setQualityIssues(String.join("; ", issues));
        } else {
            session.setDataQualityFlag(true);
            session.setQualityIssues(null);
        }
    }
}