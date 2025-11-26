package com.brandon.dtms2.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.time.Duration;

@Entity
@Table(name = "workout_sessions")
@Data
public class WorkoutSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"workoutSessions", "password"})
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "machine_id")
    @JsonIgnoreProperties({"workoutSessions"})
    private Machine machine;

    @NotNull(message = "Start time is required")
    private LocalDateTime startTime;

    private LocalDateTime endTime;
    private Duration duration;

    @Min(value = 1, message = "Calories must be at least 1")
    @Max(value = 1500, message = "Calories cannot exceed 1500 per session")
    private Integer caloriesBurned;

    @Min(value = 40, message = "Heart rate must be at least 40 bpm")
    @Max(value = 220, message = "Heart rate cannot exceed 220 bpm")
    private Integer avgHeartRate;

    @Min(value = 0, message = "Distance cannot be negative")
    @Max(value = 50, message = "Distance cannot exceed 50 km per session")
    private Double distance; // in km

    @Min(value = 0, message = "Speed cannot be negative")
    @Max(value = 30, message = "Speed cannot exceed 30 km/h")
    private Double avgSpeed; // in km/h

    private Integer resistanceLevel;
    private Integer inclineLevel;
    private String notes;

    private LocalDateTime createdAt;
    private Boolean dataQualityFlag = true;
    private String qualityIssues;

    // Constructors
    public WorkoutSession() {
        this.createdAt = LocalDateTime.now();
    }
}