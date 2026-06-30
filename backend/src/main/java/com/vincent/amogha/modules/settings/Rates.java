package com.vincent.amogha.modules.settings;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("rates")
public class Rates {
    @Id public String id = "rates";
    public double gold;
    public double silver;
    public String updatedAt;
    public String updatedBy;
}
