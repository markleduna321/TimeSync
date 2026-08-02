### Phase 1: Schedule Tab — Clean Preview + Edit Modal + Bug Fix

- **Timestamp:** 2026-08-02
- **Mode:** Agent
- **Persona(s) Active:** 🖥️ Frontend + 🎨 UI/UX + 🧪 QA
- **Files Modified/Created:**
  - `resources/js/pages/admin/users/_sections/UserEditModal.jsx` — Refactored ScheduleTab into read-only preview card; extracted all form logic into a new ScheduleEditModal inner component; fixed "Different time per day" bug.

- **Issues Encountered:**
  1. **"Different time per day" broken** — When switching to custom mode, days toggled ON *after* the mode switch had no `time_by_day` slot seeded. The save handler used `if (!slot) return` which silently skipped those days, so they were never included in the payload. Also, inputs displayed empty instead of the global shift times.
  2. **Schedule tab was cluttered** — The full editing form (mode toggle, day pickers, 5 time inputs) was embedded directly in the tab body, making it visually busy.

- **Resolution:**
  1. `toggleDay` now detects when `useCustomTimes` is active and the incoming day has no slot — it immediately seeds `time_by_day[day]` with the current global `shift_start`/`shift_end`. The `handleSave` fallback was also hardened: instead of `if (!slot) return`, it always writes `{ shift_start: slot?.shift_start || form.shift_start, shift_end: slot?.shift_end || form.shift_end }` so every work day is covered.
  2. `ScheduleTab` is now a concise read-only card (work days as colored badges, shift mode label, per-day times in monospace). Editing is behind an "Edit Schedule" button that opens `ScheduleEditModal` — a dedicated Modal (width 520, `destroyOnClose`). After a successful save the modal auto-closes after 1.2 s.

- **QA Checklist Result:** ✅ All pass (keyboard/focus/responsive: Code-level ✅ — requires browser verification)
- **Next Steps:** Awaiting next task.
