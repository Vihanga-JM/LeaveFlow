# LeaveFlow — bug reports

Severity = how bad the impact is. Priority = how soon it must be fixed.

---

## BUG-001 — Approving a request never deducts the employee's balance

- **Environment:** local, `main` @ 329548e, any browser, MANAGER approving an EMPLOYEE
- **Steps to reproduce:**
  1. Log in as ishara@ceylonroots.lk, apply Annual 9–13 Mar 2026 (5 days)
  2. Log in as ruwan@ceylonroots.lk, approve it
  3. Log in as Ishara, open My Leave
- **Expected:** Annual shows 9 of 14 days left
- **Actual:** Annual still shows 14 of 14; `leave_balances.used_days` stays 0.0
- **Severity:** major (balances — the core promise to Nadeesha — are wrong)
- **Priority:** high
- **Root cause:** the PATCH handler updated `leave_requests.status` only; the
  Part B transaction that upserts `leave_balances` was never written.
- **Fix:** approve now runs status update + balance upsert in one transaction
  (`accd1fc`). Regression test: `decisions.test.js` › "deducts the working days".
- **Data follow-up:** requests approved before the fix (ids 1 and 7 in the dev
  database) never consumed balance. Re-apply their days by hand or re-approve.

## BUG-002 — API cannot start on `main`

- **Environment:** `main` @ 329548e, `npm run dev`
- **Steps:** check out `main`, run `npm run dev` in `server/`
- **Expected:** "LeaveFlow API listening"
- **Actual:** `SyntaxError: Identifier 'Pool' has already been declared` in `src/db/pool.js`
- **Severity:** blocker · **Priority:** high
- **Root cause:** the merge of `feat/postgres-migrations` concatenated both
  versions of `pool.js` instead of choosing one.
- **Fix:** single pool module (`accd1fc`).

## BUG-003 — Dates display one day early

- **Environment:** local, machine timezone Asia/Colombo (UTC+5:30)
- **Steps:** apply 25 Sep – 27 Sep; open My Leave or Approvals
- **Expected:** 2026-09-25 → 2026-09-27
- **Actual:** 2026-09-24 → 2026-09-26
- **Severity:** major (managers approve the wrong days) · **Priority:** high
- **Root cause:** node-postgres turns a `DATE` into a JS `Date` at *local*
  midnight; JSON serialises it in UTC, i.e. 18:30 the previous day, and the
  client's `.slice(0, 10)` shows that previous day.
- **Fix:** `pool.js` returns DATE columns as plain `YYYY-MM-DD` strings.
  Regression test: `leaveRequests.test.js` › "returns dates exactly as submitted".

## BUG-004 — Every rejection from the Approvals page fails

- **Environment:** local, Chrome, logged in as Ruwan
- **Steps:** Approvals → click Reject on any pending request
- **Expected:** request becomes REJECTED
- **Actual:** red alert "decision_note is required when rejecting"; nothing changes
- **Severity:** major · **Priority:** high
- **Root cause:** the reject-with-reason lab made `decision_note` mandatory in the
  API, but the page kept sending only `{ action }`.
- **Fix:** each row has a note field; Reject stays disabled until it is filled.

## BUG-005 — An impossible date returns 500 instead of 400

- **Environment:** local, curl
- **Steps:** POST `/api/leave-requests` with `"start_date": "2026-02-30"`
- **Expected:** 400 VALIDATION naming `start_date`
- **Actual:** 500 "Something went wrong"; server log shows
  `date/time field value out of range`
- **Severity:** minor · **Priority:** medium
- **Root cause:** the regex accepted it, JavaScript silently rolled it to 2 March,
  and only Postgres noticed. Found by the coverage lab: the 500 branch of
  `errorHandler` had never run under test.
- **Fix:** `isDate` checks the date round-trips. Regression test: `errors.test.js`.

## BUG-006 — Login response time reveals which emails exist

- **Environment:** local, curl / test logs
- **Steps:** POST `/api/auth/login` with a real email + wrong password, then an
  unknown email + wrong password; compare response times
- **Expected:** indistinguishable responses
- **Actual:** same 401 body, but ~120 ms vs ~4 ms — an unknown email skips bcrypt
- **Severity:** minor (security, user enumeration) · **Priority:** medium
- **Status:** fixed in the Phase 10 security pass (dummy bcrypt compare for
  unknown emails).
