

# Role-Based Access Control (RBAC) Expansion

## Overview

Currently, Atlas has two roles: **admin** and **partner**. This plan introduces a **user** role for internal LeMaitre staff who need access to donor records without full admin privileges, and wires the architecture to support a future **super_admin** role. Every action is tied to a user's email via the existing audit log system.

---

## Role Hierarchy

```text
super_admin  (future -- not built now, but schema supports it)
    |
  admin      (manages users, partners, screening settings, full CRUD)
    |
   user      (internal staff -- view donors, add/edit donor data, run screening)
    |
  partner    (external recovery partners -- existing behavior, unchanged)
```

---

## What Each Role Can Do

| Capability | admin | user | partner |
|---|---|---|---|
| View all donors | Yes | Yes | Own only |
| Create/edit donors | Yes | Yes | Own only |
| Approve/reject donors | Yes | No | No |
| Run AI screening | Yes | Yes | No |
| View audit logs | Yes | Yes (read-only) | Own donors |
| Manage partners | Yes | No | No |
| Manage screening guidelines | Yes | No | No |
| Manage users (invite/revoke) | Yes | No | No |
| Admin Settings (Retell, etc.) | Yes | No | No |
| View own dashboard | Yes | Yes | Yes |

---

## Implementation Plan

### Phase 1: Database Changes

**1.1 Expand the `app_role` enum**
- Add `'user'` to the existing `app_role` enum (and `'super_admin'` for future-proofing)
- Migration: `ALTER TYPE app_role ADD VALUE 'user'; ALTER TYPE app_role ADD VALUE 'super_admin';`

**1.2 Update RLS policies**
- All tables that currently check `has_role(auth.uid(), 'admin')` need updating:
  - **donors** (SELECT, INSERT, UPDATE): Grant `user` role the same SELECT access as admin. Grant INSERT and UPDATE for `user` role.
  - **audit_logs** (SELECT, INSERT): Grant `user` role SELECT and INSERT access.
  - **documents** (SELECT, INSERT): Grant `user` role access.
  - **screening_results** (SELECT): Grant `user` role read access.
  - **call_transcripts** (SELECT): Grant `user` role read access.
  - **tissue_recoveries, recovered_tissues, heart_request_forms, plasma_dilution_worksheets**: Grant `user` role access similar to admin.
  - **shipments**: Grant `user` role INSERT and SELECT.
  - **screening_guidelines, document_requirements**: `user` gets SELECT only (no manage).
  - **partners**: `user` gets SELECT only (no manage).
  - **user_roles, profiles, notifications**: Keep admin-only for management; `user` can read own.
  - **pending_donor_updates**: `user` gets SELECT only.

- Create a helper function `has_internal_role(uuid)` that returns true for both `admin` and `user` to simplify policies.

**1.3 No new tables needed**
- The existing `user_roles` table already supports multiple roles per user. We just add new enum values.

### Phase 2: Edge Function for User Management

**2.1 Create `manage-user` edge function**
- Admin-only endpoint to:
  - **Create** internal users (email + password + role assignment)
  - **Update** user roles (promote user to admin, demote admin to user)
  - **Deactivate** users (via Supabase admin API `banUser`)
- Pattern follows the existing `create-partner` edge function
- Automatically creates a `profiles` entry and `user_roles` entry
- Logs the action to `audit_logs` with a new action type (e.g., `user_created`, `role_changed`, `user_deactivated`)

**2.2 Update `audit_logs` table**
- Make `donor_id` nullable so we can log non-donor actions (user management, settings changes)
- Add an `entity_type` column (`'donor'` | `'user'` | `'system'`) to distinguish log categories -- or alternatively store user-management audit entries in the existing metadata field to avoid schema changes. Given the importance of this, a dedicated approach is cleaner:
  - Add column: `entity_type TEXT NOT NULL DEFAULT 'donor'`
  - Add column: `entity_id UUID` (nullable, for non-donor entities)
  - Update existing RLS policies to accommodate

Actually, to minimize schema disruption: we will use the existing `metadata` JSONB column to store user management context (e.g., `{ "target_user": "email", "action_detail": "role_changed_to_admin" }`). The `donor_id` will remain required for donor-related logs. For user-management logs, we will create a separate lightweight `admin_activity_log` table.

**Revised approach -- new table:**

