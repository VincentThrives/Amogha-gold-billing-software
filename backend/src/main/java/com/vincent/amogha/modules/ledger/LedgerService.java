package com.vincent.amogha.modules.ledger;

import com.vincent.amogha.common.ApiException;
import com.vincent.amogha.common.Ids;
import com.vincent.amogha.config.security.AmoghaPrincipal;
import com.vincent.amogha.modules.fund.FundRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;

/** Admin cash pool: capital the admin adds, minus funds approved to staff, minus shop expenses. */
@Service
public class LedgerService {

    private final AdminFundRepository adminFunds;
    private final ExpenseRepository expenses;
    private final FundRepository funds;

    public LedgerService(AdminFundRepository adminFunds, ExpenseRepository expenses, FundRepository funds) {
        this.adminFunds = adminFunds; this.expenses = expenses; this.funds = funds;
    }

    public AdminFund addFund(double amount, String method, String note, AmoghaPrincipal principal) {
        if (!"admin".equals(principal.role())) throw ApiException.forbidden("Only the admin can add funds.");
        if (amount <= 0) throw ApiException.badRequest("Enter a valid amount.");
        AdminFund f = new AdminFund();
        f.id = Ids.genId("af");
        f.amount = amount;
        f.method = method == null ? "" : method.trim();
        f.note = note == null ? "" : note.trim();
        f.date = Instant.now().toString();
        f.addedBy = principal.userId();
        f.addedByName = principal.name();
        return adminFunds.save(f);
    }

    public Expense addExpense(double amount, String reason, AmoghaPrincipal principal) {
        if (!"admin".equals(principal.role())) throw ApiException.forbidden("Only the admin can add expenses.");
        if (amount <= 0) throw ApiException.badRequest("Enter a valid amount.");
        if (reason == null || reason.isBlank()) throw ApiException.badRequest("Enter the reason for the expense.");
        Expense e = new Expense();
        e.id = Ids.genId("exp");
        e.amount = amount;
        e.reason = reason.trim();
        e.date = Instant.now().toString();
        e.createdBy = principal.userId();
        return expenses.save(e);
    }

    /** Capital the admin has added, minus what has been approved to staff and spent on expenses. */
    public double availableAdminFund() {
        double capital = adminFunds.findAll().stream().mapToDouble(f -> f.amount).sum();
        double approved = funds.findAll().stream()
                .filter(fr -> "approved".equals(fr.status)).mapToDouble(fr -> fr.amount).sum();
        double spent = expenses.findAll().stream().mapToDouble(e -> e.amount).sum();
        return capital - approved - spent;
    }
}
