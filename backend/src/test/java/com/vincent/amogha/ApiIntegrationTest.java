package com.vincent.amogha;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

/** Web-layer API tests against an in-process MongoDB (flapdoodle). Mirrors the
 *  original Node api.test.js — one case each. */
@SpringBootTest(webEnvironment = RANDOM_PORT)
class ApiIntegrationTest {

    @LocalServerPort int port;
    @Autowired TestRestTemplate rest;

    private String url(String path) { return "http://localhost:" + port + path; }

    private ResponseEntity<Map> call(HttpMethod method, String path, Object body, String token) {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        if (token != null) h.setBearerAuth(token);
        return rest.exchange(url(path), method, new HttpEntity<>(body, h), Map.class);
    }

    @SuppressWarnings("unchecked")
    private String login(String phone, String role) {
        Map otp = call(HttpMethod.POST, "/api/auth/request-otp", Map.of("phone", phone, "role", role), null).getBody();
        Map verify = call(HttpMethod.POST, "/api/auth/verify-otp", Map.of("phone", phone, "otp", otp.get("otp")), null).getBody();
        return (String) verify.get("token");
    }
    private String admin() { return login("9999900001", "admin"); }
    private String employee() { return login("9999900002", "employee"); }

    private Map bill(long payable) {
        return Map.of("metal", "gold",
                "customer", Map.of("name", "Cust", "phone", "9812345678"),
                "items", List.of(Map.of("gross", 10, "stone", 0, "other", 0, "purity", 100, "rate", payable / 10.0)),
                "totals", Map.of("margin", 0, "billingCharges", 0));
    }

    @BeforeEach
    void reset() { call(HttpMethod.POST, "/api/admin/reset", Map.of(), admin()); }

    // ---------- AUTH ----------
    @Test void requestOtp_rejectsBadPhone() {
        assertEquals(HttpStatus.BAD_REQUEST, call(HttpMethod.POST, "/api/auth/request-otp", Map.of("phone", "123", "role", "admin"), null).getStatusCode());
    }
    @Test void requestOtp_unknownAccount404() {
        assertEquals(HttpStatus.NOT_FOUND, call(HttpMethod.POST, "/api/auth/request-otp", Map.of("phone", "9000000000", "role", "admin"), null).getStatusCode());
    }
    @Test void requestOtp_validReturnsOtpAndName() {
        Map b = call(HttpMethod.POST, "/api/auth/request-otp", Map.of("phone", "9999900001", "role", "admin"), null).getBody();
        assertTrue(((String) b.get("otp")).matches("\\d{6}"));
        assertEquals("Amogha Admin", b.get("name"));
    }
    @Test void roleMustMatch() {
        assertEquals(HttpStatus.NOT_FOUND, call(HttpMethod.POST, "/api/auth/request-otp", Map.of("phone", "9999900001", "role", "employee"), null).getStatusCode());
    }
    @Test void verifyOtp_wrongOtpRejected() {
        call(HttpMethod.POST, "/api/auth/request-otp", Map.of("phone", "9999900001", "role", "admin"), null);
        assertEquals(HttpStatus.BAD_REQUEST, call(HttpMethod.POST, "/api/auth/verify-otp", Map.of("phone", "9999900001", "otp", "000000"), null).getStatusCode());
    }
    @Test void verifyOtp_validIssuesToken() {
        Map otp = call(HttpMethod.POST, "/api/auth/request-otp", Map.of("phone", "9999900001", "role", "admin"), null).getBody();
        Map v = call(HttpMethod.POST, "/api/auth/verify-otp", Map.of("phone", "9999900001", "otp", otp.get("otp")), null).getBody();
        assertNotNull(v.get("token"));
        assertEquals("admin", ((Map) v.get("user")).get("role"));
    }
    @Test void otpIsSingleUse() {
        Map otp = call(HttpMethod.POST, "/api/auth/request-otp", Map.of("phone", "9999900001", "role", "admin"), null).getBody();
        assertEquals(HttpStatus.OK, call(HttpMethod.POST, "/api/auth/verify-otp", Map.of("phone", "9999900001", "otp", otp.get("otp")), null).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, call(HttpMethod.POST, "/api/auth/verify-otp", Map.of("phone", "9999900001", "otp", otp.get("otp")), null).getStatusCode());
    }

