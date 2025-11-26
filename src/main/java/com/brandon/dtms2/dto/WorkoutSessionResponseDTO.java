package com.brandon.dtms2.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.time.Duration;

@Data
public class WorkoutSessionResponseDTO {
    private Long id;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Duration duration;
    private Integer caloriesBurned;
    private Integer avgHeartRate;
    private Double distance;
    private Double avgSpeed;
    private Integer resistanceLevel;
    private Integer inclineLevel;
    private String notes;
    private LocalDateTime createdAt;
    private Boolean dataQualityFlag;
    private String qualityIssues;

    // Simple machine info (not the full entity)
    private MachineInfo machine;

    @Data
    public static class MachineInfo {
        private Long id;
        private String name;
        private String type;

        public static MachineInfo fromMachine(com.brandon.dtms2.entity.Machine machine) {
            if (machine == null) return null;
            MachineInfo info = new MachineInfo();
            info.setId(machine.getId());
            info.setName(machine.getName());
            info.setType(machine.getType());
            return info;
        }
    }

    public static WorkoutSessionResponseDTO fromWorkoutSession(com.brandon.dtms2.entity.WorkoutSession session) {
        WorkoutSessionResponseDTO dto = new WorkoutSessionResponseDTO();
        dto.setId(session.getId());
        dto.setStartTime(session.getStartTime());
        dto.setEndTime(session.getEndTime());
        dto.setDuration(session.getDuration());
        dto.setCaloriesBurned(session.getCaloriesBurned());
        dto.setAvgHeartRate(session.getAvgHeartRate());
        dto.setDistance(session.getDistance());
        dto.setAvgSpeed(session.getAvgSpeed());
        dto.setResistanceLevel(session.getResistanceLevel());
        dto.setInclineLevel(session.getInclineLevel());
        dto.setNotes(session.getNotes());
        dto.setCreatedAt(session.getCreatedAt());
        dto.setDataQualityFlag(session.getDataQualityFlag());
        dto.setQualityIssues(session.getQualityIssues());
        dto.setMachine(MachineInfo.fromMachine(session.getMachine()));
        return dto;
    }
}