    package com.brandon.dtms2.config;

    import com.brandon.dtms2.service.CustomUserDetailsService;
    import org.springframework.context.annotation.Bean;
    import org.springframework.context.annotation.Configuration;
    import org.springframework.security.authentication.AuthenticationManager;
    import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
    import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
    import org.springframework.security.config.annotation.web.builders.HttpSecurity;
    import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
    import org.springframework.security.crypto.password.PasswordEncoder;
    import org.springframework.security.web.SecurityFilterChain;

    @Configuration
    @EnableWebSecurity
    public class SecurityConfig {

        private final CustomUserDetailsService userDetailsService;
        private final PasswordEncoder passwordEncoder; // Inject the existing PasswordEncoder

        public SecurityConfig(CustomUserDetailsService userDetailsService, PasswordEncoder passwordEncoder) {
            this.userDetailsService = userDetailsService;
            this.passwordEncoder = passwordEncoder;
        }

        @Bean
        public DaoAuthenticationProvider authenticationProvider() {
            DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
            authProvider.setUserDetailsService(userDetailsService);
            authProvider.setPasswordEncoder(passwordEncoder); // Use the injected PasswordEncoder
            authProvider.setHideUserNotFoundExceptions(false); // Important: show user not found errors
            return authProvider;
        }

        @Bean
        public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
            return authenticationConfiguration.getAuthenticationManager();
        }

        @Bean
        public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
            http
                    .csrf(csrf -> csrf.disable())
                    .authorizeHttpRequests(authz -> authz
                            // Allow ALL template endpoints and static resources
                            .requestMatchers(
                                    "/",
                                    "/login",
                                    "/register",
                                    "/access-denied",
                                    "/css/**",
                                    "/js/**",           // This covers all JS files in /js/ directory
                                    "/images/**",
                                    "/favicon.ico",
                                    "/api/auth/**",
                                    "/error",
                                    "/auth.js",         // Your root-level JS files
                                    "/member-dashboard.js",
                                    "/instructor-dashboard.js",
                                    "/admin-dashboard.js",
                                    "/style.css",
                                    "/logout"
                            ).permitAll()

                            // Secure dashboard endpoints (use controller endpoints, not .html)
                            .requestMatchers("/admin-dashboard").hasRole("ADMIN")
                            .requestMatchers("/instructor-dashboard").hasAnyRole("INSTRUCTOR", "ADMIN")
                            .requestMatchers("/member-dashboard").hasAnyRole("MEMBER", "INSTRUCTOR", "ADMIN")

                            // API access (keep your existing rules)
                            .requestMatchers("/api/admin/**").hasRole("ADMIN")
                            .requestMatchers("/api/instructor/**").hasAnyRole("INSTRUCTOR", "ADMIN")
                            .requestMatchers("/api/workouts/**", "/api/machines", "/api/reports/member-progress/**").hasAnyRole("MEMBER", "INSTRUCTOR", "ADMIN")
                            .requestMatchers("/api/reports/**").hasAnyRole("INSTRUCTOR", "ADMIN")

                            // Secure all other endpoints
                            .anyRequest().authenticated()
                    )
                    .logout(logout -> logout
                            .logoutUrl("/api/auth/logout")
                            .logoutSuccessUrl("/login?logout=true")
                            .invalidateHttpSession(true)
                            .deleteCookies("JSESSIONID")
                            .permitAll()
                    )
                    .exceptionHandling(exception -> exception
                            .accessDeniedPage("/access-denied")
                    )
            .securityContext(securityContext -> securityContext
                    .requireExplicitSave(false)
            );

            http.authenticationProvider(authenticationProvider());
            return http.build();
        }
    }