    // ---------- STATE / RBAC ----------
    @Test void state_requiresToken() {
        assertEquals(HttpStatus.UNAUTHORIZED, call(HttpMethod.GET, "/api/state", null, null).getStatusCode());
    }
    @Test void adminState_hasGstinAndName() {
        Map s = call(HttpMethod.GET, "/api/state", null, admin()).getBody();
        assertEquals("29ABFCA1286P1Z2", ((Map) s.get("company")).get("gstn"));
        assertEquals("Amogha Gold Company", ((Map) s.get("company")).get("name"));
    }
    @Test void employeeState_scopedToSelf() {
        Map s = call(HttpMethod.GET, "/api/state", null, employee()).getBody();
        assertEquals(1, ((List) s.get("users")).size());
        assertEquals("employee", ((Map) s.get("me")).get("role"));
    }
    @Test void employeeState_seesOnlyOwnTransactions() {
        String adminT = admin(), empT = employee();
        call(HttpMethod.POST, "/api/transactions", bill(5000), adminT);   // admin bill (employeeId u-admin)
        fund(empT, adminT, 10000);
        call(HttpMethod.POST, "/api/transactions", bill(6000), empT);      // employee's own bill (pending)
        // employee sees only their own bill, not the admin's
        List empTxns = (List) call(HttpMethod.GET, "/api/state", null, empT).getBody().get("transactions");
        assertEquals(1, empTxns.size());
        assertEquals("u-emp1", ((Map) empTxns.get(0)).get("employeeId"));
        // admin sees both bills
        assertEquals(2, ((List) call(HttpMethod.GET, "/api/state", null, adminT).getBody().get("transactions")).size());
    }

    // ---------- RATES / COMPANY / USERS ----------
    @Test void employeeCannotSetRates() {
        assertEquals(HttpStatus.FORBIDDEN, call(HttpMethod.PUT, "/api/rates", Map.of("gold", 1, "silver", 1), employee()).getStatusCode());
    }
    @Test void adminSetsRates() {
        assertEquals(HttpStatus.OK, call(HttpMethod.PUT, "/api/rates", Map.of("gold", 8530, "silver", 98), admin()).getStatusCode());
        Map s = call(HttpMethod.GET, "/api/state", null, admin()).getBody();
        assertEquals(98.0, ((Number) ((Map) s.get("rates")).get("silver")).doubleValue());
    }
    @Test void adminUpdatesCompanyGstin() {
        call(HttpMethod.PUT, "/api/company", Map.of("name", "Amogha Gold Company", "gstn", "29XXXXX0000X1Z9", "addressLines", List.of("L1"), "phone", "+91 1"), admin());
        Map s = call(HttpMethod.GET, "/api/state", null, admin()).getBody();
        assertEquals("29XXXXX0000X1Z9", ((Map) s.get("company")).get("gstn"));
    }
    @Test void adminAddsEmployee_duplicateRejected() {
        assertEquals(HttpStatus.OK, call(HttpMethod.POST, "/api/users", Map.of("name", "New", "phone", "9111122223"), admin()).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, call(HttpMethod.POST, "/api/users", Map.of("name", "Dup", "phone", "9111122223"), admin()).getStatusCode());
    }
    @Test void employeeCannotAddUsers() {
        assertEquals(HttpStatus.FORBIDDEN, call(HttpMethod.POST, "/api/users", Map.of("name", "X", "phone", "9111122224"), employee()).getStatusCode());
    }

