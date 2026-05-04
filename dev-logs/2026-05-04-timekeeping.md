# Phase 3 — Timekeeping: Clock In/Out, Breaks, Schedule

**Date:** 2026-05-04  
**Author:** AI Team (Tech Lead 🏗️ · Backend ⚙️ · Frontend 🖥️ · Designer 🎨 · QA 🧪)  
**Status:** ✅ Complete

---

## Objective

Implement a full-stack timekeeping system for WFH workers, including:
- Admin-configurable work schedules and break policies
- Employee Clock In/Out, Lunch Start/End, Break Start/End
- Status machine enforcing valid transitions
- Live dashboard with real-time elapsed timer and today's event timeline

---

## Database Changes

### New Migrations

| Table | Migration File |
|---|---|
| `schedules` | `2026_05_04_040555_create_schedules_table` |
| `user_break_configs` | `2026_05_04_040555_create_user_break_configs_table` |
| `time_logs` | `2026_05_04_040556_create_time_logs_table` |

### Schema Summary

**`schedules`**
- `user_id` FK → users (cascade delete, indexed)
- `work_days` JSON — e.g. `["Mon","Tue","Wed","Thu","Fri"]`
- `shift_start` TIME, `shift_end` TIME

**`user_break_configs`**
- `user_id` FK → users (cascade delete, unique — one config per user)
- `break_allowed` BOOL default false
- `break_count` TINYINT default 1
- `break_duration_minutes` TINYINT default 15
- `lunch_duration_minutes` TINYINT default 60

**`time_logs`**
- `user_id` FK → users (cascade delete, indexed)
- `date` DATE (indexed)
- `clock_in`, `clock_out`, `lunch_start`, `lunch_end` DATETIME nullable
- `breaks` JSON nullable — `[{start, end}]` array
- `status` ENUM: `active` | `on_lunch` | `on_break` | `clocked_out`
- Unique index on `(user_id, date)` — one log per user per day

---

## Backend — New Files

### Models
- `app/Models/Schedule.php` — `$fillable`, `work_days` array cast, `belongsTo(User)`
- `app/Models/UserBreakConfig.php` — `$fillable`, boolean/integer casts, `belongsTo(User)`
- `app/Models/TimeLog.php` — `$fillable`, datetime/array casts, `belongsTo(User)`, `getTotalWorkedMinutesAttribute()` computed accessor

### Policies
| Policy | Model | Registered in `AuthServiceProvider` |
|---|---|---|
| `TimeLogPolicy` | `TimeLog` | ✅ |
| `SchedulePolicy` | `Schedule` | ✅ |
| `BreakConfigPolicy` | `UserBreakConfig` | ✅ |

### Form Requests
- `ClockActionRequest` — no body rules; auth delegated to `auth:sanctum` middleware
- `StoreScheduleRequest` — validates `work_days[]`, `shift_start`, `shift_end`
- `StoreBreakConfigRequest` — validates booleans, tinyint ranges

### Resources
- `TimeLogResource` — returns all timestamps, breaks array, status, `total_worked_minutes`
- `ScheduleResource` — returns id, user_id, work_days, shift_start, shift_end
- `BreakConfigResource` — returns id, user_id, all config fields; defaults if no record exists

### Controllers
**`TimeLogController`** — 7 methods:
- `today()` — returns today's log (or empty resource)
- `clockIn()` — creates log, errors 409 if already clocked in
- `clockOut()` — requires `active` status
- `lunchStart()` — requires `active`, errors 409 if lunch already started
- `lunchEnd()` — requires `on_lunch`
- `breakStart()` — requires `active` + `break_allowed` + break count not exhausted
- `breakEnd()` — requires `on_break`

**`ScheduleController`** — 3 methods: `mySchedule()`, `index()` (admin), `upsert()` (admin)

**`BreakConfigController`** — 3 methods: `mine()`, `show()` (admin), `upsert()` (admin)

