package com.vincent.amogha.modules.settings;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Document("company")
public class Company {
    @Id public String id = "company";
    public String name;
    public List<String> addressLines;
    public String gstn;
    public String phone;
    public String legalName;
    public List<String> terms;
}
