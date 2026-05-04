# Dev Log — Super Admin Seeder + Premium MainLayout (Phase 2)

### Phase 2: Super Admin Seeder + Premium Sidebar & Navbar

- **Timestamp:** 2026-05-03
- **Persona(s) Active:** ⚙️ Backend · 🖥️ Frontend · 🎨 UI/UX Designer · 🧪 QA

---

### Files Modified / Created

| Path | Action | Reason |
|------|--------|--------|
| `database/migrations/2026_05_03_110957_add_role_to_users_table.php` | Created | Add `role` column (string, default `employee`, indexed) with reversible `down()` |
| `app/Models/User.php` | Modified | Added `role` to `$fillable` for explicit mass-assignment protection |
| `database/seeders/AdminSeeder.php` | Created | Seeds super admin (`admin@gmail.com` / `AsuraAdmin123`) using `updateOrCreate` — idempotent |
| `database/seeders/DatabaseSeeder.php` | Modified | Replaced test user factory with `AdminSeeder::class` call; removed unused `User` import |
| `app/Http/Middleware/HandleInertiaRequests.php` | Modified | Scoped shared `auth.user` to `only('id','name','email','role')` — prevents password from leaking to frontend |
| `routes/web.php` | Modified | Changed dashboard render from `'Dashboard'` → `'home-page/page'` to match project convention; removed `verified` middleware |
| `resources/js/features/ui/uiSlice.js` | Created | Redux slice for `sidebarOpen` and `sidebarCollapsed` UI state; actions: `toggleSidebar`, `setSidebarOpen`, `toggleSidebarCollapsed`, `setSidebarCollapsed` |
| `resources/js/store/index.js` | Modified | Registered `uiReducer` under `ui` key |
| `resources/js/components/layout/Sidebar.jsx` | Created | Full premium sidebar: navy/indigo theme, collapsible, role-gated admin section, active state, user card with logout, mobile overlay |
| `resources/js/components/layout/Topbar.jsx` | Created | Top navbar: hamburger toggle, page title slot, notification bell with badge, user avatar dropdown (Profile / Settings / Logout), Escape-dismissible |
| `resources/js/components/layout/MainLayout.jsx` | Modified | Replaced stub with Sidebar + Topbar composition; flex layout with overflow control; footer with asuraTECH branding |

---

### Design Decisions

- **Role values:** `super_admin`, `admin`, `employee` — sidebar admin section hidden for `employee` role via `adminOnly` flag
- **Inertia Hand-Off Rule:** Auth user sourced from Inertia shared props (`usePage().props.auth.user`) — not RTK Query — since it is static session data
- **Sidebar collapse:** Two modes — mobile (slide-in overlay via `sidebarOpen`) and desktop (icon-only collapse via `sidebarCollapsed`), both controlled independently via Redux
- **Security:** `HandleInertiaRequests` now uses `.only()` to whitelist exposed fields — no full model object passed to frontend

---

### Issues Encountered

- None. Migration, seed, and Vite build all passed first run.

---

### QA Checklist Result

| Check | Result |
|-------|--------|
| Plain JavaScript only | ✅ Pass |
| `web.php` — Inertia renders only | ✅ Pass |
| Migration `down()` implemented | ✅ Pass |
| `$fillable` updated on User model | ✅ Pass |
| Seeder is idempotent (`updateOrCreate`) | ✅ Pass |
| `HandleInertiaRequests` exposes safe fields only | ✅ Pass |
| `uiSlice` registered in `store/index.js` | ✅ Pass |
| All nav links use `<Link>` (no `<a>` tags) | ✅ Pass |
| Sidebar ARIA labels + `aria-current` | ✅ Pass |
| Dropdown closes on Escape + outside click | ✅ Pass |
| Vite production build: 0 errors | ✅ Pass |

**Overall: PASS**

---

### Credentials

| Field | Value |
|-------|-------|
| Email | `admin@gmail.com` |
| Password | `AsuraAdmin123` |
| Role | `super_admin` |

---

### Next Steps

- **Phase 3 (awaiting approval):** Dashboard page (`home-page/page.jsx`) — KPI cards (Today's Hours, Weekly Pay, Attendance Rate, Team Online), recent timesheet table, and a Chart.js hours-per-day bar chart — all wired via RTK Query.
