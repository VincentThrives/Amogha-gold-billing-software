package com.vincent.amogha.modules.ledger;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** An admin-managed expense category / keyword (e.g. Rent, Petrol, Salary). */
@Document("expense_categories")
public class ExpenseCategory {
    @Id public String id;
    public String name;

    public ExpenseCategory() {}
    public ExpenseCategory(String id, String name) { this.id = id; this.name = name; }
}
