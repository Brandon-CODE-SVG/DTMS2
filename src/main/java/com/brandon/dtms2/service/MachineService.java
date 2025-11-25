package com.brandon.dtms2.service;

import com.brandon.dtms2.entity.Machine;
import com.brandon.dtms2.repository.MachineRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class MachineService {

    @Autowired
    private MachineRepository machineRepository;

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
        return machineRepository.save(machine);
    }

    public Machine updateMachine(Long id, Machine machineDetails) {
        Machine machine = machineRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Machine not found"));

        // Check if name is being changed and if it conflicts
        if (!machine.getName().equals(machineDetails.getName()) &&
                machineRepository.findByName(machineDetails.getName()).isPresent()) {
            throw new RuntimeException("Machine name already exists");
        }

        machine.setName(machineDetails.getName());
        machine.setType(machineDetails.getType());
        machine.setStatus(machineDetails.getStatus());
        machine.setLocation(machineDetails.getLocation());
        machine.setLastMaintenance(machineDetails.getLastMaintenance());

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
            machine.setLastMaintenance(java.time.LocalDateTime.now());
        }

        return machineRepository.save(machine);
    }

    public Long getMachineUsageCount(Long machineId) {
        Machine machine = machineRepository.findById(machineId)
                .orElseThrow(() -> new RuntimeException("Machine not found"));
        return (long) machine.getWorkoutSessions().size();
    }
}
