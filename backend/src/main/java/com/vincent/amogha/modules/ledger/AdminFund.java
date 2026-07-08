package com.vincent.amogha.modules.ledger;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** A capital top-up the admin adds to their own cash pool (daily fund). */
@Document("admin_funds")
public class AdminFund {
    @Id public String id;
    public double amount;
    public String method;      // how the cash came in — Cash | UPI | IMPS | NEFT | RTGS | Cheque | Bank deposit
    public String note;        // optional source/description
    public String date;        // ISO instant
    public String addedBy;     // admin userId
    public String addedByName; // admin name (captured at add time)
}
