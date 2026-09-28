# Restore drill log

A backup you have never restored doesn't exist. Run this monthly.

> **Render's free Postgres has no backups, and it expires.** Free databases expire
> 30 days after creation, and Render deletes them 14 days later with all their data.
> On Render the only backup is one you take yourself: `pg_dump` over the External
> Database URL. Upgrade the database to a paid plan before real data lives there.

| Date | Environment | Snapshot | Restored to | Verified with | Measured RTO | Notes |
|---|---|---|---|---|---|---|
| 2026-09-28 | local compose (stand-in for RDS) | `pg_dump -Fc` of `leaveflow` (13 KB) | brand-new `postgres:16` container on :55432 | API pointed at the copy; Ishara's "Poson week" request present, status PENDING | **22 s** | drill instance deleted afterwards |
| 2026-09-28 | **Render production** (Postgres 18, Singapore) | `pg_dump -Fc` over the External Database URL (16 KB), run from `postgres:18` in Docker | brand-new `postgres:18` container on :55433 | local API on :4300 pointed at the copy; logged in with the prod password; Ishara's approved PM half day on 2026-11-20 present (0.5 days), Annual 0.5 used of 14, 25 holidays | **18 s** | drill container and API deleted afterwards; the dump is kept outside the repo as the only backup of the free database |

## Render procedure (what was run)

```bash
# the External Database URL comes from Render → leaveflow-db → Connections; never commit it
docker run --rm -v "$PWD:/w" postgres:18 pg_dump "$RENDER_DB_URL?sslmode=require" -Fc --no-owner --no-acl -f /w/prod.dump
docker run -d --name leaveflow-restore-test -e POSTGRES_PASSWORD=restore -p 55433:5432 postgres:18
docker exec leaveflow-restore-test createdb -U postgres leaveflow
docker cp prod.dump leaveflow-restore-test:/tmp/prod.dump
docker exec leaveflow-restore-test pg_restore -U postgres -d leaveflow --no-owner --no-acl /tmp/prod.dump
PORT=4300 DATABASE_URL=postgres://postgres:restore@localhost:55433/leaveflow JWT_SECRET=x node src/server.js
# log in, check a known APPROVED request, balances and holidays
docker rm -f leaveflow-restore-test
```

`pg_dump` must be at least the server's major version: Render runs Postgres 18, so use the `postgres:18` image.

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
