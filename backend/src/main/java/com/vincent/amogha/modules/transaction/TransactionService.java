package com.vincent.amogha.modules.transaction;

import com.vincent.amogha.common.ApiException;
import com.vincent.amogha.common.Ids;
import com.vincent.amogha.config.security.AmoghaPrincipal;
import com.vincent.amogha.modules.fund.Balance;
import com.vincent.amogha.modules.fund.BalanceRepository;
import com.vincent.amogha.modules.user.UserRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class TransactionService {

    private final TxnRepository txns;
    private final BalanceRepository balances;
    private final UserRepository users;

    public TransactionService(TxnRepository txns, BalanceRepository balances, UserRepository users) {
        this.txns = txns; this.balances = balances; this.users = users;
    }

    /** True if this bill's payout was debited from a staff member's funds (approved + submitter is an employee). */
    private boolean staffFunded(Txn t) {
        return "approved".equals(t.status)
                && users.findById(t.employeeId).map(u -> "employee".equals(u.role)).orElse(false);
    }

    /** Admin soft-deletes an approved bill → recycle bin; reverses the staff payout. */
    public Txn softDelete(String id, AmoghaPrincipal principal) {
        Txn t = txns.findById(id).orElseThrow(() -> ApiException.notFound("Transaction not found."));
        if (t.deleted) throw ApiException.badRequest("Bill is already deleted.");
        if (!"approved".equals(t.status)) throw ApiException.badRequest("Only approved bills can be deleted.");
        if (staffFunded(t)) credit(t.employeeId, t.totals.amountPayable);   // refund the payout
        t.deleted = true;
        t.deletedAt = Instant.now().toString();
        t.deletedBy = principal.userId();
        return txns.save(t);
    }

    /** Restore a soft-deleted bill → active again; re-applies the staff payout. */
    public Txn restore(String id) {
        Txn t = txns.findById(id).orElseThrow(() -> ApiException.notFound("Transaction not found."));
        if (!t.deleted) throw ApiException.badRequest("Bill is not deleted.");
        t.deleted = false;
        t.deletedAt = null;
        t.deletedBy = null;
        if (staffFunded(t)) credit(t.employeeId, -t.totals.amountPayable);  // re-debit the payout
        return txns.save(t);
    }

    /** Permanently remove a bill — only allowed from the recycle bin. */
    public void purge(String id) {
        Txn t = txns.findById(id).orElseThrow(() -> ApiException.notFound("Transaction not found."));
        if (!t.deleted) throw ApiException.badRequest("Move the bill to Deleted Invoices before deleting it forever.");
        txns.deleteById(id);
    }

    public Txn create(Txn t, AmoghaPrincipal principal) {
        if (t.customer == null || t.customer.name == null || t.customer.name.isBlank())
            throw ApiException.badRequest("Customer name required.");

        boolean isAdmin = "admin".equals(principal.role());

        // Only admins set margin & billing charges. Staff submit for approval; the admin
        // applies margin/charges when approving, so they are forced to 0 at submit.
        double margin = isAdmin && t.totals != null ? t.totals.margin : 0;
        double charges = isAdmin && t.totals != null ? t.totals.billingCharges : 0;
        t.totals = BillingCalc.computeTotals(t.items, margin, charges);
        if (t.totals.grossAmount <= 0) throw ApiException.badRequest("Amount must be greater than zero.");

        if (t.id == null || t.id.isBlank()) t.id = Ids.genId("txn");
        if (t.billNo == null || t.billNo.isBlank()) t.billNo = Ids.genBillNo();
        if (t.date == null || t.date.isBlank()) t.date = Instant.now().toString();
        t.employeeId = principal.userId();
        t.employeeName = principal.name();

        if (isAdmin) {
            // admin-created bills are final immediately
            t.status = "approved";
            t.approvedBy = principal.userId();
            t.approvedAt = Instant.now().toString();
        } else {
            // staff bills wait for admin approval; funds are debited on approval
            t.status = "pending";
        }
        return txns.save(t);
    }

    /** Admin optionally edits items (incl. 24crt rate), applies margin + billing charges, and finalises a pending staff bill. */
    public Txn approve(String id, java.util.List<Txn.TxnItem> editedItems, double margin, double charges, AmoghaPrincipal principal) {
        Txn t = txns.findById(id).orElseThrow(() -> ApiException.notFound("Transaction not found."));
        if (!"pending".equals(t.status)) throw ApiException.badRequest("Transaction is not pending approval.");

        if (editedItems != null && !editedItems.isEmpty()) {
            t.items = editedItems;                       // admin edited the transaction
            if (!editedItems.isEmpty()) t.article = editedItems.get(0).article;
        }
        t.totals = BillingCalc.computeTotals(t.items, Math.max(0, margin), Math.max(0, charges));
        long payable = t.totals.amountPayable;
        if (payable <= 0) throw ApiException.badRequest("Amount payable must be greater than zero.");

        // debit the submitting staff member's approved funds
        double bal = balanceOf(t.employeeId);
        if (bal < payable)
            throw ApiException.badRequest("Staff has insufficient funds (₹" + (long) bal + "). Approve more funds for them first.");
        credit(t.employeeId, -payable);

        t.status = "approved";
        t.approvedBy = principal.userId();
        t.approvedAt = Instant.now().toString();
        return txns.save(t);
    }

    public Txn reject(String id, AmoghaPrincipal principal) {
        Txn t = txns.findById(id).orElseThrow(() -> ApiException.notFound("Transaction not found."));
        if (!"pending".equals(t.status)) throw ApiException.badRequest("Transaction is not pending approval.");
        t.status = "rejected";
        t.approvedBy = principal.userId();
        t.approvedAt = Instant.now().toString();
        return txns.save(t);
    }

    private double balanceOf(String employeeId) {
        return balances.findById(employeeId).map(b -> b.amount).orElse(0.0);
    }
    private void credit(String employeeId, double delta) {
        Balance b = balances.findById(employeeId).orElse(new Balance(employeeId, 0));
        b.amount += delta;
        balances.save(b);
    }
}
