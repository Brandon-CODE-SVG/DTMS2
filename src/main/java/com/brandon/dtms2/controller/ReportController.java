package com.brandon.dtms2.controller;

import com.brandon.dtms2.entity.User;
import com.brandon.dtms2.service.ReportService;
import com.brandon.dtms2.service.UserService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.StringWriter;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;
    private final UserService userService;

    public ReportController(ReportService reportService, UserService userService) {
        this.reportService = reportService;
        this.userService = userService;
    }

    // Helper method to check instructor/admin authorization that handles HashMap session user
    private User checkReportAuth(HttpSession httpSession) {
        Object sessionUser = httpSession.getAttribute("user");
        User user = null;

        if (sessionUser instanceof User) {
            user = (User) sessionUser;
        } else if (sessionUser instanceof Map) {
            Map<?, ?> userMap = (Map<?, ?>) sessionUser;
            Long userId = Long.valueOf(userMap.get("id").toString());
            user = userService.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
        }

        if (user == null || (user.getRole() != User.UserRole.ADMIN && user.getRole() != User.UserRole.INSTRUCTOR)) {
            throw new RuntimeException("Unauthorized");
        }
        return user;
    }

    @GetMapping("/usage/csv")
    public ResponseEntity<?> downloadUsageReportCSV(
            @RequestParam String startDate,
            @RequestParam String endDate,
            HttpSession session) {
        try {
            User user = checkReportAuth(session);

            LocalDateTime start = LocalDateTime.parse(startDate + "T00:00:00");
            LocalDateTime end = LocalDateTime.parse(endDate + "T23:59:59");

            String csvContent = reportService.generateUsageReportCSV(start, end);

            HttpHeaders headers = new HttpHeaders();
            headers.add("Content-Type", "text/csv; charset=utf-8");
            headers.add("Content-Disposition",
                    "attachment; filename=usage_report_" + startDate + "_to_" + endDate + ".csv");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(csvContent);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to generate report: " + e.getMessage()));
        }
    }

    @GetMapping("/member-progress/csv")
    public ResponseEntity<?> downloadMemberProgressCSV(
            @RequestParam Long userId,
            @RequestParam String startDate,
            @RequestParam String endDate,
            HttpSession session) {
        try {
            User user = checkReportAuth(session);

            LocalDateTime start = LocalDateTime.parse(startDate + "T00:00:00");
            LocalDateTime end = LocalDateTime.parse(endDate + "T23:59:59");

            String csvContent = reportService.generateMemberProgressCSV(userId, start, end);

            HttpHeaders headers = new HttpHeaders();
            headers.add("Content-Type", "text/csv; charset=utf-8");
            headers.add("Content-Disposition",
                    "attachment; filename=member_progress_" + userId + "_" + startDate + "_to_" + endDate + ".csv");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(csvContent);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to generate report: " + e.getMessage()));
        }
    }

    @GetMapping("/data-quality/csv")
    public ResponseEntity<?> downloadDataQualityReportCSV(HttpSession session) {
        try {
            User user = checkReportAuth(session);

            String csvContent = reportService.generateDataQualityReportCSV();

            HttpHeaders headers = new HttpHeaders();
            headers.add("Content-Type", "text/csv; charset=utf-8");
            headers.add("Content-Disposition", "attachment; filename=data_quality_report.csv");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(csvContent);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to generate report: " + e.getMessage()));
        }
    }

    // Add a simple system report endpoint for instructors
    @GetMapping("/system/overview")
    public ResponseEntity<?> getSystemOverview(HttpSession session) {
        try {
            User user = checkReportAuth(session);

            Map<String, Object> report = reportService.generateSystemReport();
            return ResponseEntity.ok(Map.of("success", true, "report", report));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to generate system report: " + e.getMessage()));
        }
    }
}