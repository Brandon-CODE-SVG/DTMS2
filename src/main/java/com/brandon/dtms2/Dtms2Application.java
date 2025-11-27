package com.brandon.dtms2;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.core.env.MutablePropertySources;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.session.data.redis.config.annotation.web.http.EnableRedisHttpSession;

@SpringBootApplication
public class Dtms2Application {

    public static void main(String[] args) {
        // Force database configuration programmatically
        new SpringApplicationBuilder(Dtms2Application.class)
                .environment(new StandardEnvironment() {
                    @Override
                    protected void customizePropertySources(MutablePropertySources propertySources) {
                        super.customizePropertySources(propertySources);
                        // Add hardcoded properties
                        System.setProperty("spring.datasource.url",
                                "jdbc:postgresql://dpg-d4jjll4hg0os73brtjk0-a.oregon-postgres.render.com/fitnessdb_5iw2?ssl=true&sslmode=require");
                        System.setProperty("spring.datasource.username", "fitnessdb_5iw2_user");
                        System.setProperty("spring.datasource.password", "ZpTdhI43Z8nmn39RyWFPOXEnuGoRrBGR");
                        System.setProperty("spring.jpa.hibernate.ddl-auto", "update");
                        System.setProperty("server.port", "8080");
                    }
                })
                .run(args);
    }
}