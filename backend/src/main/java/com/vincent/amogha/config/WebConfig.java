package com.vincent.amogha.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Serves the built Angular app. In production the dist is baked into the jar
 * (classpath:/static/); for local runs it is served from the filesystem path
 * configured by app.web.static-dir. The Angular app uses hash routing, so no
 * server-side deep-link fallback is required — only "/" maps to index.html.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final String staticDir;

    public WebConfig(@Value("${app.web.static-dir}") String staticDir) {
        this.staticDir = staticDir;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Always serve the classpath static dir (where the jar bundles the app in production);
        // additionally serve a filesystem dir for local dev (ng build output).
        if (staticDir != null && !staticDir.isBlank() && !staticDir.startsWith("classpath:")) {
            Path dir = Paths.get(staticDir).toAbsolutePath().normalize();
            registry.addResourceHandler("/**").addResourceLocations("classpath:/static/", dir.toUri().toString());
        } else {
            registry.addResourceHandler("/**").addResourceLocations("classpath:/static/");
        }
    }

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/").setViewName("forward:/index.html");
    }
}
