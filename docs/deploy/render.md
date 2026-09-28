# Deploy to Render — the 30-minute win

Everything is described in `render.yaml` at the repo root (a Render Blueprint).

1. Sign up at render.com with the GitHub account that owns the repo.
2. **New → Blueprint** → select `LeaveFlow` → Render reads `render.yaml` and
   proposes `leaveflow-db` (Postgres, Singapore), `leaveflow-api-vihangajm` (Docker,
   built from `server/Dockerfile`) and `leaveflow-web-vihangajm` (static site from `client/`).
3. **Apply**. The API container runs the migrations (schema + demo seed) on boot.
4. If Render gave the API a different hostname than `leaveflow-api-vihangajm.onrender.com`,
   edit the `/api/*` rewrite destination in `render.yaml` (or the static site's
   Redirects/Rewrites tab) to match, and redeploy the static site.

Verify:

```bash
curl https://leaveflow-web-vihangajm.onrender.com/api/health   # {"status":"ok",...}
```

Log in as `ishara@ceylonroots.lk` / `password123`. **Change or remove the demo
users before anyone real uses this** — the seed password is public in the repo.

Caveat: free web services spin down after ~15 idle minutes; the first request
afterwards takes 30–60 s. Fine for a demo, not for Nadeesha — hence AWS.
