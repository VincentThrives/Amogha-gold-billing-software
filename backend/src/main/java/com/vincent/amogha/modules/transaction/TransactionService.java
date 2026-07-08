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

    /** True if this bill's disbursement was debited from a staff member's funds (approved + submitter is an employee). */
    private boolean staffFunded(Txn t) {
        return "approved".equals(t.status)
                && users.findById(t.employeeId).map(u -> "employee".equals(u.role)).orElse(false);
    }

    /** Cash the staff pays out from their wallet = the net amount payable to the customer.
        (The release amount is paid to the bank separately and does not touch the billing wallet.) */
    private long disbursed(Txn t) {
        return t.totals != null ? t.totals.amountPayable : 0;
    }

    /** Admin soft-deletes an approved bill → recycle bin; refunds the staff payout to their wallet. */
    public Txn softDelete(String id, AmoghaPrincipal principal) {
        Txn t = txns.findById(id).orElseThrow(() -> ApiException.notFound("Transaction not found."));
        if (t.deleted) throw ApiException.badRequest("Bill is already deleted.");
        if (!"approved".equals(t.status)) throw ApiException.badRequest("Only approved bills can be deleted.");
        if (staffFunded(t)) credit(t.employeeId, disbursed(t));   // refund the customer payout
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
        if (staffFunded(t)) credit(t.employeeId, -disbursed(t));  // re-debit payout + release
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
        // The release amount (paid to the bank) can be set by whoever bills — staff or admin.
        double margin = isAdmin && t.totals != null ? t.totals.margin : 0;
        double charges = isAdmin && t.totals != null ? t.totals.billingCharges : 0;
        double release = t.totals != null ? Math.max(0, t.totals.releaseAmount) : 0;
        t.totals = BillingCalc.computeTotals(t.items, margin, charges, release);
        if (t.totals.grossAmount <= 0) throw ApiException.badRequest("Amount must be greater than zero.");
        validateRelease(t);

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
            // A staff member can only send a bill for approval if their wallet balance covers the
            // amount payable to the customer. Otherwise they must get a fund request approved first.
            // Funds are debited on approval, not here.
            long due = disbursed(t);
            double available = balanceOf(t.employeeId);
            if (available < due)
                throw ApiException.badRequest("Insufficient funds: ₹" + (long) available + " available, this bill needs ₹" + due
                        + ". Request and get funds approved before sending this bill for approval.");
            t.status = "pending";
        }
        return txns.save(t);
    }

    /** Admin optionally edits items (incl. 24crt rate), margin, billing charges and release, then finalises a pending staff bill. */
    public Txn approve(String id, java.util.List<Txn.TxnItem> editedItems, double margin, double charges,
                       double release, String releaseMethod, String releaseBank, AmoghaPrincipal principal) {
        Txn t = txns.findById(id).orElseThrow(() -> ApiException.notFound("Transaction not found."));
        if (!"pending".equals(t.status)) throw ApiException.badRequest("Transaction is not pending approval.");

        if (editedItems != null && !editedItems.isEmpty()) {
            t.items = editedItems;                       // admin edited the transaction
            t.article = editedItems.get(0).article;
        }
        if (releaseMethod != null) t.releaseMethod = releaseMethod;
        if (releaseBank != null) t.releaseBank = releaseBank;
        t.totals = BillingCalc.computeTotals(t.items, Math.max(0, margin), Math.max(0, charges), Math.max(0, release));
        if (t.totals.amountPayable <= 0) throw ApiException.badRequest("Amount payable must be greater than zero.");
        validateRelease(t);

        // debit the submitting staff member's wallet by the amount payable to the customer
        long due = disbursed(t);
        double bal = balanceOf(t.employeeId);
        if (bal < due)
            throw ApiException.badRequest("Staff has insufficient funds (₹" + (long) bal + " available, ₹" + due + " needed). Approve more funds for them first.");
        credit(t.employeeId, -due);

        t.status = "approved";
        t.approvedBy = principal.userId();
        t.approvedAt = Instant.now().toString();
        return txns.save(t);
    }

    /** A release amount can't exceed the gross, and needs a method + bank when it is greater than zero. */
    private void validateRelease(Txn t) {
        double release = t.totals != null ? t.totals.releaseAmount : 0;
        if (release <= 0) return;
        double gross = t.totals != null ? t.totals.grossAmount : 0;
        if (release > gross) throw ApiException.badRequest("Release amount cannot exceed the gross amount.");
        if (t.releaseMethod == null || t.releaseMethod.isBlank())
            throw ApiException.badRequest("Select how the release amount was paid (Cash / RTGS / NEFT…).");
        if (t.releaseBank == null || t.releaseBank.isBlank())
            throw ApiException.badRequest("Enter the bank the release amount was paid to.");
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
