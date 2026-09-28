package com.vincent.amogha.modules.ledger;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** A shop expense paid out of the admin's cash pool. */
@Document("expenses")
public class Expense {
    @Id public String id;
    public double amount;
    public String category;     // expense category / keyword (required, from the managed list)
    public String reason;       // optional note
    public String date;         // ISO instant
    public String createdBy;    // admin userId
    public String createdByName;
}
