# Bug hunt — round 1 (2026-09-28)

No mentor was assigned, so both roles were played in sequence: the "mentor"
planted three bugs on `bug-hunt/round-1` (commit `29bb093`) without touching the
tests; the "hunter" then used the automated suites first, and exploratory
testing for whatever they missed.

## How each bug was found

| Bug | Automated suites | Found by |
|---|---|---|
| BH-1 reserved days | Jest: 2 failures in `halfDay.test.js` | automation |
| BH-2 absences leak | Jest: 1 failure in `team.test.js` | automation |
| BH-3 wrong holiday deleted | Jest, Vitest and Playwright all **green** | exploratory testing of the one page with no tests |

Lesson: two of three were caught for free, but the Holidays page had zero tests,
and that is exactly where the third bug hid. A regression test now covers it.

---

## BH-1 — Balances count cancelled, rejected and approved requests as "reserved"

- **Environment:** `bug-hunt/round-1`, local, any employee
- **Steps to reproduce:**
  1. As Ishara, request an AM half day on 2026-10-09 (Annual)
  2. Cancel it
  3. Open My Leave (or `GET /api/balances`)
- **Expected:** Annual shows 0 reserved
- **Actual:** Annual still shows 0.5 reserved; after an approval the same days are
  counted twice (as used *and* reserved)
- **Severity:** major (balances wrong; employees blocked from leave they have) · **Priority:** high
- **Root cause:** the `reserved_days` subquery in `routes/balances.js` lost its
  `lr.status = 'PENDING'` filter, so it summed every request of the year.
- **Caught by:** `halfDay.test.js` › "cancelling a pending half day gives the 0.5 back"
  and "approving a half day deducts exactly 0.5".
- **Fix:** PR `fix/bh-1-reserved-days` — restore the status filter.

## BH-2 — Any manager sees every employee's approved leave

- **Environment:** `bug-hunt/round-1`, logged in as a MANAGER
- **Steps to reproduce:**
  1. Dilini (HR, not Ruwan's report) has approved leave on 2026-03-10
  2. As Ruwan, `GET /api/team/absences?from=2026-03-09&to=2026-03-13`
- **Expected:** `[]` — Dilini doesn't report to Ruwan
- **Actual:** Dilini's leave is listed
- **Severity:** major (broken access control — leaks other departments' absences) · **Priority:** high
- **Root cause:** the scoping condition in `routes/team.js` became
  `($3 > 0 OR $4 = 'HR_ADMIN')`, which is true for every logged-in user.
- **Caught by:** `team.test.js` › "a manager does not see people who are not their reports".
- **Fix:** PR `fix/bh-2-absences-scope` — restore `u.manager_id = $3`.

## BH-3 — Deleting a holiday removes a different one

- **Environment:** `bug-hunt/round-1`, Chrome, logged in as Dilini (HR_ADMIN)
- **Steps to reproduce:**
  1. Holidays page → click **Delete** next to 2026-12-25 Christmas Day
- **Expected:** Christmas Day is removed
- **Actual:** Christmas stays; the first holiday in the list (2026-01-03, or in the
  test fixture 2026-05-01 Vesak) is deleted instead — silently
- **Severity:** major (HR removes the wrong public holiday; later requests get
  deducted for it) · **Priority:** high
- **Root cause:** the button called `remove(holidays[0].holiday_date)` instead of
  `remove(h.holiday_date)`.
- **Caught by:** nothing automated. Found by exploratory testing, then pinned by the
  new `client/src/Holidays.test.jsx`, which failed on the bug branch:
  `expected '/api/holidays/2026-05-01' to be '/api/holidays/2026-12-25'`.
- **Fix:** PR `fix/bh-3-holiday-delete` — use the row's own date; the test lands on
  `main` too.

## Also fixed during the hunt

The Playwright run on the bug branch first failed with
`Timed out waiting 60000ms from config.webServer` — unrelated to the planted bugs:
building the client for `vite preview` can exceed Playwright's 60 s default on a
busy machine. The web-server timeout is now 180 s.
