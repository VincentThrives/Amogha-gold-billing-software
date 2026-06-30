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
    @Test void employeeZeroBalanceBlocked() {
        ResponseEntity<Map> r = call(HttpMethod.POST, "/api/transactions", bill(5000), employee());
        assertEquals(HttpStatus.BAD_REQUEST, r.getStatusCode());
        assertTrue(((String) r.getBody().get("error")).contains("Insufficient funds"));
    }

    // ---------- FUNDS ----------
    @Test void fundWorkflow_requestApproveBillDebit() {
        String adminT = admin(), empT = employee();
        Map fr = call(HttpMethod.POST, "/api/funds", Map.of("amount", 10000, "note", "float"), empT).getBody();
        assertEquals("pending", fr.get("status"));
        assertEquals(HttpStatus.OK, call(HttpMethod.POST, "/api/funds/" + fr.get("id") + "/decide", Map.of("approve", true), adminT).getStatusCode());

        Map s = call(HttpMethod.GET, "/api/state", null, empT).getBody();
        String empId = (String) ((Map) s.get("me")).get("id");
        assertEquals(10000.0, ((Number) ((Map) s.get("balances")).get(empId)).doubleValue());

        assertEquals(HttpStatus.OK, call(HttpMethod.POST, "/api/transactions", bill(6000), empT).getStatusCode());
        s = call(HttpMethod.GET, "/api/state", null, empT).getBody();
        assertEquals(4000.0, ((Number) ((Map) s.get("balances")).get(empId)).doubleValue());
        assertEquals(HttpStatus.BAD_REQUEST, call(HttpMethod.POST, "/api/transactions", bill(5000), empT).getStatusCode());
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
    @Test void adminCannotRequestFunds() {
        assertEquals(HttpStatus.FORBIDDEN, call(HttpMethod.POST, "/api/funds", Map.of("amount", 1000), admin()).getStatusCode());
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
