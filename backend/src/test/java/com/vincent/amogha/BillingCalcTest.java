package com.vincent.amogha;

import com.vincent.amogha.modules.transaction.BillingCalc;
import com.vincent.amogha.modules.transaction.Txn;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/** Pure billing-math tests (no Spring / no Mongo) — one case each. */
class BillingCalcTest {

    private Txn.TxnItem item(double gross, double stone, double other, double purity, double rate) {
        Txn.TxnItem it = new Txn.TxnItem();
        it.gross = gross; it.stone = stone; it.other = other; it.purity = purity; it.rate = rate;
        return it;
    }

    @Test void netWeight_subtractsStoneAndOther() {
        assertEquals(55.11, BillingCalc.netWeight(55.11, 0, 0), 1e-9);
        assertEquals(17, BillingCalc.netWeight(20, 2, 1), 1e-9);
    }

    @Test void netWeight_neverNegative() {
        assertEquals(0, BillingCalc.netWeight(5, 10, 0), 1e-9);
    }

    @Test void itemAmount_matchesSampleBill() {
        assertEquals(423079.47, BillingCalc.itemAmount(55.11, 8530, 90), 0.01);
    }

    @Test void itemAmount_zeroRate() {
        assertEquals(0, BillingCalc.itemAmount(10, 0, 91.6), 1e-9);
    }

    @Test void computeTotals_reproducesSampleInvoice() {
        Txn.Totals t = BillingCalc.computeTotals(List.of(item(55.11, 0, 0, 90, 8530)), 79, 100);
        assertEquals(423079.47, t.grossAmount, 0.01);
        assertEquals(423000.47, t.netAmount, 0.01);   // gross - margin
        assertEquals(422900L, t.amountPayable);        // (net - charges) rounded
        assertEquals(55.11, t.netWeight, 1e-6);
    }

    @Test void computeTotals_sumsMultipleItemsAndSetsNetAmount() {
        Txn.Totals t = BillingCalc.computeTotals(
                List.of(item(20, 0, 0, 100, 100), item(10, 0, 0, 50, 200)), 0, 0);
        // 20*100*1.0 = 2000 ; 10*200*0.5 = 1000
        assertEquals(3000, t.grossAmount, 1e-9);
        assertEquals(3000L, t.amountPayable);
        assertEquals(30, t.netWeight, 1e-9);
    }
}
