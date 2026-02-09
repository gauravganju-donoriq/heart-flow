

# Add Tabbed Donor Form with Documents Tab

## Overview

Redesign the donor creation/edit forms (both admin and partner) to use a **tabbed layout**. This way, the Documents upload section is always visible as a tab -- even on the "Add New Donor" form -- giving users a natural place to upload files right alongside filling in donor details.

## How It Works

The form will have two tabs:
- **Donor Information** -- all the existing form fields (demographics, tissue, compliance, etc.)
- **Documents** -- the document upload section

### New Donor (Create) Flow
1. User opens "Add New Donor"
2. They see two tabs: "Donor Information" (active) and "Documents"
3. They fill in donor details on the first tab
4. They can switch to the "Documents" tab at any time
5. If the donor hasn't been saved yet, the Documents tab shows a message: _"Please save the donor first to upload documents"_ with the Save button right there
6. Once the donor is saved (auto-navigates to the edit URL), the Documents tab becomes fully functional with the upload component
7. After saving, they stay on the form and can freely switch between tabs to keep editing or uploading

### Edit Donor Flow
1. Both tabs are fully functional since the donor already exists
2. User can edit details and upload documents seamlessly

### Detail/Review Pages (No Change)
The existing review pages (`AdminDonorReview`, `DonorDetail`) already show documents inline and will remain unchanged.

## Technical Details

### Files to Modify

1. **`src/pages/admin/AdminDonorForm.tsx`**
   - Import `Tabs, TabsList, TabsTrigger, TabsContent` from `@/components/ui/tabs`
   - Wrap the form content in a `Tabs` component with two tabs: "Donor Information" and "Documents"
   - Move all existing form cards (Partner Assignment, Demographics, Tissue, Compliance) into the first `TabsContent`
   - Move the `DocumentUpload` component into the second `TabsContent`
   - Remove the `isEdit && id` guard on `DocumentUpload`; instead show a placeholder message when `!isEdit` (no donor ID yet)
   - After a new donor is created, navigate to the edit URL (already done) so the Documents tab activates
   - Keep the Save/Submit buttons outside the tabs so they're always visible

2. **`src/pages/partner/DonorForm.tsx`**
   - Same tabbed layout changes as the admin form
   - Same placeholder logic on Documents tab for unsaved donors

### No Other Files Change
- `DocumentUpload.tsx` -- no changes needed
- `AdminDonorReview.tsx` -- already has documents, no changes
- `DonorDetail.tsx` -- already has documents, no changes
- No database or RLS changes needed

