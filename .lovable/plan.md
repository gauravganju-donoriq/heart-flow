

# Donor Workflow Enhancement: Courier Tracking + Linked Data

## Overview

Enhance the donor workflow so partners can submit full donor details via forms and attach courier tracking numbers to each donor. Since a donor can have multiple shipments, we'll create a separate `shipments` table linked to donors. All relevant information (donor details, documents, shipments) will flow through the entire journey from partner submission to admin review.

## What's Changing

### 1. New Database Table: `shipments`

A new table to store courier tracking entries linked to donors:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| donor_id | uuid (FK -> donors) | Links to the donor |
| tracking_number | text | The courier tracking number |
| notes | text (nullable) | Optional description (e.g. "Vascular tissue sample") |
| created_at | timestamp | Auto-set |
| created_by | uuid | The user who added it |

RLS policies:
- Partners can INSERT shipments for their own donors
- Partners can SELECT shipments for their own donors
- Admins can SELECT all shipments

### 2. Partner Donor Form Updates

Add a **Shipment / Courier Tracking** section to the donor form (`DonorForm.tsx`):
- Partners can add one or more tracking numbers while the donor is in draft
- Each entry is just a tracking number + optional note
- Tracking entries are saved to the `shipments` table when the form is saved

### 3. Partner Donor Detail Updates

Update `DonorDetail.tsx` to show:
- A new **Shipments** card listing all tracking numbers with their notes and timestamps
- Ability to add more tracking entries while the donor is still in draft status

### 4. Admin Donor Review Updates

Update `AdminDonorReview.tsx` to show:
- The same **Shipments** card (read-only) so admins see all courier tracking info alongside donor details, documents, and compliance data when reviewing

This ensures all relevant information travels through the full journey: partner entry -> submission -> admin review -> approval/rejection.

---

## Technical Details

### Database Migration SQL

```sql
CREATE TABLE public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
  tracking_number text NOT NULL,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- Partners can view shipments for their own donors
CREATE POLICY "Partners can view their donor shipments"
  ON public.shipments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM donors
      JOIN partners ON partners.id = donors.partner_id
      WHERE donors.id = shipments.donor_id
      AND partners.user_id = auth.uid()
    )
  );

-- Partners can add shipments to their own donors
CREATE POLICY "Partners can add shipments"
  ON public.shipments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM donors
      JOIN partners ON partners.id = donors.partner_id
      WHERE donors.id = shipments.donor_id
      AND partners.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Admins can view all shipments
CREATE POLICY "Admins can view all shipments"
  ON public.shipments FOR SELECT
  USING (has_role(auth.uid(), 'admin'));
```

### Files to Create/Modify

1. **New migration** - SQL above
2. **New component**: `src/components/ShipmentTracking.tsx` - Reusable component that displays shipment list and optionally allows adding new entries (used by both partner detail and admin review)
3. **Modify** `src/pages/partner/DonorDetail.tsx` - Add ShipmentTracking component with add capability when draft
4. **Modify** `src/pages/partner/DonorForm.tsx` - Add inline tracking number fields that get saved after initial donor creation
5. **Modify** `src/pages/admin/AdminDonorReview.tsx` - Add ShipmentTracking component in read-only mode

### ShipmentTracking Component Design

A shared component accepting props:
- `donorId: string` - which donor
- `canAdd: boolean` - whether to show the "add tracking" input
- Fetches shipments from the `shipments` table filtered by `donor_id`
- Displays a list/table of tracking numbers with notes and dates
- When `canAdd` is true, shows an input + button to insert new entries

