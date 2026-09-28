package com.vincent.amogha.modules.user;

import com.vincent.amogha.common.ApiException;
import com.vincent.amogha.common.Ids;
import com.vincent.amogha.config.security.AmoghaPrincipal;
import com.vincent.amogha.modules.auth.dto.AuthDtos.UserDto;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository users;
    private final PasswordEncoder encoder;

    public UserController(UserRepository users, PasswordEncoder encoder) {
        this.users = users; this.encoder = encoder;
    }

    public record NewUser(String name, String phone, String role, String password) {}
    public record ResetPassword(String password) {}
    public record ChangePhone(String phone) {}

    /** Admin creates another admin or a staff member with a login password. */
    @PostMapping
    public UserDto add(@RequestBody NewUser body) {
        String name = body.name() == null ? "" : body.name().trim();
        String phone = body.phone() == null ? "" : body.phone().trim();
        String role = "admin".equals(body.role()) ? "admin" : "employee";
        String password = body.password() == null ? "" : body.password();
        if (name.isEmpty() || !phone.matches("\\d{10}"))
            throw ApiException.badRequest("Name and valid 10-digit phone required.");
        if (password.length() < 4)
            throw ApiException.badRequest("Password must be at least 4 characters.");
        if (users.findByPhone(phone).isPresent())
            throw ApiException.badRequest("Phone already registered.");
        User u = new User(Ids.genId("u"), name, role, phone);
        u.passwordHash = encoder.encode(password);
        users.save(u);
        return new UserDto(u.id, u.name, u.role, u.phone);
    }

    /** Admin resets any user's password (only a super admin may reset a super admin). */
    @PostMapping("/{id}/reset-password")
    public Map<String, Boolean> resetPassword(@PathVariable String id, @RequestBody ResetPassword body,
                                              @AuthenticationPrincipal AmoghaPrincipal principal) {
        User u = users.findById(id).orElseThrow(() -> ApiException.notFound("User not found."));
        guardSuperAdminTarget(u, principal);
        String password = body.password() == null ? "" : body.password();
        if (password.length() < 4) throw ApiException.badRequest("Password must be at least 4 characters.");
        u.passwordHash = encoder.encode(password);
        users.save(u);
        return Map.of("ok", true);
    }

    /** Admin changes a user's mobile number (their login username); keeps the same account. */
    @PostMapping("/{id}/phone")
    public UserDto changePhone(@PathVariable String id, @RequestBody ChangePhone body,
                               @AuthenticationPrincipal AmoghaPrincipal principal) {
        User u = users.findById(id).orElseThrow(() -> ApiException.notFound("User not found."));
        guardSuperAdminTarget(u, principal);
        String phone = body.phone() == null ? "" : body.phone().trim();
        if (!phone.matches("\\d{10}")) throw ApiException.badRequest("Enter a valid 10-digit phone.");
        users.findByPhone(phone).filter(other -> !other.id.equals(id)).ifPresent(other -> {
            throw ApiException.badRequest("Phone already registered to another user.");
        });
        u.phone = phone;
        users.save(u);
        return new UserDto(u.id, u.name, u.role, u.phone);
    }

    @DeleteMapping("/{id}")
    public Map<String, Boolean> remove(@PathVariable String id, @AuthenticationPrincipal AmoghaPrincipal principal) {
        users.findById(id).ifPresent(u -> guardSuperAdminTarget(u, principal));
        users.deleteById(id);
        return Map.of("ok", true);
    }

    /** Only a super admin may manage the super-admin account. */
    private void guardSuperAdminTarget(User target, AmoghaPrincipal principal) {
        if ("superadmin".equals(target.role) && !principal.isSuperAdmin())
            throw ApiException.forbidden("Only the super admin can manage the super-admin account.");
    }
}
