# LeaveFlow API contract (v1)

Base URL: http://localhost:4000/api
All responses are JSON.
Errors: { "error": { "code", "message" } }.
Auth: Bearer JWT on every endpoint except POST /auth/login.

| Method | Path | Who | Success | Errors |
|--------|------|-----|---------|--------|
| POST | /auth/login | anyone | 200 | 400, 401 |
| GET | /me | any user | 200 | 401 |
| GET | /leave-requests | owner | 200 | 401 |
| POST | /leave-requests | owner | 201 | 400, 401 |
| PATCH | /leave-requests/:id | see below | 200 | 400, 403, 404 |
| GET | /balances | owner | 200 | 401 |
| GET | /team/requests | MANAGER | 200 | 401, 403 |

PATCH body: { "action": "approve" | "reject" | "cancel" }

approve/reject: requester's manager only.
cancel: owner, PENDING only.


This is the contract table the guide asks you to create. :contentReference[oaicite:1]{index=1}

## Example — Create Leave Request

```http
POST /api/leave-requests HTTP/1.1
Host: localhost:4000
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "leave_type_id": 1,
  "start_date": "2026-05-01",
  "end_date": "2026-05-03",
  "reason": "Vesak trip to Kandy with family"
}

HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": 42,
  "user_id": 3,
  "leave_type_id": 1,
  "start_date": "2026-05-01",
  "end_date": "2026-05-03",
  "status": "PENDING",
  "created_at": "2026-04-20T09:14:00Z"
}

HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "end_date must be on or after start_date"
  }
}