# LeaveFlow API Contract (v1.1)

Base URL: `http://localhost:4000/api` locally · `/api` behind nginx / CloudFront in deployments.

All responses are JSON. Dates are `YYYY-MM-DD` strings, exactly as submitted.
Every response carries an `x-request-id` header — quote it when reporting a problem;
it matches `req.id` in the server logs.

## Authentication

All endpoints require a valid JWT except `GET /health` and `POST /auth/login`.

```http
Authorization: Bearer <jwt>
```

Tokens last 8 hours. Any 401 means "log in again".

## Errors

One shape, everywhere:

```json
{ "error": { "code": "ERROR_CODE", "message": "Human-readable message" } }
```

500s always say `"Something went wrong"`; the detail is logged server-side only.

## Endpoints

| Method | Path                  | Access                                                  | Success | Possible errors         |
| ------ | --------------------- | ------------------------------------------------------- | ------- | ----------------------- |
| GET    | `/health`             | Anyone                                                  | 200     | —                       |
| POST   | `/auth/login`         | Anyone                                                  | 200     | 401, 429                |
| GET    | `/me`                 | Any user                                                | 200     | 401                     |
| GET    | `/leave-requests`     | Own requests; HR_ADMIN sees all                         | 200     | 401                     |
| POST   | `/leave-requests`     | Any user                                                | 201     | 400, 401, 409           |
| PATCH  | `/leave-requests/:id` | Owner for cancel; manager of the requester or HR_ADMIN for approve/reject | 200 | 400, 401, 403, 404, 409 |
| GET    | `/balances`           | Own balances                                            | 200     | 401                     |
| GET    | `/team/requests`      | MANAGER (own reports), HR_ADMIN (all)                   | 200     | 401, 403                |
| GET    | `/team/absences`      | MANAGER (own reports), HR_ADMIN (all)                   | 200     | 400, 401, 403           |
| GET    | `/admin/requests`     | HR_ADMIN                                                | 200     | 401, 403                |
| GET    | `/holidays`           | Any user                                                | 200     | 401                     |
| GET    | `/calendar?month=`    | Any user (own / own + reports / everyone)               | 200     | 400, 401                |
| GET    | `/notifications`      | Own notifications                                       | 200     | 401                     |
| PATCH  | `/notifications/:id/read` | Own notification                                    | 204     | 400, 401, 404           |
| POST   | `/notifications/read-all` | Own notifications                                   | 204     | 401                     |
| POST   | `/holidays`           | HR_ADMIN                                                | 201     | 400, 401, 403, 409      |
| DELETE | `/holidays/:date`     | HR_ADMIN                                                | 204     | 400, 401, 403, 404      |

---

## POST `/auth/login`

```json
{ "email": "ruwan@ceylonroots.lk", "password": "your-password" }
```

`200 OK`

```json
{ "token": "<jwt>", "user": { "id": 1, "name": "Ruwan Jayasuriya", "role": "MANAGER" } }
```

`401 BAD_CREDENTIALS` "Wrong email or password" — identical (body *and* timing) for an
unknown email and a wrong password, so the endpoint doesn't reveal which emails exist.

