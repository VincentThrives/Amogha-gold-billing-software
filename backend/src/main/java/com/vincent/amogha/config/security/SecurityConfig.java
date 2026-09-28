package com.vincent.amogha.config.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public org.springframework.security.crypto.password.PasswordEncoder passwordEncoder() {
        return new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(c -> c.configurationSource(corsConfigurationSource()))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // public auth: password login (OTP endpoints kept permitted in case re-enabled).
                // NOTE: /api/auth/change-password is intentionally NOT here — it requires a token.
                .requestMatchers("/api/auth/login", "/api/auth/request-otp", "/api/auth/verify-otp",
                        "/api/ping", "/api/health", "/actuator/health").permitAll()
                // admin-only writes
                .requestMatchers(HttpMethod.PUT, "/api/rates", "/api/company", "/api/billing-config").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/users", "/api/users/*/reset-password", "/api/users/*/phone").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/users/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/funds/*/decide").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/admin-funds", "/api/expenses", "/api/expense-categories").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/expense-categories/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/transactions/*/approve", "/api/transactions/*/reject",
                        "/api/transactions/*/delete", "/api/transactions/*/restore").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/transactions/**").hasRole("ADMIN")
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/features").hasRole("SUPERADMIN")
                // everything else under /api needs a valid token
                .requestMatchers("/api/**").authenticated()
                // static frontend (Angular) is public
                .anyRequest().permitAll()
            )
            .exceptionHandling(e -> e
                .authenticationEntryPoint((req, res, ex) -> writeError(res, 401, "Not authenticated"))
                .accessDeniedHandler((req, res, ex) -> writeError(res, 403, "Admin only")))
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    private static void writeError(jakarta.servlet.http.HttpServletResponse res, int status, String msg) throws java.io.IOException {
        res.setStatus(status);
        res.setContentType("application/json");
        res.getWriter().write("{\"error\":\"" + msg + "\"}");
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
