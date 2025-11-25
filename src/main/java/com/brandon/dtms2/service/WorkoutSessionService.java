package com.brandon.dtms2.service;

import com.brandon.dtms2.entity.Machine;
import com.brandon.dtms2.entity.User;
import com.brandon.dtms2.entity.WorkoutSession;
import com.brandon.dtms2.repository.WorkoutSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;


@Service
public class WorkoutSessionService {

    @Autowired
    private WorkoutSessionRepository workoutSessionRepository;

    @Autowired
    private DataQualityService dataQualityService;

    public WorkoutSession saveWorkoutSession(WorkoutSession session) {
        // Validate data quality
        dataQualityService.validateWorkoutData(session);
        return workoutSessionRepository.save(session);
    }

    public List<WorkoutSession> getUserSessions(User user) {
        return workoutSessionRepository.findByUserOrderByStartTimeDesc(user);
    }

    public List<WorkoutSession> getSessionsBetweenDates(LocalDateTime start, LocalDateTime end) {
        return workoutSessionRepository.findSessionsBetweenDates(start, end);
    }

    public List<WorkoutSession> getUserSessionsBetweenDates(User user, LocalDateTime start, LocalDateTime end) {
        return workoutSessionRepository.findUserSessionsBetweenDates(user, start, end);
    }

    public Long getTotalSessionsByMachine(Machine machine) {
        return workoutSessionRepository.countSessionsByMachine(machine);
    }

    public Double getAverageCaloriesByMachine(Machine machine) {
        return workoutSessionRepository.findAverageCaloriesByMachine(machine);
    }

    public List<WorkoutSession> getAllSessions() {
        return workoutSessionRepository.findAll();
    }

    public List<WorkoutSession> getSessionsWithQualityIssues() {
        return workoutSessionRepository.findAll().stream()
                .filter(session -> !session.getDataQualityFlag())
                .toList();
    }

    public WorkoutSession updateSession(Long id, WorkoutSession sessionDetails) {
        WorkoutSession session = workoutSessionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Workout session not found"));

        // Update fields
        session.setMachine(sessionDetails.getMachine());
        session.setStartTime(sessionDetails.getStartTime());
        session.setEndTime(sessionDetails.getEndTime());
        session.setCaloriesBurned(sessionDetails.getCaloriesBurned());
        session.setAvgHeartRate(sessionDetails.getAvgHeartRate());
        session.setDistance(sessionDetails.getDistance());
        session.setAvgSpeed(sessionDetails.getAvgSpeed());
        session.setResistanceLevel(sessionDetails.getResistanceLevel());
        session.setInclineLevel(sessionDetails.getInclineLevel());
        session.setNotes(sessionDetails.getNotes());

        // Re-validate data quality
        dataQualityService.validateWorkoutData(session);

        return workoutSessionRepository.save(session);
    }

    public void deleteSession(Long id) {
        workoutSessionRepository.deleteById(id);
    }

    public List<WorkoutSession> getRecentSessions(int limit) {
        return workoutSessionRepository.findAll().stream()
                .sorted((s1, s2) -> s2.getStartTime().compareTo(s1.getStartTime()))
                .limit(limit)
                .toList();
    }
}