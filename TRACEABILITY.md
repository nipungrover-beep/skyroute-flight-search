# Test Case Traceability Matrix

Every test in the suite carries a stable **Test Case ID**, prefixed onto its title so it shows up in every test run's output (terminal, HTML report, CI logs) — not just in this document. IDs never get reused or renumbered; a retired test's ID retires with it rather than being handed to a new, unrelated test.

## ID scheme

```
<SUITE>-<NNN>
```

| Prefix | Suite | Runner | Command |
|---|---|---|---|
| `API-REG` | Backend regression | `node --test` + supertest | `npm run test:regression` |
| `API-ETL` | Seed pipeline (ETL) | `node --test` | `npm run test:etl` |
| `API-BND` | Boundary value & wildcard search | `node --test` + supertest | `npm run test:boundary` |
| `E2E-SMK` | Smoke | Playwright | `npm run test:e2e:smoke` |
| `E2E-REG` | Browser regression | Playwright | `npm run test:e2e:regression` |

**What gets an ID:** every independently meaningful, assertion-bearing test case. Where `node:test`'s `t.test()` subtests are used to share setup across boundary variations (e.g. the six `passengers` edge values run against two different endpoints), each subtest gets its own ID — the outer `test()` call is just a grouping label, not a separate case, so it isn't numbered. Because of that, this document's count (126 IDed cases) is lower than the raw "139 tests" the runners report — that figure also counts those outer grouping calls as their own line items, which this matrix intentionally doesn't.

## How to use this for impact-based execution

