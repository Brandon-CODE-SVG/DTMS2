package com.brandon.dtms2.repository;

import com.brandon.dtms2.entity.WorkoutSession;
import com.brandon.dtms2.entity.User;
import com.brandon.dtms2.entity.Machine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface WorkoutSessionRepository extends JpaRepository<WorkoutSession, Long> {

    List<WorkoutSession> findByUserOrderByStartTimeDesc(User user);

    List<WorkoutSession> findByMachineOrderByStartTimeDesc(Machine machine);

    @Query("SELECT ws FROM WorkoutSession ws WHERE ws.startTime BETWEEN :startDate AND :endDate ORDER BY ws.startTime DESC")
    List<WorkoutSession> findSessionsBetweenDates(@Param("startDate") LocalDateTime startDate,
                                                  @Param("endDate") LocalDateTime endDate);

    @Query("SELECT ws FROM WorkoutSession ws WHERE ws.user = :user AND ws.startTime BETWEEN :startDate AND :endDate")
    List<WorkoutSession> findUserSessionsBetweenDates(@Param("user") User user,
                                                      @Param("startDate") LocalDateTime startDate,
                                                      @Param("endDate") LocalDateTime endDate);

    @Query("SELECT COUNT(ws) FROM WorkoutSession ws WHERE ws.machine = :machine")
    Long countSessionsByMachine(@Param("machine") Machine machine);

    @Query("SELECT AVG(ws.caloriesBurned) FROM WorkoutSession ws WHERE ws.machine = :machine")
    Double findAverageCaloriesByMachine(@Param("machine") Machine machine);

    @Query("SELECT COUNT(ws) FROM WorkoutSession ws WHERE ws.dataQualityFlag = false")
    Long countSessionsWithQualityIssues();

    @Query("SELECT ws FROM WorkoutSession ws WHERE ws.machine.id = :machineId")
    List<WorkoutSession> findByMachineId(@Param("machineId") Long machineId);

    @Query("SELECT ws FROM WorkoutSession ws WHERE ws.user.id = :userId ORDER BY ws.startTime DESC")
    List<WorkoutSession> findByUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(ws) FROM WorkoutSession ws WHERE ws.user = :user")
    Long countSessionsByUser(@Param("user") User user);

    // ADD THESE NEW METHODS:
    @Query("SELECT ws FROM WorkoutSession ws WHERE ws.dataQualityFlag = false ORDER BY ws.startTime DESC")
    List<WorkoutSession> findByDataQualityFlagFalse();

    @Query(value = "SELECT * FROM workout_sessions ws ORDER BY ws.start_time DESC LIMIT :limit", nativeQuery = true)
    List<WorkoutSession> findTopByOrderByStartTimeDesc(@Param("limit") int limit);

    @Query(value = "SELECT * FROM workout_sessions ws WHERE ws.user_id = :userId ORDER BY ws.start_time DESC LIMIT :limit", nativeQuery = true)
    List<WorkoutSession> findTopByUserOrderByStartTimeDesc(@Param("userId") Long userId, @Param("limit") int limit);

    @Query("SELECT COUNT(ws) FROM WorkoutSession ws WHERE ws.machine.id = :machineId")
    Long countSessionsByMachineId(@Param("machineId") Long machineId);

//    @Query("SELECT ws FROM WorkoutSession ws JOIN FETCH ws.machine WHERE ws.member.id = :memberId ORDER BY ws.startTime DESC")
//    List<WorkoutSession> findByMemberIdWithMachine(@Param("memberId") Long memberId);

    @Query("SELECT ws FROM WorkoutSession ws JOIN FETCH ws.machine WHERE ws.user.id = :userId ORDER BY ws.startTime DESC")
    List<WorkoutSession> findByUserIdWithMachine(@Param("userId") Long userId);

}