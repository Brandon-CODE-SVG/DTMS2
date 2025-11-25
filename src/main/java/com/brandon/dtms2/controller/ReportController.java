package com.brandon.dtms2.controller;

import com.brandon.dtms2.entity.User;
import com.brandon.dtms2.service.ReportService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    @Autowired
    private ReportService reportService;

    @GetMapping("/usage/csv")
    public ResponseEntity<?> downloadUsageReportCSV(
            @RequestParam String startDate,
            @RequestParam String endDate,
            HttpSession session) {
        try {
            User user = (User) session.getAttribute("user");
            if (user == null || (user.getRole() != User.UserRole.ADMIN && user.getRole() != User.UserRole.INSTRUCTOR)) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Unauthorized"));
            }

            LocalDateTime start = LocalDateTime.parse(startDate + "T00:00:00");
            LocalDateTime end = LocalDateTime.parse(endDate + "T23:59:59");

            String csvContent = reportService.generateUsageReportCSV(start, end);

            HttpHeaders headers = new HttpHeaders();
            headers.add("Content-Type", "text/csv; charset=utf-8");
            headers.add("Content-Disposition", "attachment; filename=usage_report.csv");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(csvContent);

        } catch (Exception e) {
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
            User user = (User) session.getAttribute("user");
            if (user == null || (user.getRole() != User.UserRole.ADMIN && user.getRole() != User.UserRole.INSTRUCTOR)) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Unauthorized"));
            }

            LocalDateTime start = LocalDateTime.parse(startDate + "T00:00:00");
            LocalDateTime end = LocalDateTime.parse(endDate + "T23:59:59");

            String csvContent = reportService.generateMemberProgressCSV(userId, start, end);

            HttpHeaders headers = new HttpHeaders();
            headers.add("Content-Type", "text/csv; charset=utf-8");
            headers.add("Content-Disposition", "attachment; filename=member_progress_" + userId + ".csv");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(csvContent);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to generate report: " + e.getMessage()));
        }
    }

    @GetMapping("/data-quality/csv")
    public ResponseEntity<?> downloadDataQualityReportCSV(HttpSession session) {
        try {
            User user = (User) session.getAttribute("user");
            if (user == null || (user.getRole() != User.UserRole.ADMIN && user.getRole() != User.UserRole.INSTRUCTOR)) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Unauthorized"));
            }

            String csvContent = reportService.generateDataQualityReportCSV();

            HttpHeaders headers = new HttpHeaders();
            headers.add("Content-Type", "text/csv; charset=utf-8");
            headers.add("Content-Disposition", "attachment; filename=data_quality_report.csv");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(csvContent);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to generate report: " + e.getMessage()));
        }
    }

    @GetMapping("/system")
    public ResponseEntity<?> getSystemReport(HttpSession session) {
        try {
            User user = (User) session.getAttribute("user");
            if (user == null || user.getRole() != User.UserRole.ADMIN) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Unauthorized"));
            }

            Map<String, Object> report = reportService.generateSystemReport();
            return ResponseEntity.ok(Map.of("success", true, "report", report));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Failed to generate system report: " + e.getMessage()));
        }
    }
}