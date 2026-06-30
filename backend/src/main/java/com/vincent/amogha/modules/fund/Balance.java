package com.vincent.amogha.modules.fund;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("balances")
public class Balance {
    @Id public String employeeId;
    public double amount;

    public Balance() {}
    public Balance(String employeeId, double amount) { this.employeeId = employeeId; this.amount = amount; }
}
