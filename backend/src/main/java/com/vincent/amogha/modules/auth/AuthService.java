package com.vincent.amogha.modules.auth;

import com.vincent.amogha.common.ApiException;
import com.vincent.amogha.config.security.JwtUtil;
import com.vincent.amogha.modules.auth.dto.AuthDtos.*;
import com.vincent.amogha.modules.user.User;
import com.vincent.amogha.modules.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;

@Service
public class AuthService {

    private final UserRepository users;
    private final OtpRepository otps;
    private final JwtUtil jwt;
    private final long otpTtlMs;
    private final SecureRandom rnd = new SecureRandom();

    public AuthService(UserRepository users, OtpRepository otps, JwtUtil jwt,
                       @Value("${app.otp.ttl-minutes}") long otpTtlMinutes) {
        this.users = users; this.otps = otps; this.jwt = jwt;
        this.otpTtlMs = otpTtlMinutes * 60_000L;
    }

    public OtpResponse requestOtp(RequestOtp req) {
        String phone = req.phone() == null ? "" : req.phone().trim();
        if (!phone.matches("\\d{10}")) throw ApiException.badRequest("Enter a valid 10-digit mobile number.");
        User user = users.findByPhoneAndRole(phone, req.role())
                .orElseThrow(() -> ApiException.notFound("No " + req.role() + " account found for this number."));

        String code = String.format("%06d", rnd.nextInt(1_000_000));
        Otp otp = new Otp();
        otp.phone = phone; otp.otp = code; otp.userId = user.id; otp.name = user.name;
        otp.role = user.role; otp.expiresAt = System.currentTimeMillis() + otpTtlMs;
        otps.save(otp);   // upsert by phone (@Id)

        // No SMS gateway → return OTP so the UI can display it.
        return new OtpResponse(user.name, user.role, code, true);
    }

    public AuthResponse verifyOtp(VerifyOtp req) {
        String phone = req.phone() == null ? "" : req.phone().trim();
        String code = req.otp() == null ? "" : req.otp().trim();
        Otp rec = otps.findById(phone).orElse(null);
        if (rec == null || !rec.otp.equals(code)) throw ApiException.badRequest("Incorrect OTP. Please try again.");
        if (System.currentTimeMillis() > rec.expiresAt) throw ApiException.badRequest("OTP expired. Request a new one.");
        otps.deleteById(phone);

        User user = users.findById(rec.userId).orElseThrow(() -> ApiException.badRequest("Account not found."));
        String token = jwt.generate(user.id, user.role, user.name, user.phone);
        return new AuthResponse(token, new UserDto(user.id, user.name, user.role, user.phone));
    }
}