    // ---------- TRANSACTIONS ----------
    @Test void txnWithoutNameRejected() {
        Map body = Map.of("metal", "gold", "customer", Map.of(), "items", List.of(), "totals", Map.of("margin", 0, "billingCharges", 0));
        assertEquals(HttpStatus.BAD_REQUEST, call(HttpMethod.POST, "/api/transactions", body, admin()).getStatusCode());
    }
    @Test void txnZeroPayableRejected() {
        Map body = Map.of("metal", "gold", "customer", Map.of("name", "X"), "items", List.of(), "totals", Map.of("margin", 0, "billingCharges", 0));
        assertEquals(HttpStatus.BAD_REQUEST, call(HttpMethod.POST, "/api/transactions", body, admin()).getStatusCode());
    }
    @Test void adminBillsWithoutFunds() {
        Map r = call(HttpMethod.POST, "/api/transactions", bill(5000), admin()).getBody();
        assertTrue(((String) r.get("billNo")).matches("\\d{4}[0-9A-F]{6}"));
    }
    @Test void employeeSubmit_createsPendingAndDoesNotDebitUntilApproval() {
        String adminT = admin(), empT = employee();
        fund(empT, adminT, 10000);
        Map r = call(HttpMethod.POST, "/api/transactions", bill(6000), empT).getBody();
        assertEquals("pending", r.get("status"));   // staff bills wait for admin approval
        // funds are NOT debited at submit — only on approval; balance stays put
        Map s = call(HttpMethod.GET, "/api/state", null, empT).getBody();
        String empId = (String) ((Map) s.get("me")).get("id");
        assertEquals(10000.0, ((Number) ((Map) s.get("balances")).get(empId)).doubleValue());
    }
    @Test void submit_blockedWhenStaffFundsInsufficient() {
        // A staff member with no funds cannot send a bill for approval — they must get funds approved first.
        ResponseEntity<Map> r = call(HttpMethod.POST, "/api/transactions", bill(6000), employee());
        assertEquals(HttpStatus.BAD_REQUEST, r.getStatusCode());
        assertTrue(((String) r.getBody().get("error")).contains("Insufficient funds"));
    }
    @Test void adminSubmit_createsApprovedImmediately() {
        assertEquals("approved", call(HttpMethod.POST, "/api/transactions", bill(5000), admin()).getBody().get("status"));
    }
    @Test void employeeMarginAndChargesAreForcedToZeroAtSubmit() {
        String adminT = admin(), empT = employee();
        fund(empT, adminT, 10000);
        Map body = new java.util.HashMap<>(bill(6000));
        body.put("totals", Map.of("margin", 500, "billingCharges", 999)); // staff tries to set them
        Map r = call(HttpMethod.POST, "/api/transactions", body, empT).getBody();
        Map totals = (Map) r.get("totals");
        assertEquals(0.0, ((Number) totals.get("margin")).doubleValue());
        assertEquals(0.0, ((Number) totals.get("billingCharges")).doubleValue());
    }

