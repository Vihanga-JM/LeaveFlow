# Costs and teardown

## What it costs (LeaveFlow scale, ap-south-1)

| Resource | Rough monthly cost |
|---|---|
| RDS `db.t4g.micro` | ~US$12–15 (free tier: 750 h/month for 12 months) |
| App Runner (0.25 vCPU / 0.5 GB) | ~US$5–10 |
| S3 + CloudFront | well under $1 |
| Route 53 zone (if used) | $0.50 + domain fee |
| ACM certificate | $0 |
| Budget alarm | $0 — and mandatory |

Cloud resources bill while they **exist**, not while you use them.

## Teardown checklist (lab 3) — run top to bottom

Order matters: things that depend on others go first.

1. **CloudFront** — Disable the distribution, wait until "Deployed", then Delete.
2. **ACM** (us-east-1) — delete the certificate once no distribution uses it.
3. **Registrar** — remove the `leave` CNAME and the ACM validation CNAME.
4. **S3** — `aws s3 rb s3://leaveflow-client --force` (empties and deletes).
5. **App Runner** — delete `leaveflow-api-staging`, then `leaveflow-api`.
6. **App Runner VPC connector** — delete it (App Runner → Networking).
7. **RDS** — delete `leaveflow-db` (and any `-restore-test` instances); take a final
   snapshot only if the data matters, and delete old manual snapshots too.
8. **Security groups** — delete `leaveflow-db-sg` and `leaveflow-apprunner-sg`.
9. **ECR** — `aws ecr delete-repository --repository-name leaveflow-api --force --region ap-south-1`.
10. **CloudWatch** — delete the `/aws/apprunner/leaveflow-api*` log groups, the 5xx
    alarm, and the SNS topic `leaveflow-alerts`.
11. **Check** — Billing → Bills and Cost Explorer (filter ap-south-1 + us-east-1):
    forecast drops, nothing named `leaveflow` remains. Keep the budget alarm.

Done when the Billing console shows the resources gone and forecast spend drops.
