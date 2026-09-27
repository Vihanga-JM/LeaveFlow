# LeaveFlow API Contract (v1)

Base URL:

`http://localhost:3000/api`

All responses are JSON.

## Authentication

All endpoints require a valid JWT unless otherwise stated.

Send the token using:

```http
Authorization: Bearer <jwt>
```

The login endpoint does not require authentication.

## Response Format

### Success

Successful responses return the resource or data directly.

### Error

All API errors use the following structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message"
  }
}
```

## API Endpoints

| Method | Path                  | Authentication | Access                                                | Success | Possible Errors              |
| ------ | --------------------- | -------------- | ----------------------------------------------------- | ------- | ---------------------------- |
| GET    | `/health`             | None           | Anyone                                                | 200     | —                            |
| POST   | `/auth/login`         | None           | Anyone                                                | 200     | 401, 500                     |
| GET    | `/me`                 | JWT            | Authenticated users                                   | 200     | 401, 500                     |
| GET    | `/leave-requests`     | JWT            | Owner; HR_ADMIN sees all                              | 200     | 401, 500                     |
| POST   | `/leave-requests`     | JWT            | Authenticated users                                   | 201     | 400, 401, 409, 500           |
| PATCH  | `/leave-requests/:id` | JWT            | Owner for cancel; MANAGER/HR_ADMIN for approve/reject | 200     | 400, 401, 403, 404, 409, 500 |
| GET    | `/balances`           | JWT            | Authenticated users                                   | 200     | 401, 500                     |
| GET    | `/team/requests`      | JWT            | MANAGER, HR_ADMIN                                     | 200     | 401, 403, 500                |

---

## Authentication

### POST `/auth/login`

Logs a user in and returns a JWT.

Authentication required: **No**

Request:

```json
{
  "email": "ruwan@ceylonroots.lk",
  "password": "your-password"
}
```

Success: `200 OK`

```json
{
  "token": "<jwt>",
  "user": {
    "id": 1,
    "name": "Ruwan Jayasuriya",
    "role": "MANAGER"
  }
}
```

Invalid credentials: `401 Unauthorized`

```json
{
  "error": {
    "code": "BAD_CREDENTIALS",
    "message": "Wrong email or password"
  }
}
```

---

## Current User

### GET `/me`

Returns the currently authenticated user's basic information.

Authentication required: **Yes**

Success: `200 OK`

```json
{
  "id": 1,
  "name": "Ruwan Jayasuriya",
  "email": "ruwan@ceylonroots.lk",
  "role": "MANAGER"
}
```

Missing token:

```json
{
  "error": {
    "code": "NO_TOKEN",
    "message": "Log in first"
  }
}
```

Invalid or expired token:

```json
{
  "error": {
    "code": "BAD_TOKEN",
    "message": "Invalid or expired token"
  }
}
```

---

## Leave Requests

### GET `/leave-requests`

Returns leave requests.

Authentication required: **Yes**

* Normal users see their own requests.
* `HR_ADMIN` sees all leave requests.

Success: `200 OK`

```json
[
  {
    "id": 6,
    "user_id": 1,
    "leave_type_id": 1,
    "start_date": "2026-09-27T18:30:00.000Z",
    "end_date": "2026-10-02T18:30:00.000Z",
    "reason": "vacation",
    "status": "PENDING",
    "decided_by": null,
    "decided_at": null,
    "created_at": "2026-09-27T10:37:33.160Z"
  }
]
```

---

### POST `/leave-requests`

Creates a new leave request.

Authentication required: **Yes**

Request:

```json
{
  "leave_type_id": 1,
  "start_date": "2026-10-10",
  "end_date": "2026-10-11",
  "reason": "Personal leave"
}
```

Success: `201 Created`

The created leave request is returned.

### Validation

`leave_type_id` is required.

`start_date` must use:

```text
YYYY-MM-DD
```

`end_date` must use:

```text
YYYY-MM-DD
```

`end_date` must be on or after `start_date`.

Example validation error:

```json
{
  "error": {
    "code": "VALIDATION",
    "message": "end_date: must be on or after start_date"
  }
}
```

Unknown leave type:

```json
{
  "error": {
    "code": "BAD_TYPE",
    "message": "Unknown leave type"
  }
}
```

Insufficient leave balance:

```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance"
  }
}
```

---

## Update Leave Request

### PATCH `/leave-requests/:id`

Changes the status of a pending leave request.

Authentication required: **Yes**

Request body:

```json
{
  "action": "approve"
}
```

Supported actions:

```text
approve
reject
cancel
```

### Approve

Allowed for:

* The requester's assigned `MANAGER`
* `HR_ADMIN`

```json
{
  "action": "approve"
}
```

Result:

```text
status = APPROVED
```

### Reject

Allowed for:

* The requester's assigned `MANAGER`
* `HR_ADMIN`

```json
{
  "action": "reject"
}
```

Result:

```text
status = REJECTED
```

### Cancel

Allowed only for the owner of the request.

```json
{
  "action": "cancel"
}
```

Result:

```text
status = CANCELLED
```

The request must still be `PENDING`.

### Invalid action

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid action"
  }
}
```

