package com.vincent.amogha.modules.user;

import com.vincent.amogha.common.ApiException;
import com.vincent.amogha.common.Ids;
import com.vincent.amogha.modules.auth.dto.AuthDtos.UserDto;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository users;

    public UserController(UserRepository users) {
        this.users = users;
    }

    public record NewEmployee(String name, String phone) {}

    @PostMapping
    public UserDto add(@RequestBody NewEmployee body) {
        String name = body.name() == null ? "" : body.name().trim();
        String phone = body.phone() == null ? "" : body.phone().trim();
        if (name.isEmpty() || !phone.matches("\\d{10}"))
            throw ApiException.badRequest("Name and valid 10-digit phone required.");
        if (users.findByPhone(phone).isPresent())
            throw ApiException.badRequest("Phone already registered.");
        User u = new User(Ids.genId("u"), name, "employee", phone);
        users.save(u);
        return new UserDto(u.id, u.name, u.role, u.phone);
    }

    @DeleteMapping("/{id}")
    public Map<String, Boolean> remove(@PathVariable String id) {
        users.deleteById(id);
        return Map.of("ok", true);
    }
}