When a change lands, use the **feature area** column to find every test case that touches the changed surface, then re-run just that set as the targeted/impacted pass before falling back to the full suite as a safety net. This is the same workflow used for the class-switch feature (see the deck's "Traceability & impact-based execution" slide): read the change, find the IDs in the affected feature area(s) below, run those first.

---

## API-REG — Backend regression (17 cases)

| ID | Feature area | File | Description |
|---|---|---|---|
| API-REG-001 | Search | `flights-search.regression.test.js` | Matching flights returned, sorted by price ascending, for a valid route |
| API-REG-002 | Search validation | `flights-search.regression.test.js` | Rejects same origin and destination |
| API-REG-003 | Search validation | `flights-search.regression.test.js` | Rejects a departure date in the past |
| API-REG-004 | Search validation | `flights-search.regression.test.js` | Rejects an unknown airport code |
| API-REG-005 | Search | `flights-search.regression.test.js` | Empty result set for a route with no scheduled flights |
| API-REG-006 | Availability | `availability.regression.test.js` | Confirms a flight can accommodate the requested party size |
| API-REG-007 | Availability | `availability.regression.test.js` | Reports unavailability when seats are insufficient |
| API-REG-008 | Availability | `availability.regression.test.js` | 404 for an unknown flight id |
| API-REG-009 | Search | `availability.regression.test.js` | Search excludes flights without enough seats for the requested passenger count |
| API-REG-010 | Fare selection | `seat-fare-selection.regression.test.js` | `/fares` returns three ascending tiers derived from the base price |
| API-REG-011 | Fare selection | `seat-fare-selection.regression.test.js` | `/fares` returns 404 for an unknown flight |
| API-REG-012 | Seat selection | `seat-fare-selection.regression.test.js` | `/seatmap` generates one seat per unit of capacity, deterministically |
| API-REG-013 | Seat selection | `seat-fare-selection.regression.test.js` | `/seatmap` uses a 2-2 business layout |
| API-REG-014 | Confirmation | `seat-fare-selection.regression.test.js` | `/confirm` computes the correct total (fare x passengers + seat fee) |
| API-REG-015 | Confirmation | `seat-fare-selection.regression.test.js` | `/confirm` rejects an already-taken seat |
| API-REG-016 | Confirmation | `seat-fare-selection.regression.test.js` | `/confirm` rejects an unknown fare or seat id |
| API-REG-017 | Confirmation | `seat-fare-selection.regression.test.js` | `/confirm` requires both `fareId` and `seatId` |

## API-ETL — Seed pipeline (9 cases)

| ID | Feature area | File | Description |
|---|---|---|---|
| API-ETL-001 | Extract | `seed-pipeline.etl.test.js` | Source airport records are well-formed and unique |
| API-ETL-002 | Extract | `seed-pipeline.etl.test.js` | Source flight records total the expected count |
| API-ETL-003 | Transform | `seed-pipeline.etl.test.js` | `addMinutes` clock arithmetic, including day wraparound |
| API-ETL-004 | Transform | `seed-pipeline.etl.test.js` | Every flight's `arriveTime` matches its own `departTime` + duration |
| API-ETL-005 | Transform | `seed-pipeline.etl.test.js` | Flight records pass basic data-quality checks |
| API-ETL-006 | Load | `seed-pipeline.etl.test.js` | `seedDatabase()` loads exactly the source row counts |
| API-ETL-007 | Load | `seed-pipeline.etl.test.js` | Every flight references an airport that actually exists |
| API-ETL-008 | Load | `seed-pipeline.etl.test.js` | Re-seeding is idempotent — no duplicate or accumulating rows |
| API-ETL-009 | Load | `seed-pipeline.etl.test.js` | The intentionally-unseeded `GOI ↔ IXC` route stays empty |

## API-BND — Boundary value & wildcard search (68 cases)

### Passengers boundary (`passengers.boundary.test.js`) — API-BND-001 to 016

| ID | Feature area | Description |
|---|---|---|
| API-BND-001..006 | Search | `passengers` boundary (0, 1, 9, 10, -1, non-numeric) on `GET /api/flights` |
| API-BND-007..012 | Availability | Same `passengers` boundary set on `GET /:id/availability` |
| API-BND-013..016 | Confirmation | `passengers` boundary (0, 1, 9, 10) on `GET /:id/confirm` |

### Date boundary (`date.boundary.test.js`) — API-BND-017 to 025

| ID | Description |
|---|---|
| API-BND-017 | Yesterday is rejected |
| API-BND-018 | Today (exact boundary) is accepted |
| API-BND-019 | Tomorrow is accepted |
| API-BND-020 | Missing leading zeros in the date format are rejected |
| API-BND-021 | Month 13 does not exist |
| API-BND-022 | Day 45 does not exist in any month |
| API-BND-023 | February 30th does not exist |
| API-BND-024 | February 29th on a leap year is accepted |
| API-BND-025 | February 29th on a non-leap year is rejected |

### Price filter boundary (`price-filter.boundary.test.js`) — API-BND-026 to 033

| ID | Description |
|---|---|
| API-BND-026..028 | `maxPrice` boundary: one below cheapest, exactly cheapest, exactly priciest |
| API-BND-029..031 | `minPrice` boundary: one above priciest, exactly priciest, zero |
| API-BND-032 | `minPrice === maxPrice` returns only the exact match |
| API-BND-033 | An inverted range (`minPrice > maxPrice`) returns empty, not an error |

### Flight id boundary (`flight-id.boundary.test.js`) — API-BND-034 to 056

| ID | Feature area | Description |
|---|---|---|
| API-BND-034..040 | Availability | Flight id boundary (0, -1, non-numeric, decimal, min, max, max+1) on `/availability` |
| API-BND-041..047 | Fare selection | Same flight id boundary set on `/fares` |
| API-BND-048..054 | Seat selection | Same flight id boundary set on `/seatmap` |
| API-BND-055..056 | Confirmation | Flight id boundary (0, max+1) on `/confirm` |

### Wildcard airport search (`airport-search.wildcard.test.js`) — API-BND-057 to 068

| ID | Description |
|---|---|
| API-BND-057..059 | Empty query variants (no param, empty string, whitespace-only) default to the capped list |
| API-BND-060 | Single-character wildcard matches by code prefix and city substring |
| API-BND-061 | Airport code matching is prefix-only, not substring |
| API-BND-062 | City/name matching is substring-anywhere |
| API-BND-063 | Matching is case-insensitive |
| API-BND-064 | An exact full match returns exactly that airport |
| API-BND-065 | No matches anywhere returns an empty array, not an error |
| API-BND-066 | A query longer than any seeded field doesn't crash |
| API-BND-067 | SQL-injection-shaped input is treated as literal text, proven harmless |
| API-BND-068 | Results are capped at 8 even when a broad query matches more |

## E2E-SMK — Smoke (4 cases)

| ID | File | Description |
|---|---|---|
| E2E-SMK-001 | `smoke.spec.js` | Home page loads with a usable search form |
| E2E-SMK-002 | `smoke.spec.js` | A basic search returns results with no console errors |
| E2E-SMK-003 | `smoke.spec.js` | The backend API is reachable through the app |
| E2E-SMK-004 | `smoke.spec.js` | Can select a fare and seat and reach a confirmation |

## E2E-REG — Browser regression (28 cases)

### Search flow (`search-flow.regression.spec.js`) — E2E-REG-001 to 005

| ID | Description |
|---|---|
| E2E-REG-001 | Autocomplete suggests and selects an airport by city name |
| E2E-REG-002 | Swap button exchanges origin and destination |
| E2E-REG-003 | Rejects searching with the same origin and destination |
| E2E-REG-004 | Rejects submitting without a departure date |
| E2E-REG-005 | A successful search navigates to `/results` with matching query params and flight cards |

### Filters and sorting (`filters-and-sorting.regression.spec.js`) — E2E-REG-006 to 013

| ID | Description |
|---|---|
| E2E-REG-006 | Results are sorted by price ascending by default |
| E2E-REG-007 | Sorting by departure time reorders the list earliest-first |
| E2E-REG-008 | Sorting by duration puts the longest flight last |
| E2E-REG-009 | Nonstop filter removes the 1-stop flight |
| E2E-REG-010 | Airline filter narrows to the selected carrier |
| E2E-REG-011 | Departure-time filter narrows to flights in that window |
| E2E-REG-012 | Max-price filter excludes flights priced above the threshold |
| E2E-REG-013 | Results count reflects the currently filtered list |

### Empty state (`empty-state.regression.spec.js`) — E2E-REG-014 to 015

| ID | Description |
|---|---|
| E2E-REG-014 | A route with no scheduled flights shows the no-results message |
| E2E-REG-015 | Filtering an existing result set down to zero also shows the no-results message |

### Navigation (`navigation.regression.spec.js`) — E2E-REG-016 to 017

| ID | Description |
|---|---|
| E2E-REG-016 | A deep link directly to `/results` renders without visiting the home page first |
| E2E-REG-017 | Browser back after a new search from the results page restores the previous search |

### Fare & seat selection (`seat-fare-selection.regression.spec.js`) — E2E-REG-018 to 023

| ID | Description |
|---|---|
| E2E-REG-018 | Selection page shows three fare tiers and a seat map |
| E2E-REG-019 | Selecting the saver fare shows the base price before any seat is chosen |
| E2E-REG-020 | Continue is disabled until both a fare and a seat are chosen |
| E2E-REG-021 | An unavailable seat cannot be selected |
| E2E-REG-022 | Confirming a selection shows the matching fare, seat, and total on the confirmation page |
| E2E-REG-023 | A deep link directly to the selection page renders without visiting results first |

### Class switch (`class-switch.regression.spec.js`) — E2E-REG-024 to 028

| ID | Description |
|---|---|
| E2E-REG-024 | Toggle shows Economy active by default, matching the class picked during selection |
| E2E-REG-025 | Switching Economy → Business keeps the same fare tier, updates seat and price, updates the URL |
| E2E-REG-026 | Switching Business → Economy restores the original fare, seat, and price exactly |
| E2E-REG-027 | The auto-picked seat prefers a fee-free standard seat, and explains it on screen when none is available |
| E2E-REG-028 | The displayed total always equals fare price plus seat fee after a switch |
