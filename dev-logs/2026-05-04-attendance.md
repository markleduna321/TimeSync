# 2026-05-04 — Phase 8: Attendance Page

## Summary

Implemented the full **Attendance** feature — calendar view with colour-coded day statuses, a correction-filing modal, and a manager-only correction review queue.

---

## Backend

### Migration
`database/migrations/2026_05_04_000001_create_attendance_corrections_table.php`
- Columns: `user_id`, `date`, `reason`, `proof_path` (nullable), `requested_clock_in/out` (time, nullable), `status` (enum: pending/approved/rejected, default pending), `reviewed_by`, `reviewed_at`, `admin_note`, `timestamps`

### Model
`app/Models/AttendanceCorrection.php`
- `$fillable` for all columns, `$casts` for `date` and `reviewed_at`, `user()` and `reviewer()` BelongsTo relations.

### Policy
`app/Policies/AttendanceCorrectionPolicy.php`
- `viewAny()` → true (controller scopes)
- `create()` → true (controller enforces own date)
- `review()` → super_admin, admin, manager only

`app/Providers/AuthServiceProvider.php` — registered `AttendanceCorrectionPolicy`.

### Form Requests
- `StoreAttendanceCorrectionRequest` — validates date (≤ today), reason (10–1000 chars), proof (file, jpg/png/pdf ≤ 5MB), optional clock times.
- `ReviewAttendanceCorrectionRequest` — validates `action` (approved|rejected), optional `admin_note` (≤ 500 chars).

### Resources
- `AttendanceDayResource` — wraps plain array; fields: date, day_of_week, status, clock_in, clock_out, total_worked_minutes, correction object (id, status, reason, requested times, admin_note, created_at).
- `AttendanceCorrectionResource` — full correction with `proof_url` via named web route, loaded user and reviewer relations.

### Controllers
`app/Http/Controllers/Api/AttendanceController@calendar`
- `GET /api/attendance?month=YYYY-MM&user_id=X`
- Loads target user + schedule; computes status per calendar day (upcoming / rest_day / absent / late / present using 15-min grace).
- Reuses `$this->authorize('viewTimesheet', $target)` from UserPolicy.

`app/Http/Controllers/Api/AttendanceCorrectionController`
- `index()` — paginated, manager+ see all; employees see own only; filterable by `?status=`.
- `store()` — stores proof to `Storage::disk('local')` under `corrections/`, creates correction for auth user.
- `review()` — manager+ only, pending corrections only; updates status, reviewer, note.
- `proof()` — web route, auth check, `Storage::disk('local')->download()`.

### Routes
`routes/api.php` — Added GET attendance, GET/POST corrections, PATCH correction review.  
`routes/web.php` — Added Inertia page route + named proof download route.

---

## Frontend

### RTK Query — `resources/js/features/timekeeping/attendanceApi.js`
- `getCalendar({ month, userId })` → `GET /attendance`
- `getCorrections(params)` → `GET /attendance/corrections`
- `fileCorrection(formData)` → `POST /attendance/corrections` (multipart FormData)
- `reviewCorrection({ id, action, admin_note })` → `PATCH /attendance/corrections/{id}`
- All tags correctly invalidated on mutations.

### Store — `resources/js/store/index.js`
- Registered `attendanceApi` reducer and middleware.

### Sections

**`AttendanceCalendar.jsx`**
- 7-column Sun–Sat grid, padded to fill full weeks.
- Colour-coded cells: emerald (present), amber (late), rose (absent), slate (rest), white/disabled (upcoming).
- Status dot + clock-in time on each cell; `AlertTriangle` icon for pending corrections.
- `Legend` component. `CalendarSkeleton` (35 pulsing divs). Disabled click on upcoming days.

**`DayDetailModal.jsx`**
- Ant Design Modal. Shows date heading, status badge (same palette), clock-in/out, total hours.
- Displays existing correction status chip + admin note when correction exists.
- Shows "File a Correction" form when: no existing correction AND date < today AND status ≠ rest_day/upcoming.
  - reason textarea (min 10 chars), requested clock in/out time inputs, drag-and-drop file upload area.
  - Submits via `FormData` multipart. 422 errors shown inline under each field.
  - Success state replaces form with confirmation message; RTK invalidates calendar.

**`CorrectionQueueTable.jsx`**
- Ant Design Table + Tabs (All / Pending / Approved / Rejected).
- Columns: Employee (name + email), Date, Reason (truncated), Requested Times, Proof (download link), Filed, Status, Actions.
- `ReviewActions` cell: optional admin note input + Approve/Reject buttons with Popconfirm.
- Paginated via `meta.total`. Empty state with CheckSquare icon.

**`page.jsx`**
- Persistent layout: `AttendancePage.layout = (page) => <MainLayout title="Attendance">{page}</MainLayout>`.
- Month nav (future blocked). Employee `Select` (manager/team_lead only, reuses timesheet subjects endpoint).
- `AttendanceCalendar` → click opens `DayDetailModal`.
- `CorrectionQueueTable` rendered below calendar for managers only.

---

## QA

- PHP lint: all 12 files — **no syntax errors**
- Vite build: **✓ built in 7.46s** — no errors or warnings

---

## Next Steps (Phase 9 candidates)

- Nav link for Attendance page in sidebar
- Notifications/badge for managers when new corrections are pending
- Run `php artisan migrate` when database is accessible
