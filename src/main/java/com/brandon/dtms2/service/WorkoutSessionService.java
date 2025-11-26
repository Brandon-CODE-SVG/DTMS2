package com.brandon.dtms2.service;

import com.brandon.dtms2.entity.Machine;
import com.brandon.dtms2.entity.User;
import com.brandon.dtms2.entity.WorkoutSession;
import com.brandon.dtms2.repository.WorkoutSessionRepository;
import com.brandon.dtms2.repository.MachineRepository;
import com.brandon.dtms2.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional
public class WorkoutSessionService {

    private final WorkoutSessionRepository workoutSessionRepository;
    private final MachineRepository machineRepository;
    private final UserRepository userRepository;
    private final DataQualityService dataQualityService;

    public WorkoutSessionService(WorkoutSessionRepository workoutSessionRepository,
                                 MachineRepository machineRepository,
                                 UserRepository userRepository,
                                 DataQualityService dataQualityService) {
        this.workoutSessionRepository = workoutSessionRepository;
        this.machineRepository = machineRepository;
        this.userRepository = userRepository;
        this.dataQualityService = dataQualityService;
    }

    /**
     * Save a workout session with full entity
     */
    public WorkoutSession saveWorkoutSession(WorkoutSession session) {
        // Validate data quality first
        dataQualityService.validateWorkoutData(session);

        // Ensure end time and duration are calculated if not provided
        calculateMissingFields(session);

        // Set createdAt timestamp if it's a new session
        if (session.getId() == null) {
            session.setCreatedAt(LocalDateTime.now());
        }

        return workoutSessionRepository.save(session);
    }

    /**
     * Save workout session with machine ID lookup - USE THIS FOR THE FRONTEND
     */
    public WorkoutSession saveWorkoutSessionWithMachineId(WorkoutSession session, Long machineId) {
        // Find and set the machine
        Optional<Machine> machine = machineRepository.findById(machineId);
        if (machine.isPresent()) {
            session.setMachine(machine.get());
        } else {
            throw new RuntimeException("Machine not found with ID: " + machineId);
        }

        return saveWorkoutSession(session);
    }

    /**
     * Create workout session from basic parameters - SIMPLIFIED VERSION
     */
    public WorkoutSession createWorkoutSession(User user, Long machineId, LocalDateTime startTime,
                                               Integer durationMinutes, Integer caloriesBurned,
                                               Integer avgHeartRate, Double distance, Double avgSpeed,
                                               Integer resistanceLevel, Integer inclineLevel, String notes) {

        WorkoutSession session = new WorkoutSession();
        session.setUser(user);
        session.setStartTime(startTime);
        session.setCaloriesBurned(caloriesBurned);
        session.setAvgHeartRate(avgHeartRate);
        session.setDistance(distance);
        session.setAvgSpeed(avgSpeed);
        session.setResistanceLevel(resistanceLevel);
        session.setInclineLevel(inclineLevel);
        session.setNotes(notes);

        // Set duration and calculate end time
        if (durationMinutes != null) {
            session.setDuration(Duration.ofMinutes(durationMinutes));
            session.setEndTime(startTime.plusMinutes(durationMinutes));
        }

        return saveWorkoutSessionWithMachineId(session, machineId);
    }

    /**
     * Create workout session using user ID instead of User object
     */
    public WorkoutSession createWorkoutSession(Long userId, Long machineId, LocalDateTime startTime,
                                               Integer durationMinutes, Integer caloriesBurned,
                                               Integer avgHeartRate, Double distance, Double avgSpeed,
                                               Integer resistanceLevel, Integer inclineLevel, String notes) {

        // Find user by ID
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

        return createWorkoutSession(user, machineId, startTime, durationMinutes, caloriesBurned,
                avgHeartRate, distance, avgSpeed, resistanceLevel, inclineLevel, notes);
    }

    /**
     * Calculate missing time fields (duration, end time)
     */
    private void calculateMissingFields(WorkoutSession session) {
        LocalDateTime startTime = session.getStartTime();
        LocalDateTime endTime = session.getEndTime();
        Duration duration = session.getDuration();

        // Case 1: Have start time and duration, but no end time
        if (startTime != null && duration != null && endTime == null) {
            session.setEndTime(startTime.plus(duration));
        }

        // Case 2: Have start time and end time, but no duration
        else if (startTime != null && endTime != null && duration == null) {
            session.setDuration(Duration.between(startTime, endTime));
        }

        // Case 3: Have duration and end time, but no start time (less common)
        else if (duration != null && endTime != null && startTime == null) {
            session.setStartTime(endTime.minus(duration));
        }
    }

    /**
     * Get all sessions for a user, ordered by most recent first
     */
    public List<WorkoutSession> getUserSessions(User user) {
        return workoutSessionRepository.findByUserOrderByStartTimeDesc(user);
    }

    /**
     * Get sessions for a specific user ID
     */
    public List<WorkoutSession> getUserSessions(Long userId) {
        return workoutSessionRepository.findByUserId(userId);
    }

    /**
     * Get all sessions between dates
     */
    public List<WorkoutSession> getSessionsBetweenDates(LocalDateTime start, LocalDateTime end) {
        return workoutSessionRepository.findSessionsBetweenDates(start, end);
    }

    /**
     * Get user sessions between specific dates
     */
    public List<WorkoutSession> getUserSessionsBetweenDates(User user, LocalDateTime start, LocalDateTime end) {
        return workoutSessionRepository.findUserSessionsBetweenDates(user, start, end);
    }

