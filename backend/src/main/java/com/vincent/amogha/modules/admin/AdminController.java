package com.vincent.amogha.modules.admin;

import com.vincent.amogha.modules.auth.OtpRepository;
import com.vincent.amogha.modules.fund.BalanceRepository;
import com.vincent.amogha.modules.fund.FundRepository;
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

    public AdminController(TxnRepository txns, FundRepository funds, BalanceRepository balances,
                           OtpRepository otps, RatesRepository rates) {
        this.txns = txns; this.funds = funds; this.balances = balances; this.otps = otps; this.rates = rates;
    }

    /** Wipes transactions, funds, balances and OTPs; resets rates. Keeps users + company. */
    @PostMapping("/reset")
    public Map<String, Boolean> reset() {
        txns.deleteAll();
        funds.deleteAll();
        balances.deleteAll();
        otps.deleteAll();
        Rates r = new Rates();
        r.id = "rates";
        rates.save(r);
        return Map.of("ok", true);
    }
}
