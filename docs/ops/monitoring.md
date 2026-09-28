# Monitoring and alerts

## Logs

The API writes one JSON line per request (pino): `req.id` (also returned as the
`x-request-id` header), method, url, `res.statusCode`, `responseTime`. The
Authorization header is redacted. On Render: dashboard → `leaveflow-api-vihangajm` → **Logs**. On AWS, ECS ships stdout to CloudWatch Logs:

```bash
aws logs tail <service log group> \
  --region ap-south-1 --follow --since 15m \
  --filter-pattern '{ $.res.statusCode = 401 }'
```

Locally: `docker compose logs -f api`.

## The 5xx alarm (AWS)

```bash
aws sns create-topic --name leaveflow-alerts --region ap-south-1
aws sns subscribe --topic-arn arn:aws:sns:ap-south-1:123456789012:leaveflow-alerts \
  --protocol email --notification-endpoint you@example.com --region ap-south-1
# confirm the email SNS sends you — an unconfirmed subscription delivers nothing

aws cloudwatch put-metric-alarm --region ap-south-1 \
  --alarm-name leaveflow-api-5xx \
  --namespace AWS/ApplicationELB --metric-name HTTPCode_Target_5XX_Count \
  --dimensions Name=LoadBalancer,Value=app/<alb-name>/<alb-id> \
  --statistic Sum --period 300 --evaluation-periods 1 \
  --threshold 5 --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching \
  --alarm-actions arn:aws:sns:ap-south-1:123456789012:leaveflow-alerts
```

Test it by tripping it deliberately on staging (e.g. point `DATABASE_URL` at a
wrong host for a minute). An alarm you've never seen fire is imaginary.

## Lab 1 — external uptime check

Checks from *outside* AWS catch what AWS can't see about itself (DNS, CloudFront,
certificate expiry).

**What runs today (Render): `.github/workflows/uptime.yml`.** Every 5 minutes,
GitHub's servers (outside Render) check:
- `https://leaveflow-api-vihangajm.onrender.com/api/health` returns `"status":"ok"`, allowing
  90 s and one retry for a free-plan cold start
- the website returns 200 with the app shell

A failed run emails the repo owner. That's GitHub's default for failed scheduled
workflows: Settings → Notifications → **Actions** → "Only notify for failed workflows".
It needs no extra account, and it also keeps the free service from sleeping.

- **Test the alert:** Actions → **uptime** → **Run workflow**, with `api_url` set to
  `https://leaveflow-api-vihangajm.invalid`. The run goes red and the email arrives. Or
  suspend the API in the Render dashboard, wait for the next scheduled run, then resume it.
- **Limit:** GitHub may start scheduled runs several minutes late under load, so
  "alert within 5 minutes" is usually met but not guaranteed. For a guaranteed
  5-minute interval, add UptimeRobot too (below).

**UptimeRobot (free), or the AWS version:** New monitor → HTTP(s) – Keyword →
the health URL above (on AWS: `https://leave.ceylonroots.lk/api/health`), interval
5 min, keyword `"status":"ok"`, alert contact = your email (on AWS, the same email
as the SNS topic). On AWS, done when scaling the ECS service to 0 tasks produces an
alert within 5 minutes.

## Alert hygiene

Every alert must be actionable. If you'd ignore it, delete it or raise its threshold.
One alarm you read beats ten you archive unread.
