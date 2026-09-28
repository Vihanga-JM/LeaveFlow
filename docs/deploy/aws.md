# Deploy to AWS — production-shaped

Region: **ap-south-1 (Mumbai)**, ~30–40 ms from Colombo.
Replace `123456789012` with your account ID and `vihanga-jm` with your lowercase
GitHub owner. Every step below needs someone with the AWS account.

## 0. Account hygiene (before anything else)

- Enable MFA on the root user, then stop using root.
- IAM → create a user for yourself; sign in as that user from now on.
- Billing → Budgets → **monthly cost budget $10, alert at 80%** to your email.
  Create this *before* the first resource.

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

## 3. API → App Runner

App Runner → Create service → source ECR, image `leaveflow-api:prod`, port `4000`,
health check path `/api/health`.

Environment variables:

| Key | Value |
|---|---|
| `DATABASE_URL` | `postgres://postgres:<password>@<rds-endpoint>:5432/leaveflow` |
| `DATABASE_SSL` | `true` |
| `DATABASE_SSL_CA` | `/etc/ssl/rds-global-bundle.pem` (baked into the image) |
| `JWT_SECRET` | a fresh value from `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

Networking → outgoing traffic → **custom VPC**, add a VPC connector with its own
security group `leaveflow-apprunner-sg`. Then edit `leaveflow-db-sg`:
inbound **5432 from source `leaveflow-apprunner-sg`** — never `0.0.0.0/0`.

Migrations: the image's start command already runs `node src/db/migrate.js`
before the server, so every deploy migrates; a failed migration fails the health
check and the rollout stops instead of breaking prod.

## 4. Client → S3 + CloudFront

```bash
aws s3 mb s3://leaveflow-client --region ap-south-1   # keep "Block all public access" on
cd client && npm ci && npm run build
aws s3 sync dist/ s3://leaveflow-client --delete
```

CloudFront → Create distribution:

- Origin 1: the S3 bucket via **Origin Access Control** (accept the bucket policy it offers)
- Default root object `index.html`
- Origin 2: the App Runner default domain (HTTPS only)
- Behavior `/api/*` → origin 2, cache policy **CachingDisabled**, origin request
  policy **AllViewerExceptHostHeader**, allowed methods GET/HEAD/OPTIONS/PUT/POST/PATCH/DELETE
- Behavior `/assets/*` → origin 1, CachingOptimized (hashed files, cache hard)
- Default behavior → origin 1; custom error response 403/404 → `/index.html`, code 200
  (so React deep links work)

After each client deploy:

```bash
aws cloudfront create-invalidation --distribution-id <ID> --paths "/index.html"
```

## 5. Domain + HTTPS

- ACM **in us-east-1** (CloudFront only reads certificates there): request
  `leave.ceylonroots.lk`, DNS validation; add the validation CNAME at the `.lk` registrar.
- When issued: CloudFront → alternate domain name `leave.ceylonroots.lk` + that certificate.
- Registrar: CNAME `leave` → `dxxxxxxxx.cloudfront.net`. Wait for propagation.

## Prove it works

1. `https://leave.ceylonroots.lk` shows the padlock with your domain on the certificate.
2. `curl https://leave.ceylonroots.lk/api/health` → `{"status":"ok",...}`.
3. Create a request, redeploy App Runner, the request is still there (data lives in RDS).
4. `curl -I https://leave.ceylonroots.lk/assets/<file>.js` twice → `x-cache: Hit from cloudfront`.
5. `psql "host=<rds-endpoint> user=postgres"` from your laptop **times out**. That's the pass.

## Lab 2 — staging

Second App Runner service `leaveflow-api-staging`: image `leaveflow-api:main`,
**automatic deployment on**, its own RDS database (`leaveflow_staging`) and its
own `JWT_SECRET`. To feed it, add an ECR push to `release.yml` (needs
`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` repo secrets, or better an OIDC role):
every merge to `main` then updates staging while prod stays on `:prod`.

## Lab 1 — Render vs CloudFront comparison

Open DevTools → Network → Disable cache, load each URL five times from Colombo
and record DOMContentLoaded + the `/api/balances` timing:

| | cold first load | warm load | `/api/balances` |
|---|---|---|---|
| Render (Singapore, free) | | | |
| CloudFront + App Runner (Mumbai) | | | |

Write three sentences: which you'd give Nadeesha, and why (cold starts, region,
cost).
