package com.vincent.amogha.modules.user;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("users")
public class User {
    @Id public String id;
    public String name;
    public String role;         // "superadmin" | "admin" | "employee"
    public String phone;        // login username for admin/employee (unique)
    public String email;        // login username for the super admin
    public String passwordHash; // BCrypt hash

    public User() {}

    public User(String id, String name, String role, String phone) {
        this.id = id; this.name = name; this.role = role; this.phone = phone;
    }
}
