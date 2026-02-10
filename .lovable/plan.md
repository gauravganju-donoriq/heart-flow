

# Comprehensive Workflow Audit: Admin and Partner Journeys

## Summary

After a thorough review of all pages, components, routes, database schema, and RLS policies, here is a complete assessment of what's working, what's inconsistent, and what needs fixing.

---

## 1. Issues Found

### 1.1 Inconsistent Navigation Items (HIGH)

The `navItems` array is duplicated across **every single page file** (10+ files). This is a maintenance risk and already has one inconsistency:

- **Partner Notifications page** (`src/pages/partner/Notifications.tsx`) includes a "Notifications" nav item in its local `navItems` array, but **no other Partner page** includes it. This means the sidebar navigation changes depending on which page you're on.
- Per the project memory: *"The 'Notifications' feature has been removed from the navigation."* -- yet it still exists in `Notifications.tsx`.

**Fix:** Extract `navItems` into shared constants (one for admin, one for partner) so all pages reference the same source of truth.

### 1.2 Partner Notifications Route Exists But Is Unreachable (MEDIUM)

- The route `/partner/notifications` exists in `App.tsx` and renders the `Notifications` page.
- However, since "Notifications" was removed from the sidebar, users have no way to navigate there (except via direct URL or notification links in the future).
- The Notifications page itself still works, and admin status changes do create notifications for partners.

**Decision needed:** Either fully remove the route and page, or add a notification indicator (e.g., bell icon badge) somewhere accessible.

### 1.3 Loading States Are Inconsistent (MEDIUM)

Some pages show plain `"Loading..."` or `"Loading..."` text, while others now use the `DonorDetailSkeleton`:

| Page | Loading State |
|------|--------------|
| Partner Dashboard | Plain text "Loading..." |
| Partner DonorsList | Plain text "Loading..." |
| Partner DonorForm | Plain text "Loading..." |
| Partner DonorDetail | Skeleton loader (correct) |
| Admin Dashboard | Plain text "Loading..." |
| Admin DonorsList | Plain text "Loading..." |
| Admin DonorForm | Plain text "Loading..." |
| Admin DonorReview | Skeleton loader (correct) |
| Admin PartnersList | Plain text "Loading..." |
| Admin Notifications | Plain text "Loading..." |

**Fix:** Add skeleton loaders to all list and detail pages for consistency.

### 1.4 Admin DonorForm Missing Audit Logging (MEDIUM)

The Partner `DonorForm` creates audit logs on create, edit, and submission. The Admin `AdminDonorForm` does **not** write any audit logs at all -- no `audit_logs` inserts on create or edit. This is a gap in the audit trail.

**Fix:** Add audit log entries to the admin donor form for create and edit operations.

### 1.5 `(donor as any)` / `(supabase.from as any)` Type Casting (LOW)

Many fields use `(donor as any).din`, `(data as any).call_type`, etc. This indicates the TypeScript types generated from the database may be out of date with the actual schema. While not a functional bug, it reduces type safety. Since the types file is auto-generated, this should resolve itself when the types are regenerated.

### 1.6 Partner DonorDetail Shows Review Notes in Changes Tab (LOW)

As discussed earlier, the "Changes" tab for partners shows `donor.review_notes` (admin review notes). Per the earlier conversation, the user wanted to either move these to Overview or remove them entirely from the partner portal.

**Fix:** Remove the review notes card from the partner Changes tab (lines 348-358 in DonorDetail.tsx).

### 1.7 Admin Dashboard Table Shows "Donor Code" Instead of "DIN" (LOW)

The Admin Dashboard pending donors table uses `donor.donor_code` as the first column header ("Donor Code"), while the Admin Donors List page uses DIN. This is inconsistent. The DIN is the more meaningful identifier post-submission.

**Fix:** Update the Admin Dashboard table to show DIN (with donor_code as fallback), matching the donors list.

### 1.8 Admin DonorForm Tab Styling Inconsistency (LOW)

The Admin `AdminDonorForm` uses the default `TabsList`/`TabsTrigger` styling (pill-style), while the Partner `DonorForm` uses a custom underline-style tab bar. All other detail pages use the `ResponsiveTabsList` or the underline style.

**Fix:** Align the Admin DonorForm tabs to use the same underline styling as the Partner DonorForm.

