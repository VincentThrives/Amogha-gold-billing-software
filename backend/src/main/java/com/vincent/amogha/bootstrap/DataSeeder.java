package com.vincent.amogha.bootstrap;

import com.vincent.amogha.modules.settings.Company;
import com.vincent.amogha.modules.settings.CompanyRepository;
import com.vincent.amogha.modules.settings.Rates;
import com.vincent.amogha.modules.settings.RatesRepository;
import com.vincent.amogha.modules.user.User;
import com.vincent.amogha.modules.user.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/** Seeds demo users, company details (real GSTIN) and empty rates on first boot. */
@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository users;
    private final CompanyRepository companies;
    private final RatesRepository rates;

    public DataSeeder(UserRepository users, CompanyRepository companies, RatesRepository rates) {
        this.users = users; this.companies = companies; this.rates = rates;
    }

    @Override
    public void run(String... args) {
        if (users.count() == 0) {
            users.save(new User("u-admin", "Amogha Admin", "admin", "9999900001"));
            users.save(new User("u-emp1", "Counter Staff", "employee", "9999900002"));
        }
        if (companies.findById("company").isEmpty()) {
            Company c = new Company();
            c.id = "company";
            c.name = "Amogha Gold Company";
            c.addressLines = List.of(
                    "No 1,2,3, 1st Floor, Hemanna Complex,",
                    "8th Mile, Chokkasandra, Tumkur Main Road,",
                    "Nagasandra, Bengaluru, Karnataka 560073");
            c.gstn = "29ABFCA1286P1Z2";
            c.phone = "+91 88844 43545";
            c.legalName = "For Amogha Gold Buyer's Private Limited";
            c.terms = List.of(
                    "Gold once purchased by our company will not be given back under any circumstances.",
                    "Please count the cash before leaving the counter, no claims for shortfall will be entertained thereafter.",
                    "Selling fake gold is a criminal offence and if found will be reported to authorities.");
            companies.save(c);
        }
        if (rates.findById("rates").isEmpty()) {
            Rates r = new Rates();
            r.id = "rates";
            rates.save(r);
        }
    }
}
