# Demo day script — 15 minutes

Rehearse twice the day before, out loud, against freshly seeded data.
Second window: live logs (`docker compose logs -f api`, or CloudWatch on AWS).

## Prep (10 minutes before)

```bash
docker compose down -v && docker compose up --build -d   # fresh seed: 14/7/7 for everyone
```

Logins (password `password123`): Ishara (employee), Ruwan (her manager), Dilini (HR).

**Demoing on Render instead** (https://leaveflow-web-vihangajm.onrender.com):
- The password is the `DEMO_USER_PASSWORD` value (dashboard → `leaveflow-api-vihangajm`
  → Environment). `password123` is rejected there.
- Open the site a minute early to wake it from the free-plan sleep.
- It isn't freshly seeded: the deploy smoke test left Ishara with an approved PM half
  day on 2026-11-20, so she starts at **13.5**, not 14. In step 3, say "watch 13.5
  become 13". A step already done in an earlier run (for example, the 2026-10-09 half
  day) will be refused as an overlap, so pick a fresh date.

## 0:00–2:00 — the problem

- "People took whole days for two-hour errands; Vesak poya was deducted from someone's
  annual leave."
- The one decision to notice: "Half days are a `day_part` column — FULL, AM or PM —
  not a yes/no flag, because managers need to know *which* half to plan cover."

## 2:00–10:00 — live flow

1. **Ishara** → Annual shows **14 of 14**. Duration: *Afternoon half day*, Date: Friday
   2026-10-09, reason "Bank errand" → Apply. Point at "(PM half day) · 0.5 day" and
   "(0.5 reserved by pending requests)".
2. **Ruwan** → Approvals: the row says **PM half day · 0.5 day** and "No one else is off".
   Approve.
3. **Ishara** → "Watch this 14 become **13.5**."
4. **Ishara** → full days Wed 2026-04-29 → Mon 2026-05-04 (spans Vesak) → "· 3 days", not 4.
5. **Dilini** → Holidays: the 2026 list, add "Special bank holiday", delete it.
6. If anything breaks: open the log window, find the request by its `x-request-id`,
   narrate what you'd check next. Don't apologise — diagnose.

## 10:00–15:00 — questions

Prepared answers:

- *What would you build next?* The team calendar view (month grid, holidays shaded) —
  parked in the backlog, story already written.
- *What if HR adds a holiday after someone applied?* Existing requests keep the day count
  they were made with; HR can reject and ask for a re-submit. (Design doc, decision 2.)
- *How would you roll this back?* Before real half days exist, the down-script in
  `005_half_day.sql`; after, restore the pre-deploy snapshot or fix forward.
- Anything else: "I don't know — I'd check X" beats a guess.

## Retro (30 minutes with the mentor, after the demo)

Walk the rubric line by line; write down one thing you'd do differently.
