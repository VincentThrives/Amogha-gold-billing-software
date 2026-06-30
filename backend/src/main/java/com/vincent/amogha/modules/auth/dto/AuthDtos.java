package com.vincent.amogha.modules.auth.dto;

public class AuthDtos {

    public record RequestOtp(String phone, String role) {}
    public record VerifyOtp(String phone, String otp) {}

    public record OtpResponse(String name, String role, String otp, boolean devDelivery) {}

    public record UserDto(String id, String name, String role, String phone) {}
    public record AuthResponse(String token, UserDto user) {}
}
