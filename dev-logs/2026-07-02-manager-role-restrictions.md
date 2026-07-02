### Phase 1: Manager Role Restrictions Audit & Implementation

- **Timestamp:** 2026-07-02
- **Persona(s) Active:** Backend + Frontend + QA
- **Files Modified:**
  - `resources/js/components/layout/Sidebar.jsx` — Removed `manager` from `Payroll` and `Reports` nav item roles
  - `app/Http/Controllers/Api/ReportController.php` — `authorizeAdmin()` now allows only `super_admin`, `admin`
  - `app/Policies/TeamPolicy.php` — `create()` admin-only; `update()` manager allowed only for own team (`manager_id === $user->id`); `delete()` admin-only
  - `app/Http/Controllers/Api/TimesheetController.php` — Manager branch split from admin block; manager queries only members of `managedTeams()` instead of all users
  - `resources/js/pages/teams/page.jsx` — Replaced `canManage` with `canCreate` (admin-only) and `canManageOwn` (manager, own team only); "New Team" button gated to `canCreate`; `openEdit` guards manager to own team
  - `resources/js/pages/teams/_sections/TeamTable.jsx` — Replaced `canManage` prop with `canCreate`, `canManageOwn`, `authUserId`; Edit button visible to admin on any row OR manager on their own team row; Delete button admin-only
  - `resources/js/pages/teams/_sections/TeamFormModal.jsx` — Added `isManagerMode` prop; hides Name, Description, and Manager fields when manager edits own team (they can only change Team Lead and Members)

- **Issues Encountered:** None.

- **Resolution:** N/A

- **QA Checklist Result:** Pass
  - ✅ Plain JavaScript only — no TypeScript
  - ✅ Backend policies protect all resource actions
  - ✅ Manager cannot POST `/api/teams` (TeamPolicy.create() returns false for manager)
  - ✅ Manager cannot DELETE `/api/teams/{id}` (TeamPolicy.delete() returns false for manager)
  - ✅ Manager can PATCH `/api/teams/{ownTeamId}` (TeamPolicy.update() allows when manager_id === user->id)
  - ✅ Manager cannot PATCH `/api/teams/{otherTeamId}` (TeamPolicy.update() returns false)
  - ✅ `/api/timesheets/subjects` scoped to own team members for manager role
  - ✅ Payroll and Reports nav items hidden from manager in sidebar
  - ✅ Report API endpoints blocked for manager (403)
  - ✅ "New Team" button hidden from manager in UI
  - ✅ Edit button hidden for manager on teams they don't manage
  - ✅ Delete button hidden for manager on all teams
  - ✅ TeamFormModal in manager mode shows only Team Lead and Members fields

- **Restriction Summary:**

  | Capability | super_admin | admin | manager | team_lead | employee |
  |---|---|---|---|---|---|
  | Payroll nav/API | ✅ | ✅ | ❌ | ❌ | ❌ |
  | Reports nav/API | ✅ | ✅ | ❌ | ❌ | ❌ |
  | Create team | ✅ | ✅ | ❌ | ❌ | ❌ |
  | Edit any team | ✅ | ✅ | ❌ | ❌ | ❌ |
  | Edit own team | ✅ | ✅ | ✅ (leader+members only) | ✅ (own) | ❌ |
  | Delete team | ✅ | ✅ | ❌ | ❌ | ❌ |
  | Timesheet subjects | All users | All (excl. SA) | Own team members | Own led teams | Self only |

- **Next Steps:** Awaiting further instructions.
