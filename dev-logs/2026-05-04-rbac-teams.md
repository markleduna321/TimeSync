### Phase 4: RBAC + Team Management

- **Timestamp:** 2026-05-04
- **Persona(s) Active:** Tech Lead + Backend + Frontend + Designer + QA
- **Files Created:**
  - `database/migrations/2026_05_04_060000_create_roles_table.php` — Roles lookup table
  - `database/migrations/2026_05_04_060001_create_role_user_table.php` — M2M pivot: user ↔ role (stackable)
  - `database/migrations/2026_05_04_060002_create_teams_table.php` — Teams with nullable leader FK
  - `database/migrations/2026_05_04_060003_create_team_user_table.php` — M2M pivot: team ↔ member
  - `database/migrations/2026_05_04_060004_drop_role_from_users_table.php` — Removes old single-role string column
  - `app/Models/Role.php` — Role model with `users()` BelongsToMany
  - `app/Models/Team.php` — Team model with `leader()`, `members()` relationships
  - `database/seeders/RoleSeeder.php` — Seeds 5 roles; assigns super_admin to admin@gmail.com
  - `app/Http/Requests/StoreUserRequest.php` — Validation for user creation
  - `app/Http/Requests/UpdateUserRequest.php` — Validation for user update (password optional)
  - `app/Http/Requests/StoreTeamRequest.php` — Validation for team creation
  - `app/Http/Requests/UpdateTeamRequest.php` — Validation for team update
  - `app/Http/Resources/RoleResource.php` — Exposes id, name, slug, description, level
  - `app/Http/Resources/TeamResource.php` — Exposes id, name, leader, members[], members_count
  - `app/Policies/TeamPolicy.php` — Admin/manager = full CRUD; team_lead = own team only
  - `app/Http/Controllers/Api/AdminUserController.php` — Paginated user CRUD + role sync
  - `app/Http/Controllers/Api/TeamController.php` — Paginated team CRUD + member sync; team_lead scoped
  - `app/Http/Controllers/Api/RoleController.php` — Role list for dropdowns
  - `resources/js/features/users/usersApi.js` — RTK Query: getUsers, createUser, updateUser, deleteUser
  - `resources/js/features/teams/teamsApi.js` — RTK Query: getTeams, createTeam, updateTeam, deleteTeam
  - `resources/js/features/roles/rolesApi.js` — RTK Query: getRoles
  - `resources/js/pages/admin/users/page.jsx` — User management page (paginated table + modals)
  - `resources/js/pages/admin/users/_sections/UserTable.jsx` — Table with role badge chips, avatar initials
  - `resources/js/pages/admin/users/_sections/UserFormModal.jsx` — Create/edit user form with role checkboxes
  - `resources/js/pages/teams/page.jsx` — Team management page
  - `resources/js/pages/teams/_sections/TeamTable.jsx` — Teams table with leader avatar + members count
  - `resources/js/pages/teams/_sections/TeamFormModal.jsx` — Create/edit team with leader + member selects
- **Files Modified:**
  - `app/Models/User.php` — Removed `role` from fillable; added `roles()`, `teams()`, `ledTeams()`, `hasRole()`, `hasAnyRole()`
  - `app/Http/Resources/UserResource.php` — Added `roles[]` with `whenLoaded`
  - `app/Http/Middleware/HandleInertiaRequests.php` — Changed shared `role` string → `roles` slug array
  - `app/Policies/UserPolicy.php` — Full CRUD policy using `hasAnyRole()`; viewAny for manager+
  - `app/Policies/SchedulePolicy.php` — Uses `hasAnyRole()`; team lead can update members' schedules
  - `app/Policies/BreakConfigPolicy.php` — Uses `hasAnyRole()`; team lead can update members' break configs
  - `app/Providers/AuthServiceProvider.php` — Registered `TeamPolicy`
  - `database/seeders/AdminSeeder.php` — Removed `role` column assignment
  - `database/seeders/DatabaseSeeder.php` — Added `RoleSeeder` call after `AdminSeeder`
  - `routes/api.php` — Added `/roles`, `/admin/users` (apiResource), `/teams` (apiResource)
  - `routes/web.php` — Added `/admin/users` and `/teams` Inertia routes
  - `resources/js/store/index.js` — Registered usersApi, teamsApi, rolesApi reducers + middleware
  - `resources/js/components/layout/Sidebar.jsx` — Replaced single-role check with roles[] array; per-item role gating; added Users + Teams links; uses `getPrimaryRoleLabel()`
- **Issues Encountered:**
  - `antd` (Ant Design) was not installed in the project — build failed with Rollup "cannot resolve antd" error.
- **Resolution:**
  - Ran `npm install antd`; subsequent build passed clean in 6.82s.
- **QA Checklist Result:** Pass
  - ✅ All code plain JavaScript
  - ✅ `api.php` contains only JSON routes
  - ✅ Form Request for every POST/PUT endpoint
  - ✅ Policy for every new resource (TeamPolicy)
  - ✅ Eloquent Resource wraps every response
  - ✅ All migrations have valid `down()` methods
  - ✅ RTK Query `invalidatesTags` set on all mutations
  - ✅ 422 errors mapped to `errors[field][0]` inline
  - ✅ Persistent layout on both new pages
  - ✅ Confirmation modal on all delete actions
  - ✅ `credentials: 'include'` via shared `baseQueryWithCsrf` helper
  - ✅ Empty states on both tables with CTA
- **Roles Defined:**
  | Slug | Name | Level |
  |---|---|---|
  | `super_admin` | Super Admin | 5 |
  | `admin` | Admin | 4 |
  | `manager` | Manager | 3 |
  | `team_lead` | Team Lead | 2 |
  | `employee` | Employee | 1 |
- **Authorization Summary:**
  - Users CRUD: super_admin, admin
  - Teams CRUD: super_admin, admin, manager (team_lead can view/update own team)
  - Schedule/BreakConfig: super_admin, admin, manager (team_lead can manage own team members)
- **Next Steps:** Awaiting approval for next phase — candidate areas:
  - Phase 5: My Time page (personal timesheet with daily entries)
  - Phase 5: Attendance calendar (monthly heat-map view)
  - Phase 5: Admin schedule/break-config management panel (bulk-assign to team members)
