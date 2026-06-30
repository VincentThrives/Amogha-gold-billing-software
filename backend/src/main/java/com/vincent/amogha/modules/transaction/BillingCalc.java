package com.vincent.amogha.modules.transaction;

import java.util.List;

/**
 * Server-authoritative billing math (mirrors the frontend core/calc.ts).
 * Recomputes each item's net weight and amount, then rolls up totals — so the
 * stored figures never depend on client-sent amounts. Pure & unit-testable.
 */
public final class BillingCalc {
    private BillingCalc() {}

    public static double netWeight(double gross, double stone, double other) {
        return Math.max(0, gross - stone - other);
    }

    public static double itemAmount(double net, double rate, double purity) {
        return net * rate * (purity / 100.0);
    }

    /** Recomputes net + amount for each item, returns rolled-up totals. */
    public static Txn.Totals computeTotals(List<Txn.TxnItem> items, double margin, double charges) {
        double gross = 0, netW = 0;
        if (items != null) {
            for (Txn.TxnItem it : items) {
                it.net = netWeight(it.gross, it.stone, it.other);
                it.amount = itemAmount(it.net, it.rate, it.purity);
                gross += it.amount;
                netW += it.net;
            }
        }
        Txn.Totals t = new Txn.Totals();
        t.grossAmount = gross;
        t.margin = margin;
        t.netAmount = gross - margin;
        t.billingCharges = charges;
        t.amountPayable = Math.round(t.netAmount - charges);
        t.netWeight = netW;
        return t;
    }
}
