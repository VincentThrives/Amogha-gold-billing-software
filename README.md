# Amogha Gold Company — Billing Software

Gold/silver **buying** (purchase-voucher) billing app for **Amogha Gold Buyer's Private Limited**
(GSTIN `29ABFCA1286P1Z2`). Two roles (Admin / Employee), OTP login, KYC capture, invoice PDF in
the supplied format, fund-approval workflow, and reports.

- **Frontend:** Angular 18 (standalone components — each with its own `.ts` / `.html` / `.scss`).
- **Backend:** Java 21 + **Spring Boot 3.3** + Spring Security (JWT) + Spring Data **MongoDB**.
- Data lives in MongoDB, so records sync across all staff devices. The built Angular app is served
  by the Spring Boot API, so the whole thing runs as **one service** (one Docker image on Render).

```
amogha-billing/
  frontend/                  # Angular 18 app
    src/app/  core/  layout/shell/  features/{login,dashboard,new-transaction,...}  shared/txn-table/
  backend/                   # Spring Boot API (also serves the built frontend)
    src/main/java/com/vincent/amogha/
      config/  (WebConfig, security/{SecurityConfig,JwtUtil,JwtAuthFilter,AmoghaPrincipal})
      common/  (ApiException, GlobalExceptionHandler, Ids)
      modules/ (auth, user, settings, transaction, fund, state, admin)
      bootstrap/DataSeeder.java
    src/test/java/com/vincent/amogha/  (ApiIntegrationTest, BillingCalcTest)
  Dockerfile                 # multi-stage: build Angular → bundle into Spring jar → run
  render.yaml                # Render Blueprint (docker)
```

---

## 1. Run locally

**Backend** (Java 21 required) — zero-setup, starts an **in-process MongoDB** via the `local` profile:
```bash
cd amogha-billing/backend
./mvnw -Dspring-boot.run.profiles=local spring-boot:run     # API on :8080
```
(Use a real DB instead by setting `MONGODB_URI` and dropping the `local` profile.)

**Frontend** — Angular dev server with live reload (proxies `/api` → backend):
```bash
cd amogha-billing/frontend
npm install
npm start                                                   # open http://localhost:4200
```
> The dev proxy (`frontend/proxy.conf.json`) targets `:8088`; the `local` launch profile used by
> the editor runs the API there. If you start the backend with `spring-boot:run` (port 8080), set
> the proxy target to `:8080` to match.

**Single-server** — build the frontend and let the API serve it:
```bash
cd amogha-billing/frontend && npm install && npm run build
cd ../backend && ./mvnw -Dspring-boot.run.profiles=local spring-boot:run   # whole app on :8080
```

**Demo logins** (OTP shown on screen — no SMS gateway yet):

| Role     | Mobile      |
|----------|-------------|
| Admin    | 9999900001  |
| Employee | 9999900002  |

Add/remove employees in **Settings** (admin only).

---

## 2. MongoDB Atlas (free tier)
1. Create a free **M0** cluster at <https://www.mongodb.com/cloud/atlas>.
2. **Database Access** → add a user. **Network Access** → allow `0.0.0.0/0`.
3. **Connect → Drivers** → copy the connection string, e.g.
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
4. Use it as `MONGODB_URI`.

---

## 3. Deploy on Render (Docker)
The Spring Boot app needs a Docker runtime on Render.
1. Push this project to a GitHub repo.
2. Render → **New + → Blueprint** → pick the repo. It reads [`render.yaml`](render.yaml) and builds
   the [`Dockerfile`](Dockerfile) (Angular build → bundled into the Spring jar).
3. Paste your **`MONGODB_URI`** when prompted. `JWT_SECRET` is auto-generated.
4. Deploy → open the service URL. Health check: `/actuator/health`.

Env vars: `MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET`, `STATIC_DIR=classpath:/static`, and Render's
`PORT` (handled automatically).

---

## Features
- **Two OTP logins** — Admin & Employee, fresh OTP every login (server-generated, 5-min expiry).
- **Dashboard** — search by **Name / Bill ID / Phone / Other** (all matching bills).
- **New Transaction** — Gold/Silver → ID proof (≥1 of Aadhaar/PAN/Voter/DL/Passport/Ration/Other),
  seller KYC, reference, optional selfie + client OTP, items (gross/stone/other→net, purity, rate),
  margin & charges → Amount Payable. **Totals are recomputed server-side** (client figures ignored).
- **Transaction List** — latest bill per customer; **Gold/Silver Rate** (admin); **Add Funds**
  (employee requests → admin approves → server-enforced billing balance); **Reports** (doughnut +
  bar + monthly table).
- **Invoice** — supplied format, branded **Amogha Gold Company** with logo, GST address and
  **GSTIN 29ABFCA1286P1Z2**. One-click **Download PDF** + **Print**.

## API (all under `/api`, JWT in `Authorization: Bearer …`, errors as `{"error": "..."}`)
`POST /auth/request-otp` · `POST /auth/verify-otp` · `GET /state` · `PUT /rates` · `PUT /company` ·
`POST/DELETE /users` · `POST /transactions` · `POST /funds` · `POST /funds/{id}/decide` ·
`POST /admin/reset`.

## Tests
**Backend** (JUnit, in-process MongoDB — no external DB needed):
```bash
cd amogha-billing/backend && ./mvnw test
```
- **`ApiIntegrationTest`** (24 cases) — auth/OTP, role-based access, rates, company, users,
  transaction validation, the employee fund-approval workflow, and reset.
- **`BillingCalcTest`** (6 cases) — server billing math verified against the sample bill → ₹4,22,900.

**Frontend** (Karma + Jasmine, headless Chrome):
```bash
cd amogha-billing/frontend && npm test
```
58 specs — `calc` (math/words/dedupe/digits), `StoreService` (every API endpoint), `login`
(role/digit-filter/OTP flows), `dashboard` (all five search modes), `new-transaction` (each
validation case + reactive totals + fund block), `transactions`, and `txn-table`.

> Headless Chrome auto-detects a browser; set `CHROME_BIN` to a Chrome/Chromium path if needed.

## Mobile responsive
Layouts adapt at two breakpoints: the sidebar collapses to a hamburger ≤880px, and ≤560px the
topbar wraps (rates on their own row), stat/grid cards stack to one column, ID-proof chips go
two-up, and the wide invoice scrolls inside its own container (no page-level horizontal scroll).
Verified at 375px.

## Notes / next steps
- **OTP is shown on screen** (no SMS). To send real OTPs, plug an SMS provider (MSG91/Twilio/Fast2SMS)
  into `AuthService.requestOtp` and stop returning the OTP in the response.
- Company details (incl. GSTIN) are editable in **Settings**.
