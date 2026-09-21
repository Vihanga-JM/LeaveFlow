# DESIGN DOC — LeaveFlow v1

**Date:** September 2026
**Author:** Vihanga Dewindi

## CONTEXT

Ceylon Roots has approximately 60 staff and currently manages employee leave through email and spreadsheets.

This creates several problems:

- Leave requests can get lost.
- Employees do not always know their available leave balances.
- HR must manually track requests and balances.
- Managers do not have a clear view of their team's leave.

The system requirements are documented in `docs/requirements.md`.

The main must-have features are:

- Apply for leave
- Approve or reject leave requests
- View leave balances
- View team leave requests
- Cancel pending requests
- View request status

## DECISIONS

### D1 — Three-tier architecture

The final LeaveFlow application will use a three-tier architecture:

**React SPA → Express API → PostgreSQL**

The first working version will use a single Express server with SQLite so that the complete request flow can be demonstrated end-to-end before introducing the full three-tier architecture.

### D2 — Database structure

The system will use four main tables:

- `users`
- `leave_types`
- `leave_requests`
- `leave_balances`

Leave balances will be recorded by:

- User
- Leave type
- Year

The database will store `used_days`.

The remaining leave balance will be calculated as:

**annual allocation - used days**

The system will not store `remaining_days` because it is derived data and could become inconsistent with `used_days`.

### D3 — Leave request state machine

Leave requests will use the following states:

- `PENDING`
- `APPROVED`
- `REJECTED`
- `CANCELLED`

Valid transitions are:

- `PENDING → APPROVED` — performed by the requester's manager
- `PENDING → REJECTED` — performed by the requester's manager
- `PENDING → CANCELLED` — performed by the request owner

`APPROVED`, `REJECTED`, and `CANCELLED` are final states.

### D4 — REST API

LeaveFlow will expose a JSON REST API under:

`/api`

API URLs will represent resources, while HTTP methods will represent actions.

All API errors will follow one standard structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

## ALTERNATIVES CONSIDERED

### A1 — Continue using spreadsheets and scripts

Rejected because spreadsheets do not provide sufficient:

- Access control
- Approval workflow
- Audit history
- Reliable leave balance management

### A2 — Store remaining_days

Rejected because remaining leave is derived from:

**annual allocation - used days**

Storing both `used_days` and `remaining_days` could allow the values to become inconsistent.

### A3 — Use an is_approved boolean

Rejected because a boolean can represent only two values.

LeaveFlow needs to distinguish between four states:

- `PENDING`
- `APPROVED`
- `REJECTED`
- `CANCELLED`

A state field therefore represents the business process more accurately.

## RISKS

### R1 — Overengineering

LeaveFlow is designed for approximately 60 users.

There is currently no need for:

- Microservices
- Message queues
- Distributed caching
- Large-scale infrastructure

The architecture should only be reconsidered if Ceylon Roots expands the system to significantly more users or additional group companies.

### R2 — Overlapping leave requests

The exact business rule for overlapping leave requests and team staffing conflicts has not yet been fully defined.

This requirement should be confirmed with Nadeesha before automatic conflict handling is implemented.
