# Post-mortem: login rate limit ineffective on Render

- **Date:** 2026-09-28 · **Environment:** Render (the live deploy): a real incident, not a drill
- **Severity:** SEV2: a security control silently not working; the app itself was fine
- **Duration:** about 1 h 30 min from the first deploy (~06:40 UTC) to the full fix (07:43 UTC)
- **Blameless:** this names causes, not people.

## Impact

For the first hour and a half of the Render deploy, the login rate limit (10 attempts
a minute per client) never triggered:

- A client could guess passwords without ever getting a 429.
- Through the website, every visitor shared about three limiter buckets. With real
  traffic, ten wrong logins from anyone would have locked out all users for a minute.
- At the same time, the three demo accounts still had the seed password
  `password123`, which is published in this public repo.

Exposure: the site had been public for about 90 minutes and its URL wasn't shared.
We have no access to Render's logs from the pipeline, so nobody checked them for
login attempts by others. **Owner action: check them** (see action items).

## Timeline (UTC)

| Time | Event |
|---|---|
| ~06:40 | Blueprint deployed. Smoke test: health, logins, apply → approve → balance all pass |
| ~06:48 | Smoke test: 12 wrong logins through the website all get 401, none get 429 |
| ~06:49 | Same test against the API URL: 6 × 401, then 429, which doesn't match a 10/min limit |
| ~07:10 | The `RateLimit` response header shows the remaining count jumping (`r=5, 8, 6, 7, 4…`) on **both** URLs, so one client is being counted under several keys |
| ~07:15 | Cause found: Render sits behind Cloudflare. `X-Forwarded-For` is `client, cloudflare-edge, render-internal`, and with `TRUST_PROXY=1` Express picks the rotating internal hop |
| 07:23 | PR #27 opened: key the limit on `cf-connecting-ip`, and add a per-account limit (10 failures per email per 15 min) |
| 07:26 | #27 merged; Render auto-deploys |
| 07:35 | Checked on production. API URL: `r=9…0`, then 429 ✅. Website: still `r=5,4,9,8,3,2,1,9,8…` ❌ |
| 07:36 | Second cause: the website's `/api/*` rewrite is forwarded from Render's own addresses, so `cf-connecting-ip` is a Render IP, not the visitor's |
| 07:36 | PR #28 merged: on start, the API replaces the seed password when `DEMO_USER_PASSWORD` is set (Render generates it) |
| 07:41 | PR #29 merged: the browser calls the API directly (CORS limited to the site's origin) |
| 07:43 | Verified on production: `password123` → 401. Wrong logins count down 8…0, then 429. CORS allows the site's origin only. **Resolved** |

## Root cause

The limiter keys on `req.ip`. How Express finds the client IP depends on the proxy
chain, and that chain was assumed to be one hop (true for nginx in compose) without
being checked on the platform. Render has two layers of proxy in front of the app
(Cloudflare, then Render's router), plus a third for traffic coming through the
static site's rewrite. None of the tests could have caught this: they only ever run
without a proxy or behind our own nginx.

The seed password staying live was a known item ("change before real use") that
depended on a manual step. Render's free plan has no shell, so that step had no
easy way to happen.

## What went well

- The smoke test included a negative security check (expect a 429), not just the
  happy path. That's the only reason this was found.
- The draft-8 `RateLimit` header made the problem visible from outside, with no log
  access: a counter that jumps instead of counting down means the keys are split.
- Each fix went through the normal pipeline (branch → 5 CI checks → merge → auto-deploy),
  with no hand edits on the server.
- Fixing forward in two steps (#27, then #29) showed exactly which layer each change fixed.

## What went badly

- The first fix was only verified on the API URL, then assumed to cover the website
  too. It didn't.
- Removing the `/api` rewrite from `render.yaml` didn't remove it from the live static
  site. Blueprint sync added the new settings but left the old route in place.
- A known-public password was live on the internet for about 90 minutes.

## Action items

| Action | Owner | Due |
|---|---|---|
| Key the limit on the CDN's client-IP header, add a per-account limit — **done** (#27) | intern | 2026-09-28 |
| Replace the seed password on deploy — **done** (#28) | intern | 2026-09-28 |
| Browser calls the API directly — **done** (#29) | intern | 2026-09-28 |
| Delete the leftover `/api/*` rewrite in the static site's Redirects/Rewrites tab | owner (dashboard) | 2026-09-29 |
| Check the Render API logs for 06:40–07:43 UTC for logins not from the smoke test | owner (dashboard) | 2026-09-29 |
| Add "11 wrong logins → 429 on the public URL" to the post-deploy checklist in `docs/deploy/render.md` — **done** | intern | 2026-09-28 |
