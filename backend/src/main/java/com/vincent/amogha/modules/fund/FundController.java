package com.vincent.amogha.modules.fund;

import com.vincent.amogha.config.security.AmoghaPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/funds")
public class FundController {

    private final FundService service;

    public FundController(FundService service) {
        this.service = service;
    }

    public record FundRequestBody(double amount, String note) {}
    public record DecideBody(boolean approve) {}

    @PostMapping
    public FundRequest request(@RequestBody FundRequestBody body, @AuthenticationPrincipal AmoghaPrincipal principal) {
        return service.request(body.amount(), body.note(), principal);
    }

    @PostMapping("/{id}/decide")
    public Map<String, Boolean> decide(@PathVariable String id, @RequestBody DecideBody body,
                                       @AuthenticationPrincipal AmoghaPrincipal principal) {
        service.decide(id, body.approve(), principal);
        return Map.of("ok", true);
    }
}
