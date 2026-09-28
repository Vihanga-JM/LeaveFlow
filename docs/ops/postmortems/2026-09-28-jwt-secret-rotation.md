# Post-mortem: every logged-in user suddenly rejected (drill)

- **Date:** 2026-09-28 · **Environment:** local compose stack standing in for staging
- **Severity:** SEV1 (staging only — drill) · **Duration:** 38 s from break to fix
- **Blameless:** this names causes, not people.

## Impact

Every authenticated call from an existing session returned
`401 BAD_TOKEN "Invalid or expired token"`. Fresh logins worked, which made it
look intermittent: users who logged in again were fine until … nothing, in fact —
the confusion was entirely the old sessions.

## Timeline (local time)

| Time | Event |
|---|---|
| 09:13:41 | Baseline: Ishara's session `GET /api/me` → 200 |
| 09:13:41 | `JWT_SECRET` changed on the API service and the container recreated |
| 09:13:58 | Symptom reproduced: `/api/me` → 401 BAD_TOKEN |
| ~09:14:00 | Runbook step 2: `/api/health` green → process up, routing fine |
| ~09:14:00 | Step 3: logs show `"msg":"token rejected"` from the moment of the redeploy |
| ~09:14:00 | Step 4: `pg_isready` → accepting connections; database not involved |
| ~09:14:01 | Container start time = the minute the 401s began → config change, not code |
| 09:14:04 | Mitigation: previous secret restored, container recreated |
| 09:14:19 | Same old token → 200. Resolved |

## Root cause

JWTs are signed with `JWT_SECRET`. Changing it invalidates every token already
issued, so every existing session failed signature verification at once. The
change was made as a plain redeploy, with no announcement or maintenance window.

## What went well

- The runbook ordering (health → logs → DB) ruled out a crash and the database
  within a minute.
- Logs are structured JSON with request ids, and the Authorization header is
  redacted — the investigation never exposed a token.
- The `token rejected` log line (added this phase) states the JWT error. Before it,
  the logs showed only `statusCode: 401`, indistinguishable from a wrong password.

## What went badly

- A 401 page gave users no hint to log in again; the client kept showing the stale page.
- Nothing distinguished "secret changed" from "attacker sending garbage" in the
  alarms — only reading logs did.

## Action items

| Action | Owner | Due |
|---|---|---|
| Log the JWT error name/reason on every rejected token — **done** (`middleware/auth.js`) | intern | 2026-09-28 |
| Client: on any 401, clear the token and return to the login screen — **done** (`client/src/api.js`) | intern | 2026-09-28 |
| Document secret rotation as planned maintenance: announce, rotate off-hours, expect everyone to re-login | intern + mentor | 2026-10-05 |
| CloudWatch metric filter + alarm on a spike of `token rejected` | intern | 2026-10-12 |
