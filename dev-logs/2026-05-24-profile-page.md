### Phase 1: Profile Page — Avatar Upload, Email Change, Password Change

- **Timestamp:** 2026-05-24
- **Persona(s) Active:** Backend + Frontend + Designer
- **Files Modified/Created:**
  - `database/migrations/2026_05_24_031634_add_avatar_to_users_table.php` — Created; adds nullable `avatar` column
  - `app/Models/User.php` — Added `avatar` to `$fillable`
  - `app/Http/Resources/UserResource.php` — Added `avatar_url` (resolved via `Storage::disk('public')->url()`)
  - `app/Http/Requests/UpdateAvatarRequest.php` — Created; validates image, max 2 MB
  - `app/Http/Requests/UpdateProfileEmailRequest.php` — Created; validates email uniqueness + `current_password`
  - `app/Http/Requests/UpdateProfilePasswordRequest.php` — Created; validates `current_password`, new password + confirmation
  - `app/Http/Controllers/Api/UserController.php` — Replaced `update()` with `updateAvatar()`, `updateEmail()`, `updatePassword()`; `me()` now eager-loads `roles`
  - `routes/api.php` — Replaced `PUT /user` with `POST /user/avatar`, `PATCH /user/email`, `PATCH /user/password`
  - `resources/js/features/user/userApi.js` — Replaced `updateUser` mutation with `uploadAvatar`, `updateEmail`, `updatePassword`
  - `resources/js/pages/profile/Edit.jsx` — Full redesign: Avatar card, Email card, Password card

- **Issues Encountered:** None.

- **Resolution:** N/A

- **QA Checklist Result:** Pass
  - Avatar stored in `storage/app/public/avatars/`; old file deleted on re-upload
  - Email change guarded by `current_password` rule
  - Password change guarded by `current_password` rule
  - 422 errors mapped field-level in all three sections
  - `storage:link` confirmed; `avatar_url` served via `/storage/avatars/...`
  - Delete account not present
  - `FormData` passed directly to RTK Query — browser sets multipart boundary correctly
  - All PHP files pass `php -l`; Vite build succeeds in 8.54s

- **Next Steps:** Awaiting next request.
