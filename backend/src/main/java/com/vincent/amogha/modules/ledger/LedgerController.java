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
    public record ExpenseBody(double amount, String reason) {}

    @PostMapping("/admin-funds")
    public AdminFund addFund(@RequestBody FundBody body, @AuthenticationPrincipal AmoghaPrincipal principal) {
        return service.addFund(body.amount(), body.method(), body.note(), principal);
    }

    @PostMapping("/expenses")
    public Expense addExpense(@RequestBody ExpenseBody body, @AuthenticationPrincipal AmoghaPrincipal principal) {
        return service.addExpense(body.amount(), body.reason(), principal);
    }
}