### Unauthorized role

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Managers only"
  }
}
```

### Manager attempting to approve another manager's report

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Not your report"
  }
}
```

### Request not found

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "No such request"
  }
}
```

### Request is no longer pending

```json
{
  "error": {
    "code": "INVALID_STATE",
    "message": "Request is not pending"
  }
}
```

---

## Leave Balances

### GET `/balances`

Returns the authenticated user's leave balances for the current year.

Authentication required: **Yes**

Success: `200 OK`

Example:

```json
[
  {
    "id": 1,
    "name": "Annual",
    "annual_allocation": 14,
    "used_days": "0.0"
  },
  {
    "id": 2,
    "name": "Casual",
    "annual_allocation": 7,
    "used_days": "0.0"
  },
  {
    "id": 3,
    "name": "Sick",
    "annual_allocation": 7,
    "used_days": "0.0"
  }
]
```

---

## Team Approvals

### GET `/team/requests`

Returns pending leave requests belonging to the authenticated manager's reports.

Authentication required: **Yes**

Allowed roles:

* `MANAGER`
* `HR_ADMIN`

Success: `200 OK`

For a manager, only pending requests from their direct reports are returned.

For `HR_ADMIN`, pending requests across the organization are returned.

Example:

```json
[
  {
    "id": 7,
    "user_id": 2,
    "leave_type_id": 1,
    "start_date": "2026-10-10T00:00:00.000Z",
    "end_date": "2026-10-11T00:00:00.000Z",
    "reason": "Personal leave",
    "status": "PENDING",
    "employee_name": "Ishara Fernando"
  }
]
```

---

## Common HTTP Status Codes

| Status | Meaning                                                       |
| ------ | ------------------------------------------------------------- |
| `200`  | Request successful                                            |
| `201`  | Resource created                                              |
| `400`  | Invalid request or validation failure                         |
| `401`  | Authentication required or invalid credentials/token          |
| `403`  | Authenticated user does not have permission                   |
| `404`  | Resource or endpoint not found                                |
| `409`  | Request conflicts with the current state or available balance |
| `500`  | Unexpected server error                                       |

## Error Codes

| Code                   | Meaning                                                         |
| ---------------------- | --------------------------------------------------------------- |
| `BAD_CREDENTIALS`      | Login credentials are incorrect                                 |
| `NO_TOKEN`             | Authentication token was not provided                           |
| `BAD_TOKEN`            | JWT is invalid or expired                                       |
| `VALIDATION`           | Request input failed validation                                 |
| `VALIDATION_ERROR`     | Invalid PATCH action                                            |
| `BAD_TYPE`             | Unknown leave type                                              |
| `INSUFFICIENT_BALANCE` | Leave balance is insufficient                                   |
| `FORBIDDEN`            | User does not have permission                                   |
| `NOT_FOUND`            | Requested resource or endpoint does not exist                   |
| `INVALID_STATE`        | Requested operation is not valid for the current resource state |
| `INTERNAL`             | Unexpected server error                                         |

## Health Check

### GET `/health`

Authentication required: **No**

Success:

```json
{
  "status": "ok",
  "version": "0.5.0"
}
```
