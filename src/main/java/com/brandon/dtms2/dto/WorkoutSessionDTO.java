    package com.brandon.dtms2.dto;

    import lombok.Data;

    import java.time.LocalDateTime;

    @Data
    public class WorkoutSessionDTO {
        private Long machineId;
        private LocalDateTime startTime;
        private Integer duration; // in minutes
        private Integer caloriesBurned;
        private Integer avgHeartRate;
        private Double distance;
        private Double avgSpeed;
        private Integer resistanceLevel;
        private Integer inclineLevel;
        private String notes;
    }