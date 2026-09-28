package com.vincent.amogha.bootstrap;

import com.vincent.amogha.modules.settings.BillingConfig;
import com.vincent.amogha.modules.settings.BillingConfigRepository;
import com.vincent.amogha.modules.settings.Company;
import com.vincent.amogha.modules.settings.CompanyRepository;
import com.vincent.amogha.modules.settings.Rates;
import com.vincent.amogha.modules.settings.RatesRepository;
import com.vincent.amogha.modules.ledger.ExpenseCategory;
import com.vincent.amogha.modules.ledger.ExpenseCategoryRepository;
import com.vincent.amogha.modules.feature.FeatureFlags;
import com.vincent.amogha.modules.feature.FeatureRepository;
import com.vincent.amogha.modules.user.User;
import com.vincent.amogha.modules.user.UserRepository;
import com.vincent.amogha.common.Ids;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/** Seeds demo users, company details (real GSTIN), empty rates and billing defaults on first boot. */
@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository users;
    private final CompanyRepository companies;
    private final RatesRepository rates;
    private final BillingConfigRepository billingConfig;
    private final ExpenseCategoryRepository expenseCategories;
    private final FeatureRepository features;
    private final org.springframework.security.crypto.password.PasswordEncoder encoder;

    // demo login passwords (shown on the login screen); admin can change them anytime
    private static final String ADMIN_PASSWORD = "admin@2024";
    private static final String STAFF_PASSWORD = "staff@2024";
    // super admin (hidden login at /superadmin; email is the username)
    private static final String SUPER_EMAIL = "vincentthrives@gmail.com";
    private static final String SUPER_PASSWORD = "Vincent@1127";

    private static final List<String> DEFAULT_CATEGORIES = List.of(
            "Rent", "Petrol / Fuel", "Salary", "Electricity", "Water",
            "Maintenance", "Office Supplies", "Transport", "Food", "Miscellaneous");

    public DataSeeder(UserRepository users, CompanyRepository companies, RatesRepository rates,
                      BillingConfigRepository billingConfig, ExpenseCategoryRepository expenseCategories,
                      FeatureRepository features,
                      org.springframework.security.crypto.password.PasswordEncoder encoder) {
        this.users = users; this.companies = companies; this.rates = rates;
        this.billingConfig = billingConfig; this.expenseCategories = expenseCategories;
        this.features = features; this.encoder = encoder;
    }

    @Override
    public void run(String... args) {
        if (users.count() == 0) seedUsers();
        else ensureSeedPasswords();   // migrate a pre-password DB: give the seed accounts default passwords
        ensureSuperAdmin();           // make sure the super admin exists on any DB
        if (features.findById("features").isEmpty()) features.save(FeatureFlags.allOn());
        if (companies.findById("company").isEmpty()) companies.save(seedCompany());
        if (rates.findById("rates").isEmpty()) {
            Rates r = new Rates();
            r.id = "rates";
            rates.save(r);
        }
        if (billingConfig.findById("billing").isEmpty()) {
            billingConfig.save(BillingConfig.defaults());   // default billing charges ₹100
        }
        if (expenseCategories.count() == 0) seedCategories();
    }

    /** Full reset to the seeded baseline: only the two seed users, the seed company, empty rates,
        default billing and the default expense categories. */
    public void restoreBaseline() {
        users.deleteAll();
        seedUsers();
        companies.save(seedCompany());
        Rates r = new Rates();
        r.id = "rates";
        rates.save(r);
        billingConfig.save(BillingConfig.defaults());
        expenseCategories.deleteAll();
        seedCategories();
        features.save(FeatureFlags.allOn());
    }

    private void seedUsers() {
        User admin = new User("u-admin", "Amogha Admin", "admin", "9999900001");
        admin.passwordHash = encoder.encode(ADMIN_PASSWORD);
        users.save(admin);
        User staff = new User("u-emp1", "Counter Staff", "employee", "9999900002");
        staff.passwordHash = encoder.encode(STAFF_PASSWORD);
        users.save(staff);
        seedSuperAdmin();
    }

    private void seedSuperAdmin() {
        User su = new User("u-super", "Super Admin", "superadmin", "");
        su.email = SUPER_EMAIL;
        su.passwordHash = encoder.encode(SUPER_PASSWORD);
        users.save(su);
    }

    /** Backfill default passwords onto the seed accounts if they predate the password feature. */
    private void ensureSeedPasswords() {
        users.findById("u-admin").ifPresent(u -> {
            if (u.passwordHash == null || u.passwordHash.isBlank()) { u.passwordHash = encoder.encode(ADMIN_PASSWORD); users.save(u); }
        });
        users.findById("u-emp1").ifPresent(u -> {
            if (u.passwordHash == null || u.passwordHash.isBlank()) { u.passwordHash = encoder.encode(STAFF_PASSWORD); users.save(u); }
        });
    }

    /** Ensure the super admin exists (create it on a DB that predates the feature). */
    private void ensureSuperAdmin() {
        if (users.findById("u-super").isEmpty() && users.findByEmailIgnoreCase(SUPER_EMAIL).isEmpty()) seedSuperAdmin();
    }

    private void seedCategories() {
        for (String name : DEFAULT_CATEGORIES) expenseCategories.save(new ExpenseCategory(Ids.genId("cat"), name));
    }

    private Company seedCompany() {
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
        return c;
    }
}
