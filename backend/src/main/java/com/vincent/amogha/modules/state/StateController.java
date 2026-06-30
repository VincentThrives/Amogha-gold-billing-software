package com.vincent.amogha.modules.state;

import com.vincent.amogha.common.ApiException;
import com.vincent.amogha.config.security.AmoghaPrincipal;
import com.vincent.amogha.modules.auth.dto.AuthDtos.UserDto;
import com.vincent.amogha.modules.fund.Balance;
import com.vincent.amogha.modules.fund.BalanceRepository;
import com.vincent.amogha.modules.fund.FundRepository;
import com.vincent.amogha.modules.fund.FundRequest;
import com.vincent.amogha.modules.settings.CompanyRepository;
import com.vincent.amogha.modules.settings.RatesRepository;
import com.vincent.amogha.modules.transaction.TxnRepository;
import com.vincent.amogha.modules.user.User;
import com.vincent.amogha.modules.user.UserRepository;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

@RestController
@RequestMapping("/api/state")
public class StateController {

    private final UserRepository users;
    private final CompanyRepository companies;
    private final RatesRepository rates;
    private final TxnRepository txns;
    private final FundRepository funds;
    private final BalanceRepository balances;

    public StateController(UserRepository users, CompanyRepository companies, RatesRepository rates,
                           TxnRepository txns, FundRepository funds, BalanceRepository balances) {
        this.users = users; this.companies = companies; this.rates = rates;
        this.txns = txns; this.funds = funds; this.balances = balances;
    }

    @GetMapping
    public Map<String, Object> state(@AuthenticationPrincipal AmoghaPrincipal principal) {
        User me = users.findById(principal.userId())
                .orElseThrow(() -> ApiException.unauthorized("Account not found."));
        boolean isAdmin = "admin".equals(me.role);

        List<UserDto> userList;
        List<FundRequest> fundList;
        Map<String, Double> balanceMap = new HashMap<>();

        if (isAdmin) {
            userList = users.findAll().stream().map(StateController::toDto).toList();
            fundList = funds.findAllByOrderByRequestedAtDesc();
            for (Balance b : balances.findAll()) balanceMap.put(b.employeeId, b.amount);
        } else {
            userList = List.of(toDto(me));
            fundList = funds.findByEmployeeIdOrderByRequestedAtDesc(me.id);
            balanceMap.put(me.id, balances.findById(me.id).map(b -> b.amount).orElse(0.0));
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("me", toDto(me));
        out.put("users", userList);
        out.put("company", companies.findById("company").orElse(null));
        out.put("rates", rates.findById("rates").orElse(null));
        out.put("transactions", txns.findAllByOrderByDateDesc());
        out.put("funds", fundList);
        out.put("balances", balanceMap);
        return out;
    }

    private static UserDto toDto(User u) {
        return new UserDto(u.id, u.name, u.role, u.phone);
    }
}
