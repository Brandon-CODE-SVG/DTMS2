package com.brandon.dtms2.entity;

import com.brandon.dtms2.entity.WorkoutSession;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "machines")
@Data
public class Machine {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String name;

    private String type; // Treadmill, Bike, Elliptical, etc.
    private String status = "ACTIVE"; // ACTIVE, MAINTENANCE, INACTIVE
    private String location;
    private String model;
    private String manufacturer;
    private String serialNumber;

    // New performance fields
    private Integer performanceScore = 100;

    @Enumerated(EnumType.STRING)
    private HealthStatus healthStatus = HealthStatus.EXCELLENT;

    private Integer maintenanceFrequency = 30; // days
    private Integer maxUsageHours = 8;
    private Integer dailyUsageLimit = 12;
    private Double purchaseCost;
    private LocalDateTime purchaseDate;

    private LocalDateTime lastMaintenance;
    private LocalDateTime nextMaintenance;
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "machine", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<WorkoutSession> workoutSessions = new ArrayList<>();

    public enum HealthStatus {
        EXCELLENT, GOOD, FAIR, POOR
    }

    public Machine() {
        this.createdAt = LocalDateTime.now();
        this.nextMaintenance = LocalDateTime.now().plusDays(this.maintenanceFrequency);
    }

    // Add this method to calculate health status
    public void calculateHealthStatus() {
        if (lastMaintenance == null) {
            this.healthStatus = HealthStatus.POOR;
            return;
        }

        long daysSinceMaintenance = java.time.Duration.between(lastMaintenance, LocalDateTime.now()).toDays();

        if (daysSinceMaintenance <= 7) {
            this.healthStatus = HealthStatus.EXCELLENT;
        } else if (daysSinceMaintenance <= 30) {
            this.healthStatus = HealthStatus.GOOD;
        } else if (daysSinceMaintenance <= 60) {
            this.healthStatus = HealthStatus.FAIR;
        } else {
            this.healthStatus = HealthStatus.POOR;
        }
    }
}