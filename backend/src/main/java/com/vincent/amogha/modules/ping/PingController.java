package com.vincent.amogha.modules.ping;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Public, no-auth dummy endpoint. Handy for uptime monitors / cron pingers that keep a
 * Render free-tier instance awake (it sleeps after ~15 min idle), and as a quick liveness check.
 */
@RestController
@RequestMapping("/api")
public class PingController {

    @GetMapping({"/ping", "/health"})
    public Map<String, Object> ping() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("status", "ok");
        out.put("service", "amogha-billing");
        out.put("time", Instant.now().toString());
        out.put("uptimeMs", ManagementFactory.getRuntimeMXBean().getUptime());
        return out;
    }
}
