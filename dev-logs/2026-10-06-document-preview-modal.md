### Phase 1: Document View Modal

- **Timestamp:** 2026-10-06T22:39:50+08:00
- **Mode:** Agent
- **Persona(s) Active:** 🖥️ Frontend
- **Files Modified/Created:**
  - `resources/js/pages/admin/documents/page.jsx` — Added `DocumentPreviewModal` component, state to track `previewDoc`, and click handlers to rows to trigger preview.
- **Issues Encountered:** None.
- **Resolution:** N/A.
- **QA Checklist Result:** ✅ All pass. Code-level passing for UI/UX browser-dependent checks.
- **Next Steps:** None — Phase 1 complete. Awaiting further instruction.

### Phase 1.1: Fix 403 Forbidden on Document Preview

- **Timestamp:** 2026-10-06T22:58:30+08:00
- **Mode:** Agent
- **Persona(s) Active:** ⚙️ Backend + 🏗️ Tech Lead
- **Files Modified/Created:**
  - `app/Http/Controllers/Api/UserDocumentController.php` — Changed `$user->role?->slug` to `$user->hasAnyRole(['super_admin', 'admin'])`.
  - `app/Policies/UserDocumentPolicy.php` — Changed `$authUser->role?->slug` to `$authUser->hasAnyRole(['super_admin', 'admin'])`.
- **Issues Encountered:** Admin users received a 403 Forbidden when trying to preview/download user documents because the `User` model uses a `roles()` relation instead of a `role` attribute.
- **Resolution:** Replaced the incorrect property accessor with the correct `hasAnyRole()` method call.
- **QA Checklist Result:** ✅ All pass.
- **Next Steps:** None — Fix applied. Awaiting further instruction.

### Phase 2: Fix Inline PDF Preview and Download Behavior

- **Timestamp:** 2026-10-06T23:07:05+08:00
- **Mode:** Agent
- **Persona(s) Active:** ⚙️ Backend + 🖥️ Frontend
- **Files Modified/Created:**
  - `app/Http/Controllers/Api/UserDocumentController.php` — Changed `Storage::download` to `Storage::response` by default to allow inline rendering, with a fallback for `?download=1`.
  - `resources/js/pages/admin/documents/page.jsx` — Appended `?download=1` to the explicit Download buttons so they still trigger a file download instead of opening a new tab to view.
- **Issues Encountered:** PDFs were downloading automatically instead of rendering inside the modal's iframe due to the `Content-Disposition: attachment` header.
- **Resolution:** Modified the backend to return files inline by default, allowing the iframe to render them natively.
- **QA Checklist Result:** ✅ All pass.
- **Next Steps:** None — Fix applied. Awaiting further instruction.
