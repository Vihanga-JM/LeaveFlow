# Runbook — "sorry, too many clients already"

**Symptoms:** the API returns 500s (or hangs, then 500s); health check may still
be green; logs contain `sorry, too many clients already` or requests that never
log "request completed". Often gets worse over hours and "fixes itself" on restart.

## Check

1. RDS console → Monitoring → **DatabaseConnections**. Compare with `max_connections`
   (`SHOW max_connections;` — on `db.t4g.micro` it's roughly 80–100).
2. How many API instances are running? App Runner → Metrics → active instances.
   Each instance opens up to `pg.Pool` `max` connections (default **10**).
3. Who holds the connections?
   ```sql
   SELECT application_name, client_addr, state, count(*),
          max(now() - state_change) AS oldest
   FROM pg_stat_activity WHERE datname = 'leaveflow'
   GROUP BY 1, 2, 3 ORDER BY 4 DESC;
   ```
   Many `idle in transaction` rows = a code path that ran `BEGIN` and never
   `COMMIT`/`ROLLBACK`/`release()`.

## Likely causes

| Cause | Tell-tale |
|---|---|
| **Instances × pool size > max_connections** — autoscaling added instances | connections step up with instance count, all `idle` |
| **Connection leak** — a `pool.connect()` without `client.release()` in `finally` | count climbs steadily, `idle in transaction`, API freezes after N requests |
| Something else connects too (an Adminer session, a migration, a psql left open) | unfamiliar `application_name` / `client_addr` |

## Mitigate

1. Restart the API (App Runner → Deploy the same image). Leaked clients die with the process.
2. If instances × 10 > max_connections: cap App Runner max instances, or set a smaller
   pool (`new Pool({ max: 5 })`), then redeploy.
3. Kill a stuck session only if you know what it is: `SELECT pg_terminate_backend(<pid>);`

## Prevent

- Every `pool.connect()` pairs with `client.release()` in `finally` (see the approve
  transaction in `routes/leaveRequests.js`).
- Set `idle_in_transaction_session_timeout` on the RDS parameter group (e.g. 60 s).
- CloudWatch alarm on DatabaseConnections > 80% of `max_connections`.
- Instances × pool max stays below `max_connections` minus headroom for admin/migrations.
