package com.vincent.amogha.modules.auth;

import com.vincent.amogha.common.ApiException;
import com.vincent.amogha.config.security.JwtUtil;
import com.vincent.amogha.modules.auth.dto.AuthDtos.*;
import com.vincent.amogha.modules.user.User;
import com.vincent.amogha.modules.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;

@Service
public class AuthService {

    private final UserRepository users;
    private final OtpRepository otps;
    private final JwtUtil jwt;
    private final PasswordEncoder encoder;
    private final long otpTtlMs;
    private final SecureRandom rnd = new SecureRandom();

    public AuthService(UserRepository users, OtpRepository otps, JwtUtil jwt, PasswordEncoder encoder,
                       @Value("${app.otp.ttl-minutes}") long otpTtlMinutes) {
        this.users = users; this.otps = otps; this.jwt = jwt; this.encoder = encoder;
        this.otpTtlMs = otpTtlMinutes * 60_000L;
    }

    /** Login with a username (phone number, or the super admin's email) + password. */
    public AuthResponse login(LoginRequest req) {
        String username = req.phone() == null ? "" : req.phone().trim();
        String password = req.password() == null ? "" : req.password();
        User user = username.contains("@")
                ? users.findByEmailIgnoreCase(username).orElse(null)
                : users.findByPhone(username).orElse(null);
        if (user == null || user.passwordHash == null || !encoder.matches(password, user.passwordHash))
            throw ApiException.badRequest("Incorrect username or password.");
        String token = jwt.generate(user.id, user.role, user.name, user.phone);
        return new AuthResponse(token, new UserDto(user.id, user.name, user.role, user.phone));
    }

    /** Logged-in user changes their own password (current password required). */
    public void changePassword(String userId, ChangePassword req) {
        User user = users.findById(userId).orElseThrow(() -> ApiException.unauthorized("Account not found."));
        String current = req.currentPassword() == null ? "" : req.currentPassword();
        String next = req.newPassword() == null ? "" : req.newPassword();
        if (user.passwordHash == null || !encoder.matches(current, user.passwordHash))
            throw ApiException.badRequest("Your current password is incorrect.");
        if (next.length() < 4) throw ApiException.badRequest("New password must be at least 4 characters.");
        user.passwordHash = encoder.encode(next);
        users.save(user);
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
