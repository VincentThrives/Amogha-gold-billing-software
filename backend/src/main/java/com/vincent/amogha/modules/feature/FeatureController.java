package com.vincent.amogha.modules.feature;

import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Super-admin-only feature toggles (secured in SecurityConfig). */
@RestController
@RequestMapping("/api")
public class FeatureController {

    private final FeatureRepository repo;

    public FeatureController(FeatureRepository repo) {
        this.repo = repo;
    }

    @PutMapping("/features")
    public FeatureFlags update(@RequestBody Map<String, Boolean> flags) {
        FeatureFlags f = repo.findById("features").orElseGet(FeatureFlags::allOn);
        if (flags != null) f.flags.putAll(flags);   // merge only the toggles that were sent
        return repo.save(f);
    }
}
