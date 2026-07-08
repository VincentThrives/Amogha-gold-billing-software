package com.vincent.amogha.modules.fund;

import com.vincent.amogha.common.ApiException;
import com.vincent.amogha.common.Ids;
import com.vincent.amogha.config.security.AmoghaPrincipal;
import com.vincent.amogha.modules.ledger.LedgerService;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class FundService {

    private final FundRepository funds;
    private final BalanceRepository balances;
    private final LedgerService ledger;

    public FundService(FundRepository funds, BalanceRepository balances, LedgerService ledger) {
        this.funds = funds; this.balances = balances; this.ledger = ledger;
    }

    public FundRequest request(double amount, String note, AmoghaPrincipal principal) {
        if (!"employee".equals(principal.role())) throw ApiException.forbidden("Only employees request funds.");
        if (amount <= 0) throw ApiException.badRequest("Enter a valid amount.");
        FundRequest fr = new FundRequest();
        fr.id = Ids.genId("fr");
        fr.employeeId = principal.userId();
        fr.employeeName = principal.name();
        fr.amount = amount;
        fr.note = note == null ? "" : note;
        fr.status = "pending";
        fr.requestedAt = Instant.now().toString();
        return funds.save(fr);
    }

    public void decide(String id, boolean approve, String method, String reference, AmoghaPrincipal principal) {
        FundRequest fr = funds.findById(id).orElse(null);
        if (fr == null || !"pending".equals(fr.status)) throw ApiException.badRequest("Request not pending.");
        if (approve && (method == null || method.isBlank()))
            throw ApiException.badRequest("Select how the funds were given (Cash / UPI / NEFT / RTGS…).");
        if (approve) {
            double available = ledger.availableAdminFund();
            if (available < fr.amount)
                throw ApiException.badRequest("Insufficient admin funds: ₹" + (long) available + " available, this approval needs ₹"
                        + (long) fr.amount + ". Add more of your own fund before approving.");
        }
        fr.status = approve ? "approved" : "rejected";
        if (approve) {
            fr.method = method.trim();
            fr.reference = reference == null ? "" : reference.trim();
        }
        fr.decidedAt = Instant.now().toString();
        fr.decidedBy = principal.userId();
        funds.save(fr);
        if (approve) {
            Balance b = balances.findById(fr.employeeId).orElse(new Balance(fr.employeeId, 0));
            b.amount += fr.amount;
            balances.save(b);
        }
    }
}