    // ---------- APPROVAL ----------
    private void fund(String empT, String adminT, int amount) {
        // admin must have their own capital before they can approve staff funds
        call(HttpMethod.POST, "/api/admin-funds", Map.of("amount", amount, "note", "seed"), adminT);
        Map fr = call(HttpMethod.POST, "/api/funds", Map.of("amount", amount), empT).getBody();
        call(HttpMethod.POST, "/api/funds/" + fr.get("id") + "/decide", Map.of("approve", true, "method", "Cash"), adminT);
    }
    @Test void approval_appliesChargesDebitsFundsAndFinalises() {
        String adminT = admin(), empT = employee();
        fund(empT, adminT, 10000);
        Map t = call(HttpMethod.POST, "/api/transactions", bill(6000), empT).getBody();
        Map approved = call(HttpMethod.POST, "/api/transactions/" + t.get("id") + "/approve",
                Map.of("margin", 0, "billingCharges", 100), adminT).getBody();
        assertEquals("approved", approved.get("status"));
        assertEquals(5900L, ((Number) ((Map) approved.get("totals")).get("amountPayable")).longValue()); // 6000 - 100
        Map s = call(HttpMethod.GET, "/api/state", null, empT).getBody();
        String empId = (String) ((Map) s.get("me")).get("id");
        assertEquals(4100.0, ((Number) ((Map) s.get("balances")).get(empId)).doubleValue()); // 10000 - 5900
    }
    @Test void approval_adminEditsItemsAndRateRecomputesTotals() {
        String adminT = admin(), empT = employee();
        fund(empT, adminT, 500000);
        Map t = call(HttpMethod.POST, "/api/transactions", bill(6000), empT).getBody();
        // admin edits the 24crt rate 600 -> 1200 (net 10 x 1200 x 100% = 12000), charges 100
        Map editedItem = Map.of("article", "NECKLACE", "gross", 10, "stone", 0, "other", 0, "purity", 100, "rate", 1200);
        Map approved = call(HttpMethod.POST, "/api/transactions/" + t.get("id") + "/approve",
                Map.of("items", List.of(editedItem), "margin", 0, "billingCharges", 100), adminT).getBody();
        assertEquals(12000.0, ((Number) ((Map) approved.get("totals")).get("grossAmount")).doubleValue());
        assertEquals(11900L, ((Number) ((Map) approved.get("totals")).get("amountPayable")).longValue()); // 12000 - 100
        assertEquals(1200.0, ((Number) ((Map) ((List) approved.get("items")).get(0)).get("rate")).doubleValue());
        Map s = call(HttpMethod.GET, "/api/state", null, empT).getBody();
        String empId = (String) ((Map) s.get("me")).get("id");
        assertEquals(488100.0, ((Number) ((Map) s.get("balances")).get(empId)).doubleValue()); // 500000 - 11900
    }
    @Test void employeeCannotApprove() {
        String adminT = admin(), empT = employee();
        fund(empT, adminT, 10000);
        Map t = call(HttpMethod.POST, "/api/transactions", bill(6000), empT).getBody();
        assertEquals(HttpStatus.FORBIDDEN, call(HttpMethod.POST, "/api/transactions/" + t.get("id") + "/approve",
                Map.of("margin", 0, "billingCharges", 0), empT).getStatusCode());
    }
    // ---------- RELEASE AMOUNT ----------
    private Map billWithRelease(double release, String method, String bank) {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("metal", "gold");
        body.put("customer", Map.of("name", "Cust", "phone", "9812345678"));
        body.put("items", List.of(Map.of("gross", 100, "stone", 0, "other", 0, "purity", 100, "rate", 5000))); // gross 5,00,000
        body.put("totals", Map.of("margin", 0, "billingCharges", 0, "releaseAmount", release));
        if (method != null) body.put("releaseMethod", method);
        if (bank != null) body.put("releaseBank", bank);
        return body;
    }
    @Test void release_deductsFromPayableAndDebitsPayoutOnly() {
        String adminT = admin(), empT = employee();
        fund(empT, adminT, 600000);
        Map t = call(HttpMethod.POST, "/api/transactions", billWithRelease(300000, "RTGS", "HDFC Bank"), empT).getBody();
        assertEquals("pending", t.get("status"));
        assertEquals(200000L, ((Number) ((Map) t.get("totals")).get("amountPayable")).longValue()); // 5L - 3L
        Map approved = call(HttpMethod.POST, "/api/transactions/" + t.get("id") + "/approve",
                Map.of("margin", 0, "billingCharges", 0, "releaseAmount", 300000, "releaseMethod", "RTGS", "releaseBank", "HDFC Bank"), adminT).getBody();
        assertEquals(200000L, ((Number) ((Map) approved.get("totals")).get("amountPayable")).longValue());
        assertEquals(300000.0, ((Number) ((Map) approved.get("totals")).get("releaseAmount")).doubleValue());
        // wallet debited by the customer payout only (release is paid to the bank separately): 6L - 2L = 4L
        Map s = call(HttpMethod.GET, "/api/state", null, empT).getBody();
        assertEquals(400000.0, ((Number) ((Map) s.get("balances")).get("u-emp1")).doubleValue());
    }
    @Test void release_cannotExceedGross() {
        assertEquals(HttpStatus.BAD_REQUEST, call(HttpMethod.POST, "/api/transactions", billWithRelease(600000, "RTGS", "HDFC Bank"), employee()).getStatusCode());
    }
    @Test void release_requiresMethodAndBank() {
        ResponseEntity<Map> r = call(HttpMethod.POST, "/api/transactions", billWithRelease(300000, null, null), employee());
        assertEquals(HttpStatus.BAD_REQUEST, r.getStatusCode());
        assertTrue(((String) r.getBody().get("error")).contains("release amount was paid"));
    }

