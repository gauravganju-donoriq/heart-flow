

## Team Management Enhancements

### Overview
Three improvements to the Team page: (1) make the Invite User dialog consistent with the Create Partner dialog pattern, (2) add "Revoke Access" and "Reset Password" actions per user, and (3) show credentials after user creation.

---

### 1. Invite User Dialog -- Consistency + Credentials Screen

**Current state:** After creating a user, a toast shows and the dialog closes. The admin never sees the login details again.

**What changes:**
- After successful user creation, instead of closing the dialog, show a **credentials summary screen** (matching the Create Partner dialog pattern):
  - Login URL (the main `/auth` page) with a copy button
  - Email (read-only)
  - Password (read-only)
  - A note: "Save these credentials now -- the password cannot be retrieved later."
- A "Done" button closes the dialog and resets the form.
- Styling will match the existing dialog conventions: `max-w-md`, `text-[13px]` labels, `h-9` inputs, `text-base` title, etc.

### 2. User Actions -- Revoke Access + Reset Password

**Current state:** The team table only shows a "Change Role" button. No way to deactivate or reset passwords.

**What changes in `TeamManagement.tsx`:**
- Replace the single "Change Role" button with a **dropdown menu** (using the existing DropdownMenu component) containing:
  - **Change Role** -- opens the existing role change dialog
  - **Reset Password** -- opens a new dialog to set a temporary password, then shows the new credentials
  - **Revoke Access** / **Reactivate** -- calls the existing `deactivate`/`reactivate` action on manage-user edge function
- Show a visual indicator (badge or muted row styling) for deactivated users.

### 3. Reset Password -- Edge Function Update

**Current state:** The `manage-user` edge function supports `create`, `update_role`, `deactivate`, and `reactivate` but not password reset.

**What changes in `supabase/functions/manage-user/index.ts`:**
- Add a new `reset_password` action that:
  - Accepts `targetUserId` and `newPassword`
  - Validates password length (min 8 chars)
  - Uses `adminClient.auth.admin.updateUserById(targetUserId, { password: newPassword })`
  - Logs the action to `admin_activity_log`
  - Returns success

### 4. Track Banned Status

**Current state:** `is_banned` is hardcoded to `false` on every member.

**What changes:**
- After fetching roles and profiles, also call the `manage-user` edge function or use the admin client data to determine ban status. Since we cannot call `auth.admin` from the frontend, we will add a `list_users` action to the edge function that returns user metadata including ban status.
- Add a `list_users` action to `manage-user` that accepts an array of user IDs and returns their ban/active status from `auth.admin.getUserById`.
- Display a "Deactivated" badge on revoked users and swap the button label to "Reactivate".

---

### Technical Details

**Files to modify:**
- `src/components/admin/InviteUserDialog.tsx` -- Add post-creation credentials screen
- `src/pages/admin/TeamManagement.tsx` -- Add dropdown actions menu, reset password dialog, revoke/reactivate confirmation, fetch ban status
- `supabase/functions/manage-user/index.ts` -- Add `reset_password` and `list_users` actions

**Security considerations:**
- All actions go through the `manage-user` edge function which verifies the caller is an admin via `has_role` RPC
- Password reset uses `auth.admin.updateUserById` (service role key, server-side only)
- No secrets are exposed to the frontend
- `verify_jwt = false` is already set; JWT is validated manually in the function code

