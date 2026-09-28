# Capstone retro — 2026-09-28

No mentor was assigned, so this is a written self-assessment against the guide's
rubric, backed by evidence you can click. Demo rehearsal (fresh stack, the
`demo-script.md` flow): 14 of 14 → 0.5 reserved → **13.5 of 14** after approval;
manager inbox showed "PM 0.5"; the Vesak range counted **3** days; HR add → 201,
delete → 204.

## Rubric, line by line

| Rubric line | Met? | Evidence |
|---|---|---|
| Every code change traces back to an approved story | ✅ | CS-1..CS-6 in `stories.md`; PR descriptions cite them; Gate 1 signed off (Q1–Q6) |
| The design doc argues real alternatives and commits to one | ✅ | `design.md`: `day_part` vs boolean, stored `days`, the holiday primary key |
| The migration is reversible-aware | ✅ | Down paths and the "restore, don't down-script, after real half days" note in `005_half_day.sql` and `006_…sql` |
| Day-math tests cover the edges | ✅ | `leaveDays.test.js` (half day on a poya/Saturday, Fri–Tue long weekend), `halfDay.test.js` (cancel gives 0.5 back) |
| The PR is a reviewable size with what/why/how-to-test | ✅ with one caveat | Split into #16 (docs), #17 (holidays), #18 (half days). Every PR has What / Why / How to test. #18 shows +698 / −481, but only ~255 added lines are application code; ~260 are tests, 47 are holiday data, and the rest is docs. Caveat: the `api.md` rewrite (+159 / −400) should have been its own PR |
| CI green on the first push, or red diagnosed and fixed fast | ✅ | Every capstone PR was green before merge; the fire drill's red was diagnosed from the log in minutes |
| Deployed through the pipeline, no hand edits on the server/DB | ✅ | Render Blueprint from `render.yaml`; every later change (#27–#29) went PR → CI → auto-deploy. One gap: the removed `/api` rewrite needs deleting in the dashboard |
| Scope held; stretch ideas parked in the backlog | ✅ | Team calendar, email notifications and the audit log are listed as parked in `stories.md`; none were built |
| The demo survives an unrehearsed question | ⏳ | Prepared answers are in `demo-script.md`; needs a live audience |

## What went well

- Writing the tests first for half days caught the Fri–Tue long-weekend case before any code existed.
- The independent code review found a real race condition: two parallel submissions could both
  pass the balance check. It was reproduced with a test (fails 3/3), fixed with a per-user
  advisory lock, and the test now passes 3/3.
- Checking the holiday list against two official sources replaced five wrong poya dates and
  added seven missing holidays before anyone relied on them.

## What went badly

- Merging a stacked PR with "delete branch" closed the next PR instead of retargeting it
  (#11 and #13), and had to be untangled by hand.
- A stale local `main` still tracked `server/.env`, and switching branches deleted the real
  file. Secrets that only exist in an untracked file are one `git checkout` away from being lost.
- The Holidays page shipped with no tests. The bug hunt proved it: that page is where the one
  bug CI missed was hiding.

## One thing I'd do differently

**Retarget before you merge.** With stacked PRs, change the next PR's base to `main` *first*,
then merge and delete. It's a one-line habit that would have avoided the whole #11/#13 detour.

## Follow-ups

- ~~Deploy to Render, then run the incident drill there.~~ Done. Deployed 2026-09-28. The
  first hour produced a real incident instead of a drill: the login limit wasn't working
  behind Cloudflare, fixed in #27–#29 (`docs/ops/postmortems/2026-09-28-login-rate-limit-on-render.md`).
- The restore drill still needs a paid Render database or AWS: Render's free Postgres has no backups.
- Give the client an error boundary, so a render crash shows a message instead of a blank page.
- Keep a password-manager copy of `server/.env` values.