    // ---------- SOFT DELETE / RECYCLE BIN ----------
    @Test void softDelete_removesFromActiveAddsToRecycleAndRefundsStaff() {
        String adminT = admin(), empT = employee();
        fund(empT, adminT, 10000);
        Map t = call(HttpMethod.POST, "/api/transactions", bill(6000), empT).getBody();
        call(HttpMethod.POST, "/api/transactions/" + t.get("id") + "/approve", Map.of("margin", 0, "billingCharges", 0), adminT);
        // approved → staff debited 6000 (balance 4000)
        String empId = (String) ((Map) call(HttpMethod.GET, "/api/state", null, empT).getBody().get("me")).get("id");
        // delete
        call(HttpMethod.POST, "/api/transactions/" + t.get("id") + "/delete", Map.of(), adminT);
        Map s = call(HttpMethod.GET, "/api/state", null, adminT).getBody();
        assertTrue(((List) s.get("transactions")).isEmpty());                 // gone from active
        assertEquals(1, ((List) s.get("deletedTransactions")).size());        // in recycle bin
        assertEquals(10000.0, ((Number) ((Map) s.get("balances")).get(empId)).doubleValue()); // funds refunded
    }
    @Test void restore_bringsBackAndReDebits() {
        String adminT = admin(), empT = employee();
        fund(empT, adminT, 10000);
        Map t = call(HttpMethod.POST, "/api/transactions", bill(6000), empT).getBody();
        call(HttpMethod.POST, "/api/transactions/" + t.get("id") + "/approve", Map.of("margin", 0, "billingCharges", 0), adminT);
        call(HttpMethod.POST, "/api/transactions/" + t.get("id") + "/delete", Map.of(), adminT);
        call(HttpMethod.POST, "/api/transactions/" + t.get("id") + "/restore", Map.of(), adminT);
        Map s = call(HttpMethod.GET, "/api/state", null, adminT).getBody();
        assertEquals(1, ((List) s.get("transactions")).size());               // back to active
        assertTrue(((List) s.get("deletedTransactions")).isEmpty());
        assertEquals(4000.0, ((Number) ((Map) s.get("balances")).get("u-emp1")).doubleValue()); // re-debited
    }
    @Test void purge_onlyFromRecycleBin() {
        String adminT = admin();
        Map t = call(HttpMethod.POST, "/api/transactions", bill(5000), adminT).getBody(); // admin bill, approved
        // cannot purge an active bill
        assertEquals(HttpStatus.BAD_REQUEST, call(HttpMethod.DELETE, "/api/transactions/" + t.get("id"), null, adminT).getStatusCode());
        // delete then purge
        call(HttpMethod.POST, "/api/transactions/" + t.get("id") + "/delete", Map.of(), adminT);
        assertEquals(HttpStatus.OK, call(HttpMethod.DELETE, "/api/transactions/" + t.get("id"), null, adminT).getStatusCode());
        Map s = call(HttpMethod.GET, "/api/state", null, adminT).getBody();
        assertTrue(((List) s.get("deletedTransactions")).isEmpty());          // gone forever
    }
    @Test void pendingBillCannotBeDeleted() {
        String adminT = admin(), empT = employee();
        fund(empT, adminT, 10000);
        Map t = call(HttpMethod.POST, "/api/transactions", bill(6000), empT).getBody(); // pending
        assertEquals(HttpStatus.BAD_REQUEST, call(HttpMethod.POST, "/api/transactions/" + t.get("id") + "/delete", Map.of(), adminT).getStatusCode());
    }
    @Test void employeeCannotDeleteBills() {
        String adminT = admin(), empT = employee();
        Map t = call(HttpMethod.POST, "/api/transactions", bill(5000), adminT).getBody();
        assertEquals(HttpStatus.FORBIDDEN, call(HttpMethod.POST, "/api/transactions/" + t.get("id") + "/delete", Map.of(), empT).getStatusCode());
    }

