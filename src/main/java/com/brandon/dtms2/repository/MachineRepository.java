package com.brandon.dtms2.repository;

import com.brandon.dtms2.entity.Machine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface MachineRepository extends JpaRepository<Machine, Long> {

    Optional<Machine> findByName(String name);

    List<Machine> findByStatus(String status);

    @Query("SELECT m FROM Machine m ORDER BY m.name")
    List<Machine> findAllOrderedByName();

    @Query("SELECT COUNT(w) FROM WorkoutSession w WHERE w.machine.id = :machineId")
    Long countWorkoutSessionsByMachineId(@Param("machineId") Long machineId);

    @Query("SELECT m FROM Machine m WHERE m.status IN ('ACTIVE', 'MAINTENANCE') ORDER BY m.name")
    List<Machine> findActiveMachines();
}