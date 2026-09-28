# Costs and teardown

Nothing on AWS is deployed (see the status note in `aws.md`). The live deploy is
Render's free plan: $0. This page is for when AWS happens.

## What it costs (LeaveFlow scale, ap-south-1)

| Resource | Rough monthly cost |
|---|---|
| Application Load Balancer (created by ECS Express Mode) | ~US$16–19, shared by up to 25 Express services |
| Fargate task (0.25 vCPU / 0.5 GB, always on) | ~US$9 |
| RDS `db.t4g.micro` + 20 GB storage | ~US$13–15 |
| Public IPv4 addresses (ALB, task) | ~US$3–4 per address |
| S3 + CloudFront | well under $1 |
| Route 53 zone (if used) | $0.50 + domain fee |
| ACM certificate | $0 |
| Budget alarm | $0 — and mandatory |
| **Total** | **about US$40–50** |

New accounts on the Free plan get US$100–200 in credits for 6 months, which
covers roughly 3–5 months of this. Cloud resources bill while they **exist**, not
while you use them.

## Teardown checklist (lab 3) — run top to bottom

Order matters: things that depend on others go first.

1. **CloudFront** — Disable the distribution, wait until "Deployed", then Delete.
2. **ACM** (us-east-1) — delete the certificate once no distribution uses it.
3. **Registrar** — remove the `leave` CNAME and the ACM validation CNAME.
4. **S3** — `aws s3 rb s3://leaveflow-client --force` (empties and deletes).
5. **ECS Express services** — delete `leaveflow-api-staging`, then `leaveflow-api`.
   Deleting the last one removes the load balancer it created. Check EC2 → Load
   Balancers and Target Groups afterwards, since the ALB costs money while it exists.
6. **RDS** — delete `leaveflow-db` (and any `-restore-test` instances); take a final
   snapshot only if the data matters, and delete old manual snapshots too.
7. **Security groups** — delete `leaveflow-db-sg` and any service security groups left over.
8. **ECR** — `aws ecr delete-repository --repository-name leaveflow-api --force --region ap-south-1`.
9. **CloudWatch** — delete the service's log groups, the 5xx alarm, and the SNS topic
   `leaveflow-alerts`.
10. **IAM** — delete the ECS task execution and infrastructure roles if nothing else uses them.
11. **Check** — Billing → Bills and Cost Explorer (filter ap-south-1 + us-east-1):
    forecast drops, nothing named `leaveflow` remains. Keep the budget alarm.

Done when the Billing console shows the resources gone and forecast spend drops.
