# Deploy to AWS — production-shaped

> **Status (2026-09-28): written plan, not deployed.** LeaveFlow runs on Render
> (`render.md`). AWS was skipped on purpose: the setup below costs about US$40 a
> month once the sign-up credits run out, which is too much for an app with no
> real users. Everything the code needs for it is already in the repo: the image
> includes the RDS certificate bundle, TLS turns on with `DATABASE_SSL`, and the
> container migrates on start.
>
> **Changed from the original guide:** AWS App Runner stopped accepting new
> customers on 30 April 2026, so step 3 uses **Amazon ECS Express Mode**, AWS's
> recommended replacement. Its load balancer costs about $16 a month on its own,
> so the $10 budget from the guide would alarm in the first month.

Region: **ap-south-1 (Mumbai)**, ~30–40 ms from Colombo.
Replace `123456789012` with your account ID and `vihanga-jm` with your lowercase
GitHub owner. Every step below needs someone with the AWS account.

## 0. Account hygiene (before anything else)

- Sign-up needs a credit card. On the **Free plan**, new accounts get US$100–200
  in credits for 6 months and aren't charged unless they upgrade to the Paid plan.
- Enable MFA on the root user, then stop using root.
- IAM → create a user for yourself; sign in as that user from now on.
- Billing → Budgets → a **monthly cost budget sized to what this costs (about $50),
  alert at 80%** to your email. Create this *before* the first resource.

## 1. Image → ECR

```bash
aws ecr create-repository --repository-name leaveflow-api --region ap-south-1
aws ecr get-login-password --region ap-south-1 | docker login --username AWS \
  --password-stdin 123456789012.dkr.ecr.ap-south-1.amazonaws.com
docker pull ghcr.io/vihanga-jm/leaveflow-api:main        # built by release.yml
docker tag ghcr.io/vihanga-jm/leaveflow-api:main \
  123456789012.dkr.ecr.ap-south-1.amazonaws.com/leaveflow-api:prod
docker push 123456789012.dkr.ecr.ap-south-1.amazonaws.com/leaveflow-api:prod
```

Prod runs the `:prod` tag (a release you chose); staging tracks `:main` (lab 2).

## 2. Database → RDS

RDS → Create database: PostgreSQL 16, Free tier, `db.t4g.micro`,
identifier `leaveflow-db`, initial database `leaveflow`.

- **Public access: No**
- New security group `leaveflow-db-sg` with **no inbound rules yet**

## 3. API → ECS Express Mode

ECS → **Express Mode** → create a service:

- Image: `123456789012.dkr.ecr.ap-south-1.amazonaws.com/leaveflow-api:prod`
- Container port `4000`, health check path `/api/health`
- Roles: a **task execution role** (it pulls from ECR and writes logs) and an
  **infrastructure role** (it creates the load balancer, security groups and
  scaling). The console offers to create both.

Express Mode creates a Fargate service, an Application Load Balancer with HTTPS
and its own URL, auto scaling, and CloudWatch logs.

Environment variables:

