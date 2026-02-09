

# Unified Login Page with Role-Based Routing

## Overview

Redesign the `/auth` login page so both admins and partners can log in from a single page. After entering credentials, the system automatically detects the user's role and redirects them to the correct dashboard. Partners also keep their custom branded URLs (`/login/:slug`) as an alternative entry point.

## What Changes

### Login Page (`/auth`) Redesign

The current page already handles role-based redirect after login -- it checks the user's role and sends them to `/admin` or `/partner`. The main improvement is making the UI clearly communicate that **both** admins and partners can sign in here:

- Update the page title/description to say something like "LeMaitre Portal" with "Sign in as an Admin or Recovery Partner"
- Add two visual tabs or a toggle: **Admin** and **Partner** -- these are purely cosmetic/informational (the actual routing is determined by the user's role in the database, not by which tab they pick)
- Alternatively, keep a single form but with clearer messaging that this is a universal login

**Recommended approach**: Keep a single login form (no tabs needed) since the backend already determines the role. Just update the copy to make it clear both user types can log in here. This avoids confusion where someone picks "Admin" tab but has a partner account.

### Post-Login Flow

This already works correctly:
1. User enters email + password
2. `signIn` authenticates via the backend
3. `AuthContext` fetches the user's role from `user_roles` table
4. `Auth.tsx` redirects: admin -> `/admin`, partner -> `/partner`

No backend changes needed -- the routing logic is already in place.

## Technical Details

### File Changes

**1. `src/pages/Auth.tsx`** -- Update UI copy and styling:
- Change title from "LeMaitre Partner Portal" to "LeMaitre Portal"
- Change description to "Sign in to access your admin or partner account"
- Add a small note below the form: "Partners can also use their custom login URL"
- Keep the existing form and redirect logic untouched

That's it -- the core functionality already works. This is primarily a UI/copy update to make it obvious that both roles can log in from this single page.

