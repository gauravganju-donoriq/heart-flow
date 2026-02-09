

# Add Plasma Dilution Worksheet (7059F) to Donor Detail

## Overview

Add the LeMaitre 7059F Plasma Dilution of Donor Worksheet as a new tab on the donor detail pages. This compliance form determines whether a donor's blood samples are acceptable based on fluid transfusions/infusions received before death.

## Where It Fits

This form is relevant during the **review and approval** stages of a donor referral. When an admin or partner reviews a donor, they need to assess whether the donor's lab samples are diluted. The tab will appear for donors with status `submitted`, `under_review`, or `approved` (not for `draft` donors who haven't been submitted yet).

## What the Form Captures

### Section 1: Donor Header
- LeMaitre Donor # (pre-filled from DIN)
- Recovery Agency Donor # (pre-filled from external_donor_id)
- Donor weight in kg (pre-filled from weight_kgs)
- Sample type: Post Mortem (with date/time of death) or Pre Mortem (with date/time of collection)
- Death type: Asystole, LTKA, or CCT

### Section 2: Fluids Received
- **A. Blood products** transfused in the 48 hours before death (dynamic rows: product name + amount)
- **B. Colloids** infused in the 48 hours before death (dynamic rows: colloid name + amount)
- **C. Crystalloids** infused in the 1 hour before death (dynamic rows: crystalloid name + amount)
- Each section has a calculated total

### Section 3: Weight Calculations (auto-calculated)
- Blood Volume (BV) based on weight range and gender
- Plasma Volume (PV) based on weight range and gender
- For donors 45-100 kg: simple weight-based formula
- For donors under 45 kg or over 100 kg: BSA-based formula (male/female variants)

### Section 4: Dilution Check (auto-calculated)
- Check 1: Is B + C > PV?
- Check 2: Is A + B + C > BV?
- Result: Acceptable or Not Acceptable (with clear visual indicator)

### Section 5: Review
- Reviewed by (text field)
- Date reviewed

## Technical Details

### Database Changes

**New table: `plasma_dilution_worksheets`**
- `id` UUID primary key
- `donor_id` UUID (references donors, unique -- one worksheet per donor)
- `sample_type` TEXT ('post_mortem' or 'pre_mortem')
- `sample_datetime` TIMESTAMPTZ
- `death_type` TEXT ('asystole', 'ltka', 'cct')
- `blood_products` JSONB (array of {name, amount})
- `colloids` JSONB (array of {name, amount})
- `crystalloids` JSONB (array of {name, amount})
- `bsa_value` NUMERIC (optional, for edge-weight donors)
- `blood_volume` NUMERIC (calculated)
- `plasma_volume` NUMERIC (calculated)
- `is_sample_acceptable` BOOLEAN
- `reviewed_by` TEXT
- `reviewed_at` TIMESTAMPTZ
- `created_at`, `updated_at` TIMESTAMPTZ defaults

**RLS Policies:** Same pattern as `tissue_recoveries` -- admins full access, partners can manage their own donor's worksheets.

### Frontend Changes

**New component: `src/components/PlasmaDilutionForm.tsx`**
- Mirrors the structure and styling of `TissueRecoveryForm.tsx` for UI consistency
- Auto-calculates BV and PV based on donor weight, gender, and optional BSA
- Dynamic row addition for blood products, colloids, and crystalloids
- Auto-evaluates the two dilution checks and shows a clear pass/fail result
- Save and load from database
- Uses same Card/field patterns as existing forms (text-[13px], h-9 inputs, etc.)

**Modified files:**
- `src/pages/admin/AdminDonorReview.tsx` -- Add "Plasma Dilution (7059F)" tab after Recovery (7033F), visible for submitted/under_review/approved donors
- `src/pages/partner/DonorDetail.tsx` -- Same tab addition

### Auto-Calculation Logic

```text
If weight >= 45 and <= 100:
  BV = weight / 0.015
  PV = weight / 0.025
Else if male:
  BV = BSA * 2740
  PV = BSA * 1560
Else (female):
  BV = BSA * 2370
  PV = BSA * 1410

Check 1: (colloids_total + crystalloids_total) > PV
Check 2: (blood_total + colloids_total + crystalloids_total) > BV

Acceptable = both checks are NO
```

