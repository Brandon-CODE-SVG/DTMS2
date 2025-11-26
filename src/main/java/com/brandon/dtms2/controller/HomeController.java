package com.brandon.dtms2.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    @GetMapping("/")
    public String index() {
        return "redirect:/login";
    }

    @GetMapping("/login")
    public String login() {
        System.out.println("HomeController: Serving login page");
        return "login"; // This looks for templates/login.html
    }

    @GetMapping("/register")
    public String register() {
        System.out.println("HomeController: Serving register page");
        return "register";
    }

    @GetMapping("/member-dashboard")
    public String memberDashboard() {
        System.out.println("HomeController: Serving member dashboard template");
        return "member-dashboard"; // This resolves to templates/member-dashboard.html
    }

    @GetMapping("/instructor-dashboard")
    public String instructorDashboard() {
        System.out.println("HomeController: Serving instructor dashboard template");
        return "instructor-dashboard";
    }

    @GetMapping("/admin-dashboard")
    public String adminDashboard() {
        System.out.println("HomeController: Serving admin dashboard template");
        return "admin-dashboard";
    }

    @GetMapping("/access-denied")
    public String accessDenied() {
        return "access-denied";
    }

    // Add this test endpoint
    @GetMapping("/test-template")
    public String testTemplate() {
        System.out.println("TEST: Trying to serve login template");
        return "login";
    }
}