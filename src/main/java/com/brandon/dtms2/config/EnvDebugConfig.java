package com.brandon.dtms2.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

@Configuration
public class EnvDebugConfig {

    private static final Logger logger = LoggerFactory.getLogger(EnvDebugConfig.class);

    @Bean
    CommandLineRunner logEnvironmentVariables(Environment env) {
        return args -> {
            logger.info("=== ENVIRONMENT VARIABLES DEBUG ===");
            logger.info("JDBC_DATABASE_URL: {}", env.getProperty("JDBC_DATABASE_URL"));
            logger.info("JDBC_DATABASE_USERNAME: {}", env.getProperty("JDBC_DATABASE_USERNAME"));
            logger.info("JDBC_DATABASE_PASSWORD: {}", env.getProperty("JDBC_DATABASE_PASSWORD") != null ? "***SET***" : "NULL");
            logger.info("SPRING_PROFILES_ACTIVE: {}", env.getProperty("SPRING_PROFILES_ACTIVE"));
            logger.info("Active profiles: {}", String.join(", ", env.getActiveProfiles()));
            logger.info("Datasource URL: {}", env.getProperty("spring.datasource.url"));
            logger.info("=====================================");
        };
    }
}