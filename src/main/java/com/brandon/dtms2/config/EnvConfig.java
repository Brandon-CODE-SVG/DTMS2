package com.brandon.dtms2.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

@Configuration
public class EnvConfig {

    private static final Logger logger = LoggerFactory.getLogger(EnvConfig.class);

    @Bean
    CommandLineRunner logDatabaseConfig(Environment env) {
        return args -> {
            logger.info("=== DATABASE CONFIGURATION ===");
            logger.info("JDBC_DATABASE_URL: {}", env.getProperty("JDBC_DATABASE_URL"));
            logger.info("JDBC_DATABASE_USERNAME: {}", env.getProperty("JDBC_DATABASE_USERNAME"));
            logger.info("Active profiles: {}", String.join(", ", env.getActiveProfiles()));
            logger.info("Datasource URL: {}", env.getProperty("spring.datasource.url"));
            logger.info("==============================");
        };
    }
}