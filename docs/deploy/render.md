# Deploy to Render — the 30-minute win

Everything is described in `render.yaml` at the repo root (a Render Blueprint).

1. Sign up at render.com with the GitHub account that owns the repo.
2. **New → Blueprint** → select `LeaveFlow` → Render reads `render.yaml` and
   proposes `leaveflow-db` (Postgres, Singapore), `leaveflow-api-vihangajm` (Docker,
   built from `server/Dockerfile`) and `leaveflow-web-vihangajm` (static site from `client/`).
3. **Apply**. The API container runs the migrations (schema + demo seed) on boot.
4. If Render gave either service a different hostname, fix `VITE_API_URL` (static
   site) and `CORS_ORIGIN` (API) in `render.yaml` to match. The browser calls the
   API directly; there is deliberately no `/api` rewrite through the static site
   (it made every visitor share a few Render IPs, and so one login-limit bucket).

Post-deploy checklist (every deploy that touches auth, proxies or `render.yaml`):

```bash
curl https://leaveflow-api-vihangajm.onrender.com/api/health   # {"status":"ok",...}
```

- [ ] Health is 200.
- [ ] Log in on the website with the `DEMO_USER_PASSWORD` value: apply, approve, balance.
- [ ] `password123` is rejected (401).
- [ ] 11 wrong logins → `RateLimit` `r=` counts down by one each time, then 429.
- [ ] Anything removed from `render.yaml` is also gone in the dashboard. Blueprint
      sync adds and changes settings, but it didn't delete the old `/api` rewrite route.

Log in as `ishara@ceylonroots.lk` with the value of `DEMO_USER_PASSWORD`
(Render dashboard → `leaveflow-api-vihangajm` → **Environment** → reveal). Render
generates it, and on every start the API replaces the public seed password
`password123` on any account still using it (`src/db/rotateDemoPasswords.js`).
Before real staff use this, replace the demo users with real accounts.

Client IPs: Render sits behind Cloudflare, and its `X-Forwarded-For` is
`client, cloudflare-edge, render-internal` with rotating hops, so `TRUST_PROXY`
alone can't find the visitor. `CLIENT_IP_HEADER=cf-connecting-ip` makes the login
limit key on the header Cloudflare overwrites. See postmortem
`docs/ops/postmortems/2026-09-28-login-rate-limit-on-render.md`.

Caveat: free web services spin down after ~15 idle minutes; the first request
afterwards takes 30–60 s. Fine for a demo, not for Nadeesha — hence AWS.
