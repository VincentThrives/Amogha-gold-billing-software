package com.vincent.amogha.modules.feature;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Super-admin-controlled on/off switches for app features (hides them from admin/employee when off). */
@Document("features")
public class FeatureFlags {
    @Id public String id = "features";
    public Map<String, Boolean> flags = new LinkedHashMap<>();

    /** Feature keys that map to nav items / screens; all default ON. */
    public static final List<String> KEYS = List.of(
            "register", "new", "transactions", "rate", "approvals",
            "reports", "expense", "users", "billingDefaults", "deleted", "settings");

    public static FeatureFlags allOn() {
        FeatureFlags f = new FeatureFlags();
        for (String k : KEYS) f.flags.put(k, true);
        return f;
    }
}
