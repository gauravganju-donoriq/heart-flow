

# Admin Donor Creation + Document Uploads

## Overview

Two features to implement:
1. **Admins can create/manage donors** -- A dedicated admin donor form page, reusing the same form structure as partners but with a partner selector (since admins aren't linked to a single partner).
2. **Document uploads on donor detail pages** -- The `DocumentUpload` component already exists and is shown on the partner `DonorDetail` page and admin `AdminDonorReview` page. We just need to ensure partners can upload documents at any status (not just draft), and that the storage bucket + RLS policies work correctly.

## What Changes

### 1. Admin Donor Form

Create a new page `src/pages/admin/AdminDonorForm.tsx` that:
- Reuses the same form fields as the partner form (Demographics, Tissue, Compliance)
- Adds a **Partner selector** dropdown at the top so the admin picks which partner this donor belongs to
- Supports both create and edit modes (`/admin/donors/new` and `/admin/donors/:id/edit`)
- Uses admin nav items instead of partner nav items
- On save, navigates to `/admin/donors/:id` (the admin review page)

**Database changes needed:**
- Add an RLS policy so admins can INSERT donors (currently only partners can)
- The admin sets `partner_id` from the dropdown rather than from `AuthContext.partnerId`

### 2. Document Uploads

The `DocumentUpload` component and `documents` table already exist. Current state:
- Partners can upload documents for their donors (RLS INSERT policy exists)
- Admins can view all documents (RLS SELECT policy exists)
- Documents are stored in the `donor-documents` storage bucket

What needs to change:
- **Allow admins to upload documents too** -- Add an RLS INSERT policy for admins on the `documents` table
- **Add storage policies** -- The `donor-documents` bucket needs RLS policies on `storage.objects` so uploads and downloads actually work
- **Update partner DonorDetail** -- Allow document uploads at all statuses, not just draft (partners may need to send documents after submission)
- **Update admin AdminDonorReview** -- Enable uploads (set `canUpload={true}`) so admins can also attach documents

### 3. Routes

Add new routes in `App.tsx`:
- `/admin/donors/new` -- Admin donor creation form
- `/admin/donors/:id/edit` -- Admin donor edit form

Add an "Add Donor" button on the admin donors list page.

---

## Technical Details

### Database Migration

```sql
-- Allow admins to insert donors
CREATE POLICY "Admins can insert donors"
  ON public.donors FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Allow admins to upload documents
CREATE POLICY "Admins can upload documents"
  ON public.documents FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin')
    AND uploaded_by = auth.uid()
  );

-- Storage policies for donor-documents bucket
CREATE POLICY "Authenticated users can upload to donor-documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'donor-documents');

CREATE POLICY "Authenticated users can read from donor-documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'donor-documents');
```

### Files to Create/Modify

1. **New**: `src/pages/admin/AdminDonorForm.tsx` -- Admin donor form with partner selector dropdown
2. **Modify**: `src/App.tsx` -- Add routes for `/admin/donors/new` and `/admin/donors/:id/edit`
3. **Modify**: `src/pages/admin/AdminDonorsList.tsx` -- Add "Add Donor" button linking to `/admin/donors/new`
4. **Modify**: `src/pages/admin/AdminDonorReview.tsx` -- Change `canUpload={false}` to `canUpload={true}` for DocumentUpload
5. **Modify**: `src/pages/partner/DonorDetail.tsx` -- Change `canUpload={isDraft}` to `canUpload={true}` so partners can upload docs at any status
6. **New migration** -- SQL above for RLS policies

### AdminDonorForm Component Design

- Fetches all active partners via `supabase.from('partners').select('id, organization_name').eq('is_active', true)`
- Shows a Select dropdown for partner selection (required field)
- Same form fields as `DonorForm.tsx`: Demographics, Tissue Condition, Compliance cards
- Save and Submit buttons work the same way, using the selected `partner_id`
- Uses admin nav items and "Admin Panel" layout title
- On edit mode, fetches existing donor and pre-selects the partner (read-only since changing partner on an existing donor doesn't make sense)

