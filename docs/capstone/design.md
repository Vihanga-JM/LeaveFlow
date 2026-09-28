# Design doc — half-day leave and public holidays

Author: intern · Date: 2026-09-28 · Status: **draft for Gate 2**

## Problem

Staff take whole days for two-hour errands because the system only knows full
days, and a public holiday (Vesak) was deducted from someone's annual leave.
We need half days (AM/PM, 0.5) and a holiday calendar that day counting honours.

## Constraints

- Existing data: `leave_requests` rows with no notion of day parts.
- `leave_balances.used_days` is already `NUMERIC(4,1)` — 0.5 fits.
- HR must manage holidays without a developer; the gazette changes every year.
- ~60 users: correctness and clarity beat cleverness.

## Decision 1 — how to store a half day

**Option A: `day_part` column** — `TEXT NOT NULL DEFAULT 'FULL' CHECK (day_part IN ('FULL','AM','PM'))`.

- Pros: says *which* half — managers need AM vs PM to plan cover (CS-5). One column
  answers "is it a half day?" and "which half?". Existing rows default to FULL.
  A `CHECK (day_part = 'FULL' OR start_date = end_date)` makes the Q1 rule
  impossible to break, even with direct SQL.
- Cons: three states instead of two; every query that sums days must know about it.

**Option B: `half_day BOOLEAN`**

- Pros: minimal.
- Cons: can't say morning or afternoon — the first thing Nadeesha's managers will ask.
  Adding that later means a *second* column (`half_day_part`) whose value is meaningless
  when `half_day = false` — the "two booleans, you needed an enum" smell from Phase 2.
  And AM+PM on the same date (Q2) can't be told apart from a double booking.

**Decision: A, `day_part`.**

## Decision 2 — store the day count on the request

Add `days NUMERIC(4,1) NOT NULL` to `leave_requests`, computed when the request is
created (weekends and public holidays excluded, 0.5 for half days).

Why store a derived value, given Phase 2's "store facts, compute answers"? Because
it *is* a fact: "this request asked for 3 days, under the calendar in force when it
was made". If it were recomputed at approval, an HR edit to the holiday list in
between would silently change what the employee agreed to (Q5). Approve adds
`days` to `used_days`; reserved = sum of `days` over PENDING requests.

## Decision 3 — the `public_holidays` table

```sql
CREATE TABLE public_holidays (
  holiday_date DATE PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- **Primary key = the date.** Day counting only asks "is this date a holiday?" — a
  date is either off or it isn't. When two holidays share a date (Vesak and May Day
  on 2026-05-01) that's one row with a combined name. A surrogate `id` plus
  `(date, name)` uniqueness would allow two rows for one date and make "delete the
  holiday on 1 May" ambiguous.
- No `year` column: it's derivable from the date (`EXTRACT(YEAR …)`), and storing it
  would be exactly the drift Phase 2 warned about.
- Corrections (the gazette moves a poya by a day) = delete + add.

## API contract diff

```text
POST /api/leave-requests
  + body.day_part: "FULL" (default) | "AM" | "PM"
  + 400 VALIDATION      half day with start_date ≠ end_date; bad day_part
  + 400 NO_WORKING_DAYS the range/half day contains no working day
  ~ 409 INSUFFICIENT_BALANCE now counts PENDING (reserved) days too
  ~ 409 OVERLAPPING_REQUEST AM and PM on the same date no longer conflict
  + response: day_part, days

GET /api/leave-requests, /api/team/requests, /api/admin/requests
  + day_part, days on every row

GET /api/balances
  + reserved_days per leave type (sum of PENDING days this year)

GET    /api/holidays?year=2026    any logged-in user → [{ holiday_date, name }]
POST   /api/holidays              HR_ADMIN → 201 | 400 | 403 | 409 (date exists)
DELETE /api/holidays/:date        HR_ADMIN → 204 | 403 | 404
```

## Migrations and rollback

- `004_public_holidays.sql` — create table, seed 2026 (the list from `lib/holidays.js`,
  which is then deleted). Down: `DROP TABLE public_holidays;` — safe, HR re-enters edits.
- `005_half_day.sql` — add `day_part` (default FULL), add `days`, **backfill `days`**
  for existing rows in SQL (weekdays minus holidays), then `SET NOT NULL`; add the
  single-date CHECK. Down: `ALTER TABLE leave_requests DROP COLUMN day_part, DROP COLUMN days;`
  — but once half days exist, dropping `day_part` turns every 0.5 request into an
  apparent full day while balances keep the 0.5s. **So rollback after real use means
  restore from the pre-deploy snapshot or fix forward, not the down-script.**
  Take a manual RDS snapshot before deploying.

## Consequences

- Every place that computes days reads `days` from the row instead of recomputing.
- The balance check gets stricter (reserved days count) — a behaviour change to announce.
- Day counting now needs the database (holidays), so `leaveDays` takes the holiday
  list as an argument and stays a pure, unit-testable function.
