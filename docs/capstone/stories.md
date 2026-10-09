# Capstone — stories and acceptance criteria

Source: Nadeesha's email after the management meeting (half-day leave; public
holidays must never reduce a balance). Status: **Gate 1 approved** — all six
answers below were accepted as written on 2026-09-28 by Vihanga De Silva,
answering as Nadeesha (no mentor assigned for this capstone).

## Open questions and agreed answers
Q1  - Can a half day be attached to a multi-day request (e.g. Mon–Wed + Thu morning)? 
**No.** A half day is its own single-date request. Two requests cover the Mon–Thu-morning case. Keeps the day math and the UI simple. 

Q2 - Can someone take the morning *and* the afternoon of the same day as two requests?
Yes — AM and PM on the same date don't overlap. Two AMs on the same date do. 

Q3 - Who maintains the holiday list?

**HR_ADMIN, in the app**, per year — no developer needed. The 2026 list is seeded once.

Q4 - A half day on a public holiday or weekend? 
Refused: it would deduct nothing, so it's almost certainly a mistake. Same for a full-day request that contains no working day. 

Q5 - If HR adds a holiday *after* a request was made, does the request change?

No. A request stores its day count when it's submitted; HR can reject and ask for a re-submit. (Changing approved balances retroactively would surprise people.)

Q6 - Should pending days count against the balance? 

Yes, as **reserved**: shown separately and used in the "enough days left?" check, released on cancel/reject. (This is the US-3 criterion from Phase 1.) 

## Stories

**CS-1 Book a half day** — As an employee, I want to book a morning or afternoon
off, so that a two-hour errand doesn't cost me a whole day.

- Given I have 14 annual days, when I request Friday 2026-10-09 PM, then a PENDING
  request for 0.5 days is created and my balance shows 0.5 reserved.
- Given a half day, when start and end dates differ, then 400 "a half day must be a single date".
- Given I already have an AM half day on a date, when I request PM on the same date,
  then it's accepted; when I request AM again, then 409 OVERLAPPING_REQUEST.

**CS-2 Half-day balance math** — As an employee, I want half days to deduct exactly
0.5, so that my balance is right.

- Given a PENDING PM half day, when my manager approves it, then `used_days` rises by 0.5
  (14 → 13.5 left).
- Given a PENDING half day, when I cancel it, then the 0.5 reserved is released.

**CS-3 Holiday calendar data** — As an HR admin, I want to see and manage the year's
public holidays in the app, so that I don't need a developer each year.

- Given I'm HR_ADMIN, when I add 2026-12-31 "Special bank holiday", then it appears in the list.
- Given I'm HR_ADMIN, when I delete a holiday, then it's gone.
- Given I'm not HR_ADMIN, when I try to add or delete, then 403. Anyone logged in can read the list.
- Given a holiday already exists on that date, when I add another, then 409.

**CS-4 Holiday-aware day counting** — As an employee, I want public holidays inside my
request not to be deducted, so that Vesak never costs me leave.

- Given Vesak poya on Fri 2026-05-01, when I request Wed 29 Apr – Mon 4 May and it's
  approved, then 3 days are deducted, not 4.
- Given a long weekend (Fri–Tue, with Monday a holiday), then only Fri and Tue count.
- Given a request containing no working day, then 400 NO_WORKING_DAYS.

**CS-5 Managers see the half** — As a manager, I want to see AM/PM on a half-day request
when approving, so that I know when the person is actually away.

- Given a PENDING PM half day from my report, when I open Approvals, then the row shows
  "PM half day" and "0.5 day".

**CS-6 Nothing else breaks** — Full-day requests, approvals, balances and the existing
test suites keep passing.

## Nadeesha's acceptance list → stories → tests

| Nadeesha's words | Story | Tests |
|---|---|---|
| "book a morning or afternoon half day, deducts 0.5 from the right balance" | CS-1, CS-2 | `halfDay.test.js` |
| "Vesak poya — or any public holiday — never reduces anyone's balance" | CS-4 | `leaveDays.test.js`, `halfDay.test.js` |
| "Friday to Tuesday over a long weekend deducts only the working days" | CS-4 | `leaveDays.test.js`, `halfDay.test.js` |
| "Cancelling a pending half-day request gives the 0.5 back" | CS-2 | `halfDay.test.js` |
| "As HR, I can see and manage the holiday list" | CS-3 | `holidays.test.js` |
| "Managers see 'AM' or 'PM'" | CS-5 | `halfDay.test.js`, e2e |
| "Everything that already worked still works" | CS-6 | the whole suite |

## Parked (backlog, not this capstone)

~~Team calendar view~~ — built after the capstone (US-7, issue #42) · email
notifications · audit log table · half days attached to multi-day requests (Q1).
