package com.vincent.amogha.modules.admin;

import com.vincent.amogha.bootstrap.DataSeeder;
import com.vincent.amogha.modules.auth.OtpRepository;
import com.vincent.amogha.modules.customer.CustomerRepository;
import com.vincent.amogha.modules.fund.BalanceRepository;
import com.vincent.amogha.modules.fund.FundRepository;
import com.vincent.amogha.modules.ledger.AdminFundRepository;
import com.vincent.amogha.modules.ledger.ExpenseRepository;
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
    private final CustomerRepository customers;
    private final AdminFundRepository adminFunds;
    private final ExpenseRepository expenses;
    private final DataSeeder seeder;

    public AdminController(TxnRepository txns, FundRepository funds, BalanceRepository balances,
                           OtpRepository otps, CustomerRepository customers,
                           AdminFundRepository adminFunds, ExpenseRepository expenses, DataSeeder seeder) {
        this.txns = txns; this.funds = funds; this.balances = balances; this.otps = otps;
        this.customers = customers; this.adminFunds = adminFunds; this.expenses = expenses; this.seeder = seeder;
    }

    /** Wipes transactions, funds, balances, customers, ledgers and OTPs, then restores the seeded
        baseline (the two demo users, the company, empty rates and default billing). */
    @PostMapping("/reset")
    public Map<String, Boolean> reset() {
        txns.deleteAll();
        funds.deleteAll();
        balances.deleteAll();
        customers.deleteAll();
        adminFunds.deleteAll();
        expenses.deleteAll();
        otps.deleteAll();
        seeder.restoreBaseline();   // users + company + rates + billing back to seed
        return Map.of("ok", true);
    }
}
