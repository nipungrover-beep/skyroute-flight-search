# Bug Audit History

A running log of real defects this project's test automation has actually caught — not hypothetical coverage, but specific bugs found, their root cause, the fix, and how the fix was verified. Each entry follows: **Found by → Symptom → Root cause → Fix → Verified by**.

---

## 2026-07-04 — CI failed instantly on the very first push

**Found by:** GitHub Actions, first push to `main` (backend job, `npm test` step).

**Symptom:** The backend test job failed in under a second — `started_at` and `completed_at` on the failing step were identical, meaning `node --test` crashed before running a single test.

**Root cause:** `server/test-results/` (the HTML reporter's output directory) only existed on the development machine because it had been created by hand earlier in the session. It's gitignored (build output) and git never tracks empty directories anyway, so it didn't exist on a clean CI checkout. Node's `--test-reporter-destination` opens a write stream to that path but does not create missing parent directories, so the process threw immediately.

**Fix:** Added a `pretest` npm script (`server/package.json`) that runs `node -e "fs.mkdirSync('test-results', { recursive: true })"` before every `test` run, so the directory always exists regardless of environment.

**Verified by:** Deleted `server/test-results/` locally to simulate a clean checkout, reran `npm test`, confirmed it auto-created the folder and all tests passed. Pushed the fix and confirmed the next CI run went green via the GitHub REST API.

---

## 2026-07-08 — `passengers=0` was silently accepted as `1` instead of rejected

**Found by:** New boundary-value tests targeting the `passengers` parameter's valid range (`1`–`9`) across `/api/flights`, `/api/flights/:id/availability`, and `/api/flights/:id/confirm`.

**Symptom:** `GET /api/flights?...&passengers=0` returned `200` with `query.passengers: 1` in the response, instead of the expected `400 passengers must be between 1 and 9`.

**Root cause:** All three endpoints parsed the parameter as `Number.parseInt(req.query.passengers, 10) || 1`. In JavaScript, `0` is falsy, so `0 || 1` evaluates to `1` — the explicit invalid value `0` was silently coerced to a valid one *before* the `passengers < 1` range check ever saw it. `-1` and `10` were already handled correctly, since neither is falsy.

**Fix:** Replaced the pattern in all three routes with a shared `parsePassengers()` helper (`server/src/routes/flights.js`) that only defaults to `1` when the parsed value is `NaN` (missing or non-numeric input) — an explicit `0` now parses to `0` and correctly fails the range check.

**Verified by:** Confirmed live against the running dev server (`passengers=0` → `400`) before and after the fix. Added `server/tests/boundary/passengers.boundary.test.js`, asserting the full boundary set (`0`, `1`, `9`, `10`, `-1`, non-numeric) across all three endpoints — 27 assertions, all passing. Full existing suite re-run with no regressions.

---

## 2026-07-08 — Nonsensical calendar dates (month 13, Feb 30) passed validation

**Found by:** New boundary-value tests targeting the `date` parameter on `/api/flights`.

**Symptom:** `GET /api/flights?...&date=2026-13-45` returned `200` with real search results, instead of being rejected. The date format regex (`/^\d{4}-\d{2}-\d{2}$/`) only checks digit *shape*, and the past-date check (`date < todayIso()`) is a plain lexical string comparison — neither validates that the month/day combination is a real calendar date.

**Root cause:** No calendar-validity check existed between the format check and the past-date check. `"2026-13-45"` matches the regex, and lexically it sorts *after* today's date string, so it sailed through both checks untouched.

**Fix:** Added an `isValidCalendarDate()` helper that constructs a `Date` from the parsed year/month/day and verifies the constructed date's fields round-trip back to the same values (JavaScript's `Date` silently normalizes overflow — e.g. day 45 rolls into the next month — so a mismatch after round-tripping proves the input wasn't a real date). Runs immediately after the format check, before the past-date check.

**Verified by:** Confirmed live (`2026-13-45` and `2026-02-30` → `400 date is not a valid calendar date`) before and after the fix. Added `server/tests/boundary/date.boundary.test.js`, including a leap-year edge case (Feb 29 accepted on a leap year, rejected on a non-leap year, using dynamically-computed future years so the test never rots). Full existing suite re-run with no regressions.

---

## 2026-07-09 — Switching class could silently add an unexpected seat fee, with no explanation

**Found by:** Writing a new e2e regression test (`class-switch.regression.spec.js`) for the Economy/Business toggle on the confirmation page, asserting the auto-picked seat would always be a fee-free standard seat.

**Symptom:** The test failed — for a flight with a small Business cabin, the auto-picked seat after switching landed in row 1 (an extra-legroom, fee-bearing row), pushing the total price up by both the class fare difference *and* an unadvertised seat fee, with nothing on screen explaining why.

**Root cause:** Not a logic bug — a genuine product gap. `seatMap.js` marks the first `EXTRA_LEGROOM_ROWS` (2) rows of every cabin as fee-bearing. Economy cabins (6 seats/row) always have standard rows left over; small Business cabins (4 seats/row, sometimes only 8 total seats) can have *every* seat inside those first two rows. The class-switch handler's fallback (`find standard seat, else find any available seat`) silently took the fee-bearing fallback with no indication to the user that it wasn't a free pick.

**Fix:** `ConfirmationPage.jsx` now tracks whether the fallback was used and shows an inline note — *"No standard seat was free in Business — an extra-legroom seat (+fee) was selected instead."* — only when it applies.

**Verified by:** Rewrote the test to assert either outcome is correct as long as it's honestly represented: a standard seat with no notice, or a fee seat *with* the notice visible. Ran the full `class-switch.regression.spec.js` file (5/5 passing), the existing `seat-fare-selection.regression.spec.js` and `smoke.spec.js` as targeted impact checks (both unaffected, all passing), then the full suite (139/139).

---

## How this fits into the test suite

The two 2026-07-08 bugs were both caught by the same initiative: a dedicated **boundary value** test category (`server/tests/boundary/`, run via `npm run test:boundary`), alongside a **wildcard search** test file for the airport autocomplete's partial/substring matching. The 2026-07-09 finding came from writing tests *for* a new feature (the class-switch toggle) rather than testing existing behavior — a reminder that new-feature test cases catch real gaps too, not just regression suites. See the [README](Readme.md#tests) for the full breakdown of what each file covers.
