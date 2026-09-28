# Runbook — default incident response

Severity: **SEV1** down or data loss (drop everything) · **SEV2** a feature broken
with a workaround · **SEV3** annoying, fix this week.

Mitigate first, diagnose second.

| # | Step | Local (compose) | Render | AWS |
|---|------|-----------------|--------|-----|
| 1 | **Symptom** — write down what's reported and when it started | | | |
| 2 | **Health** — is the app up at all? | `curl localhost:8080/api/health` | `curl https://leaveflow-api-vihangajm.onrender.com/api/health` (first call after idle takes 30–60 s: cold start, not an outage) | `curl https://leave.ceylonroots.lk/api/health` |
| 3 | **Logs** — errors? which route? since when? | `docker compose logs api --since 30m` | Dashboard → `leaveflow-api-vihangajm` → **Logs** (search e.g. `token rejected`); **Events** for deploys and restarts | ECS → `leaveflow-api` → **Logs**, or `aws logs tail <service log group> --since 30m --region ap-south-1` |
| 4 | **Database** — up? CPU? connections? | `docker compose exec db pg_isready -U leaveflow` | Dashboard → `leaveflow-db` → status and **Metrics** | RDS console → status, CPU, DatabaseConnections |
| 5 | **Mitigate** — roll back to the last good image, or fix forward if trivial | `docker compose up -d` with the previous image/env | **Events** → an earlier deploy → **Rollback**; or fix forward through a PR (merges to `main` auto-deploy) | ECS → service → update to the previous `:sha` image |
| 6 | **Communicate** — tell Nadeesha what's broken, what you're doing, next update time | | | |
| 7 | **Afterwards** — blameless post-mortem within 48 h | `docs/ops/postmortems/` | | |

When the logs aren't available, response headers often are: `x-request-id` ties a
response to its log line, and the login `RateLimit` header shows whether one client
is being counted as one (see postmortem 2026-09-28-login-rate-limit-on-render).

## Useful log filters

Logs are JSON lines (pino), one per request, each with a `req.id` that is also
returned to the client as the `x-request-id` header.

```bash
# every 401, last 15 minutes (AWS)
aws logs tail <group> --since 15m --filter-pattern '{ $.res.statusCode = 401 }'
# why tokens are being rejected: "invalid signature" = secret mismatch, "jwt expired" = normal
aws logs tail <group> --since 15m --filter-pattern '{ $.msg = "token rejected" }'
# locally
docker compose logs api --no-log-prefix | grep '"statusCode":5'
```

## Symptom → first suspect

| Symptom | Health | Logs show | Suspect |
|---|---|---|---|
| Everyone logged out / every call 401 | green | `token rejected`, `invalid signature`, sharp start time | `JWT_SECRET` changed (see postmortem 2026-09-28) |
| 500s everywhere | green | `relation … does not exist` | migrations didn't run against this database |
| 500s, `sorry, too many clients already` | green | — | connections exhausted → `runbook-connections-exhausted.md` |
| Nothing loads | red / timeout | nothing new | container crashed or failing health check → Render **Events** / ECS service **Events** |
| 429 on login | green | `TOO_MANY_ATTEMPTS` | rate limit doing its job — or `TRUST_PROXY` / `CLIENT_IP_HEADER` wrong so all users share one IP (check the `RateLimit` response header: `r=` should count down for one client) |
