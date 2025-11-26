package com.brandon.dtms2.service;

import com.brandon.dtms2.entity.Machine;
import com.brandon.dtms2.repository.MachineRepository;
import com.brandon.dtms2.repository.WorkoutSessionRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class MachineService {

    private final MachineRepository machineRepository;
    private final WorkoutSessionRepository workoutSessionRepository;

    public MachineService(MachineRepository machineRepository, WorkoutSessionRepository workoutSessionRepository) {
        this.machineRepository = machineRepository;
        this.workoutSessionRepository = workoutSessionRepository;
    }

    public List<Machine> getAllMachines() {
        return machineRepository.findAllOrderedByName();
    }

    public Optional<Machine> getMachineById(Long id) {
        return machineRepository.findById(id);
    }

    public Optional<Machine> getMachineByName(String name) {
        return machineRepository.findByName(name);
    }

    public Machine createMachine(Machine machine) {
        if (machineRepository.findByName(machine.getName()).isPresent()) {
            throw new RuntimeException("Machine with name " + machine.getName() + " already exists");
        }

        // Set default values if not provided
        if (machine.getPerformanceScore() == null) {
            machine.setPerformanceScore(100);
        }
        if (machine.getHealthStatus() == null) {
            machine.setHealthStatus(Machine.HealthStatus.valueOf("EXCELLENT"));
        }
        if (machine.getMaintenanceFrequency() == null) {
            machine.setMaintenanceFrequency(30);
        }
        if (machine.getMaxUsageHours() == null) {
            machine.setMaxUsageHours(8);
        }
        if (machine.getDailyUsageLimit() == null) {
            machine.setDailyUsageLimit(12);
        }

        // Set timestamps
        machine.setCreatedAt(LocalDateTime.now());
        machine.setNextMaintenance(LocalDateTime.now().plusDays(machine.getMaintenanceFrequency()));

        return machineRepository.save(machine);
    }

    public Machine updateMachine(Long id, Machine machineDetails) {
        Machine machine = machineRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Machine not found"));

        if (!machine.getName().equals(machineDetails.getName()) &&
                machineRepository.findByName(machineDetails.getName()).isPresent()) {
            throw new RuntimeException("Machine name already exists");
        }

        machine.setName(machineDetails.getName());
        machine.setType(machineDetails.getType());
        machine.setStatus(machineDetails.getStatus());
        machine.setLocation(machineDetails.getLocation());
        machine.setModel(machineDetails.getModel());
        machine.setManufacturer(machineDetails.getManufacturer());
        machine.setSerialNumber(machineDetails.getSerialNumber());
        machine.setPerformanceScore(machineDetails.getPerformanceScore());
        machine.setHealthStatus(machineDetails.getHealthStatus());
        machine.setMaintenanceFrequency(machineDetails.getMaintenanceFrequency());
        machine.setMaxUsageHours(machineDetails.getMaxUsageHours());
        machine.setDailyUsageLimit(machineDetails.getDailyUsageLimit());

        return machineRepository.save(machine);
    }

    public void deleteMachine(Long id) {
        Machine machine = machineRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Machine not found"));

        // Check if machine has associated workout sessions
        if (!machine.getWorkoutSessions().isEmpty()) {
            throw new RuntimeException("Cannot delete machine with associated workout sessions");
        }

        machineRepository.delete(machine);
    }

    public List<Machine> getMachinesByStatus(String status) {
        return machineRepository.findByStatus(status);
    }

    public Machine updateMachineStatus(Long id, String status) {
        Machine machine = machineRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Machine not found"));

        machine.setStatus(status);
        if ("MAINTENANCE".equals(status)) {
            machine.setLastMaintenance(LocalDateTime.now());
            machine.setNextMaintenance(LocalDateTime.now().plusDays(machine.getMaintenanceFrequency()));
            machine.calculateHealthStatus(); // Recalculate health after maintenance
        }

        return machineRepository.save(machine);
    }

    public void performMaintenance(Long machineId) {
        Machine machine = machineRepository.findById(machineId)
                .orElseThrow(() -> new RuntimeException("Machine not found"));

        machine.setLastMaintenance(LocalDateTime.now());
        machine.setNextMaintenance(LocalDateTime.now().plusDays(machine.getMaintenanceFrequency()));
        machine.setStatus("ACTIVE");
        machine.calculateHealthStatus();

        machineRepository.save(machine);
    }

    public Long getMachineUsageCount(Long machineId) {
        Machine machine = machineRepository.findById(machineId)
                .orElseThrow(() -> new RuntimeException("Machine not found"));
        return (long) machine.getWorkoutSessions().size();
    }

    public Map<String, Object> getMachinePerformance(Long machineId) {
        Machine machine = machineRepository.findById(machineId)
                .orElseThrow(() -> new RuntimeException("Machine not found"));

        Long totalSessions = workoutSessionRepository.countSessionsByMachine(machine);
        Double avgCalories = workoutSessionRepository.findAverageCaloriesByMachine(machine);

        // Calculate usage hours (assuming 30 minutes per session)
        double totalUsageHours = totalSessions * 0.5;

        Map<String, Object> performance = new HashMap<>();
        performance.put("totalSessions", totalSessions);
        performance.put("totalUsageHours", Math.round(totalUsageHours * 10.0) / 10.0);
        performance.put("avgCalories", avgCalories != null ? Math.round(avgCalories) : 0);
        performance.put("performanceScore", machine.getPerformanceScore());
        performance.put("healthStatus", machine.getHealthStatus());
        performance.put("daysUntilMaintenance", java.time.Duration.between(LocalDateTime.now(), machine.getNextMaintenance()).toDays());

        return performance;
    }
}