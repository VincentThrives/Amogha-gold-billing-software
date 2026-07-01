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

    public record ApproveRequest(java.util.List<Txn.TxnItem> items, double margin, double billingCharges) {}

    @PostMapping("/{id}/approve")
    public Txn approve(@PathVariable String id, @RequestBody ApproveRequest body, @AuthenticationPrincipal AmoghaPrincipal principal) {
        return service.approve(id, body.items(), body.margin(), body.billingCharges(), principal);
    }

    @PostMapping("/{id}/reject")
    public Txn reject(@PathVariable String id, @AuthenticationPrincipal AmoghaPrincipal principal) {
        return service.reject(id, principal);
    }

    @PostMapping("/{id}/delete")
    public Txn softDelete(@PathVariable String id, @AuthenticationPrincipal AmoghaPrincipal principal) {
        return service.softDelete(id, principal);
    }

    @PostMapping("/{id}/restore")
    public Txn restore(@PathVariable String id) {
        return service.restore(id);
    }

    @DeleteMapping("/{id}")
    public java.util.Map<String, Boolean> purge(@PathVariable String id) {
        service.purge(id);
        return java.util.Map.of("ok", true);
    }
}
