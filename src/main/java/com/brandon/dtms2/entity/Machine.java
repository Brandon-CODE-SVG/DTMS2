package com.brandon.dtms2.entity;

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
    private LocalDateTime lastMaintenance;
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "machine", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<WorkoutSession> workoutSessions = new ArrayList<>();

    public Machine() {
        this.createdAt = LocalDateTime.now();
    }

}