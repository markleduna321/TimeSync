### Phase 1: Day-aware schedule assignment + UI wiring

- **Timestamp:** 2026-08-02
- **Mode:** Agent
- **Persona(s) Active:** 🏗️ Tech Lead + ⚙️ Backend + 🖥️ Frontend + 🧪 QA
- **Files Modified/Created:**
  - `app/Http/Controllers/Api/AttendanceController.php` — resolve effective shifts per day from `time_by_day` before falling back to the default schedule
  - `app/Services/PayslipComputationService.php` — use day-specific schedule overrides in payroll calculations for late/undertime logic
  - `app/Http/Resources/ScheduleResource.php` — preserve `time_by_day` in API responses for the UI
  - `resources/js/pages/admin/users/_sections/UserEditModal.jsx` — add a shared-shift vs per-day-shift toggle and submit the new payload shape
  - `resources/js/pages/admin/schedules/_sections/ScheduleFormModal.jsx` — add the same day-aware schedule editor in the schedule assignment modal

---

**Issues Encountered:**
- The backend already supported `time_by_day`, but the admin UI was still only sending the legacy single-shift payload.
- The schedule resource was not exposing the new field consistently for the frontend state to consume.
- Day-specific times had to be preserved without breaking the existing fallback behavior for single-shift schedules.

**Resolution:**
- Wired the admin schedule UI to allow either one shared shift or a distinct shift per selected workday.
- Sent the new `time_by_day` payload structure to the API while still preserving `shift_start` and `shift_end` as defaults.
- Updated attendance and payroll logic to resolve the effective shift from the day-specific override first, then fall back to the default schedule.
- Fixed the schedule resource serialization so the frontend receives `time_by_day` reliably.

---

**QA Checklist Result:** ✅ All pass
- Backend: `php artisan test --filter=ScheduleResourceTest` → 1 passed, 3 assertions
- Frontend: `npm run build` → Vite build completed successfully

**Next Steps:**
- Verify the feature in the browser with a real overnight schedule example such as Monday 08:00–17:00 and Friday 18:00–03:00.
