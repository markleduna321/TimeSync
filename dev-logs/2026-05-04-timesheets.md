### Phase 7: Timesheets Page

- **Timestamp:** 2026-05-04
- **Persona(s) Active:** Backend ⚙️ + Frontend 🖥️ + Designer 🎨
- **Files Modified/Created:**
  - `app/Http/Controllers/Api/TimesheetController.php` — Created; `subjects()` + `index()` methods
  - `app/Policies/UserPolicy.php` — Added `viewTimesheet()` policy method
  - `routes/api.php` — Added `GET /timesheets/subjects` and `GET /timesheets`; imported `TimesheetController`
  - `routes/web.php` — Added `GET /time/timesheets` Inertia route
  - `resources/js/features/timekeeping/timesheetApi.js` — Created; `getTimesheetData` + `getTimesheetSubjects` endpoints
  - `resources/js/store/index.js` — Registered `timesheetApi` (reducer + middleware)
  - `resources/js/pages/time/timesheets/page.jsx` — Created; persistent layout, month nav, employee selector, cards + grid
  - `resources/js/pages/time/timesheets/_sections/TimesheetSummaryCards.jsx` — Created; 3 stat cards (Total Hours, Days Worked, Avg/Day)
  - `resources/js/pages/time/timesheets/_sections/WeeklyGrid.jsx` — Created; Ant Design Table with Mon–Sun columns, per-day cells, week total chips, monthly grand total summary row

- **Issues Encountered:** None.

- **Resolution:** N/A

- **Architecture Notes:**
  - `subjects()` endpoint scopes the employee dropdown by caller role: super_admin/admin/manager → all users; team_lead → led-team members; employee → empty (no dropdown shown)
  - `index()` uses `$this->authorize('viewTimesheet', $target)` via `UserPolicy::viewTimesheet()` — team lead cross-check is done via `ledTeams()->whereHas('members', ...)` lazy query to avoid over-eager loading
  - Timesheet data is fetched via `->get()` (not paginated) — max 31 rows, all required simultaneously for the weekly grid computation
  - Week rows are computed client-side: `getWeeksInMonth()` builds Mon–Sun arrays, `buildWeekRows()` maps them against a `dateStr → log` map (O(1) lookups)
  - Days outside the selected month are grayed out (`bg-slate-50`); future days show `—` in muted color
  - Monthly grand total per-day column in the `Table.Summary` footer row
  - Employee `Select` dropdown only mounts for manager-and-above roles (RTK Query also `skip`s the subjects fetch for plain employees)

- **QA Checklist Result:** ✅ Pass
  - Plain JS only — no TypeScript ✓
  - `web.php` Inertia-only ✓ | `api.php` JSON-only ✓
  - No POST/PUT → no Form Request needed ✓
  - Policy (`viewTimesheet`) guards the index endpoint ✓
  - `TimeLogResource` wraps all responses ✓
  - `providesTags` on both queries ✓ | No mutations → no `invalidatesTags` needed ✓
  - Persistent layout on page.jsx ✓
  - Loading skeleton in `WeeklyGrid` + `TimesheetSummaryCards` ✓
  - Empty state in `WeeklyGrid` (CalendarDays icon + description) ✓
  - `timesheetApi` registered in `store/index.js` ✓
  - Build: ✅ `built in 8.00s` — no errors

- **Next Steps:** Phase 8 — Attendance + Corrections (calendar view, color-coded day statuses, employee correction filing with proof upload, admin approve/reject queue) — plan already approved, awaiting implementation start signal.