`429 TOO_MANY_ATTEMPTS` after 10 attempts per minute from one client IP, or after
10 wrong passwords for one email within 15 minutes (from any IP; successful logins
don't count).

## GET `/me`

`200 OK` → `{ "id": 1, "name": "Ruwan Jayasuriya", "email": "ruwan@ceylonroots.lk", "role": "MANAGER" }`

`401 NO_TOKEN` "Log in first" · `401 BAD_TOKEN` "Invalid or expired token"

---

## Leave requests

A request object:

```json
{
  "id": 6,
  "user_id": 2,
  "leave_type_id": 1,
  "start_date": "2026-10-09",
  "end_date": "2026-10-09",
  "day_part": "PM",
  "days": "0.5",
  "reason": "Bank errand",
  "status": "PENDING",
  "decided_by": null,
  "decided_at": null,
  "decision_note": null,
  "created_at": "2026-09-28T03:59:33.156Z"
}
```

- `day_part`: `FULL`, `AM` or `PM`. A half day is always a single date.
- `days`: working days this request consumes — weekends and public holidays excluded,
  0.5 for a half day. Fixed when the request is created.
- `status`: `PENDING` → `APPROVED` | `REJECTED` (manager/HR) or `CANCELLED` (owner). Final
  states never change.

### GET `/leave-requests`

Own requests, newest first. HR_ADMIN receives everyone's.

### POST `/leave-requests`

```json
{
  "leave_type_id": 1,
  "start_date": "2026-10-09",
  "end_date": "2026-10-09",
  "day_part": "PM",
  "reason": "Bank errand"
}
```

`day_part` is optional (default `FULL`). `201 Created` returns the request object.

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION` | missing `leave_type_id`; a date isn't a real `YYYY-MM-DD` day; `end_date` before `start_date`; bad `day_part`; a half day spanning two dates. The message starts with the field name. |
| 400 | `BAD_TYPE` | unknown `leave_type_id` |
| 400 | `NO_WORKING_DAYS` | every date is a weekend or public holiday |
| 409 | `OVERLAPPING_REQUEST` | overlaps one of your PENDING/APPROVED requests (an AM and a PM half day on the same date don't overlap) |
| 409 | `INSUFFICIENT_BALANCE` | used + reserved (pending) + this request > allocation. The message says how many days are left. |

### PATCH `/leave-requests/:id`

```json
{ "action": "approve" }
{ "action": "reject", "decision_note": "Stock-take week" }
{ "action": "cancel" }
```

- **approve** — requester's manager or HR_ADMIN. Sets `APPROVED` and adds the request's
  `days` to the balance, in one transaction.
- **reject** — same roles; `decision_note` is required and shown to the employee.
- **cancel** — the owner only, while `PENDING`. Releases the reserved days.
- Nobody may **approve or reject their own** request, HR included. A manager's own leave
  goes to HR. With a single HR admin, HR's own leave needs a second approver (another
  HR admin or the MD), which the seed data doesn't have.

| Status | Code | Message |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid action |
| 400 | `VALIDATION` | decision_note is required when rejecting |
| 403 | `SELF_DECISION` | You can't approve or reject your own request |
| 403 | `FORBIDDEN` | Only the owner can cancel · Managers only · Not your report |
| 404 | `NOT_FOUND` | No such request |
| 409 | `INVALID_STATE` | Request is not pending |

---

## GET `/balances`

Your balances for the current year, one row per leave type.

```json
[
  { "id": 1, "name": "Annual", "annual_allocation": 14, "used_days": "0.5", "reserved_days": "2.0" },
  { "id": 2, "name": "Casual", "annual_allocation": 7,  "used_days": "0",   "reserved_days": "0" },
  { "id": 3, "name": "Sick",   "annual_allocation": 7,  "used_days": "0",   "reserved_days": "0" }
]
```

`used_days` = approved; `reserved_days` = pending. Available = allocation − used − reserved.

---

## GET `/team/requests`

Pending requests from your direct reports (HR_ADMIN: everyone), oldest first — request
objects plus `employee_name`. Your own requests are never included.

## GET `/team/absences?from=YYYY-MM-DD&to=YYYY-MM-DD`

Who is already off in that window: **APPROVED** requests overlapping `from`–`to`, for your
reports (HR_ADMIN: everyone).

```json
[
  { "id": 3, "user_id": 2, "employee_name": "Ishara Fernando",
    "start_date": "2026-03-10", "end_date": "2026-03-11", "leave_type_id": 1 }
]
```

An empty array means nobody is off. `400 VALIDATION` if either date is missing/invalid or
`to` < `from`.

## GET `/calendar?month=YYYY-MM`

The team calendar (US-7): leave overlapping the month, plus the month's public holidays.
`month` defaults to the current month; anything that isn't `YYYY-MM` is a 400.

Who appears: an EMPLOYEE sees their own leave, a MANAGER sees their own and their
reports', HR_ADMIN sees everyone. Only `PENDING` and `APPROVED` requests are included —
cancelled and rejected leave isn't absence.

```json
{
  "month": "2026-10", "first": "2026-10-01", "last": "2026-10-31",
  "leave": [
    { "id": 12, "user_id": 2, "employee_name": "Ishara Fernando", "leave_type": "Annual",
      "start_date": "2026-10-09", "end_date": "2026-10-09", "day_part": "PM",
      "days": "0.5", "status": "PENDING" }
  ],
  "holidays": [ { "holiday_date": "2026-10-25", "name": "Vap Full Moon Poya Day" } ]
}
```

## Notifications (US-8)

In-app notifications, shown under the bell in the top bar. They are written in the same
transaction as the change they describe, so a refused request or decision leaves none.

| Event                        | Who is notified                                              |
| ---------------------------- | ------------------------------------------------------------ |
| `SUBMITTED` — new request    | The requester's manager; HR admins if they have no manager   |
| `CANCELLED` — owner withdrew | Same as above                                                |
| `APPROVED` / `REJECTED`      | The requester                                                |

### GET `/notifications`

Your latest 30, newest first, plus the unread count. The text is built from the request
at read time, so it always matches the request.

```json
{
  "unread": 1,
  "items": [
    { "id": 7, "kind": "REJECTED", "read_at": null, "created_at": "2026-10-09T05:12:44.120Z",
      "leave_request_id": 12, "actor_name": "Ruwan Jayasuriya",
      "employee_name": "Ishara Fernando", "leave_type": "Annual",
      "start_date": "2026-10-13", "end_date": "2026-10-15", "day_part": "FULL",
      "days": "3.0", "decision_note": "Release week" }
  ]
}
```

### PATCH `/notifications/:id/read` · POST `/notifications/read-all`

Both return `204`. Someone else's notification is a `404` (its existence isn't confirmed);
a non-numeric id is a `400 VALIDATION`.

## GET `/admin/requests`

HR_ADMIN only: every request, newest first, plus `employee_name` and `leave_type`.

---

## Public holidays

Public holidays are never counted in `days`.

### GET `/holidays?year=2026`

```json
[ { "holiday_date": "2026-05-01", "name": "Vesak Full Moon Poya Day / May Day" } ]
```

`year` defaults to the current year.

### POST `/holidays` (HR_ADMIN)

```json
{ "holiday_date": "2026-12-31", "name": "Special bank holiday" }
```

`201 Created` → the holiday. `409 HOLIDAY_EXISTS` if that date already has one;
`400 VALIDATION` for a bad date or empty name.

### DELETE `/holidays/:date` (HR_ADMIN)

`204 No Content`; `404 NOT_FOUND` if there is no holiday on that date.

A holiday added or removed later does not change existing requests — their `days` were
fixed when they were made.

---

## GET `/health`

No authentication. `200 OK` → `{ "status": "ok", "version": "0.6.0" }`

---

## Status codes

| Status | Meaning |
|---|---|
| 200 / 201 / 204 | OK / created / deleted |
| 400 | invalid input |
| 401 | not logged in, or the token is invalid/expired |
| 403 | logged in, but not allowed |
| 404 | no such resource or endpoint |
| 409 | conflicts with current state, other requests, or the balance |
| 429 | too many login attempts |
| 500 | unexpected server error |

## Error codes

| Code | Meaning |
|---|---|
| `BAD_CREDENTIALS` | wrong email or password |
| `TOO_MANY_ATTEMPTS` | login rate limit hit |
| `NO_TOKEN` | no `Authorization` header |
| `BAD_TOKEN` | JWT invalid or expired |
| `VALIDATION` | input failed validation (message names the field) |
| `VALIDATION_ERROR` | unknown PATCH action |
| `BAD_TYPE` | unknown leave type |
| `NO_WORKING_DAYS` | the dates contain no working day |
| `OVERLAPPING_REQUEST` | clashes with another pending/approved request |
| `INSUFFICIENT_BALANCE` | not enough days left |
| `HOLIDAY_EXISTS` | a holiday already exists on that date |
| `FORBIDDEN` | role or ownership doesn't allow this |
| `NOT_FOUND` | resource or endpoint doesn't exist |
| `INVALID_STATE` | the request is no longer pending |
| `INTERNAL` | unexpected server error |
