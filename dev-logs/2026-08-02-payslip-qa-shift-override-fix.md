### Phase: QA — Payslip Computation with Schedule & Shift Override Changes

- **Timestamp:** 2026-08-02
- **Mode:** Agent
- **Persona(s) Active:** 🧪 QA + ⚙️ Backend
- **Files Modified:**
  - `app/Services/PayslipComputationService.php` — Fixed null-shift-override bug corrupting `$dayShiftStart`/`$dayShiftEnd`
  - `app/Http/Controllers/Api/AttendanceController.php` — Same fix (attendance calendar had the identical pattern)

- **Issues Encountered:**
  **Bug: Day-status override with null `shift_start`/`shift_end` corrupts per-day shift resolution**

  Day-status overrides created by the swap endpoint (promotes_to_workday / demotes_to_restday) store `shift_start = null` and `shift_end = null` by design — they only flip work/rest status without changing shift times.

  In both `PayslipComputationService::compute()` and `AttendanceController`, the override resolution ternary was:
  ```php
  $dayShiftStart = ... : ($override ? substr($override->shift_start, 0, 5) : $dayShiftStart);
  ```
  This checked if `$override` existed (non-null), not if `$override->shift_start` was non-null.
  When a day-status override exists but has no shift times, `substr(null, 0, 5)` = `''` →
  `$dayShiftStart = ''` → `toMins('')` = 0 → shift anchor = midnight (00:00).
  Result: every employee who clocked in on a promoted rest day appeared late by their entire shift duration.

- **Resolution:**
  Changed the guard from `$override ?` to `$override?->shift_start ?` (and same for `shift_end`):
  ```php
  // Before (buggy):
  $dayShiftStart = ... : ($override ? substr($override->shift_start, 0, 5) : $dayShiftStart);

  // After (fixed):
  $dayShiftStart = ... : ($override?->shift_start ? substr($override->shift_start, 0, 5) : $dayShiftStart);
  ```
  A status-only override now correctly falls through and preserves the per-day schedule's shift times.
  Both files patched in the same pass.

- **QA Checklist Result:**
  - ✅ `substr` normalization on schedule `shift_start`/`shift_end` — already present
  - ✅ `time_by_day` per-day key (`$cursor->format('D')`) matches frontend JSON keys ("Mon", "Tue", …)
  - ✅ `time_by_day` values always `H:i` (API-validated); no seconds issue
  - ✅ `$dayShiftStart`/`$dayShiftEnd` correctly fed into `calcLateMinutes` / `calcUndertimeMinutes`
  - ✅ `effective_shift_start`/`effective_shift_end` from `TimeLog` correctly takes highest precedence
  - ✅ `promotes_to_workday`/`demotes_to_restday` correctly flips `$isWorkDay` before pay branch
  - ✅ Overnight shift handling (`toMins` modular arithmetic) robust to seconds in time strings
  - ✅ Test suite: 26/27 pass; 1 pre-existing unrelated failure (`ExampleTest` / route requires auth)
  - ❌ (Fixed) Null override shift corrupting `$dayShiftStart`/`$dayShiftEnd`

- **Next Steps:** None — QA phase complete. Payslip computation correctly handles all schedule configurations:
  - Default schedule (same time every day)
  - Custom per-day shifts (`time_by_day`)
  - Day-status overrides (rest day ↔ work day swap)
  - Shift-time overrides (per-date custom shift times)
  - `TimeLog.effective_shift_start`/`effective_shift_end` (highest precedence correction)
