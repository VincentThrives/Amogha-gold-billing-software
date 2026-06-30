package com.vincent.amogha.modules.auth;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("otps")
public class Otp {
    @Id public String phone;   // one active OTP per phone
    public String otp;
    public String userId;
    public String name;
    public String role;
    public long expiresAt;
}
