### Phase 3: Correction form — current times prefilled + lunch/breaks corrections

- **Timestamp:** 2026-09-05
- **Mode:** Agent
- **Persona(s) Active:** 🏗️ Tech Lead · ⚙️ Backend · 🖥️ Frontend · 🎨 UI/UX · 🧪 QA

---

#### Files Modified/Created:

**Backend:**
- `database/migrations/2026_09_05_100000_add_lunch_breaks_to_attendance_corrections.php` — Created; adds `requested_lunch_start` (string 5), `requested_lunch_end` (string 5), `requested_breaks` (JSON), all nullable; reversible `down()`
- `app/Models/AttendanceCorrection.php` — 3 new fields in `$fillable`; `requested_breaks` cast to `array`
- `app/Http/Requests/StoreAttendanceCorrectionRequest.php` — validation: `H:i` formats; lunch end required-with + after lunch start; breaks max 5, each pair requires start/end with end > start
- `app/Http/Controllers/Api/AttendanceCorrectionController.php` — `store()` persists new fields; `review()` approval converts local `HH:MM` → UTC (`$toUtc` closure with next-day roll when time < clock-in) and writes `lunch_start`, `lunch_end`, `breaks` (ISO strings matching clock-flow format) onto the time log — only when provided
- `app/Http/Resources/AttendanceCorrectionResource.php` — exposes 3 new fields
- `app/Http/Resources/AttendanceDayResource.php` — exposes 3 new fields on calendar day correction entries

**Frontend:**
- `resources/js/pages/time/attendance/_sections/DayDetailModal.jsx`:
  - `toInputTime()` helper (ISO → local `HH:MM` for time inputs)
  - `useEffect` prefills correction form with the day's current clock in/out, lunch, and breaks
  - Hint: "Current recorded times are prefilled — adjust only what needs correcting."
  - Lunch Start/End inputs + Breaks editor (add/remove rows, max 5, dashed add button)
  - Submit appends `requested_lunch_*` and indexed `requested_breaks[i][start|end]` FormData fields (correction type only; overtime form unchanged)
  - 422 errors mapped inline for lunch/breaks fields
  - Existing correction status card shows requested lunch/breaks
- `resources/js/pages/time/attendance/_sections/CorrectionQueueTable.jsx` — "Requested Times" column now shows lunch and breaks lines for reviewers

#### Issues Encountered:
- Pre-existing pending migration `2026_08_12_000001_add_time_by_day_to_schedules_table` (from branch merge) failed — column already exists locally. Made it idempotent with `Schema::hasColumn` guards.

#### Resolution: All resolved; migrations ran clean.

#### QA Checklist Result:
- ✅ Plain JavaScript, no TypeScript
- ✅ Form Request validation for all new inputs; inline 422 error mapping beneath each field
- ✅ No new routes — existing `create`/`review` policies cover the flow
- ✅ Resources expose new fields (no raw arrays)
- ✅ Migration reversible
- ✅ Smoke suite **36/36 pass** — new section 8 verifies end-to-end: file correction with lunch + 2 breaks → approve via real controller `review()` → time log updated with correct UTC conversions (08:00→00:00Z, 12:00→04:00Z, 10:00–10:15→02:00–02:15Z)
- ✅ Zero test-data residue (transaction rollback + cleanup)
- ✅ No JS lint/compile errors on modified frontend files
- Code-level ✅ — requires browser verification: prefilled inputs render, breaks add/remove interaction, keyboard accessibility

#### Next Steps:
None pending. Possible follow-ups: show old→new lunch/break diff in TimeLogHistory; over-break badge recalc preview in the form.
