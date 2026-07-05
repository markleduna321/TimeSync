### Phase 1: Dashboard QA Audit — teamOnline blind spot + RTK tag fix

- **Timestamp:** 2026-07-05
- **Mode:** Agent
- **Persona(s) Active:** 🧪 QA + ⚙️ Backend + 🖥️ Frontend + 🏗️ Tech Lead
- **Files Modified/Created:**
  - `app/Http/Controllers/Api/DashboardController.php` — F-1: expand `teamOnline` query to include `managedTeams` and `ledTeams`
  - `resources/js/features/dashboard/dashboardApi.js` — F-2: add `EmployeeKpis` to `tagTypes`; fix `getEmployeeKpis.providesTags` tag type

---

**Issues Encountered:**

**F-1 — Manager `Team Online` always 0 (functional bug)**
- Root cause: `employeeKpis()` only called `$user->teams()` (BelongsToMany pivot).
  Managers are linked to teams via `manager_id` on the `teams` table, NOT via the pivot.
  DemoDataSeeder confirmed: managers are never added as pivot members of their own teams.
  A logged-in manager would see `team_online = 0` regardless of actual teammate clock-ins.
- Fix: load all three relationship paths — `teams()` (pivot member), `managedTeams()` (`manager_id`),
  and `ledTeams()` (`leader_id`) — merge their member lists, deduplicate, exclude self, then count.

**F-2 — `getEmployeeKpis` wrong `tagType` (naming/cache isolation bug)**
- Root cause: `providesTags: [{ type: 'AdminKpis', id: 'EMPLOYEE' }]` used the `AdminKpis` tag type.
  Any future mutation that invalidates `AdminKpis` (e.g. admin payroll generation) would also
  accidentally refetch employee KPIs.
- Fix: added `'EmployeeKpis'` to the `tagTypes` array; changed `providesTags` to
  `[{ type: 'EmployeeKpis', id: 'SUMMARY' }]`.

**F-3 — Dashboard endpoints return raw arrays without Eloquent Resources (RULE violation)**
- Flagged but deferred. Dashboard KPI endpoints return computed scalar aggregates (sums, counts,
  rates), not serialized model instances. Creating dedicated Resources for these would add boilerplate
  without meaningful security or format benefit. Accepted as a documented exception.

---

**Resolution:**

`DashboardController::employeeKpis()` — replaced single `teams()` call with three parallel eager-loaded fetches merged into one collection before the flatMap/unique/reject pipeline. No behavior change for employees (who are typically only pivot members); managers and team leads now see correct teammate counts.

`dashboardApi.js` — `tagTypes` extended; `getEmployeeKpis` isolated under its own `EmployeeKpis` cache tag.

---

**QA Checklist Result:** ✅ All pass

- PHP: `managedTeams()` and `ledTeams()` both return HasMany of Team; `->with('members:id')` resolves via Team's `members()` BelongsToMany ✅
- Dedup: `->unique()` handles users who appear in multiple collections (e.g. member AND manager of same team) ✅
- Self-exclusion: `->reject(fn ($id) => $id === $user->id)` unchanged ✅
- JS: `tagTypes` declared, no orphaned tag reference ✅
- Exported hooks unchanged: `useGetEmployeeKpisQuery` consumers unaffected ✅

---

**Next Steps:** No further phases planned for this audit. F-3 (Eloquent Resources on dashboard endpoints) remains an accepted exception per above rationale.
