# Post-mortem: users can't stay logged in (staged incident on Render)

- **Date:** 2026-09-28 · **Environment:** Render production (there is no staging).
  This was a drill, staged on purpose.
- **Roles:** the repo owner acted as mentor and broke a setting without saying which.
  Claude was on point and diagnosed it from outside with the runbook.
- **Severity:** SEV1 for users (every existing session rejected) · **Duration:** about 13 min
  from break to verified fix (break at ~09:19, resolved by 09:32 UTC)
- **Blameless:** this names causes, not people.

## Impact

Every request from an existing session returned `401 BAD_TOKEN "Invalid or expired
token"`. Fresh logins worked, so it looked intermittent: a user who logged in again
was fine, and anyone still using an open tab wasn't.

The fix was to restore the old secret. That brought back every earlier session, but
anyone who logged in *during* the incident had to log in once more.

## Timeline (UTC)

| Time | Event |
|---|---|
| 09:19:08 | Baseline: Ishara's session (issued 09:18) → `GET /api/me` 200 |
| ~09:19–09:24 | Mentor edits one environment variable on the API service and saves. Render redeploys |
| ~09:24 | Report: "Prod is down, users can't stay logged in. You're on point." |
| 09:25:17 | Runbook step 2, health: `GET /api/health` → 200. The app is up, so it's not an outage |
| 09:25:17 | Same 09:18 session → `401 BAD_TOKEN`. It's 7 minutes old against an 8-hour expiry, so it's invalid, not expired |
| 09:25:18 | Fresh login → 200, and the new token → `/me` and `/balances` 200. The database and password checks are fine |
| ~09:26 | Diagnosis: tokens issued before a moment fail, and tokens issued after it pass. The code and database are unchanged, so the signing secret (`JWT_SECRET`) changed. Recommended restoring the old value, not accepting the rotation |
| ~09:26–09:32 | Mentor pastes the saved value back and redeploys |
| 09:32:33 | The same 09:18 session → `/api/me` 200. **Resolved** |
| 09:32:59 | Fresh login (Ruwan) → 200; manager inbox → 200 |

## Root cause

JWTs are signed with `JWT_SECRET`. Changing it invalidates every token already
issued, so every open session failed signature verification at once. The change was
an unannounced environment edit that redeployed straight to production.

## The call: restore, not rotate

Both are legitimate responses to a secret change. Restoring was chosen because:

- **Nobody planned the change**, and the known-good configuration is the old value.
- **The new value wasn't safe to keep.** It was short, typed text. Anyone who
  guessed it could sign a token for any user, including HR.
- **Rotating properly** means a new long random value, announced beforehand, with
  everyone expecting to log in again. That's planned maintenance, not an incident fix.

## What went well

- The runbook ordering worked without log access: health, then an old session, then a
  fresh login. The diagnosis took about two minutes, all from outside the platform.
- A baseline taken just before the break (an old token known to work at 09:19) turned
  "users can't stay logged in" into a precise test: that exact token passes before and fails after.
- The mentor backed up the old secret before changing it, so restoring took a paste.
  Render stores generated values only in the dashboard.
- The client's on-401 handling sends users back to the login page, so users saw
  "log in again", not a broken page.

## What went badly

- **Logs and Events weren't checked.** The runbook's step 3 needs the Render
  dashboard, which only the owner can open, and it was skipped once the pattern was
  clear. It would have confirmed `invalid signature` and the exact minute of the config change.
- **Nothing alerted.** The uptime check only watches `/api/health`, which stayed green
  the whole time, so only a human report caught this.
- **One production service, no staging.** The drill had to break the live site.

## Action items

| Action | Owner | Due |
|---|---|---|
| Keep an offline copy of every production secret. This time the backup existed only because the drill said to make one | owner | 2026-09-29 |
| Treat `JWT_SECRET` rotation as planned maintenance: announce it, use a long random value, expect everyone to log in again (`runbook.md`) | owner | 2026-10-05 |
| Add an authenticated check to the uptime workflow: log in, then call `/api/me` with the token, so session-breaking changes alert too | intern | 2026-10-12 |
| Give the drill runner read access to Render logs, or have the owner send the Logs/Events view at step 3 | owner | next drill |
