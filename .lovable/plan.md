

# Rebrand to Atlas + Document Upload UI Polish

## Overview

Two changes: (1) rename the app from "DonorIQ" to "Atlas" across the entire UI, and (2) refine the document upload experience so the checklist is more prominent and the UI is consistent with the rest of the app's design language (compact text sizes, border styling, card patterns).

## 1. Rebrand: DonorIQ to Atlas

Every instance of "DonorIQ" in the sidebar title will be changed to "Atlas". The HTML page title and meta tags will also be updated.

### Files affected

- **`index.html`** -- update `<title>` and og/twitter meta tags from "testing" to "Atlas"
- **`src/pages/admin/AdminDashboard.tsx`** -- `title="Atlas"`
- **`src/pages/admin/AdminDonorReview.tsx`** -- `title="Atlas"` (2 instances: loading + main)
- **`src/pages/admin/AdminDonorForm.tsx`** -- `title="Atlas"` (2 instances)
- **`src/pages/admin/AdminDonorsList.tsx`** -- `title="Atlas"`
- **`src/pages/admin/AdminNotifications.tsx`** -- `title="Atlas"`
- **`src/pages/admin/PartnersList.tsx`** -- `title="Atlas"`
- **`src/pages/admin/ScreeningSettings.tsx`** -- `title="Atlas"`
- **`src/pages/admin/StyleGuide.tsx`** -- heading text update
- **`src/pages/partner/PartnerDashboard.tsx`** -- `title="Atlas"`
- **`src/pages/partner/DonorDetail.tsx`** -- `title="Atlas"` (2 instances)
- **`src/pages/partner/DonorForm.tsx`** -- `title="Atlas"` (2 instances)
- **`src/pages/partner/DonorsList.tsx`** -- `title="Atlas"`
- **`src/pages/partner/Notifications.tsx`** -- `title="Atlas"`

Total: ~17 string replacements of `"DonorIQ"` to `"Atlas"` across 14 files.

## 2. Document Upload UI Refinements

The current `DocumentUpload.tsx` component already has the checklist and upload flow. The refinements will bring it in line with the app's design system:

- Use consistent `text-[13px]` sizing on file names and metadata (currently `text-sm` / `text-xs` -- slightly inconsistent)
- Match the card header pattern used elsewhere (plain `<p className="text-sm font-medium">` instead of `<CardTitle>` which renders larger)
- Tighten padding on file rows to match the compact style used in tables throughout the app
- Ensure the checklist section uses the same `<p className="text-sm font-medium">` header pattern as other cards

### Files affected

- **`src/components/DocumentUpload.tsx`** -- UI consistency tweaks:
  - Replace `<CardTitle>` with `<p className="text-sm font-medium">` in both card headers (checklist card and documents card)
  - Standardize file name to `text-[13px]` and metadata to `text-[12px]`
  - Use `py-2.5` padding on file rows instead of `p-3` for tighter spacing

These are purely visual/cosmetic changes -- no logic changes needed.

## Technical Details

All changes are simple string replacements. No database changes, no new components, no new dependencies.

