package com.vincent.amogha.modules.auth;

import com.vincent.amogha.config.security.AmoghaPrincipal;
import com.vincent.amogha.modules.auth.dto.AuthDtos.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    /** Phone + password login. */
    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest req) {
        return auth.login(req);
    }

    /** Logged-in user changes their own password. */
    @PostMapping("/change-password")
    public Map<String, Boolean> changePassword(@RequestBody ChangePassword req,
                                               @AuthenticationPrincipal AmoghaPrincipal principal) {
        auth.changePassword(principal.userId(), req);
        return Map.of("ok", true);
    }

    // ---- OTP login (disabled for now — kept for easy re-enable) ----
    // @PostMapping("/request-otp")
    // public OtpResponse requestOtp(@RequestBody RequestOtp req) {
    //     return auth.requestOtp(req);
    // }
    //
    // @PostMapping("/verify-otp")
    // public AuthResponse verifyOtp(@RequestBody VerifyOtp req) {
    //     return auth.verifyOtp(req);
    // }
}
