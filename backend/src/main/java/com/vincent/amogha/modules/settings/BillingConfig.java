package com.vincent.amogha.modules.settings;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** Admin-set defaults used to pre-fill margin & billing charges when approving a bill. */
@Document("billing_config")
public class BillingConfig {
    @Id public String id;                 // always "billing"
    public double defaultMargin;          // ₹, default 0
    public double defaultBillingCharges;  // ₹, default 100

    public static BillingConfig defaults() {
        BillingConfig c = new BillingConfig();
        c.id = "billing";
        c.defaultMargin = 0;
        c.defaultBillingCharges = 100;
        return c;
    }
}
