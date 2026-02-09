

# Auto-Generate DIN (Donor Identification Number) on Submission

## What This Does

When a partner submits a donor referral (with their own External Donor ID), the system will automatically generate a **DIN** -- a unique LeMaitre-specific identifier for that donor. This replaces the current manual "LeMaitre Donor Number" field in the recovery form with a system-generated value.

## How It Works

1. Partner submits a donor referral containing their **External Donor ID**
2. The system auto-generates a **DIN** (e.g., `DIN-250209-0001`) and stores it on the donor record
3. The DIN appears in the donor header, overview tab, and pre-fills into the Recovery (7033F) form

## Default DIN Format

Until the customer specifies their numbering system, the format will be:

```text
DIN-YYMMDD-NNNN
```

Where `YYMMDD` is the submission date and `NNNN` is a zero-padded daily sequence number (e.g., `DIN-250209-0001`).

---

## Technical Details

### 1. Database Changes

**Add `din` column to `donors` table:**
- New column: `din TEXT UNIQUE NULLABLE`
- The column is nullable because drafts won't have a DIN yet -- it's generated on submission

**Create a database function `generate_din()`:**
- A trigger function that fires on UPDATE of the `donors` table
- Condition: when `status` changes to `'submitted'` and `din` IS NULL
- Logic: queries the count of donors submitted on that date to determine the sequence number, then sets `din` to `DIN-YYMMDD-NNNN`

**Create trigger `set_din_on_submit`:**
- `BEFORE UPDATE` trigger on `donors`
- Calls `generate_din()` only when the status transitions to `submitted`

### 2. Frontend Changes

**`src/pages/admin/AdminDonorReview.tsx`:**
- Display the DIN in the donor header alongside the donor code
- Show DIN in the Overview tab under a new "Identifiers" card (External Donor ID + DIN side by side)

**`src/pages/partner/DonorDetail.tsx`:**
- Same DIN display in header and Overview tab

**`src/components/TissueRecoveryForm.tsx`:**
- Pre-fill the `lemaitre_donor_number` field with the donor's DIN
- Make it read-only (since it's system-generated)
- Update the label from "LeMaitre Donor Number" to "DIN (Donor Identification Number)"

**`src/pages/admin/AdminDonorsList.tsx` and `src/pages/partner/DonorsList.tsx`:**
- Add a DIN column to the donors list table for quick reference

### 3. Type Updates

The `din` column will automatically appear in the generated Supabase types after the migration runs, so no manual type changes are needed.

