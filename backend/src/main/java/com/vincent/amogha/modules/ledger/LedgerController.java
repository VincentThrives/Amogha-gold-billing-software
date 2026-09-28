package com.vincent.amogha.modules.ledger;

import com.vincent.amogha.config.security.AmoghaPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class LedgerController {

    private final LedgerService service;

    public LedgerController(LedgerService service) {
        this.service = service;
    }

    public record FundBody(double amount, String method, String note) {}
    public record ExpenseBody(double amount, String category, String reason) {}
    public record CategoryBody(String name) {}

    @PostMapping("/admin-funds")
    public AdminFund addFund(@RequestBody FundBody body, @AuthenticationPrincipal AmoghaPrincipal principal) {
        return service.addFund(body.amount(), body.method(), body.note(), principal);
    }

    @PostMapping("/expenses")
    public Expense addExpense(@RequestBody ExpenseBody body, @AuthenticationPrincipal AmoghaPrincipal principal) {
        return service.addExpense(body.amount(), body.category(), body.reason(), principal);
    }

    @PostMapping("/expense-categories")
    public ExpenseCategory addCategory(@RequestBody CategoryBody body, @AuthenticationPrincipal AmoghaPrincipal principal) {
        return service.addCategory(body.name(), principal);
    }

    @DeleteMapping("/expense-categories/{id}")
    public java.util.Map<String, Boolean> removeCategory(@PathVariable String id, @AuthenticationPrincipal AmoghaPrincipal principal) {
        service.removeCategory(id, principal);
        return java.util.Map.of("ok", true);
    }
}
