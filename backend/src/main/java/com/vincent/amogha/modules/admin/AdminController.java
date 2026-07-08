package com.vincent.amogha.modules.admin;

import com.vincent.amogha.modules.auth.OtpRepository;
import com.vincent.amogha.modules.customer.CustomerRepository;
import com.vincent.amogha.modules.fund.BalanceRepository;
import com.vincent.amogha.modules.fund.FundRepository;
import com.vincent.amogha.modules.ledger.AdminFundRepository;
import com.vincent.amogha.modules.ledger.ExpenseRepository;
import com.vincent.amogha.modules.settings.BillingConfig;
import com.vincent.amogha.modules.settings.BillingConfigRepository;
import com.vincent.amogha.modules.settings.Rates;
import com.vincent.amogha.modules.settings.RatesRepository;
import com.vincent.amogha.modules.transaction.TxnRepository;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final TxnRepository txns;
    private final FundRepository funds;
    private final BalanceRepository balances;
    private final OtpRepository otps;
    private final RatesRepository rates;
    private final CustomerRepository customers;
    private final BillingConfigRepository billingConfig;
    private final AdminFundRepository adminFunds;
    private final ExpenseRepository expenses;

    public AdminController(TxnRepository txns, FundRepository funds, BalanceRepository balances,
                           OtpRepository otps, RatesRepository rates, CustomerRepository customers,
                           BillingConfigRepository billingConfig, AdminFundRepository adminFunds,
                           ExpenseRepository expenses) {
        this.txns = txns; this.funds = funds; this.balances = balances; this.otps = otps; this.rates = rates;
        this.customers = customers; this.billingConfig = billingConfig;
        this.adminFunds = adminFunds; this.expenses = expenses;
    }

    /** Wipes transactions, funds, balances, customers, ledgers and OTPs; resets rates + billing defaults. Keeps users + company. */
    @PostMapping("/reset")
    public Map<String, Boolean> reset() {
        txns.deleteAll();
        funds.deleteAll();
        balances.deleteAll();
        customers.deleteAll();
        adminFunds.deleteAll();
        expenses.deleteAll();
        otps.deleteAll();
        Rates r = new Rates();
        r.id = "rates";
        rates.save(r);
        billingConfig.save(BillingConfig.defaults());
        return Map.of("ok", true);
    }
}
