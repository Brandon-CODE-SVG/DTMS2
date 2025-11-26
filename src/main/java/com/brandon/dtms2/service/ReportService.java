package com.brandon.dtms2.service;

import com.brandon.dtms2.entity.Machine;
import com.brandon.dtms2.entity.User;
import com.brandon.dtms2.entity.WorkoutSession;
import com.brandon.dtms2.repository.WorkoutSessionRepository;
import com.brandon.dtms2.repository.MachineRepository;
import com.brandon.dtms2.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.StringWriter;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ReportService {

    private final WorkoutSessionRepository workoutSessionRepository;

    private final MachineRepository machineRepository;

    private final UserRepository userRepository;

    public ReportService(WorkoutSessionRepository workoutSessionRepository, MachineRepository machineRepository,
                         UserRepository userRepository) {
        this.workoutSessionRepository = workoutSessionRepository;
        this.machineRepository = machineRepository;
        this.userRepository = userRepository;
    }

    public String generateUsageReportCSV(LocalDateTime startDate, LocalDateTime endDate) {
        try {
            List<WorkoutSession> sessions = workoutSessionRepository.findSessionsBetweenDates(startDate, endDate);

            StringWriter writer = new StringWriter();
            writer.write("Machine Usage Report\n");
            writer.write("Period: " + startDate.format(DateTimeFormatter.ISO_DATE) + " to " + endDate.format(DateTimeFormatter.ISO_DATE) + "\n");
            writer.write("Generated: " + LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME) + "\n\n");

            writer.write("Machine Name,Type,Total Sessions,Total Calories,Avg Heart Rate,Avg Duration (min),Data Quality Score\n");

            // Group by machine
            var sessionsByMachine = sessions.stream()
                    .collect(Collectors.groupingBy(session ->
                            session.getMachine() != null ? session.getMachine().getName() : "Unknown"));

            for (var entry : sessionsByMachine.entrySet()) {
                String machineName = entry.getKey();
                List<WorkoutSession> machineSessions = entry.getValue();

                int totalSessions = machineSessions.size();
                int totalCalories = machineSessions.stream()
                        .mapToInt(s -> s.getCaloriesBurned() != null ? s.getCaloriesBurned() : 0)
                        .sum();
                double avgHeartRate = machineSessions.stream()
                        .filter(s -> s.getAvgHeartRate() != null)
                        .mapToInt(WorkoutSession::getAvgHeartRate)
                        .average()
                        .orElse(0);
                double avgDuration = machineSessions.stream()
                        .filter(s -> s.getDuration() != null)
                        .mapToLong(s -> s.getDuration().toMinutes())
                        .average()
                        .orElse(0);

                long qualitySessions = machineSessions.stream()
                        .filter(s -> s.getDataQualityFlag() != null && s.getDataQualityFlag())
                        .count();
                double qualityScore = totalSessions > 0 ? (double) qualitySessions / totalSessions * 100 : 100;

                String machineType = machineSessions.isEmpty() ? "Unknown" :
                        (machineSessions.get(0).getMachine() != null ?
                                machineSessions.get(0).getMachine().getType() : "Unknown");

                writer.write(String.format("%s,%s,%d,%d,%.1f,%.1f,%.1f%%\n",
                        machineName, machineType, totalSessions, totalCalories,
                        avgHeartRate, avgDuration, qualityScore));
            }

            // Add summary
            writer.write("\nSummary:\n");
            writer.write("Total Sessions: " + sessions.size() + "\n");
            writer.write("Total Machines: " + sessionsByMachine.size() + "\n");
            writer.write("Total Calories Burned: " + sessions.stream()
                    .mapToInt(s -> s.getCaloriesBurned() != null ? s.getCaloriesBurned() : 0)
                    .sum() + "\n");
            writer.write("Overall Data Quality Score: " +
                    String.format("%.1f%%", calculateOverallQualityScore(sessions)) + "\n");

            return writer.toString();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate usage report: " + e.getMessage(), e);
        }
    }

    public String generateMemberProgressCSV(Long userId, LocalDateTime startDate, LocalDateTime endDate) {
        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

            List<WorkoutSession> sessions = workoutSessionRepository.findUserSessionsBetweenDates(user, startDate, endDate);

            StringWriter writer = new StringWriter();
            writer.write("Member Progress Report\n");
            writer.write("Member: " + user.getFirstName() + " " + user.getLastName() + "\n");
            writer.write("Email: " + user.getEmail() + "\n");
            writer.write("Period: " + startDate.format(DateTimeFormatter.ISO_DATE) + " to " + endDate.format(DateTimeFormatter.ISO_DATE) + "\n");
            writer.write("Generated: " + LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME) + "\n\n");

            writer.write("Date,Machine,Duration (min),Calories,Heart Rate,Distance (km),Avg Speed (km/h),Quality\n");

            for (WorkoutSession session : sessions) {
                writer.write(String.format("%s,%s,%d,%d,%d,%.1f,%.1f,%s\n",
                        session.getStartTime().format(DateTimeFormatter.ISO_DATE),
                        session.getMachine() != null ? session.getMachine().getName() : "Unknown",
                        session.getDuration() != null ? session.getDuration().toMinutes() : 0,
                        session.getCaloriesBurned() != null ? session.getCaloriesBurned() : 0,
                        session.getAvgHeartRate() != null ? session.getAvgHeartRate() : 0,
                        session.getDistance() != null ? session.getDistance() : 0,
                        session.getAvgSpeed() != null ? session.getAvgSpeed() : 0,
                        session.getDataQualityFlag() != null && session.getDataQualityFlag() ? "Good" : "Issues"
                ));
            }

            // Add summary
            writer.write("\nSummary:\n");
            writer.write("Total Workouts: " + sessions.size() + "\n");
            writer.write("Total Calories: " + sessions.stream()
                    .mapToInt(s -> s.getCaloriesBurned() != null ? s.getCaloriesBurned() : 0)
                    .sum() + "\n");
            writer.write("Total Distance: " + sessions.stream()
                    .mapToDouble(s -> s.getDistance() != null ? s.getDistance() : 0)
                    .sum() + " km\n");
            writer.write("Avg Session Duration: " + sessions.stream()
                    .filter(s -> s.getDuration() != null)
                    .mapToLong(s -> s.getDuration().toMinutes())
                    .average()
                    .orElse(0) + " min\n");
            writer.write("Data Quality Score: " +
                    String.format("%.1f%%", calculateOverallQualityScore(sessions)) + "\n");

            return writer.toString();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate member progress report: " + e.getMessage(), e);
        }
    }

    public String generateDataQualityReportCSV() {
        try {
            List<WorkoutSession> allSessions = workoutSessionRepository.findAll();
            List<WorkoutSession> qualityIssues = allSessions.stream()
                    .filter(session -> session.getDataQualityFlag() == null || !session.getDataQualityFlag())
                    .collect(Collectors.toList());

            StringWriter writer = new StringWriter();
            writer.write("Data Quality Report\n");
            writer.write("Generated: " + LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME) + "\n\n");
            writer.write("Total Sessions: " + allSessions.size() + "\n");
            writer.write("Sessions with Quality Issues: " + qualityIssues.size() + "\n");
            writer.write("Data Quality Score: " +
                    String.format("%.1f%%", calculateOverallQualityScore(allSessions)) + "\n\n");

            writer.write("Quality Issues Details:\n");
            writer.write("Member,Date,Machine,Issue Description,Severity\n");

            for (WorkoutSession session : qualityIssues) {
                writer.write(String.format("%s %s,%s,%s,%s,%s\n",
                        session.getUser() != null ? session.getUser().getFirstName() : "Unknown",
                        session.getUser() != null ? session.getUser().getLastName() : "",
                        session.getStartTime().format(DateTimeFormatter.ISO_DATE),
                        session.getMachine() != null ? session.getMachine().getName() : "Unknown",
                        session.getQualityIssues() != null ? session.getQualityIssues() : "Data validation failed",
                        "Medium"
                ));
            }

            return writer.toString();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate data quality report: " + e.getMessage(), e);
        }
    }

    private double calculateOverallQualityScore(List<WorkoutSession> sessions) {
        if (sessions.isEmpty()) {
            return 100.0;
        }

        long validSessions = sessions.stream()
                .filter(session -> session.getDataQualityFlag() != null && session.getDataQualityFlag())
                .count();

        return (double) validSessions / sessions.size() * 100;
    }

    public Map<String, Object> generateSystemReport() {
        Map<String, Object> report = new HashMap<>();

        try {
            // Basic statistics
            report.put("totalUsers", userRepository.count());
            report.put("totalMachines", machineRepository.count());
            report.put("totalSessions", workoutSessionRepository.count());

            // Machine usage statistics
            List<Machine> machines = machineRepository.findAll();
            Map<String, Object> machineStats = machines.stream()
                    .collect(Collectors.toMap(
                            Machine::getName,
                            machine -> Map.of(
                                    "sessions", machine.getWorkoutSessions().size(),
                                    "status", machine.getStatus() != null ? machine.getStatus() : "Unknown",
                                    "lastMaintenance", machine.getLastMaintenance() != null ?
                                            machine.getLastMaintenance().format(DateTimeFormatter.ISO_DATE) : "Never"
                            )
                    ));
            report.put("machineStatistics", machineStats);

            // User activity
            LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
            List<WorkoutSession> recentSessions = workoutSessionRepository.findSessionsBetweenDates(weekAgo, LocalDateTime.now());
            report.put("recentActivity", recentSessions.size());

            // Data quality metrics
            long totalSessions = workoutSessionRepository.count();
            long qualitySessions = workoutSessionRepository.findAll().stream()
                    .filter(session -> session.getDataQualityFlag() != null && session.getDataQualityFlag())
                    .count();
            report.put("dataQualityScore", totalSessions > 0 ? (double) qualitySessions / totalSessions * 100 : 100);

            return report;
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate system report: " + e.getMessage(), e);
        }
    }
}