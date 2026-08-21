### Phase 2: Per-User Pay Setting Toggles + Flexi Schedule Type

- **Timestamp:** 2026-08-21
- **Mode:** Agent
- **Persona(s) Active:** 🏗️ Tech Lead · ⚙️ Backend · 🖥️ Frontend · 🎨 UI/UX · 🧪 QA

---

#### Files Modified/Created:

**Backend:**
- `database/migrations/2026_08_21_120000_create_user_pay_settings_table.php` — Created; `user_pay_settings` table with `user_id`, `code`, `is_enabled`, unique(`user_id`,`code`)
- `database/migrations/2026_08_21_120001_add_schedule_type_to_schedules_table.php` — Created; adds `schedule_type` enum(`standard`,`flexi`) default `standard` to `schedules`
- `app/Models/UserPaySetting.php` — Created; fillable `[user_id, code, is_enabled]`
- `app/Models/Schedule.php` — Added `schedule_type` to `$fillable`
- `app/Http/Controllers/Api/UserPaySettingController.php` — Created; mirrors `UserGovernmentDeductionController` exactly; `PAY_TYPES = ['NIGHT_DIFF', 'HOLIDAY_PAY']`
- `app/Http/Requests/StoreScheduleRequest.php` — Added `schedule_type` validation; `shift_start`/`shift_end` become nullable when `schedule_type === 'flexi'`
- `app/Http/Resources/ScheduleResource.php` — Added `schedule_type` field (defaults `'standard'`)
- `app/Services/PayslipComputationService.php` — Added `UserPaySetting` import and toggle reads; `$nightDiffEnabled` / `$holidayPayEnabled` gate the earnings lines; `$isFlexi` flag skips `$lateMinutes` / `$undertimeMins` accumulation
- `app/Http/Controllers/Api/AttendanceController.php` — Added `$isFlexi` flag; `$calcLate` / `$calcUT` calls wrapped in `!$isFlexi`
- `routes/api.php` — Added `UserPaySettingController` import and two routes (`GET`/`PATCH`)

**Frontend:**
- `resources/js/features/payroll/payrollApi.js` — Added `UserPaySetting` tagType; `getUserPaySettings` query + `updateUserPaySetting` mutation with proper `providesTags`/`invalidatesTags`; exported `useGetUserPaySettingsQuery` + `useUpdateUserPaySettingMutation`
- `resources/js/pages/admin/users/_sections/UserEditModal.jsx`:
  - Imported `useGetUserPaySettingsQuery` + `useUpdateUserPaySettingMutation`
  - Added `isFlexi` state to `ScheduleEditModal`; initialization from `schedule.schedule_type`
  - Added third pill "Flexible Time" to the segmented control; `setFlexiMode()` helper clears `time_by_day` and sets `schedule_type: 'flexi'` in payload
  - Wrapped time inputs in `{!isFlexi && (...)}` so they're hidden when flexi
  - `ScheduleTab` summary badge: green "Flexible Time" badge; emerald banner instead of shift times when flexi
  - Added `PaySettingsTab` component (mirrors `GovContributionsTab` pattern)
  - Added "Pay Settings" tab entry after "Gov. Contributions" tab

---

#### Issues Encountered:
- `shift_start`/`shift_end` validation rule needed conditional nullability for flexi — handled with `$isFlexi` flag in `StoreScheduleRequest::rules()`
- Frontend ternary nesting for flexi: changed `!isFlexi && !useCustomTimes ? A : B` to `!isFlexi && (!useCustomTimes ? A : B)` so neither A nor B renders for flexi

#### Resolution: All issues resolved during implementation.

#### QA Checklist Result:
- ✅ Plain JavaScript only — no TypeScript
- ✅ `api.php` JSON routes only for new routes
- ✅ `UserPaySettingController` authorizes with `$this->authorize('update', $user)`
- ✅ `RTK Query` `providesTags`/`invalidatesTags` set on both query and mutation
- ✅ Migrations both ran `DONE`
- ✅ `down()` implemented on both migrations
- ✅ `schedule_type` in `$fillable` and `ScheduleResource`
- ✅ PHP syntax verified: `No syntax errors detected` on all 5 modified PHP files
- ✅ Routes verified: both `pay-settings` routes appear in `route:list`
- ✅ Default for missing pay setting rows = `true` (enabled) — matches gov deductions pattern
- ✅ Flexi: late/UT skipped in both `PayslipComputationService` and `AttendanceController`
- ✅ Night diff / holiday pay only skip the *earnings line* — OT and other pays unaffected
- ✅ `PaySettingsTab` placed in correct directory (existing file, not a new file)
- ✅ `useGetUserPaySettingsQuery` + `useUpdateUserPaySettingMutation` registered in `payrollApi.js` exports

