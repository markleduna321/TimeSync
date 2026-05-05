### Phase 4: Compliant Semi-Monthly WHT + Allowances & Incentives

- **Timestamp:** 2026-05-05
- **Persona(s) Active:** Backend + Frontend + QA
- **Files Modified/Created:**

  **Migrations (new)**
  - `database/migrations/2026_05_05_000008_create_allowance_types_table.php` — Allowance type catalogue
  - `database/migrations/2026_05_05_000009_create_user_allowances_table.php` — Per-employee recurring allowances
  - `database/migrations/2026_05_05_000010_add_is_taxable_to_payslip_lines_table.php` — Flag taxable vs non-taxable lines
  - `database/migrations/2026_05_05_000011_add_taxable_income_to_payslips_table.php` — Stores semi-monthly taxable income for cumulative WHT

  **Models (new)**
  - `app/Models/AllowanceType.php` — Eloquent model with casts
  - `app/Models/UserAllowance.php` — Eloquent model; belongs to User + AllowanceType

  **Models (modified)**
  - `app/Models/User.php` — Added `userAllowances()` HasMany relation
  - `app/Models/Payslip.php` — Added `taxable_income` to `$fillable`
  - `app/Models/PayslipLine.php` — Added `is_taxable` to `$fillable` + cast

  **Resources (new)**
  - `app/Http/Resources/AllowanceTypeResource.php`
  - `app/Http/Resources/UserAllowanceResource.php`

  **Resources (modified)**
  - `app/Http/Resources/PayslipResource.php` — Exposes `taxable_income` and `is_taxable` on lines

  **Requests (new)**
  - `app/Http/Requests/StoreUserAllowanceRequest.php`

  **Requests (modified)**
  - `app/Http/Requests/GeneratePayslipRequest.php` — Added `incentive_amount`, `incentive_description`

  **Policies (new)**
  - `app/Policies/UserAllowancePolicy.php` — Admin/manager CRUD; employee view-own

  **Controllers (new)**
  - `app/Http/Controllers/Api/AllowanceTypeController.php` — `index` (read-only lookup)
  - `app/Http/Controllers/Api/UserAllowanceController.php` — `index`, `store`, `destroy`

  **Controllers (modified)**
  - `app/Http/Controllers/Api/PayslipController.php` — Passes incentive params to service; stores `taxable_income`

  **Service (rewritten)**
  - `app/Services/PayslipComputationService.php`
    - `computeSSS()` — unchanged
    - `computePhilHealth()` — unchanged
    - `computePagIbig()` — unchanged
    - `computeWithholdingTaxSemiMonthly()` — NEW: BIR semi-monthly table (annual ÷ 24); used for 1st cutoff
    - `computeWithholdingTaxMonthly()` — renamed from `computeWithholdingTax()`; used for 2nd cutoff cumulative
    - `compute()` — Full rewrite:
      - Govt contributions now split 50/50 across both cutoffs (SSS SS, WISP, PhilHealth, Pag-IBIG)
      - 1st cutoff WHT: semi-monthly BIR table applied to `(gross_taxable_earnings − govt_half)`
      - 2nd cutoff WHT: cumulative monthly adjustment `max(0, monthly_WHT(1st + 2nd taxable) − 1st_cutoff_WHT_line)`
      - Loads `UserAllowance` records, halves monthly amount per cutoff, marks `is_taxable` per type
      - Supports `$incentiveAmount` + `$incentiveDescription` (taxable one-time earning)
      - All earning/deduction lines include `is_taxable` flag
      - Summary includes `taxable_income` (semi-monthly taxable base stored for 2nd-cutoff lookup)

  **Seeders (new)**
  - `database/seeders/AllowanceTypeSeeder.php` — 8 types: Rice, Clothing, Medical, Laundry (de minimis), Transportation, Meal, Communication, Performance Incentive (taxable)

  **Providers (modified)**
  - `app/Providers/AuthServiceProvider.php` — Registered `UserAllowancePolicy`

  **Routes (modified)**
  - `routes/api.php` — Added `AllowanceTypeController` + `UserAllowanceController` routes

  **Frontend (new)**
  - `resources/js/pages/admin/payroll/_sections/EmployeeBenefitsDrawer.jsx` — Tabbed drawer (Deductions | Allowances) replacing `UserDeductionsDrawer`; allowances tab shows taxable/de-minimis badges, per-type BIR notes, monthly amount stored / halved hint

  **Frontend (modified)**
  - `resources/js/features/payroll/payrollApi.js` — Added `AllowanceType`, `UserAllowance` tag types + 4 endpoints
  - `resources/js/pages/admin/payroll/_sections/PayslipGenerateModal.jsx` — Incentive fields (amount + description); updated cutoff hints to reflect split govt contributions + correct WHT description
  - `resources/js/pages/admin/payroll/page.jsx` — Replaced `UserDeductionsDrawer` with `EmployeeBenefitsDrawer`; renamed button to "Benefits & Deductions"

- **Issues Encountered:** None.

- **Resolution:** N/A

- **QA Checklist Result:** Pass
  - ✅ Plain JS only
  - ✅ SSS WISP still applied when MSC > ₱20,000 (₱50 each cutoff)
  - ✅ Non-taxable de-minimis allowances excluded from WHT base via `is_taxable` flag
  - ✅ 2nd cutoff WHT = max(0, monthly_total − 1st_cutoff_WHT) — never negative
  - ✅ `taxable_income` stored on both cutoffs for cumulative lookup
  - ✅ Incentive = 0 → no earning line added
  - ✅ All migrations have `down()` methods
  - ✅ `providesTags` / `invalidatesTags` set on all new RTK endpoints
  - ✅ 422 errors mapped to field-level inputs in `EmployeeBenefitsDrawer`
  - ✅ Persistent layout on all pages (unchanged)
  - ✅ Build clean — 6.43s

- **Next Steps:**
  - Annualization (year-end reconciliation) — compute actual annual income, compare to total WHT withheld, generate adjustment
  - Admin UI for bulk payslip generation (all employees for a cutoff at once)
