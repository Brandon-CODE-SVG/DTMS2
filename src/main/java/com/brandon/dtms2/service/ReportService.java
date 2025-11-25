package com.brandon.dtms2.service;

import com.brandon.dtms2.entity.Machine;
import com.brandon.dtms2.entity.User;
import com.brandon.dtms2.entity.WorkoutSession;
import com.brandon.dtms2.repository.MachineRepository;
import com.brandon.dtms2.repository.UserRepository;
import com.brandon.dtms2.repository.WorkoutSessionRepository;
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

    @Autowired
    private WorkoutSessionRepository workoutSessionRepository;

    @Autowired
    private MachineRepository machineRepository;

    @Autowired
    private UserRepository userRepository;

    public String generateUsageReportCSV(LocalDateTime startDate, LocalDateTime endDate) {
        List<WorkoutSession> sessions = workoutSessionRepository.findSessionsBetweenDates(startDate, endDate);

        StringWriter writer = new StringWriter();
        writer.write("Machine Usage Report\n");
        writer.write("Period: " + startDate.format(DateTimeFormatter.ISO_DATE) + " to " + endDate.format(DateTimeFormatter.ISO_DATE) + "\n\n");
        writer.write("Machine Name,Type,Total Sessions,Total Calories,Avg Heart Rate,Avg Duration (min)\n");

        Map<String, List<WorkoutSession>> sessionsByMachine = sessions.stream()
                .collect(Collectors.groupingBy(session -> session.getMachine().getName()));

        for (Map.Entry<String, List<WorkoutSession>> entry : sessionsByMachine.entrySet()) {
            String machineName = entry.getKey();
            List<WorkoutSession> machineSessions = entry.getValue();

            int totalSessions = machineSessions.size();
            int totalCalories = machineSessions.stream().mapToInt(WorkoutSession::getCaloriesBurned).sum();
            double avgHeartRate = machineSessions.stream().mapToInt(WorkoutSession::getAvgHeartRate).average().orElse(0);
            double avgDuration = machineSessions.stream().mapToLong(s -> s.getDuration().toMinutes()).average().orElse(0);

            writer.write(String.format("%s,%s,%d,%d,%.1f,%.1f\n",
                    machineName,
                    machineSessions.get(0).getMachine().getType(),
                    totalSessions,
                    totalCalories,
                    avgHeartRate,
                    avgDuration
            ));
        }

        return writer.toString();
    }

    public String generateMemberProgressCSV(Long userId, LocalDateTime startDate, LocalDateTime endDate) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<WorkoutSession> sessions = workoutSessionRepository.findUserSessionsBetweenDates(user, startDate, endDate);

        StringWriter writer = new StringWriter();
        writer.write("Member Progress Report\n");
        writer.write("Member: " + user.getFirstName() + " " + user.getLastName() + "\n");
        writer.write("Period: " + startDate.format(DateTimeFormatter.ISO_DATE) + " to " + endDate.format(DateTimeFormatter.ISO_DATE) + "\n\n");
        writer.write("Date,Machine,Duration (min),Calories,Heart Rate,Distance (km),Avg Speed (km/h)\n");

        for (WorkoutSession session : sessions) {
            writer.write(String.format("%s,%s,%d,%d,%d,%.1f,%.1f\n",
                    session.getStartTime().format(DateTimeFormatter.ISO_DATE),
                    session.getMachine().getName(),
                    session.getDuration().toMinutes(),
                    session.getCaloriesBurned(),
                    session.getAvgHeartRate(),
                    session.getDistance() != null ? session.getDistance() : 0,
                    session.getAvgSpeed() != null ? session.getAvgSpeed() : 0
            ));
        }

        // Add summary
        writer.write("\nSummary:\n");
        writer.write("Total Workouts: " + sessions.size() + "\n");
        writer.write("Total Calories: " + sessions.stream().mapToInt(WorkoutSession::getCaloriesBurned).sum() + "\n");
        writer.write("Total Distance: " + sessions.stream().mapToDouble(s -> s.getDistance() != null ? s.getDistance() : 0).sum() + " km\n");
        writer.write("Avg Session Duration: " + sessions.stream().mapToLong(s -> s.getDuration().toMinutes()).average().orElse(0) + " min\n");

        return writer.toString();
    }

    public String generateDataQualityReportCSV() {
        List<WorkoutSession> allSessions = workoutSessionRepository.findAll();
        List<WorkoutSession> qualityIssues = allSessions.stream()
                .filter(session -> !session.getDataQualityFlag())
                .toList();

        StringWriter writer = new StringWriter();
        writer.write("Data Quality Report\n");
        writer.write("Generated: " + LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME) + "\n\n");
        writer.write("Total Sessions: " + allSessions.size() + "\n");
        writer.write("Sessions with Quality Issues: " + qualityIssues.size() + "\n");
        writer.write("Data Quality Score: " + String.format("%.1f%%", (double) (allSessions.size() - qualityIssues.size()) / allSessions.size() * 100) + "\n\n");

        writer.write("Quality Issues Details:\n");
        writer.write("Member,Date,Machine,Issue Description\n");

        for (WorkoutSession session : qualityIssues) {
            writer.write(String.format("%s %s,%s,%s,%s\n",
                    session.getUser().getFirstName(),
                    session.getUser().getLastName(),
                    session.getStartTime().format(DateTimeFormatter.ISO_DATE),
                    session.getMachine().getName(),
                    session.getQualityIssues() != null ? session.getQualityIssues() : "Data validation failed"
            ));
        }

        return writer.toString();
    }

    public Map<String, Object> generateSystemReport() {
        Map<String, Object> report = new HashMap<>();

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
                                "status", machine.getStatus(),
                                "lastMaintenance", machine.getLastMaintenance()
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
                .filter(WorkoutSession::getDataQualityFlag)
                .count();
        report.put("dataQualityScore", totalSessions > 0 ? (double) qualitySessions / totalSessions * 100 : 100);

        return report;
    }
}