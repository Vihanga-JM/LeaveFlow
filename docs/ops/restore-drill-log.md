# Restore drill log

A backup you have never restored doesn't exist. Run this monthly.

> **Render's free Postgres has no backups, and it expires.** Free databases expire
> 30 days after creation, and Render deletes them 14 days later with all their data.
> On Render the only backup is one you take yourself: `pg_dump` over the External
> Database URL. Upgrade the database to a paid plan before real data lives there.

| Date | Environment | Snapshot | Restored to | Verified with | Measured RTO | Notes |
|---|---|---|---|---|---|---|
| 2026-09-28 | local compose (stand-in for RDS) | `pg_dump -Fc` of `leaveflow` (13 KB) | brand-new `postgres:16` container on :55432 | API pointed at the copy; Ishara's "Poson week" request present, status PENDING | **22 s** | drill instance deleted afterwards |

## Local procedure (what was run)

```bash
docker compose exec -T db pg_dump -U leaveflow -Fc leaveflow > snap.dump
docker run -d --name leaveflow-restore-test -e POSTGRES_PASSWORD=restore -p 55432:5432 postgres:16
docker exec leaveflow-restore-test createdb -U postgres leaveflow
docker exec -i leaveflow-restore-test pg_restore -U postgres -d leaveflow --no-owner < snap.dump
PORT=4200 DATABASE_URL=postgres://postgres:restore@localhost:55432/leaveflow JWT_SECRET=x node src/server.js
# log in, list requests, compare with production
docker rm -f leaveflow-restore-test
```

## AWS procedure (RDS)

1. RDS → Snapshots → last night's automated snapshot → **Restore snapshot**,
   identifier `leaveflow-restore-test`, `db.t4g.micro`. (A restore always creates
   a *new* instance; the original is untouched.)
2. For the drill only: allow inbound 5432 from your laptop's IP as a `/32`, never `0.0.0.0/0`.
3. Run the API locally against it with `DATABASE_SSL=true`, verify real data
   (e.g. a known APPROVED request).
4. Delete `leaveflow-restore-test` (skip the final snapshot) and remove the `/32` rule.
5. Add a row to the table above. Expect RTO in tens of minutes on RDS: most of it is
   instance creation, which is why practising matters.

RPO with nightly automated snapshots alone = up to 24 h. RDS point-in-time recovery
(on by default with automated backups) brings it down to ~5 minutes.