    @Test void rejectSetsStatusRejected() {
        String adminT = admin(), empT = employee();
        fund(empT, adminT, 10000);
        Map t = call(HttpMethod.POST, "/api/transactions", bill(6000), empT).getBody();
        assertEquals("rejected", call(HttpMethod.POST, "/api/transactions/" + t.get("id") + "/reject", Map.of(), adminT).getBody().get("status"));
    }

    // ---------- BILLING CONFIG ----------
    @Test void billingConfig_defaultsToHundredAndIsUpdatable() {
        String adminT = admin();
        Map s = call(HttpMethod.GET, "/api/state", null, adminT).getBody();
        assertEquals(100.0, ((Number) ((Map) s.get("billingConfig")).get("defaultBillingCharges")).doubleValue());
        call(HttpMethod.PUT, "/api/billing-config", Map.of("defaultMargin", 50, "defaultBillingCharges", 150), adminT);
        s = call(HttpMethod.GET, "/api/state", null, adminT).getBody();
        assertEquals(150.0, ((Number) ((Map) s.get("billingConfig")).get("defaultBillingCharges")).doubleValue());
    }
    @Test void employeeCannotSetBillingConfig() {
        assertEquals(HttpStatus.FORBIDDEN, call(HttpMethod.PUT, "/api/billing-config",
                Map.of("defaultMargin", 0, "defaultBillingCharges", 100), employee()).getStatusCode());
    }
    @Test void rejectingFundDoesNotCredit() {
        String adminT = admin(), empT = employee();
        Map fr = call(HttpMethod.POST, "/api/funds", Map.of("amount", 7000), empT).getBody();
        call(HttpMethod.POST, "/api/funds/" + fr.get("id") + "/decide", Map.of("approve", false), adminT);
        Map s = call(HttpMethod.GET, "/api/state", null, empT).getBody();
        String empId = (String) ((Map) s.get("me")).get("id");
        Object bal = ((Map) s.get("balances")).get(empId);
        assertTrue(bal == null || ((Number) bal).doubleValue() == 0.0);
    }
    @Test void employeeCannotDecide() {
        String empT = employee();
        Map fr = call(HttpMethod.POST, "/api/funds", Map.of("amount", 1000), empT).getBody();
        assertEquals(HttpStatus.FORBIDDEN, call(HttpMethod.POST, "/api/funds/" + fr.get("id") + "/decide", Map.of("approve", true), empT).getStatusCode());
    }
    @Test void approvingFundRequiresPaymentMethod() {
        String adminT = admin(), empT = employee();
        Map fr = call(HttpMethod.POST, "/api/funds", Map.of("amount", 5000), empT).getBody();
        ResponseEntity<Map> r = call(HttpMethod.POST, "/api/funds/" + fr.get("id") + "/decide", Map.of("approve", true), adminT);
        assertEquals(HttpStatus.BAD_REQUEST, r.getStatusCode());
        assertTrue(((String) r.getBody().get("error")).contains("how the funds were given"));
    }
    @Test void approvingFundStoresMethodAndReference() {
        String adminT = admin(), empT = employee();
        call(HttpMethod.POST, "/api/admin-funds", Map.of("amount", 5000, "note", "seed"), adminT);
        Map fr = call(HttpMethod.POST, "/api/funds", Map.of("amount", 5000), empT).getBody();
        call(HttpMethod.POST, "/api/funds/" + fr.get("id") + "/decide",
                Map.of("approve", true, "method", "NEFT", "reference", "TXN12345"), adminT);
        Map s = call(HttpMethod.GET, "/api/state", null, adminT).getBody();
        Map decided = (Map) ((List<Map>) s.get("funds")).stream().filter(x -> fr.get("id").equals(x.get("id"))).findFirst().orElseThrow();
        assertEquals("approved", decided.get("status"));
        assertEquals("NEFT", decided.get("method"));
        assertEquals("TXN12345", decided.get("reference"));
    }
    @Test void adminCannotRequestFunds() {
        assertEquals(HttpStatus.FORBIDDEN, call(HttpMethod.POST, "/api/funds", Map.of("amount", 1000), admin()).getStatusCode());
    }

