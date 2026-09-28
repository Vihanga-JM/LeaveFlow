# Exploratory testing and bug hunt

## Exploratory session — 2026-09-28, 30 minutes

**Charter:** try to break leave balances using approvals, rejections,
cancellations and re-applications.

Notes, in order:

1. Approved a 2-day Casual request → balance did not move. Stopped: BUG-001.
   (Re-tested after the fix: 2.0 used, as expected.)
2. Approved the same request twice → second call 409, balance not doubled. Good.
3. Rejected, then re-applied for the same dates → allowed (rejected requests
   don't block). Good — matches the overlap rule (PENDING/APPROVED only).
4. Applied for overlapping dates while the first was still PENDING → used to be
   allowed; that's how double-booking happens. Added 409 OVERLAPPING_REQUEST.
5. Tried `2026-02-30` → 500. BUG-005.
6. Compared login timings for real vs unknown emails → BUG-006.
7. Cancelled a PENDING request → no balance change needed (pending isn't
   deducted). Open question for Nadeesha: should PENDING days show as
   "reserved" on the balances page (US-3 AC)? → built in the capstone.

## Bug hunt (Phase 6, step 9)

The drill needs a mentor to plant three bugs secretly on `bug-hunt/round-1`.
Until that happens, the suite has been checked against the guide's suggested
three by planting each one locally and running the tests:

| Planted bug | Caught by | Result |
|---|---|---|
| `cursor <= end` → `cursor < end` in `leaveDays` (the demo's off-by-one) | `leaveDays.test.js` (4) + `decisions.test.js` (3) | 7 failed, 31 passed |
| Ownership check removed from cancel (anyone cancels anyone) | `decisions.test.js` › "cancelling someone else's request is 403" | 1 failed |
| My Leave not refetched after applying (stale list/balance) | `e2e/approve-flow.spec.js` › expects `PENDING` to appear | spec failed on `getByText('PENDING')` |

Each bug was reverted immediately after the run; the suite is green again.

The real bugs found this week (BUG-001 … BUG-006 in `bug-reports.md`) were
reported and fixed through PRs the same way the drill asks for.