    /**
     * Get total sessions count for a machine
     */
    public Long getTotalSessionsByMachine(Machine machine) {
        return workoutSessionRepository.countSessionsByMachine(machine);
    }

    /**
     * Get total sessions count for a machine by ID
     */
    public Long getTotalSessionsByMachineId(Long machineId) {
        return workoutSessionRepository.countSessionsByMachineId(machineId);
    }

    /**
     * Get average calories burned for a machine
     */
    public Double getAverageCaloriesByMachine(Machine machine) {
        Double avg = workoutSessionRepository.findAverageCaloriesByMachine(machine);
        return avg != null ? avg : 0.0;
    }

    /**
     * Get all workout sessions
     */
    public List<WorkoutSession> getAllSessions() {
        return workoutSessionRepository.findAll();
    }

    /**
     * Get sessions with data quality issues
     */
    public List<WorkoutSession> getSessionsWithQualityIssues() {
        return workoutSessionRepository.findByDataQualityFlagFalse();
    }

    /**
     * Update an existing workout session
     */
    public WorkoutSession updateSession(Long id, WorkoutSession sessionDetails) {
        WorkoutSession session = workoutSessionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Workout session not found with ID: " + id));

        // Update fields if provided
        if (sessionDetails.getMachine() != null) {
            session.setMachine(sessionDetails.getMachine());
        }
        if (sessionDetails.getStartTime() != null) {
            session.setStartTime(sessionDetails.getStartTime());
        }
        if (sessionDetails.getEndTime() != null) {
            session.setEndTime(sessionDetails.getEndTime());
        }
        if (sessionDetails.getDuration() != null) {
            session.setDuration(sessionDetails.getDuration());
        }
        if (sessionDetails.getCaloriesBurned() != null) {
            session.setCaloriesBurned(sessionDetails.getCaloriesBurned());
        }
        if (sessionDetails.getAvgHeartRate() != null) {
            session.setAvgHeartRate(sessionDetails.getAvgHeartRate());
        }
        if (sessionDetails.getDistance() != null) {
            session.setDistance(sessionDetails.getDistance());
        }
        if (sessionDetails.getAvgSpeed() != null) {
            session.setAvgSpeed(sessionDetails.getAvgSpeed());
        }
        if (sessionDetails.getResistanceLevel() != null) {
            session.setResistanceLevel(sessionDetails.getResistanceLevel());
        }
        if (sessionDetails.getInclineLevel() != null) {
            session.setInclineLevel(sessionDetails.getInclineLevel());
        }
        if (sessionDetails.getNotes() != null) {
            session.setNotes(sessionDetails.getNotes());
        }

        // Calculate missing fields
        calculateMissingFields(session);

        // Re-validate data quality
        dataQualityService.validateWorkoutData(session);

        return workoutSessionRepository.save(session);
    }

    /**
     * Delete a workout session
     */
    public void deleteSession(Long id) {
        if (!workoutSessionRepository.existsById(id)) {
            throw new RuntimeException("Workout session not found with ID: " + id);
        }
        workoutSessionRepository.deleteById(id);
    }

    /**
     * Get recent sessions (all users)
     */
    public List<WorkoutSession> getRecentSessions(int limit) {
        return workoutSessionRepository.findTopByOrderByStartTimeDesc(limit);
    }

    /**
     * Get recent sessions for a specific user
     */
    public List<WorkoutSession> getRecentSessionsByUser(User user, int limit) {
        return workoutSessionRepository.findTopByUserOrderByStartTimeDesc(user.getId(), limit);
    }

    /**
     * Get total workout count for a user
     */
    public Long getTotalWorkoutsByUser(User user) {
        return workoutSessionRepository.countSessionsByUser(user);
    }

    /**
     * Get total calories burned by user
     */
    public Integer getTotalCaloriesByUser(User user) {
        List<WorkoutSession> sessions = getUserSessions(user);
        return sessions.stream()
                .mapToInt(session -> session.getCaloriesBurned() != null ? session.getCaloriesBurned() : 0)
                .sum();
    }

    /**
     * Get total distance by user
     */
    public Double getTotalDistanceByUser(User user) {
        List<WorkoutSession> sessions = getUserSessions(user);
        return sessions.stream()
                .mapToDouble(session -> session.getDistance() != null ? session.getDistance() : 0.0)
                .sum();
    }

    /**
     * Get average heart rate by user
     */
    public Double getAverageHeartRateByUser(User user) {
        List<WorkoutSession> sessions = getUserSessions(user);
        double avg = sessions.stream()
                .filter(session -> session.getAvgHeartRate() != null)
                .mapToInt(WorkoutSession::getAvgHeartRate)
                .average()
                .orElse(0.0);
        return Math.round(avg * 100.0) / 100.0; // Round to 2 decimal places
    }

    public WorkoutSession updateSessionQuality(Long id, Map<String, Object> updates) {
        WorkoutSession session = workoutSessionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Workout session not found with ID: " + id));

        if (updates.containsKey("dataQualityFlag")) {
            session.setDataQualityFlag((Boolean) updates.get("dataQualityFlag"));
        }
        if (updates.containsKey("qualityIssues")) {
            session.setQualityIssues((String) updates.get("qualityIssues"));
        }

        return workoutSessionRepository.save(session);
    }
}