```sql
CREATE TABLE admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,  -- 'user', 'partner', 'setting'
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
- RLS: admin and user (read), admin only (insert via edge function using service role)

### Phase 3: Frontend -- User Management UI

**3.1 New "Team" page for admins (`/admin/team`)**
- Table listing all internal users (admin + user roles) with columns: Name, Email, Role, Status, Created
- "Invite User" button opens a dialog similar to CreatePartnerDialog
- Each row has actions: Edit Role, Deactivate/Reactivate
- Shows the admin activity log at the bottom

**3.2 Add "Team" to admin navigation**
- New nav item in `adminNavItems` with a Users icon, positioned after Dashboard

**3.3 Update ProtectedRoute**
- Change from strict role matching (`role !== requiredRole`) to a permission-based check:
  - Routes marked `requiredRole="admin"` stay admin-only (partner management, screening settings, team management, settings)
  - New routes/existing routes marked `requiredRole="internal"` accept both `admin` and `user` roles (donors, dashboard, audit log)
- Add a `requiredRole` option of `"internal"` that maps to `['admin', 'user']`

**3.4 Update AuthContext**
- No structural changes needed -- it already fetches role from `user_roles`
- The `user` role will route to the same `/admin` paths but with restricted UI

**3.5 Conditional UI based on role**
- On Admin Dashboard: hide "Partners" stats card for `user` role
- On AdminDonorReview: hide approve/reject buttons for `user` role (they can still view and add data)
- Sidebar: hide "Partners", "Screening", "Settings" nav items for `user` role
- This means `adminNavItems` becomes a function of role, or we filter items in DashboardLayout

**3.6 Update DashboardLayout header badge**
- Show "Admin" for admin role, "Staff" for user role, "Partner" for partner role

### Phase 4: Audit Trail Enhancement

**4.1 Every action records the actor's email**
- The existing `audit_logs.changed_by` stores `user.id` (UUID)
- The `AuditLog` component already resolves UUIDs to names/emails via the `profiles` table
- The new `admin_activity_log` table will also store `actor_id` and resolve similarly
- No changes needed here -- the architecture already supports "who did what"

**4.2 Admin Activity Log component**
- New component showing user management actions (who invited whom, role changes, deactivations)
- Displayed on the Team page and optionally on the existing Audit Log page

---

## Files to Create

| File | Purpose |
|---|---|
| `supabase/functions/manage-user/index.ts` | Edge function for user CRUD |
| `src/pages/admin/TeamManagement.tsx` | Team listing + invite UI |
| `src/components/admin/InviteUserDialog.tsx` | Dialog for inviting internal users |
| `src/components/admin/AdminActivityLog.tsx` | Activity log for user management actions |

## Files to Modify

| File | Change |
|---|---|
| `src/lib/navItems.tsx` | Add "Team" item; make items role-aware |
| `src/components/ProtectedRoute.tsx` | Support `"internal"` requiredRole |
| `src/contexts/AuthContext.tsx` | No structural changes, but export helpers for role checks |
| `src/App.tsx` | Add `/admin/team` route |
| `src/components/layouts/DashboardLayout.tsx` | Filter nav items by role; update badge text |
| `src/pages/admin/AdminDonorReview.tsx` | Conditionally hide approve/reject for `user` role |
| `supabase/config.toml` | Add `manage-user` function config |

## Database Migrations

1. `ALTER TYPE app_role ADD VALUE 'user'`
2. `ALTER TYPE app_role ADD VALUE 'super_admin'`
3. Create `admin_activity_log` table with RLS
4. Create `has_internal_role(uuid)` helper function
5. Update RLS policies on donors, audit_logs, documents, screening_results, call_transcripts, tissue_recoveries, recovered_tissues, heart_request_forms, plasma_dilution_worksheets, shipments, screening_guidelines, document_requirements, partners, pending_donor_updates to grant appropriate access to `user` role

## Security Considerations

- Role assignment only happens server-side (edge function with service role key)
- No client-side role elevation possible -- roles are read from `user_roles` table with RLS
- The `has_role` and `has_internal_role` functions are `SECURITY DEFINER` to prevent recursive RLS
- User deactivation uses Supabase admin API `banUser` -- banned users cannot authenticate
- All management actions are logged to `admin_activity_log`
- The `super_admin` enum value is added now but no code references it yet -- ready for future use

