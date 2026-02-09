

# Allow Admins to Add Donors Without a Partner

## Overview

Currently, every donor must be assigned to a recovery partner (`partner_id` is required). This change makes the partner assignment optional so admins can create donors independently.

## What Changes

### 1. Database Migration

The `partner_id` column on the `donors` table is currently `NOT NULL`. We need to make it nullable so donors can exist without a partner.

We also need to update the admin INSERT RLS policy to allow inserting donors with a NULL `partner_id`.

```sql
ALTER TABLE public.donors ALTER COLUMN partner_id DROP NOT NULL;
```

### 2. Admin Donor Form (`src/pages/admin/AdminDonorForm.tsx`)

- Add a "None (Direct Admin Entry)" option to the partner selector dropdown
- Remove the validation that blocks saving without a partner selected
- When "None" is selected, set `partner_id` to `null` in the insert/update call
- Update the card description to: "Optionally assign this donor to a partner organization"

### 3. Admin Donor Review / List Pages

- Where partner name is displayed, handle the case where `partner_id` is null by showing "Direct Admin Entry" or "Unassigned" instead of a blank

## Technical Details

### Files to Modify

1. **New migration** -- `ALTER TABLE public.donors ALTER COLUMN partner_id DROP NOT NULL;`
2. **`src/pages/admin/AdminDonorForm.tsx`** -- Add "None" option to partner Select, remove required validation, pass `null` when no partner selected
3. **`src/pages/admin/AdminDonorsList.tsx`** -- Show "Unassigned" label when a donor has no partner
4. **`src/pages/admin/AdminDonorReview.tsx`** -- Handle null partner display gracefully
