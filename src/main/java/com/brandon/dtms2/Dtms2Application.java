package com.brandon.dtms2;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.core.env.Environment;
import org.springframework.session.data.redis.config.annotation.web.http.EnableRedisHttpSession;

@SpringBootApplication
public class Dtms2Application {

    @Autowired
    private Environment env;

    public static void main(String[] args) {
        System.out.println("=== STARTING DTMS2 APPLICATION ===");
        SpringApplication.run(Dtms2Application.class, args);
    }

    @PostConstruct
    public void debugConfiguration() {
        System.out.println("=== CONFIGURATION DEBUG ===");
        System.out.println("Datasource URL: " + env.getProperty("spring.datasource.url"));
        System.out.println("Datasource Username: " + env.getProperty("spring.datasource.username"));
        System.out.println("Active Profiles: " + String.join(", ", env.getActiveProfiles()));
        System.out.println("=================================");
    }
}