    // ---------- ADMIN FUND POOL / EXPENSES ----------
    @Test void adminAddsFund_reflectedInAvailable() {
        String adminT = admin();
        call(HttpMethod.POST, "/api/admin-funds", Map.of("amount", 500000, "note", "cash deposit"), adminT);
        Map s = call(HttpMethod.GET, "/api/state", null, adminT).getBody();
        assertEquals(500000.0, ((Number) s.get("adminFundAvailable")).doubleValue());
        assertEquals(1, ((List) s.get("adminFunds")).size());
    }
    @Test void adminFund_recordsMethodDateAndAddedBy() {
        String adminT = admin();
        call(HttpMethod.POST, "/api/admin-funds", Map.of("amount", 250000, "method", "RTGS", "note", "HDFC transfer"), adminT);
        Map s = call(HttpMethod.GET, "/api/state", null, adminT).getBody();
        Map f = (Map) ((List) s.get("adminFunds")).get(0);
        assertEquals("RTGS", f.get("method"));
        assertEquals("HDFC transfer", f.get("note"));
        assertEquals("Amogha Admin", f.get("addedByName"));   // captured from the principal
        assertNotNull(f.get("date"));
    }
    @Test void expenseReducesAvailable() {
        String adminT = admin();
        call(HttpMethod.POST, "/api/admin-funds", Map.of("amount", 100000, "note", "seed"), adminT);
        call(HttpMethod.POST, "/api/expenses", Map.of("amount", 2500, "reason", "shop rent"), adminT);
        Map s = call(HttpMethod.GET, "/api/state", null, adminT).getBody();
        assertEquals(97500.0, ((Number) s.get("adminFundAvailable")).doubleValue()); // 100000 - 2500
        assertEquals(1, ((List) s.get("expenses")).size());
    }
    @Test void expenseRequiresReason() {
        ResponseEntity<Map> r = call(HttpMethod.POST, "/api/expenses", Map.of("amount", 100), admin());
        assertEquals(HttpStatus.BAD_REQUEST, r.getStatusCode());
        assertTrue(((String) r.getBody().get("error")).contains("reason"));
    }
    @Test void employeeCannotAddFundOrExpense() {
        String empT = employee();
        assertEquals(HttpStatus.FORBIDDEN, call(HttpMethod.POST, "/api/admin-funds", Map.of("amount", 1000, "note", "x"), empT).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, call(HttpMethod.POST, "/api/expenses", Map.of("amount", 100, "reason", "x"), empT).getStatusCode());
    }
    @Test void approvingFund_blockedWhenAdminCapitalShort() {
        String adminT = admin(), empT = employee();
        call(HttpMethod.POST, "/api/admin-funds", Map.of("amount", 3000, "note", "seed"), adminT); // only 3000
        Map fr = call(HttpMethod.POST, "/api/funds", Map.of("amount", 5000), empT).getBody();
        ResponseEntity<Map> r = call(HttpMethod.POST, "/api/funds/" + fr.get("id") + "/decide", Map.of("approve", true, "method", "Cash"), adminT);
        assertEquals(HttpStatus.BAD_REQUEST, r.getStatusCode());
        assertTrue(((String) r.getBody().get("error")).contains("Insufficient admin funds"));
    }
    @Test void approvingFund_succeedsAfterTopUp_drawsDownAvailable() {
        String adminT = admin(), empT = employee();
        call(HttpMethod.POST, "/api/admin-funds", Map.of("amount", 5000, "note", "seed"), adminT);
        Map fr = call(HttpMethod.POST, "/api/funds", Map.of("amount", 5000), empT).getBody();
        call(HttpMethod.POST, "/api/funds/" + fr.get("id") + "/decide", Map.of("approve", true, "method", "Cash"), adminT);
        Map s = call(HttpMethod.GET, "/api/state", null, adminT).getBody();
        assertEquals(0.0, ((Number) s.get("adminFundAvailable")).doubleValue());          // 5000 - 5000
        assertEquals(5000.0, ((Number) ((Map) s.get("balances")).get("u-emp1")).doubleValue());
    }
    @Test void employeeStateHidesAdminLedger() {
        String adminT = admin(), empT = employee();
        call(HttpMethod.POST, "/api/admin-funds", Map.of("amount", 5000, "note", "seed"), adminT);
        call(HttpMethod.POST, "/api/expenses", Map.of("amount", 100, "reason", "x"), adminT);
        Map s = call(HttpMethod.GET, "/api/state", null, empT).getBody();
        assertTrue(((List) s.get("adminFunds")).isEmpty());
        assertTrue(((List) s.get("expenses")).isEmpty());
        assertEquals(0.0, ((Number) s.get("adminFundAvailable")).doubleValue());
    }

