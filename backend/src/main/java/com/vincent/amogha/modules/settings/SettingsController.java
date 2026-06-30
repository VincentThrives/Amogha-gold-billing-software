package com.vincent.amogha.modules.settings;

import com.vincent.amogha.config.security.AmoghaPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api")
public class SettingsController {

    private final RatesRepository rates;
    private final CompanyRepository companies;

    public SettingsController(RatesRepository rates, CompanyRepository companies) {
        this.rates = rates; this.companies = companies;
    }

    public record RateUpdate(double gold, double silver) {}

    @PutMapping("/rates")
    public Rates updateRates(@RequestBody RateUpdate body, @AuthenticationPrincipal AmoghaPrincipal principal) {
        Rates r = new Rates();
        r.id = "rates";
        r.gold = body.gold();
        r.silver = body.silver();
        r.updatedAt = Instant.now().toString();
        r.updatedBy = principal.userId();
        return rates.save(r);
    }

    @PutMapping("/company")
    public Company updateCompany(@RequestBody Company body) {
        Company existing = companies.findById("company").orElse(null);
        body.id = "company";
        if (body.terms == null && existing != null) body.terms = existing.terms;
        if (body.legalName == null && existing != null) body.legalName = existing.legalName;
        return companies.save(body);
    }
}
