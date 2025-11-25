package com.brandon.dtms2.controller;

import com.brandon.dtms2.entity.Machine;
import com.brandon.dtms2.entity.User;
import com.brandon.dtms2.service.MachineService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/machines")
public class MachineController {

    @Autowired
    private MachineService machineService;

    @GetMapping
    public ResponseEntity<?> getAllMachines(HttpSession session) {
        try {
            User user = (User) session.getAttribute("user");
            if (user == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Not authenticated"));
            }

            List<Machine> machines = machineService.getAllMachines();
            return ResponseEntity.ok(Map.of("success", true, "machines", machines));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to fetch machines: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getMachine(@PathVariable Long id, HttpSession session) {
        try {
            User user = (User) session.getAttribute("user");
            if (user == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Not authenticated"));
            }

            return machineService.getMachineById(id)
                    .map(machine -> ResponseEntity.ok(Map.of("success", true, "machine", machine)))
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to fetch machine"));
        }
    }

    @PostMapping
    public ResponseEntity<?> createMachine(@RequestBody Machine machine, HttpSession session) {
        try {
            User user = (User) session.getAttribute("user");
            if (user == null || user.getRole() != User.UserRole.ADMIN) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Unauthorized"));
            }

            Machine savedMachine = machineService.createMachine(machine);
            return ResponseEntity.ok(Map.of("success", true, "machine", savedMachine));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateMachine(@PathVariable Long id, @RequestBody Machine machineDetails, HttpSession session) {
        try {
            User user = (User) session.getAttribute("user");
            if (user == null || user.getRole() != User.UserRole.ADMIN) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Unauthorized"));
            }

            Machine updatedMachine = machineService.updateMachine(id, machineDetails);
            return ResponseEntity.ok(Map.of("success", true, "machine", updatedMachine));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMachine(@PathVariable Long id, HttpSession session) {
        try {
            User user = (User) session.getAttribute("user");
            if (user == null || user.getRole() != User.UserRole.ADMIN) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Unauthorized"));
            }

            machineService.deleteMachine(id);
            return ResponseEntity.ok(Map.of("success", true, "message", "Machine deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateMachineStatus(@PathVariable Long id, @RequestBody Map<String, String> statusUpdate, HttpSession session) {
        try {
            User user = (User) session.getAttribute("user");
            if (user == null || user.getRole() != User.UserRole.ADMIN) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Unauthorized"));
            }

            String status = statusUpdate.get("status");
            Machine updatedMachine = machineService.updateMachineStatus(id, status);
            return ResponseEntity.ok(Map.of("success", true, "machine", updatedMachine));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/{id}/usage")
    public ResponseEntity<?> getMachineUsage(@PathVariable Long id, HttpSession session) {
        try {
            User user = (User) session.getAttribute("user");
            if (user == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Not authenticated"));
            }

            Long usageCount = machineService.getMachineUsageCount(id);
            return ResponseEntity.ok(Map.of("success", true, "usageCount", usageCount));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}