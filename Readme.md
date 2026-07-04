# SkyRoute — Domestic Flight Search (Test Automation POC)

A small full-stack app for searching domestic flights, built as a stable target for UI/API test automation (Playwright, Selenium, etc.). Search results are seeded from a fixed, deterministic dataset — no randomness — so the same query always returns the same results.

**Scope (v1):** search + results only (autocomplete, filters, sorting). No booking/checkout flow, no auth.

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

Results: `npm run test:e2e` prints a live pass/fail list in the terminal and writes an interactive HTML report to `e2e/html-report/` (open `index.html`, or run `npm run report -w e2e`). Every test — pass or fail — captures a screenshot (`use.screenshot: 'on'`); failures also get a Playwright trace. Artifacts live under `e2e/test-results/`.

## Continuous integration

`.github/workflows/ci.yml` runs on every push/PR to `main`: one job runs the backend API suite (`npm test`), a second installs Chromium and runs the full Playwright suite (`npm run test:e2e`) against a freshly-started `npm run dev` (same `webServer` config used locally — verified it cold-starts and tears itself down cleanly, matching a CI runner). Both jobs upload their HTML reports as build artifacts regardless of outcome, so a failed run's screenshots/traces are still downloadable from the Actions tab.

This repo was git-initialized locally but has no remote configured — push it to a GitHub repo of your own to see CI run.

## API

- `GET /api/health` → `{ status: "ok" }`
- `GET /api/airports?q=<text>` → up to 8 airports matching code/city/name
- `GET /api/flights?from=DEL&to=BOM&date=YYYY-MM-DD&passengers=1&travelClass=ECONOMY|BUSINESS` → matching flights, plus optional `sort` (`price`|`duration`|`departure`), `stops` (`nonstop`|`1stop`), `airlines` (comma-separated), `minPrice`/`maxPrice`, `departure` (`early-morning`|`morning`|`afternoon`|`evening`). Results are already filtered to flights with enough seats for `passengers` in the requested `travelClass`.
- `GET /api/flights/:id/availability?passengers=1&travelClass=ECONOMY|BUSINESS` → `{ flightId, flightNumber, airline, from, to, travelClass, requestedPassengers, seatsAvailable, available }` for one specific flight. `404` if the flight id doesn't exist.

Validation errors (missing fields, same origin/destination, past date, unknown airport code, `from === to`, invalid flight id, passengers out of `1–9` range) return `400`/`404` with `{ error: "..." }`.

## Sample data notes for test authors

- Seeded airports: DEL, BOM, BLR, MAA, CCU, HYD, PNQ, AMD, GOI, JAI, COK, IXC.
- Most city pairs have 2–3 flights across different airlines/times/prices for exercising filters and sorting.
- `GOI → IXC` (and reverse) has no seeded flights — use this pair to test the "no results" empty state.
- Interactive elements carry stable `data-testid` attributes (search inputs, autocomplete options, filters, sort select, flight cards, loading/error/empty states) — see component source under `client/src/components` and `client/src/pages` for the full list.
