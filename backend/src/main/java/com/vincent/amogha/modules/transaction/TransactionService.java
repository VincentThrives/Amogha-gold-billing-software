package com.vincent.amogha.modules.transaction;

import com.vincent.amogha.common.ApiException;
import com.vincent.amogha.common.Ids;
import com.vincent.amogha.config.security.AmoghaPrincipal;
import com.vincent.amogha.modules.fund.Balance;
import com.vincent.amogha.modules.fund.BalanceRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class TransactionService {

    private final TxnRepository txns;
    private final BalanceRepository balances;

    public TransactionService(TxnRepository txns, BalanceRepository balances) {
        this.txns = txns; this.balances = balances;
    }

    public Txn create(Txn t, AmoghaPrincipal principal) {
        if (t.customer == null || t.customer.name == null || t.customer.name.isBlank())
            throw ApiException.badRequest("Customer name required.");

        // server-authoritative totals (uses client-supplied margin/charges as inputs)
        double margin = t.totals != null ? t.totals.margin : 0;
        double charges = t.totals != null ? t.totals.billingCharges : 0;
        t.totals = BillingCalc.computeTotals(t.items, margin, charges);
        long payable = t.totals.amountPayable;
        if (payable <= 0) throw ApiException.badRequest("Amount payable must be greater than zero.");

        boolean isEmployee = "employee".equals(principal.role());
        if (isEmployee) {
            double bal = balanceOf(principal.userId());
            if (bal < payable)
                throw ApiException.badRequest("Insufficient funds (₹" + (long) bal + "). Get funds approved before billing.");
        }

        if (t.id == null || t.id.isBlank()) t.id = Ids.genId("txn");
        if (t.billNo == null || t.billNo.isBlank()) t.billNo = Ids.genBillNo();
        if (t.date == null || t.date.isBlank()) t.date = Instant.now().toString();
        t.employeeId = principal.userId();
        t.employeeName = principal.name();
        Txn saved = txns.save(t);

        if (isEmployee) credit(principal.userId(), -payable);
        return saved;
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
