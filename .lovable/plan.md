

# Section-Wise Document Upload + Domain-Specific Checklist

## Overview

Two improvements: (1) add a `category` field to document requirements so they can be grouped into logical sections like "Consent & Authorization", "Lab & Serology", "Recovery & Packaging", and (2) restructure the upload UI so partners see documents organized by section rather than a flat list -- making it intuitive to find what's missing and upload against the right category.

## What Changes

### 1. Add `category` column to `document_requirements`

A new TEXT column `category` on the `document_requirements` table. Admins assign each requirement to a section when creating/editing it. Categories:

- **Consent & Authorization** -- Consent Form, Next of Kin Authorization
- **Medical & Clinical** -- Medical Examiner Report, DRAI Questionnaire, Clinical Summary
- **Lab & Serology** -- Serology / Infectious Disease Results, Blood Typing Report
- **Recovery & Packaging** -- Tissue Recovery Report, Packaging Checklist, Hemodilution Worksheet
- **Other** -- catch-all for anything not in the above

### 2. Update Admin Settings UI

In `DocumentChecklistSettings.tsx`:
- Add a category dropdown (select from the five categories above) when creating/editing a requirement
- Display requirements grouped by category with section headers
- Update starter templates to include category assignments

### 3. Restructure Partner/Admin Document Upload UI

In `DocumentUpload.tsx`, instead of a flat checklist followed by a flat file list:

**New layout per category section:**

```
[Consent & Authorization]              2 of 2 uploaded
  [x] Consent Form                     view-file.pdf
  [x] Next of Kin Authorization        nok-auth.pdf

[Lab & Serology]                       0 of 1 uploaded  (!)
  [ ] Serology Results                 [Upload]

[Recovery & Packaging]                 1 of 2 uploaded  (!)
  [x] Hemodilution Worksheet           hemo.pdf
  [ ] Tissue Recovery Report           [Upload]

[Other Documents]
  invoice-scan.pdf  |  misc-notes.pdf
```

Each section:
- Shows its own progress (e.g., "1 of 2 uploaded")
- Lists requirements with status indicators (check / warning)
- Shows the uploaded file inline next to the fulfilled requirement (with download button)
- Has an upload button next to unfulfilled requirements
- Uncategorized documents appear in an "Other Documents" section at the bottom

### 4. Improved Starter Templates

Update the starter templates to cover the actual tissue banking workflow:

| Document | Category | Required |
|----------|----------|----------|
| Consent Form | Consent & Authorization | Yes |
| Next of Kin Authorization | Consent & Authorization | Yes |
| Medical Examiner / Coroner Report | Medical & Clinical | Yes |
| Donor Risk Assessment Interview (DRAI) | Medical & Clinical | Yes |
| Serology / Infectious Disease Results | Lab & Serology | Yes |
| Blood Typing Report | Lab & Serology | No |
| Tissue Recovery Report | Recovery & Packaging | Yes |
| Hemodilution Worksheet | Recovery & Packaging | No |
| Packaging & Shipping Checklist | Recovery & Packaging | No |

## Technical Details

### Database Migration

```sql
ALTER TABLE document_requirements
ADD COLUMN category TEXT NOT NULL DEFAULT 'other';
```

No new RLS policies needed -- existing policies cover this column.

### Files Modified

**`supabase/migrations/` (new migration)**
- Add `category` column to `document_requirements`

**`src/components/admin/DocumentChecklistSettings.tsx`**
- Add category select dropdown to the create/edit dialog (options: Consent & Authorization, Medical & Clinical, Lab & Serology, Recovery & Packaging, Other)
- Group the requirements list by category with section headers
- Update starter templates array to include category values

**`src/components/DocumentUpload.tsx`**
- Group requirements by category
- Render each category as a collapsible section with its own progress indicator
- Show uploaded files inline next to their matched requirement
- Show uncategorized uploads in an "Other Documents" section
- Each unfulfilled requirement has a direct upload button
- Overall compliance summary remains at the top

**`src/integrations/supabase/types.ts`**
- Will auto-update after migration to include `category` on `document_requirements`

No changes needed to `AdminDonorReview.tsx` or `DonorDetail.tsx` -- they already render `<DocumentUpload>` which will pick up the new grouped layout automatically.