#### Next Steps:
Phase 2 complete. Possible Phase 3 candidates:
- Flexi OT: define OT trigger logic for flexi employees (e.g. hours > 8/day)
- Report view: surface `schedule_type` in attendance summary/reports
- Night diff override per-user rate (currently fixed at 10%)

---

### Phase 2 QA Addendum: End-to-End Smoke Test

- **Timestamp:** 2026-08-21 (post-implementation)
- **Mode:** Agent
- **Persona(s) Active:** 🧪 QA

#### Defect found & fixed during QA:
- ❌→✅ `schedules.shift_start` / `shift_end` were `NOT NULL` — flexi save (null times) would have failed at DB level.
  **Fix:** `database/migrations/2026_08_21_120002_make_shift_times_nullable_on_schedules_table.php` (applied, reversible `down()`).

#### Smoke suite: `scripts/smoke-test-phase2.php` (transaction-wrapped, auto-rollback + cleanup)
**Result: 24/24 PASS — zero data residue confirmed.**

| Area | Scenarios verified |
|---|---|
| User + schedule setup | 3 users created; standard 08:00–17:00, flexi (NULL shift times), overnight 22:00–06:00; `ScheduleResource` exposes `schedule_type` |
| Time scenarios (standard) | On-time → 0 late; 08:30 in → 30m late; 16:00 out → 60m UT; correction day (effective shift 09:00–18:00) → 0 late |
| OT request | `overtime_minutes=120` on workday → `OVERTIME` earnings line present |
| RDOT | Saturday work + approved 240m OT → `RDOT` line present; no rest-day pay without approved OT |
| Holiday | Regular holiday worked → `HOLIDAY_PAY` line + `holiday_days_worked=1` |
| Flexi payroll | 10:23 clock-in → late=0; early out → UT=0; days worked counted normally |
| Flexi attendance calendar | Status = `present` (never `late`), `late_minutes=0` via real `AttendanceController::calendar()` call |
| Night diff | 22:00–06:00 shift → `NIGHT_DIFF` line; toggle OFF → line removed; BASIC unaffected |
| Holiday pay toggle | Toggle OFF → `HOLIDAY_PAY` removed; `OVERTIME` + `RDOT` unaffected |
| Pay settings API | Policy denies non-admin (`authorize('update')` working); toggle persisted correctly; missing rows default `true` |

#### Test-data corrections during QA (not code bugs):
- `time_logs.status` enum is `active|on_lunch|on_break|clocked_out` (not `completed`)
- `effective_shift_start`/`end` columns store `HH:MM` (5 chars)

---

### Phase 2.1: Hide Night Diff summary stat when toggle is off

- **Timestamp:** 2026-08-21
- **Mode:** Agent
- **Persona(s) Active:** ⚙️ Backend · 🧪 QA
- **Files Modified:**
  - `app/Services/PayslipComputationService.php` — summary now reports `'nd_minutes' => $nightDiffEnabled ? $ndMinutes : 0`
  - `scripts/smoke-test-phase2.php` — added assertion: nd_minutes = 0 in summary after toggle OFF
- **Issues Encountered:** User report: "Night Diff 12h" still visible in payslip Attendance Summary after disabling the NIGHT_DIFF toggle. Earnings line was correctly gated; the summary stat was not. Frontend needed no change — `AttRow`/`fmtMinutes` already hide zero values.
- **Resolution:** Gated `nd_minutes` in the summary. **Note:** payslips drafted before the toggle change retain old data — regenerate the draft to reflect it.
- **QA Checklist Result:** ✅ Smoke suite 25/25 pass, syntax clean, zero data residue.
- **Next Steps:** None — behavior confirmed.
