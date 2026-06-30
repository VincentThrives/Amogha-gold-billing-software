package com.vincent.amogha.modules.user;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("users")
public class User {
    @Id public String id;
    public String name;
    public String role;   // "admin" | "employee"
    public String phone;

    public User() {}

    public User(String id, String name, String role, String phone) {
        this.id = id; this.name = name; this.role = role; this.phone = phone;
    }
}
