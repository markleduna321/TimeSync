### Phase 1: Attendance + User Schedule + Payslip QA (Real Data)

- **Timestamp:** 2026-08-03 15:30 (Asia/Manila)
- **Mode:** Agent
- **Persona(s) Active:** 🧪 QA + ⚙️ Backend + 🏗️ Tech Lead
- **Files Modified/Created:**
  - `dev-logs/2026-08-03-attendance-schedule-payslip-qa.md` — Mandatory phase log with QA evidence and analysis.
- **Issues Encountered:**
  - Real-data window (2026-07-16 to 2026-07-31) had only one schedule pattern with actual time logs (08:00-17:00), limiting native multi-schedule coverage.
  - Existing unique constraint row on `schedule_overrides (user_id, date)` blocked one repeated RD-change insert attempt for user 3 on 2026-07-16 during an additional coverage run.
  - `storage/logs/laravel.log` shows DB connectivity error at 2026-08-03 14:58:42 (`SQLSTATE[HY000] [2002]` against `sessions` table), indicating intermittent MySQL availability risk for auth/session and QA reliability.
- **Resolution:**
  - Ran all existing targeted QA scripts successfully:
    - `scripts/qa_training_override.php` → 22/22 pass
    - `scripts/qa_cross_midnight.php` → 21/21 pass
    - `scripts/smoke_payslip.php` → 46/46 pass
  - Ran real-data scenario runner in transaction with rollback:
    - Scenario A (real attendance + schedule compute)
    - Scenario B (RD change simulation via `demotes_to_restday=true`)
    - Scenario C (payslip draft generation with line items)
  - Added supplemental real-user multi-schedule coverage by using real night-shift user and temporary transaction-only timelog insertion (rolled back), then recomputed payroll.
- **QA Checklist Result:** ✅ Scenario suite passed with data coverage caveat and infra risk logged.
  - Automated scenario assertions: all passed.
  - Real-data runner completed and rolled back safely.
  - Known operational risk: intermittent DB connectivity in logs.
- **Next Steps:**
  - Phase 2 should focus on data analysis and hardening plan:
    1. Resolve negative net-pay handling policy/UX for high-absence cases.
    2. Add idempotent RD-change QA fixture strategy to avoid unique-key collisions.
    3. Seed/prepare a stable mixed-schedule QA dataset per cutoff window.
    4. Stabilize DB availability checks for session/auth reliability.

### Phase 2: QA Hardening + Analysis Plan Finalization

- **Timestamp:** 2026-08-03 15:43 (Asia/Manila)
- **Mode:** Agent
- **Persona(s) Active:** 🧪 QA + ⚙️ Backend + 🏗️ Tech Lead
- **Files Modified/Created:**
  - `scripts/qa_training_override.php` — Switched schedule override setup to idempotent `updateOrCreate` helper keyed by `(user_id, date)`.
  - `scripts/qa_cross_midnight.php` — Added optional `--real-summary` mode for real-data schedule/timelog coverage reporting.
  - `scripts/smoke-payroll.php` — Added explicit negative-net visibility logs as informational policy signal.
  - `README.md` — Added TimeSync QA scenario matrix and expected outcomes.
  - `dev-logs/2026-08-03-attendance-schedule-payslip-qa.md` — Appended Phase 2 record.
- **Issues Encountered:**
  - Smoke payroll fixture computes negative net pay under current deduction profile (expected by current implementation, but policy-sensitive).
  - Existing real override row can still conflict in ad-hoc scripts if they do not use idempotent insert strategy.
- **Resolution:**
  - Re-ran hardened scripts:
    - `scripts/qa_training_override.php` → 22/22 pass
    - `scripts/qa_cross_midnight.php --real-summary` → coverage summary printed + 21/21 pass
    - `scripts/smoke-payroll.php` → smoke flow successful; negative net now emitted as `[INFO]` with policy reminder
  - Validated syntax/diagnostics on modified files (`No errors found`).
- **QA Checklist Result:** ✅ All phase checks passed for the delivered hardening scope.
- **Next Steps:**
  - Phase 3 candidate (awaiting approval):
    1. Implement explicit payroll policy for negative net handling (clamp vs carry-forward ledger).
    2. Add stable real-data QA runner script in `scripts/` with reusable cutoff and user selection.
    3. Add DB readiness precheck script for auth/session smoke prior to QA runs.
