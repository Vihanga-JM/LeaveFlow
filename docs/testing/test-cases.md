# LeaveFlow — manual test cases

Derived from the Phase 1 acceptance criteria (US-2, US-3, US-4, US-5).
Run against a freshly migrated database (seed users, password `password123`).
Last full run: 2026-09-28, local stack (API :4000, client :5173), after the
Phase 5 fixes on `feat/phase5-finish`.

| ID    | Steps | Expected | Actual | Pass? |
|-------|-------|----------|--------|-------|
| TC-01 | Log in as Ishara, apply Annual 9 Mar – 13 Mar 2026 | Request PENDING; Annual still 14 of 14 (pending is not deducted) | as expected | PASS |
| TC-02 | Log in as Ruwan → Approvals → approve TC-01's request | Status APPROVED; Ishara's Annual shows 9 of 14 | as expected (before the fix: balance stayed 14 — see BUG-001) | PASS |
| TC-03 | Apply with end date before start date | Apply button disabled + inline message; API returns 400 if forced with curl | as expected | PASS |
| TC-04 | Ishara PATCHes her own request with `{"action":"approve"}` | 403 Forbidden | as expected | PASS |
| TC-05 | Cancel an already-APPROVED request | 409 INVALID_STATE | as expected | PASS |
| TC-06 | Ruwan rejects a request from the Approvals page with a note | Status REJECTED; Ishara sees the note beside it | as expected (before the fix: every reject failed — BUG-004) | PASS |
| TC-07 | Apply for Casual leave spanning 10 working days | 409 INSUFFICIENT_BALANCE with a clear message | as expected | PASS |
| TC-08 | Apply twice for overlapping dates | Second attempt 409 OVERLAPPING_REQUEST | as expected | PASS |
| TC-09 | Apply 29 Apr – 4 May 2026 (spans Vesak), approve | 3 days deducted, not 4 | as expected | PASS |
| TC-10 | Apply with start date `2026-02-30` via curl | 400 naming `start_date` | 500 "Something went wrong" → fixed (BUG-005) | PASS after fix |
| TC-11 | Log in as Ruwan (MANAGER) and open `/api/admin/requests` | 403 | as expected | PASS |
| TC-12 | View My Leave in a browser set to Asia/Colombo | Dates match what was entered | dates were one day early → fixed (BUG-003) | PASS after fix |

Every row above is also covered by an automated test — see `server/tests/*.test.js`,
`client/src/ApplyLeaveForm.test.jsx` and `e2e/approve-flow.spec.js`.
