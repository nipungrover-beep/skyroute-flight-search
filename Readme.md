# SkyRoute — Domestic Flight Search (Test Automation POC)

A small full-stack app for searching domestic flights, built as a stable target for UI/API test automation (Playwright, Selenium, etc.). Search results are seeded from a fixed, deterministic dataset — no randomness — so the same query always returns the same results.

**Scope:** search + results (autocomplete, filters, sorting), plus fare and seat selection ending in a confirmation summary — including switching Economy ↔ Business right from that summary screen. A standalone login/signup/forgot-password flow exists too, but isn't wired into the search/booking flow above — no session, no protected routes. Still no passenger-details form or payment — booking itself stays out of scope.

## Stack

- **Client:** React 18 + React Router, built with Vite
- **Server:** Node.js + Express REST API
- **Database:** SQLite via Node's built-in `node:sqlite` module (no native build step), file-based, seeded from static data

## Project layout

```
client/   React SPA (search form, results, filters)
server/   Express API + SQLite database + seed data
e2e/      Playwright smoke + regression tests against the running app (localhost:5173)
```

## Prerequisites

- [Node.js](https://nodejs.org/) 22.5+ (this was set up and tested against Node 24 LTS) and npm — required for the built-in `node:sqlite` module.

## Setup

From the repo root (`c:\POC-Test Automation`):

```powershell
npm install
npm run seed
```

`npm install` installs dependencies for both `client` and `server` (npm workspaces). `npm run seed` creates `server/data/flights.sqlite` and loads the airports/flights sample data. Re-run `npm run seed` any time to reset the database back to its known-good state.

## Run

```powershell
npm run dev
```

This starts the API on **http://localhost:4000** and the React app on **http://localhost:5173** together. The client dev server proxies `/api/*` requests to the API, so just open http://localhost:5173.

To run them separately: `npm run dev:server` / `npm run dev:client`.

## Tests

```powershell
npm test
```

Runs the API test suite (`server/tests/`) with Node's built-in test runner (`node --test`) and `supertest`. Tests run against an in-memory SQLite database (`DB_PATH=:memory:`), seeded fresh in a `before()` hook — fully isolated from the dev database in `server/data/`, so they're safe to run while `npm run dev` is active.

- `regression/flights-search.regression.test.js` — the search happy path (route filtering + default price sort), input validation (same origin/destination, past date, unknown airport code), and the empty-results edge case (`GOI → IXC`).
- `regression/availability.regression.test.js` — the dedicated `/availability` endpoint (has-enough-seats, not-enough-seats, unknown flight id) and seat-based filtering on the search endpoint itself.
- `regression/seat-fare-selection.regression.test.js` — `/fares` (ascending tiers derived from base price), `/seatmap` (correct seat count, deterministic across requests, business 2-2 layout), and `/confirm` (correct total = fare × passengers + seat fee, rejects taken/unknown seats and unknown fares).
- `regression/auth.regression.test.js` — signup (all fields, optional username, duplicate email/mobile/username rejected, mismatched confirm password rejected), login by email/mobile/username (and rejecting a wrong password or unknown login ID), and the forgot-password → reset-password round trip (including rejecting an invalid or already-used token).

Run just the regression tests with `npm run test:regression`.

### ETL tests (seed data pipeline)

```powershell
npm run test:etl
```

This app has no external data warehouse, but `server/src/seed/` is a genuine little ETL pipeline — **extract** (static airport/flight arrays) → **transform** (compute `arriveTime` from `departTime` + duration, including day-rollover) → **load** (insert into SQLite). `tests/etl/seed-pipeline.etl.test.js` covers:

- **Extract** — source data is well-formed: 12 unique 3-letter airport codes, exactly 55 flight records.
- **Transform** — `addMinutes()` clock arithmetic is correct, including midnight rollover (e.g. `21:15 + 165min → 00:00`); every flight's `arriveTime` matches its own `departTime` + duration; basic data-quality checks (positive prices/seats/durations, business fare costs more than economy).
- **Load** — `seedDatabase()` inserts exactly the source row counts; every flight's `from`/`to` airport code actually exists (no orphaned foreign keys); re-running the seed is idempotent (no duplicate/accumulating rows); the intentionally-unseeded `GOI ↔ IXC` route stays empty (protects the empty-results fixture used elsewhere).

### Boundary value & wildcard search tests

```powershell
npm run test:boundary
```

`server/tests/boundary/` — edge-of-range and pattern-matching coverage across every endpoint, run via `npm run test:boundary` (also included in the full `npm test`):

- `passengers.boundary.test.js` — the valid range `1`–`9` at every edge (`0`, `1`, `9`, `10`, `-1`, non-numeric) across `/api/flights`, `/availability`, and `/confirm`.
- `date.boundary.test.js` — yesterday/today/tomorrow around the "no past dates" boundary, missing leading zeros, and calendar-validity edges (month 13, day 45, Feb 30, Feb 29 on leap vs. non-leap years — computed dynamically so the test never rots).
- `price-filter.boundary.test.js` — `minPrice`/`maxPrice` exactly at, one above, and one below each seeded flight's price; `minPrice === maxPrice`; an inverted range.
- `flight-id.boundary.test.js` — `0`, `-1`, non-numeric, and decimal ids across `/availability`, `/fares`, `/seatmap`, `/confirm`, plus the lowest/highest seeded id and one past it.
- `airport-search.wildcard.test.js` — the autocomplete's partial matching: empty/whitespace query, single character, code-prefix-only vs. city/name-substring-anywhere, case-insensitivity, no-match, an oversized query, and a SQL-injection-shaped string (proven harmless — the query is a JS array filter, not raw SQL).
- `auth.boundary.test.js` — password strength edges (9 vs. 10 chars, missing letter/digit, 1 vs. 2 special characters), email/mobile/username format edges (malformed email, 9/11-digit mobile numbers, a leading digit below 6, username length 2/3/20/21 and a leading digit or embedded space), and reset-token expiry (one second before vs. after the cutoff).

Two real bugs were found and fixed this way — see [BUG_AUDIT.md](BUG_AUDIT.md) for the full root-cause writeups.

### Test case IDs & traceability

Every test carries a stable ID (`API-REG-001`, `API-BND-034`, `E2E-REG-024`, etc.), prefixed onto its title so it shows up directly in run output and reports — no separate lookup needed to see which case failed. [TRACEABILITY.md](TRACEABILITY.md) maps every ID to its feature area and file, and is the reference for scoping an impact-based test run: find the IDs touching a changed feature area, run those first, then the full suite as a safety net.

### End-to-end (browser) tests

```powershell
npm run test:e2e            # smoke + regression, headless Chromium
npm run test:e2e:smoke      # just the 3 fast smoke checks
npm run test:e2e:regression # just the regression suite
```

Drives the **actual running app** at `http://localhost:5173` with Playwright — real browser, real clicks, real network calls through the Vite proxy to the API. If `npm run dev` isn't already running, Playwright starts it automatically and reuses it if it is. A `globalSetup` step re-seeds the database before every run so assertions about specific flights/routes stay deterministic.

- `tests/smoke/` — 3 fast checks: home page renders, a basic search returns results with no console errors, the API is reachable through the app.
- `tests/regression/search-flow.*` — autocomplete selection, the swap button, client-side validation (same origin/destination, missing date), and a full successful search producing the right URL + flight cards.
- `tests/regression/filters-and-sorting.*` — default price sort, sort by duration/departure, stops/airline/departure-time/max-price filters, and the live results count.
- `tests/regression/empty-state.*` — the `GOI → IXC` no-results route, and filtering an existing result set down to zero.
- `tests/regression/navigation.*` — deep-linking straight to `/results?...`, and browser back-button behavior after searching again from the results page.
- `tests/regression/seat-fare-selection.*` — fare tiers and seat map render on the selection page, live price updates as fare/seat are picked, Continue stays disabled until both are chosen, unavailable seats can't be clicked, the confirmation page shows the matching fare/seat/total, and deep-linking straight to `/flights/:id/select`.
- `tests/regression/class-switch.*` — the Economy/Business toggle on the confirmation page: correct default state, switching keeps the same fare tier but recalculates seat/price, switching back restores the original selection exactly, the auto-picked seat prefers a fee-free standard seat (and shows an explanatory note on screen when none is available), and the displayed total always matches the API's own math.
- `tests/regression/auth.*` — the "Log in" header link, signup success linking back to login, logging in with the freshly-created username, a wrong-password error, a weak-password signup error that leaves no account behind, and the full forgot-password → reset-password → log in with the new password round trip.

Results: `npm run test:e2e` prints a live pass/fail list in the terminal and writes an interactive HTML report to `e2e/html-report/` (open `index.html`, or run `npm run report -w e2e`). Every test — pass or fail — captures a screenshot (`use.screenshot: 'on'`); failures also get a Playwright trace. Artifacts live under `e2e/test-results/`.

### Test history dashboard

```powershell
npm run test:history
```

Runs every suite once (API regression, ETL, boundary/wildcard, smoke, browser regression), records the result, and writes `test-history-dashboard.html` — a grid with suites as rows and the **last 5 runs** as columns (newest on the left), each cell color-coded pass/fail with its count; hover a cell for the exact duration, commit, and timestamp. `scripts/record-test-run.mjs` is the tool (committed); `test-history.json` (its data, capped at 5 entries — the oldest is dropped once a 6th run is recorded) and the dashboard HTML are both regenerated locally and gitignored, so history is per-machine, not shared through the repo. Open `test-history-dashboard.html` directly in a browser — it's self-contained, no server needed. Run the command again after making a change to see it added as a new column.

A grid was chosen over a calendar view here: with 5 runs (not weeks/months of daily activity) a calendar would be mostly empty and can't show a per-suite breakdown in one glance the way the grid does.

## Continuous integration

`.github/workflows/ci.yml` runs on every push/PR to `main`: one job runs the backend suite (`npm test` — regression + ETL + boundary/wildcard together), a second installs Chromium and runs the full Playwright suite (`npm run test:e2e`) against a freshly-started `npm run dev` (same `webServer` config used locally — verified it cold-starts and tears itself down cleanly, matching a CI runner). Both jobs upload their HTML reports as build artifacts regardless of outcome, so a failed run's screenshots/traces are still downloadable from the Actions tab.

This repo was git-initialized locally but has no remote configured — push it to a GitHub repo of your own to see CI run.

## API

- `GET /api/health` → `{ status: "ok" }`
- `GET /api/airports?q=<text>` → up to 8 airports matching code/city/name
- `GET /api/flights?from=DEL&to=BOM&date=YYYY-MM-DD&passengers=1&travelClass=ECONOMY|BUSINESS` → matching flights, plus optional `sort` (`price`|`duration`|`departure`), `stops` (`nonstop`|`1stop`), `airlines` (comma-separated), `minPrice`/`maxPrice`, `departure` (`early-morning`|`morning`|`afternoon`|`evening`). Results are already filtered to flights with enough seats for `passengers` in the requested `travelClass`.
- `GET /api/flights/:id/availability?passengers=1&travelClass=ECONOMY|BUSINESS` → `{ flightId, flightNumber, airline, from, to, travelClass, requestedPassengers, seatsAvailable, available }` for one specific flight. `404` if the flight id doesn't exist.
- `GET /api/flights/:id/fares?travelClass=ECONOMY|BUSINESS` → `{ flightId, flightNumber, travelClass, basePrice, fares }`, three fixed tiers (`saver` / `flexi` / `flexi-plus`) computed as multiples of the base price, each with `baggageKg`, `meal`, `freeCancellation`, `freeDateChange`, `freeSeatSelection`.
- `GET /api/flights/:id/seatmap?travelClass=ECONOMY|BUSINESS` → `{ flightId, travelClass, capacity, columns, rows, seats }`. Seats are generated deterministically from the flight id (same flight always produces the same layout and ~20% pre-occupied pattern) — economy is a 3-3 layout (`A-F`), business is 2-2 (`A,C,D,F`); the first two rows of each cabin are fee-bearing "extra-legroom" seats.
- `GET /api/flights/:id/confirm?travelClass=&fareId=&seatId=&passengers=` → `{ ..., fare, seat, totalPrice, selectionId }` where `totalPrice = fare.price × passengers + seat.fee`. `400` for an unknown `fareId`/`seatId` or an already-taken seat; `selectionId` is deterministic (`SEL-<flightId>-<fareId>-<seatId>-<passengers>`), not random.

Validation errors (missing fields, same origin/destination, past date, unknown airport code, `from === to`, invalid flight id, passengers out of `1–9` range, unknown fare/seat id, unavailable seat) return `400`/`404` with `{ error: "..." }`.

### Auth (standalone — not wired into the booking flow above)

- `POST /api/auth/signup` body `{ email, mobile, username?, password, confirmPassword }` → `201` with `{ userId, email, mobile, username }` (never the password/hash). `username` is optional; when given it becomes an additional valid login ID alongside email and mobile. `400` for a missing/invalid field or mismatched passwords, `409` if the email, mobile, or username is already taken.
- `POST /api/auth/login` body `{ loginId, password }` → `200` with the same public user shape. `loginId` is matched as an email, a 10-digit mobile number, or a username depending on its shape. `400` if `loginId` doesn't match any of those three shapes, `401` for a wrong password or unknown account.
- `POST /api/auth/forgot-password` body `{ loginId }` → `200` with `{ message, resetToken, expiresAt }`. **POC shortcut:** this app has no real email service, so the reset token is returned directly in the response instead of being emailed, keeping the flow fully testable end-to-end. `404` if no account matches.
- `POST /api/auth/reset-password` body `{ token, newPassword, confirmPassword }` → `200` on success. `400` for an unknown/already-used/expired token, a weak password, or mismatched passwords. Tokens expire 30 minutes after being issued and can only be used once.

Password rule (signup and reset alike): at least 10 characters, with at least one letter, one digit, and two special (non-alphanumeric) characters. Mobile numbers must be a 10-digit number starting with 6–9. Usernames, when supplied, must be 3–20 characters, start with a letter, and contain only letters, digits, `_`, or `.`.

## Sample data notes for test authors

- Seeded airports: DEL, BOM, BLR, MAA, CCU, HYD, PNQ, AMD, GOI, JAI, COK, IXC.
- Most city pairs have 2–3 flights across different airlines/times/prices for exercising filters and sorting.
- `GOI → IXC` (and reverse) has no seeded flights — use this pair to test the "no results" empty state.
- Interactive elements carry stable `data-testid` attributes (search inputs, autocomplete options, filters, sort select, flight cards, loading/error/empty states) — see component source under `client/src/components` and `client/src/pages` for the full list.
