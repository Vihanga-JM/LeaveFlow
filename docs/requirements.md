# LeaveFlow — SRS

Status: Draft — pending answers to Q1–Q5
Customer: Ceylon Roots (Pvt) Ltd
Contact: Nadeesha Perera, HR Manager

Purpose

Replace the current email, WhatsApp, verbal, and spreadsheet-based leave process for approximately 60 employees with a simple centralized leave management system.

In Scope

Employee login
Apply for leave
View leave balances
Approve or reject leave requests
Cancel pending leave requests
View request status
Email notifications
HR oversight
Leave type configuration
Team leave calendar
Out of Scope — Version 1
Payroll
WhatsApp integration
Native mobile application

A responsive web application will be used instead of a native mobile app.

## Stakeholders

Employees

Employees need to:

Log in securely
Apply for leave
Cancel pending requests
View remaining leave balances
View the status of their requests
Use the system comfortably from a mobile phone
Managers / Team Leads

Managers need to:

View leave requests from their team members
Approve or reject pending requests
View approved team leave to avoid staffing conflicts
Nadeesha — HR Administrator

HR needs to:

Maintain oversight of leave across the company
Configure leave types and allocations
View all employee leave requests
Ensure company leave policies are followed
Reduce the current manual administration workload
Finance

Finance needs to:

Access year-end leave reports
Avoid manually requesting and compiling leave information
Directors

Directors are indirectly interested in:

Keeping the solution cost-effective
Ensuring company leave policies are followed
Reducing operational risk

## User Stories

US-1 — Login

As an employee, I want to log in with my email and password, so that only I can act on my leave.

US-2 — Apply for Leave

As an employee, I want to apply for leave by selecting a leave type, dates, and reason, so that requests stop living in WhatsApp.

US-3 — View Leave Balance

As an employee, I want to see my remaining balance for each leave type, so that I do not need to repeatedly ask HR.

US-4 — Approve or Reject Leave

As a manager, I want to approve or reject my team's pending leave requests, so that decisions are fast and recorded.

US-5 — Cancel Pending Request

As an employee, I want to cancel a request while it is still pending, so that changed plans do not require HR intervention.

US-6 — Configure Leave Types

As an HR admin, I want to configure leave types and allocations, so that policy changes do not require a developer.

US-7 — Team Leave Calendar

As a manager, I want a calendar view of my team's approved leave, so that I can avoid having too many important team members away at the same time.

US-8 — Email Notification

As an employee, I want to receive an email when my request is decided, so that I do not need to repeatedly check the application.

US-9 — HR Oversight

As an HR admin, I want to see all leave requests across the company, so that I maintain company-wide oversight.

US-10 — Request Status

As an employee, I want to see the status of my requests as PENDING, APPROVED, REJECTED, or CANCELLED, so that I always know where each request stands.

## Acceptance Criteria

US-2 — Apply for Leave
Successful Request

Given I am logged in as an employee with 10 annual leave days remaining
When I submit an annual leave request for 3 working days with a reason
Then the request is saved with status PENDING
And my available annual leave balance shows 7 days.

Insufficient Balance

Given my remaining annual leave balance is 2 days
When I request 5 annual leave days
Then the request is rejected
And I see a clear "insufficient balance" message.

US-4 — Approve or Reject
Approve Request

Given I am logged in as a manager
And my report Ishara has a PENDING leave request
When I approve the request
Then its status becomes APPROVED
And my user ID and the decision timestamp are recorded
And Ishara is notified.

Prevent Repeated Decisions

Given a leave request is already APPROVED
When anyone attempts to approve or reject it again
Then the action is refused because decisions are final.

US-3 — Balance Check

Given the yearly leave allocations are:

Annual: 14 days
Casual: 7 days
Sick: 7 days

And I have taken 4 approved annual leave days
When I open my leave balances page
Then I see:

Annual: 10 days remaining
Casual: 7 days remaining
Sick: 7 days remaining

And pending requests are displayed as "reserved" rather than permanently deducted.

## MoSCoW Priorities

Must Have
US-1 — Login
US-2 — Apply for leave
US-3 — View balances
US-4 — Approve or reject
US-5 — Cancel pending request
US-10 — View request status

Should Have
US-8 — Email notifications
US-9 — HR oversight view

Could Have
US-6 — HR configures leave types
US-7 — Team calendar

Won't Have — Version 1
Payroll
WhatsApp integration
Native mobile app

The application will instead provide a responsive web interface.

## Clarifying Questions

Q1 — Approval Flow — Blocking

You mentioned that team leads should approve their own people's leave, but you also said that every approval must come to HR first.

Which process should the system follow?

Manager approves
HR approves
Manager approves and then HR approves

Can you walk us through the most recent real leave approval step by step?

Q2 — Leave Carry Forward

Do unused leave days carry forward into the next year, or do they expire on December 31?

Q3 — Weekends and Public Holidays

Are weekends and public holidays, such as Poya days, counted as leave days, or should they be excluded when calculating leave duration?

Q4 — Retroactive Sick Leave

Can employees apply for sick leave after they have already been absent?

Q5 — Finance Report

Can Finance provide last year's manually prepared leave report so that the new system can reproduce the information they already use?

## Non-Functional Requirements

1 — Authentication

All application features require authentication.

Passwords must be stored securely as hashes and must never be stored in plain text.

2 — Role-Based Access

The system must support:

EMPLOYEE
MANAGER
HR_ADMIN

Users may access only the functionality and information allowed for their role.

3 — Audit Trail

Every approval and rejection must record:

Who made the decision
When the decision was made

4 — Mobile Support

All employee-facing screens must remain usable on a mobile device with a minimum width of 360px.

5 — Expected Scale

The system is expected to support approximately:

60 employees
A few hundred leave requests per year

The system does not currently require clustering or complex caching infrastructure. A single appropriately sized application server is sufficient.

### Leave Types

The initial leave allocations are:

Leave Type Annual Allocation
Annual Leave 14 days
Casual Leave 7 days
Sick Leave 7 days

### Request Lifecycle

A leave request begins as:

PENDING : From PENDING, it may become:

APPROVED or REJECTED : The employee who created the request may also change it

from: PENDING → CANCELLED

An approved or rejected request cannot be cancelled under the current requirements.

### Open Issues

The requirements remain in draft status until questions Q1–Q5 are answered.

Blocking issue: Q1 — the final approval workflow must be confirmed before the approval process is designed and implemented.
