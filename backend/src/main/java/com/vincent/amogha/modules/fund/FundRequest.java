package com.vincent.amogha.modules.fund;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("funds")
public class FundRequest {
    @Id public String id;
    public String employeeId;
    public String employeeName;
    public double amount;
    public String note;
    public String status;       // pending | approved | rejected
    public String requestedAt;
    public String decidedAt;
    public String decidedBy;
}