---

## 2. What's Working Correctly

- **Authentication flow**: Login (both `/auth` and `/login/:slug`), role-based routing, and protected routes all function correctly.
- **Partner journey**: Create donor (draft) -> Edit -> Submit -> View detail with tabs -> Propose changes on non-draft -> Pending updates displayed.
- **Admin journey**: Dashboard stats -> View pending donors -> Review with approve/reject/under-review -> Notifications sent to partner on status change -> Audit log written.
- **Pending updates workflow**: Partner proposes changes -> Admin sees side-by-side diff with approve/reject -> Changes applied to donor on approval -> Notification sent -> Audit logged.
- **DIN generation**: Trigger generates DIN on status change to "submitted."
- **Document upload/checklist**: Working on both portals.
- **AI Screening**: Auto-triggered on submission, viewable in admin detail.
- **Recovery forms (7033F, 7117F)**: Conditionally shown for approved donors.
- **Plasma Dilution (7059F)**: Shown for non-draft donors in admin view.
- **Shipment tracking**: Available on both portals.
- **Phone intake**: Retell integration, call transcripts linked to donors, intake phone displayed in sidebar.
- **Screening guidelines**: CRUD with categories, templates, and active toggles.
- **Document checklist settings**: Admin-managed requirements.
- **Partner management**: Create, edit, activate/deactivate partners.
- **RLS policies**: Comprehensive and correctly scoped for all tables.

---

## 3. Implementation Plan

### Step 1: Extract shared navigation constants
Create `src/lib/navItems.tsx` with `partnerNavItems` and `adminNavItems` arrays, then update all 10+ pages to import from there.

### Step 2: Fix Partner Notifications accessibility
Remove the "Notifications" nav item from the Notifications page's local array (it's already missing from others). Keep the route and page functional since admin actions create notifications -- but the route can remain accessible only via links (e.g., from a future bell icon).

### Step 3: Remove review notes from Partner Changes tab
Remove the review notes card (lines 348-358) from `src/pages/partner/DonorDetail.tsx`.

### Step 4: Add audit logging to Admin DonorForm
Add `audit_logs` insert calls for create and edit operations in `src/pages/admin/AdminDonorForm.tsx`, matching the pattern used in the Partner DonorForm.

### Step 5: Fix Admin Dashboard DIN column
Update `AdminDashboard.tsx` to show DIN instead of donor_code in the pending donors table (fetch `din` in the query).

### Step 6: Align Admin DonorForm tab styling
Update the `TabsList`/`TabsTrigger` in `AdminDonorForm.tsx` to use the underline style matching the Partner DonorForm.

### Step 7: Add skeleton loaders to remaining pages
Add table skeleton loaders to: Partner Dashboard, Partner DonorsList, Partner DonorForm, Admin Dashboard, Admin DonorsList, Admin DonorForm, Admin PartnersList, Admin Notifications.

---

## 4. Technical Details

### Files to create:
- `src/lib/navItems.tsx` -- shared nav item constants

### Files to modify:
- `src/pages/partner/PartnerDashboard.tsx` -- use shared navItems, add skeleton
- `src/pages/partner/DonorsList.tsx` -- use shared navItems, add skeleton
- `src/pages/partner/DonorForm.tsx` -- use shared navItems
- `src/pages/partner/DonorDetail.tsx` -- use shared navItems, remove review notes from Changes tab
- `src/pages/partner/Notifications.tsx` -- use shared navItems (removes stale "Notifications" link)
- `src/pages/admin/AdminDashboard.tsx` -- use shared navItems, add skeleton, fix DIN column
- `src/pages/admin/AdminDonorsList.tsx` -- use shared navItems, add skeleton
- `src/pages/admin/AdminDonorReview.tsx` -- use shared navItems
- `src/pages/admin/AdminDonorForm.tsx` -- use shared navItems, add audit logging, fix tab styling
- `src/pages/admin/AdminNotifications.tsx` -- use shared navItems, add skeleton
- `src/pages/admin/AdminSettings.tsx` -- use shared navItems
- `src/pages/admin/PartnersList.tsx` -- use shared navItems, add skeleton
- `src/pages/admin/ScreeningSettings.tsx` -- use shared navItems

### No database changes required.

