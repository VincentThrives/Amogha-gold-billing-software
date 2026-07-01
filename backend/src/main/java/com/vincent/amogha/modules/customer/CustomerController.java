package com.vincent.amogha.modules.customer;

import com.vincent.amogha.common.ApiException;
import com.vincent.amogha.common.Ids;
import com.vincent.amogha.config.security.AmoghaPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerRepository repo;

    public CustomerController(CustomerRepository repo) {
        this.repo = repo;
    }

    /** Register a customer. Upserts by phone; response tells the UI whether it already existed. */
    @PostMapping
    public Map<String, Object> register(@RequestBody Customer body, @AuthenticationPrincipal AmoghaPrincipal principal) {
        validate(body);
        String phone = body.phone.trim();

        Optional<Customer> existing = repo.findFirstByPhone(phone);
        boolean existed = existing.isPresent();
        Customer c = existing.orElseGet(Customer::new);

        c.name = body.name.trim();
        c.dob = body.dob;
        c.phone = phone;
        c.address1 = body.address1.trim();
        c.address2 = body.address2;
        c.pincode = body.pincode.trim();
        c.landmark = body.landmark;
        c.idProofs = body.idProofs;
        c.reference = body.reference;
        c.selfie = body.selfie;
        if (!existed) {
            c.id = Ids.genId("cust");
            c.createdAt = Instant.now().toString();
            c.createdBy = principal.userId();
        }
        repo.save(c);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("customer", c);
        out.put("existed", existed);
        return out;
    }

    private void validate(Customer b) {
        boolean hasIdProof = b.idProofs != null &&
                b.idProofs.stream().anyMatch(p -> p != null && p.number != null && !p.number.isBlank());
        if (!hasIdProof) throw ApiException.badRequest("At least one ID proof with a document number is required.");
        if (b.name == null || b.name.isBlank()) throw ApiException.badRequest("Customer name is required.");
        if (b.phone == null || !b.phone.trim().matches("\\d{10}")) throw ApiException.badRequest("Enter a valid 10-digit phone.");
        if (b.address1 == null || b.address1.isBlank()) throw ApiException.badRequest("Address is required.");
        if (b.pincode == null || !b.pincode.trim().matches("\\d{6}")) throw ApiException.badRequest("Enter a valid 6-digit PIN code.");
    }
}