| Key | Value |
|---|---|
| `DATABASE_URL` | `postgres://postgres:<password>@<rds-endpoint>:5432/leaveflow` |
| `DATABASE_SSL` | `true` |
| `DATABASE_SSL_CA` | `/etc/ssl/rds-global-bundle.pem` (baked into the image) |
| `JWT_SECRET` | a fresh value from `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `TRUST_PROXY` | `2` (CloudFront → ALB → task). Confirm it on the first deploy: 11 wrong logins must count `RateLimit` `r=` down one at a time. It's only safe if the ALB accepts traffic from CloudFront alone (the `com.amazonaws.global.cloudfront.origin-facing` prefix list in its security group); otherwise a client calling the ALB URL directly can fake its IP |
| `DEMO_USER_PASSWORD` | a long random value, so the public seed password doesn't survive |

Then edit `leaveflow-db-sg`: inbound **5432 with the service's task security
group as the source**, never `0.0.0.0/0`. RDS and the service must be in the
same VPC. Express Mode uses the default VPC unless you choose another one.

Migrations: the image's start command already runs `node src/db/migrate.js`
before the server, so every deploy migrates. A failed migration fails the health
check and the rollout stops instead of breaking prod.

## 4. Client → S3 + CloudFront

```bash
aws s3 mb s3://leaveflow-client --region ap-south-1   # keep "Block all public access" on
cd client && npm ci && npm run build                   # no VITE_API_URL: same-origin /api via CloudFront
aws s3 sync dist/ s3://leaveflow-client --delete
```

CloudFront → Create distribution:

- Origin 1: the S3 bucket via **Origin Access Control** (accept the bucket policy it offers)
- Default root object `index.html`
- Origin 2: the Express Mode service URL (HTTPS only)
- Behavior `/api/*` → origin 2, cache policy **CachingDisabled**, origin request
  policy **AllViewerExceptHostHeader**, allowed methods GET/HEAD/OPTIONS/PUT/POST/PATCH/DELETE
- Behavior `/assets/*` → origin 1, CachingOptimized (hashed files, cache hard)
- Default behavior → origin 1; custom error response 403/404 → `/index.html`, code 200
  (so React deep links work)

Unlike Render's static-site rewrite, CloudFront passes the viewer's IP along in
`X-Forwarded-For`, so the same-origin `/api` path is fine here.

After each client deploy:

```bash
aws cloudfront create-invalidation --distribution-id <ID> --paths "/index.html"
```

## 5. Domain + HTTPS

This needs a domain you control. `ceylonroots.lk` is the guide's example
company, so without a real domain, use the `dxxxxxxxx.cloudfront.net` address.

- ACM **in us-east-1** (CloudFront only reads certificates there): request
  `leave.ceylonroots.lk`, DNS validation; add the validation CNAME at the `.lk` registrar.
- When issued: CloudFront → alternate domain name `leave.ceylonroots.lk` + that certificate.
- Registrar: CNAME `leave` → `dxxxxxxxx.cloudfront.net`. Wait for propagation.

## Prove it works

1. `https://leave.ceylonroots.lk` shows the padlock with your domain on the certificate.
2. `curl https://leave.ceylonroots.lk/api/health` → `{"status":"ok",...}`.
3. Create a request, redeploy the ECS service, and the request is still there (data lives in RDS).
4. `curl -I https://leave.ceylonroots.lk/assets/<file>.js` twice → `x-cache: Hit from cloudfront`.
5. `psql "host=<rds-endpoint> user=postgres"` from your laptop **times out**. That's the pass.
6. 11 wrong logins → the 11th is 429, and `r=` counted down one at a time.

## Lab 2 — staging

A second Express Mode service `leaveflow-api-staging` (it shares the same load
balancer, so no second $16): image `leaveflow-api:main`, its own RDS database
(`leaveflow_staging`) and its own `JWT_SECRET`. To feed it, add to `release.yml`
an ECR push and an ECS service update. That needs AWS credentials as repo secrets,
or better an OIDC role. Every merge to `main` then updates staging while prod
stays on `:prod`.

## Lab 1 — Render vs CloudFront comparison

Open DevTools → Network → Disable cache, load each URL five times from Colombo
and record DOMContentLoaded + the `/api/balances` timing:

Measured 2026-09-28 from Colombo (traffic enters Cloudflare's `CMB` edge), with a
headless Chromium and a fresh browser context per load (empty cache), 5 loads each:

| | cold first load | warm load (DOMContentLoaded) | `/api/balances` |
|---|---|---|---|
| Render (Singapore, free) | **4.5 s** for the first page load (TTFB 3.6 s). After ~15 idle minutes the API sleeps, and its first request takes **30–60 s** | **154–256 ms** | **86–108 ms** |
| CloudFront + ECS Express (Mumbai) | not measured: not deployed (see the status note at the top) | — | — |

Expected CloudFront numbers, not measured: similar warm page loads, since both serve
static files from an edge near Colombo. API calls maybe 20–40 ms faster, since Mumbai
is closer than Singapore. **No cold starts**, because the task is always running.

**The trade-off in three sentences.** Once warm, Render's free plan is already fast
from Colombo (sub-300 ms pages, ~100 ms API calls), so the region difference to Mumbai
wouldn't be noticed by anyone. What rules out *free* Render for Nadeesha is not speed:
the 30–60 s cold start after idle, a database that Render deletes after 30 days, and no
backups. I'd give her Render on paid plans (an always-on web service and a paid Postgres
with backups), which fixes all three for a fraction of the ~US$40–50/month the
CloudFront + ECS + RDS setup costs. I'd move to AWS only when she needs something Render
can't give, such as private networking to other company systems, or data kept in India.
