package com.vincent.amogha.modules.transaction;

import com.vincent.amogha.config.security.AmoghaPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService service;

    public TransactionController(TransactionService service) {
        this.service = service;
    }

    @PostMapping
    public Txn create(@RequestBody Txn txn, @AuthenticationPrincipal AmoghaPrincipal principal) {
        return service.create(txn, principal);
    }
}
