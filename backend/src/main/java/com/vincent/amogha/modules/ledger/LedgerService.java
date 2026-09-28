package com.vincent.amogha.modules.ledger;

import com.vincent.amogha.common.ApiException;
import com.vincent.amogha.common.Ids;
import com.vincent.amogha.config.security.AmoghaPrincipal;
import com.vincent.amogha.modules.fund.FundRepository;
import com.vincent.amogha.modules.transaction.TxnRepository;
import com.vincent.amogha.modules.user.UserRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;

/** Admin cash pool: capital the admin adds, minus funds approved to staff, minus shop expenses,
 *  minus the customer payout of bills the admin billed directly. */
@Service
public class LedgerService {

    private final AdminFundRepository adminFunds;
    private final ExpenseRepository expenses;
    private final ExpenseCategoryRepository categories;
    private final FundRepository funds;
    private final TxnRepository txns;
    private final UserRepository users;

    public LedgerService(AdminFundRepository adminFunds, ExpenseRepository expenses,
                         ExpenseCategoryRepository categories, FundRepository funds,
                         TxnRepository txns, UserRepository users) {
        this.adminFunds = adminFunds; this.expenses = expenses; this.categories = categories;
        this.funds = funds; this.txns = txns; this.users = users;
    }

    public AdminFund addFund(double amount, String method, String note, AmoghaPrincipal principal) {
        if (!principal.isAdmin()) throw ApiException.forbidden("Only the admin can add funds.");
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

    public Expense addExpense(double amount, String category, String reason, AmoghaPrincipal principal) {
        if (!principal.isAdmin()) throw ApiException.forbidden("Only the admin can add expenses.");
        if (amount <= 0) throw ApiException.badRequest("Enter a valid amount.");
        if (category == null || category.isBlank()) throw ApiException.badRequest("Select an expense category.");
        String canonical = categories.findByNameIgnoreCase(category.trim())
                .orElseThrow(() -> ApiException.badRequest("Unknown expense category. Add it first.")).name;
        Expense e = new Expense();
        e.id = Ids.genId("exp");
        e.amount = amount;
        e.category = canonical;
        e.reason = reason == null ? "" : reason.trim();
        e.date = Instant.now().toString();
        e.createdBy = principal.userId();
        e.createdByName = principal.name();
        return expenses.save(e);
    }

    /** Admin adds a new expense category / keyword. */
    public ExpenseCategory addCategory(String name, AmoghaPrincipal principal) {
        if (!principal.isAdmin()) throw ApiException.forbidden("Only the admin can manage categories.");
        if (name == null || name.isBlank()) throw ApiException.badRequest("Enter a category name.");
        String clean = name.trim();
        if (categories.findByNameIgnoreCase(clean).isPresent())
            throw ApiException.badRequest("That category already exists.");
        return categories.save(new ExpenseCategory(Ids.genId("cat"), clean));
    }

    /** Admin removes an expense category. Existing expenses keep their stored category text. */
    public void removeCategory(String id, AmoghaPrincipal principal) {
        if (!principal.isAdmin()) throw ApiException.forbidden("Only the admin can manage categories.");
        categories.deleteById(id);
    }

    /** Capital the admin has added, minus funds approved to staff, minus expenses,
     *  minus the customer payout of every bill the admin billed directly. */
    public double availableAdminFund() {
        double capital = adminFunds.findAll().stream().mapToDouble(f -> f.amount).sum();
        double approved = funds.findAll().stream()
                .filter(fr -> "approved".equals(fr.status)).mapToDouble(fr -> fr.amount).sum();
        double spent = expenses.findAll().stream().mapToDouble(e -> e.amount).sum();
        double adminPurchases = txns.findAll().stream()
                .filter(t -> "approved".equals(t.status) && !t.deleted && adminBilled(t.employeeId))
                .mapToDouble(t -> t.totals != null ? t.totals.amountPayable + Math.round(t.totals.releaseAmount) : 0).sum();
        return capital - approved - spent - adminPurchases;
    }

    /** True if the bill was submitted by an admin (paid out of the admin cash pool, not a staff wallet). */
    private boolean adminBilled(String employeeId) {
        return employeeId != null && users.findById(employeeId).map(u -> "admin".equals(u.role)).orElse(false);
    }
}
