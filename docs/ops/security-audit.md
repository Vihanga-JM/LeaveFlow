# Security self-audit — 2026-09-28

Scope: the OWASP Top 10 risks LeaveFlow actually faces. Each row was verified,
not assumed; the evidence column says how.

| Threat | Where we defend | Verification | Result |
|---|---|---|---|
| **SQL injection** | `$1`-style parameters on every query | `grep -rnE 'query\(\s*`[^`]*\$\{' server/src` → no matches; every `query(` either passes `$n` params or is static SQL | ✅ |
| **Broken access control** | `requireAuth`, `requireRole`, ownership checks in PATCH, role-aware lists | 46 Jest tests incl. employee approve → 403, cancel another's → 403, manager deciding a non-report → 403, `/api/admin` as MANAGER → 403, `/api/team/*` as EMPLOYEE → 403 | ✅ |
| **Secrets exposure** | `.env` / `.env.test` gitignored; secrets only in platform env vars; `.dockerignore` excludes `.env`; pino redacts `authorization` + `cookie` | log line from the drill shows `"authorization":"[Redacted]"`; `git ls-files` lists no `.env` | ✅ — but see finding 1 |
| **Vulnerable dependencies** | `npm audit --audit-level=critical` gate in CI | `npm audit` in server, client, root → 0 vulnerabilities of any level | ✅ |
| **Login brute force** | `express-rate-limit`, 10 attempts/min/IP, `trust proxy` set so the limit keys on the real client | `security.test.js`; through nginx: attempts 1–10 → 401, 11th → 429 | ✅ |
| **User enumeration** | same 401 body for unknown email and wrong password; dummy bcrypt compare for unknown emails | before: 120 ms vs 4 ms; after: 142 ms vs 91 ms (both bcrypt-bound, within noise) | ✅ fixed (BUG-006) |
| **Error detail leakage** | `errorHandler` returns "Something went wrong" for 500s, logs the detail server-side | `errors.test.js` | ✅ |
| **Transport security** | HTTPS at Render/CloudFront; `DATABASE_SSL` + RDS CA bundle for the DB | `DATABASE_SSL=true` against a non-TLS server is refused (verified); prod not yet deployed | ⏳ verify on AWS |

## Findings to act on

1. **The old dev `JWT_SECRET` and `DATABASE_URL` are in git history.** `server/.env`
   was committed before it was untracked. Local-dev values only, but: never reuse
   that secret anywhere, and rotate the local Postgres password if it is used elsewhere.
2. **Demo users share a public password** (`password123`, in `002_seed.sql`).
   Before real staff use any deployment: delete or re-password the seed users.
3. **JWT in `localStorage`** is readable by any script on the page, so an XSS bug
   would leak tokens. Acceptable at this scale (React escapes output, there's no
   user-supplied HTML), but an httpOnly cookie is the stronger option if the app grows.

## Access-control spot check in prod (once deployed)

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X PATCH \
  https://leave.ceylonroots.lk/api/leave-requests/<dilini's request id> \
  -H "Authorization: Bearer $ISHARA_TOKEN" \
  -H "Content-Type: application/json" -d '{"action":"cancel"}'
# expect 403
```
