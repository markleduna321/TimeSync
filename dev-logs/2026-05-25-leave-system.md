# 2026-05-25 — Leave Application & Leave Credits System

## Summary
Full implementation of the Leave Management System across the Laravel backend and React frontend. This covers leave filing from the attendance calendar, leave credit tracking with admin management, and leave approval inside the Correction Queue table.

---

## Scope

### Backend (Laravel)

**Migrations (5 new tables)**
- `leave_types` — configurable leave types (VL, SL, etc.) with policy linkage
- `leave_credit_policies` — allocation rules (monthly_accrual, annual_lump, manual) per type
- `leave_credits` — per-user, per-type, per-year credit balance (with `balance` virtual via appends)
- `leave_credit_transactions` — audit trail for every credit/debit event
- `leave_applications` — filed leave requests with status lifecycle (pending → approved/rejected/cancelled)

**Models (5 new, 1 updated)**
- `LeaveType`, `LeaveCreditPolicy`, `LeaveCredit`, `LeaveCreditTransaction`, `LeaveApplication`
- `User` — added `leaveApplications()` and `leaveCredits()` HasMany relationships

**Form Requests (5 new)**
- `StoreLeaveTypeRequest`, `StoreLeaveApplicationRequest`, `ReviewLeaveApplicationRequest`, `UpsertLeaveCreditRequest`, `BulkAllocateLeaveCreditRequest`

**API Resources (4 new)**
- `LeaveTypeResource`, `LeaveApplicationResource`, `LeaveCreditResource`, `LeaveCreditTransactionResource`

**Policy**
- `LeaveApplicationPolicy` — tiered access: admin/super_admin full access; manager/team_lead scoped to their team

**Notifications (2 new)**
- `LeaveFiledNotification` — sent to reviewers on new application
- `LeaveReviewedNotification` — sent to applicant on approval/rejection

**Console Command**
- `AccrueMonthlyLeaveCredits` (`leave:accrue-monthly`) — processes monthly accrual policies for all active users; registered in `routes/console.php` to run on the 1st of each month

**Controllers (3 new, 2 updated)**
- `LeaveTypeController` — CRUD for leave types + policies
- `LeaveCreditController` — my credits, user credits (admin), upsert, bulk allocate
- `LeaveApplicationController` — file, view, review, cancel; working days computed via CarbonPeriod + schedule + holidays
- `AttendanceController` — calendar now loads leave applications for the month and injects leave data into each day
- `AttendanceDayResource` — exposes `leave` key with type/status/period info

**Routes (api.php)**
```
GET|POST  /leave/types
PUT|DELETE /leave/types/{type}
GET|POST  /leave/applications
GET       /leave/applications/{application}
PATCH     /leave/applications/{application}/review
DELETE    /leave/applications/{application}
GET       /leave/credits/me
GET|POST  /admin/users/{user}/leave-credits
POST      /admin/leave-credits/bulk-allocate
```

---

### Frontend (React)

**`leaveApi.js`** — RTK Query API slice for all leave endpoints (12 endpoints, tagTypes: LeaveApplication, LeaveCredit, LeaveType)

**`store/index.js`** — registered `leaveApi` reducer and middleware

**`AttendanceCalendar.jsx`** — added `on_leave` status config (violet), left accent bar for approved leave using `leaveType.color`, amber dot for pending leaves, updated Legend

**`DayDetailModal.jsx`** — added leave status card (pending/approved/rejected) with cancel button for pending leaves; "Apply for Leave" dashed button opens `LeaveApplicationModal`

**`LeaveApplicationModal.jsx`** (new) — full leave filing form: type select, date range, half-day toggle with AM/PM, live working days estimate, balance preview, advance notice warning, insufficient credits warning, conditional proof upload

**`CorrectionQueueTable.jsx`** — added top-level request type switcher (Corrections / Leave Requests); Leave Requests pane has its own status tabs, leave-colored type badges, and approve/reject actions with admin note

**`UserLeaveCreditsModal.jsx`** (new) — admin modal: year selector, per-type balance cards with progress bars, adjust form (set/add, amount, note), last 50 transaction history

**`UserTable.jsx`** — added Wallet icon button to row actions → opens `UserLeaveCreditsModal` via `onLeaveCredits` prop

**`page.jsx` (admin/users)** — wired `UserLeaveCreditsModal` with `leaveCreditsUser` state

---

## Known Issues / Follow-Up

- **Proof download for leave files**: `LeaveApplicationResource` currently omits `proof_url` when using local disk (no `temporaryUrl` support). A dedicated web route `GET /leave/applications/{id}/proof` should be added (similar to correction proofs) and the resource updated to use `route('leave.proof', $id)`.
- **Seeder**: No `LeaveType` seeder yet. Admin must create types manually via API or a future seeder.
- **`php artisan leave:accrue-monthly`**: First run must be triggered manually or waited until the 1st of next month.

---

## Migration Status
All 5 migrations ran successfully on 2026-05-25.

## Build Status
`npm run build` — ✅ 4050 modules, zero errors.
