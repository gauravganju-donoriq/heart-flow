

# Document Checklist Module

## Overview

Add an admin-configurable document checklist that defines which documents are required for each donor referral. When partners view a donor, they see which documents are still missing. Admins also see a compliance summary so missing documents are immediately flagged.

## How It Works

### Admin Side: Settings

A new "Document Checklist" section inside the existing **Screening Settings** page (as a second tab alongside the existing screening guidelines). Admins can:

- Add required document types (e.g., "Consent Form", "Medical Examiner Report", "Serology Results", "Next of Kin Authorization")
- Mark each as required or optional
- Reorder them by priority
- Toggle active/inactive
- Add a description so partners know what to upload

### Partner Side: Documents Tab

When a partner views a donor's Documents tab, they see:

- A checklist showing all required document types with checkboxes
- Green check for documents that have been uploaded (matched by document type tag)
- Red/amber indicator for missing required documents
- Upload button next to each checklist item so they can upload directly against that requirement

### Admin Side: Donor Review Documents Tab

When an admin reviews a donor, the Documents tab shows:

- Same checklist view with completion status
- A summary badge: "3 of 5 required documents uploaded" (or similar)
- Missing documents highlighted in red

### Upload Flow Change

When uploading, the user picks which checklist item the document satisfies (via a dropdown/select). Documents can also be uploaded as "Other" for items not on the checklist.

## Technical Details

### New Database Table

**`document_requirements`** -- the admin-configured checklist template

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| name | TEXT | e.g., "Consent Form" |
| description | TEXT | Optional guidance for partners |
| is_required | BOOLEAN | Default true |
| is_active | BOOLEAN | Default true |
| sort_order | INTEGER | Default 0 |
| created_by | UUID | Admin who created it |
| created_at | TIMESTAMPTZ | Default now() |
| updated_at | TIMESTAMPTZ | Default now() |

**RLS Policies:**
- Admins: full CRUD
- Partners + anon: SELECT only (they need to read the checklist to know what to upload)

### Schema Change to `documents` Table

Add a new nullable column:

- `document_requirement_id UUID` -- links an uploaded file to a specific checklist item (nullable for legacy/uncategorized uploads)

### Files Modified

**`src/pages/admin/ScreeningSettings.tsx`**
- Add a second tab: "Screening Guidelines" (existing) and "Document Checklist" (new)
- Document Checklist tab has the same CRUD pattern as guidelines: add/edit/delete/toggle/reorder

**`src/components/DocumentUpload.tsx`**
- Fetch `document_requirements` on load
- Show a checklist view above the file list: each requirement with its status (uploaded or missing)
- When uploading, prompt user to select which requirement the document satisfies
- Highlight missing required documents with a warning indicator

**`src/pages/admin/AdminDonorReview.tsx`**
- Pass a `showChecklist` prop to DocumentUpload so it renders the compliance summary
- Optionally show a badge on the Documents tab trigger indicating missing count

**`src/pages/partner/DonorDetail.tsx`**
- Same checklist integration via DocumentUpload component

### Starter Templates

Pre-load common LeMaitre document requirements when the list is empty:
- Consent Form
- Medical Examiner / Coroner Report
- Serology / Infectious Disease Test Results
- Next of Kin Authorization
- Donor Medical / Social History Questionnaire (DRAI)
- Hemodilution Worksheet

