package com.vincent.amogha.modules.auth;

import com.vincent.amogha.modules.auth.dto.AuthDtos.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/request-otp")
    public OtpResponse requestOtp(@RequestBody RequestOtp req) {
        return auth.requestOtp(req);
    }

    @PostMapping("/verify-otp")
    public AuthResponse verifyOtp(@RequestBody VerifyOtp req) {
        return auth.verifyOtp(req);
    }
}
