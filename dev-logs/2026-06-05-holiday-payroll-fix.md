### Phase 1: Holiday-aware payroll computation fix

- **Timestamp:** 2026-06-05
- **Persona(s) Active:** Backend + QA
- **Files Modified/Created:**
  - `database/migrations/2026_06_05_000001_add_holiday_columns_to_payslips_table.php` — Created; adds `holiday_days` + `holiday_days_worked` unsignedSmallInteger columns to `payslips`
  - `app/Models/Payslip.php` — Added `holiday_days` and `holiday_days_worked` to `$fillable`
  - `app/Services/PayslipComputationService.php` — Core logic fix (see below)
  - `app/Http/Controllers/Api/PayslipController.php` — Passed new summary keys to `Payslip::create()`
  - `app/Http/Resources/PayslipResource.php` — Exposed `holiday_days` and `holiday_days_worked`
  - `resources/js/pages/time/payslips/page.jsx` — Conditionally renders "· N holiday(s)" in the payslip list row

- **Bugs Fixed:**

  **Bug 1 — Special holiday counted as absent (critical)**
  In `PayslipComputationService::compute()`, the `$isWorkDay && !$worked` branch used to fall through to `else { $daysAbsent += 1.0 }` for special non-working holidays because only `elseif ($holiday->type === 'regular')` was matched. Special holidays now have an explicit `elseif ($holiday)` branch that:
  - Does NOT increment `$daysAbsent`
  - Decrements `$daysScheduled` (holiday is not a regular work day)
  - Increments `$holidayDays` counter
  - For regular holidays: still adds the full daily rate to `holidayPayExtra` (Labor Code Art. 94 entitlement)
  - For special holidays: no pay added, no penalty (correct "no work, no pay" treatment)

  **Bug 2 — `daysScheduled` inflated by holidays**
  `$daysScheduled` was incremented before the holiday check, so holidays fell inside the scheduled count. Now, when any holiday causes the employee to not work, `$daysScheduled--` is applied immediately, keeping the scheduled count as pure work-day count.

  **Bug 3 — No holiday visibility on payslip**
  Added two new columns: `holiday_days` (unworked holiday days in period) and `holiday_days_worked` (holidays where employee reported for duty and earned premium pay). Both are exposed via `PayslipResource` and shown in the frontend list row.

- **Logic after fix:**

  | Scenario | daysAbsent | daysScheduled | holidayPayExtra |
  |---|---|---|---|
  | Regular holiday, off | 0 | excluded | +dailyRate |
  | Regular holiday, worked | 0 | included | +dailyRate (200% total) |
  | Special holiday, off | 0 | excluded | 0 (no work, no pay) |
  | Special holiday, worked | 0 | included | +dailyRate×0.30 (130% total) |
  | Genuine absence | +1 | included | 0 |

- **Issues Encountered:** None.
- **Resolution:** N/A
- **QA Checklist Result:** Pass
  - No TypeScript
  - No raw array returns
  - Migration has valid `down()` method
  - New columns in `$fillable`
  - Resource exposes new fields
  - Frontend only reads, does not re-fetch (no RTK cache invalidation needed — existing queries already return updated resource shape)
- **Next Steps:** Awaiting next feature request.