    // ---------- CUSTOMERS ----------
    private Map customerBody(String name, String phone) {
        return Map.of("name", name, "phone", phone, "address1", "MG Road", "pincode", "560073",
                "idProofs", List.of(Map.of("type", "PAN Card", "number", "ABCDE1234F")),
                "reference", Map.of());
    }
    @Test void registerCustomer_succeedsAndAppearsInState() {
        String t = admin();
        Map res = call(HttpMethod.POST, "/api/customers", customerBody("Ravi", "9811122233"), t).getBody();
        assertEquals(Boolean.FALSE, res.get("existed"));
        List custs = (List) call(HttpMethod.GET, "/api/state", null, t).getBody().get("customers");
        assertEquals(1, custs.size());
    }
    @Test void registerCustomer_duplicatePhoneUpdatesAndFlagsExisted() {
        String t = admin();
        call(HttpMethod.POST, "/api/customers", customerBody("Ravi", "9811122233"), t);
        Map res = call(HttpMethod.POST, "/api/customers", customerBody("Ravi Kumar", "9811122233"), t).getBody();
        assertEquals(Boolean.TRUE, res.get("existed"));
        List custs = (List) call(HttpMethod.GET, "/api/state", null, t).getBody().get("customers");
        assertEquals(1, custs.size());  // updated, not duplicated
        assertEquals("Ravi Kumar", ((Map) custs.get(0)).get("name"));
    }
    @Test void registerCustomer_requiresIdProof() {
        Map noId = Map.of("name", "X", "phone", "9811122233", "address1", "A", "pincode", "560073", "reference", Map.of());
        assertEquals(HttpStatus.BAD_REQUEST, call(HttpMethod.POST, "/api/customers", noId, admin()).getStatusCode());
    }
    @Test void registerCustomer_employeeCanRegister() {
        assertEquals(HttpStatus.OK, call(HttpMethod.POST, "/api/customers", customerBody("Ravi", "9811122244"), employee()).getStatusCode());
    }

    // ---------- RESET ----------
    @Test void resetWipesTransactions() {
        String adminT = admin();
        call(HttpMethod.POST, "/api/transactions", bill(5000), adminT);
        assertTrue(((List) call(HttpMethod.GET, "/api/state", null, adminT).getBody().get("transactions")).size() >= 1);
        call(HttpMethod.POST, "/api/admin/reset", Map.of(), adminT);
        assertEquals(0, ((List) call(HttpMethod.GET, "/api/state", null, adminT).getBody().get("transactions")).size());
    }
}
