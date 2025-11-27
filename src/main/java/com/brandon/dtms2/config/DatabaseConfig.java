package com.brandon.dtms2.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;

@Configuration
public class DatabaseConfig {

    @Bean
    @Profile("!test")
    public DataSource dataSource() {
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl("jdbc:postgresql://dpg-d4jjll4hg0os73brtjk0-a.oregon-postgres.render.com/fitnessdb_5iw2?ssl=true&sslmode=require");
        dataSource.setUsername("fitnessdb_5iw2_user");
        dataSource.setPassword("ZpTdhI43Z8nmn39RyWFPOXEnuGoRrBGR");
        dataSource.setDriverClassName("org.postgresql.Driver");

        // HikariCP settings
        dataSource.setMaximumPoolSize(10);
        dataSource.setMinimumIdle(2);
        dataSource.setIdleTimeout(300000);

        System.out.println("=== DATASOURCE CONFIGURED PROGRAMMATICALLY ===");
        System.out.println("URL: " + dataSource.getJdbcUrl());
        System.out.println("Username: " + dataSource.getUsername());
        System.out.println("=============================================");

        return dataSource;
    }
}