### Routes (`routes/api.php`)
```
GET  /api/time-log/today
POST /api/time-log/clock-in
POST /api/time-log/clock-out
POST /api/time-log/lunch-start
POST /api/time-log/lunch-end
POST /api/time-log/break-start
POST /api/time-log/break-end
GET  /api/schedule/me
GET  /api/schedules          [admin]
PUT  /api/schedules/{user}   [admin]
GET  /api/break-config/me
GET  /api/break-config/{user} [admin]
PUT  /api/break-config/{user} [admin]
```
All under `auth:sanctum` middleware.

---

## Frontend — New Files

### RTK Query API Slices (`resources/js/features/timekeeping/`)
- **`timelogApi.js`** — 7 endpoints (`getToday` query + 6 mutations). `tagTypes: ['TimeLog']`, all mutations `invalidatesTags`.
- **`scheduleApi.js`** — 3 endpoints (`getMySchedule`, `getSchedules`, `upsertSchedule`). `tagTypes: ['Schedule']`.
- **`breakConfigApi.js`** — 3 endpoints (`getMyBreakConfig`, `getBreakConfig`, `upsertBreakConfig`). `tagTypes: ['BreakConfig']`.

All use `fetchBaseQuery({ baseUrl: '/api', credentials: 'include' })`.

### Store (`resources/js/store/index.js`)
Registered all three new API reducers and middleware.

### UI Sections (`resources/js/pages/home-page/_sections/`)

**`ClockWidget.jsx`**
- Live digital clock via `setInterval` (1 s tick)
- Status badge: `active` (emerald), `on_lunch` (amber), `on_break` (sky), `clocked_out` (slate)
- Live elapsed timer (`calcLiveMinutes`) — pauses correctly during lunch and breaks
- State-driven action buttons: Clock In / Clock Out / Start Lunch / End Lunch / Start Break (counter) / End Break
- Loading spinners on all mutations; buttons disabled while any mutation is loading
- Inline error display from API error responses

**`TodayTimeline.jsx`**
- Builds sorted event array from `timelog` timestamps
- Vertical timeline with color-coded icons per event type
- Skeleton loader (3 rows) while `isLoading`
- Empty state when no clock-in yet

### Updated `home-page/page.jsx`
- Calls `useGetTodayQuery(undefined, { pollingInterval: 30000 })` — re-fetches every 30 s
- Calls `useGetMyScheduleQuery()`
- "Today's Hours" KPI card now shows live computed value from API
- "Status" sub-label on KPI shows current status text
- Two-column widget row below KPI cards: `<ClockWidget>` and `<TodayTimeline>`

---

## QA Checklist

| Check | Status |
|---|---|
| `npm run build` — 0 errors, 0 warnings | ✅ |
| `php artisan migrate` — all 3 tables created | ✅ |
| Migrations have `down()` methods | ✅ |
| All models have `$fillable` | ✅ |
| All API responses via Eloquent Resources | ✅ |
| Policies registered in `AuthServiceProvider` | ✅ |
| `credentials: 'include'` on all `fetchBaseQuery` | ✅ |
| `invalidatesTags` on all mutations | ✅ |
| No TypeScript — plain JS only | ✅ |
| `<Link>` not `<a>` in navigation | ✅ |
| Status machine prevents invalid transitions | ✅ |
| Break count enforced server-side | ✅ |
| Admin-only routes gated by policy `viewAny`/`update` | ✅ |
| `unique(['user_id','date'])` prevents duplicate daily logs | ✅ |
| Live timer pauses during lunch and breaks | ✅ |

---

## Status Machine Summary

```
(no log)       → Clock In only
active         → Clock Out | Start Lunch | Start Break (if allowed + not exhausted)
on_lunch       → End Lunch only
on_break       → End Break only
clocked_out    → nothing (day complete)
```

---

## Next Phase Candidates

- **Phase 4**: Timesheets — paginated list of historical time logs with filters
- **Phase 5**: Attendance overview — calendar heatmap per employee
- **Phase 6**: Payroll overview — computed weekly/monthly pay slips
- **Phase 7**: Admin panels — Schedule manager, Break Config manager per user
