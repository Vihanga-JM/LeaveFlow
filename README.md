# LeaveFlow

Leave management for Ceylon Roots: employees apply, managers approve, HR sees everything.
React (Vite) client · Express API · PostgreSQL.

## Run it — one command

Needs only Docker Desktop.

```bash
docker compose up --build -d
```

| URL | What |
|---|---|
| http://localhost:8080 | the app (nginx serves the client and proxies `/api`) |
| http://localhost:8081 | Adminer — System PostgreSQL, Server `db`, user/password/db `leaveflow` |

Migrations and demo seed data run automatically when the API container starts.
Demo logins (password `password123`): `ishara@ceylonroots.lk` (employee),
`ruwan@ceylonroots.lk` (her manager), `dilini@ceylonroots.lk` (HR admin).

```bash
docker compose down      # stop; data is kept in the dbdata volume
docker compose down -v   # stop AND delete all data
docker compose up --build -d   # after changing code or a Dockerfile
```

## Develop without Docker

```bash
# Postgres on localhost:5432, then:
cd server && cp .env.example .env   # fill in DATABASE_URL and JWT_SECRET
npm install && npm run migrate && npm run dev     # API on :4000
cd ../client && npm install && npm run dev        # app on :5173
```

## Tests

```bash
cd server && cp .env.test.example .env.test && npm test   # Jest + Supertest (leaveflow_test DB)
cd client && npm test                                     # Vitest
npm install && npx playwright test                        # E2E, from the repo root
```

Docs: `docs/requirements.md`, `docs/design.md`, `docs/api.md`, `docs/testing/`, `docs/ops/`.
