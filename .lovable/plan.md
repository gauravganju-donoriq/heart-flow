

## Partner Dashboard Consistency Fixes

### Overview
Standardize the partner-side pages to match admin conventions: extract shared status constants, fix form styling, remove redundant titles/wrappers, and add a "View All" link.

---

### 1. Extract shared status constants

Create `src/lib/donorStatus.ts` with `statusStyles` and `statusLabels` maps, then update all five files that currently duplicate them:
- `src/pages/partner/PartnerDashboard.tsx`
- `src/pages/partner/DonorsList.tsx`
- `src/pages/partner/DonorDetail.tsx`
- `src/pages/admin/AdminDashboard.tsx`
- `src/pages/admin/AdminDonorsList.tsx`

### 2. DonorForm consistency

In `src/pages/partner/DonorForm.tsx`:
- Remove the "Edit Donor" / "New Donor" page title text, keep only the back button.
- Add `text-[13px]` to all Labels and `h-9 text-[13px]` to all Inputs in the Demographics section to match the Call Information section.

### 3. Partner Dashboard "View All" link

In `src/pages/partner/PartnerDashboard.tsx`:
- Add a "View All" link button next to the "Recent Donors" heading, pointing to `/partner/donors`.

### 4. TeamManagement cleanup

In `src/pages/admin/TeamManagement.tsx`:
- Replace `Card` wrappers around the table with a plain `div className="border border-border rounded-lg"`.
- Remove the "Internal Users" card header.
- Remove the inline Activity Log section at the bottom (now covered by the dedicated Audit Log page).

---

### Files modified

| File | Change |
|---|---|
| `src/lib/donorStatus.ts` (new) | Shared `statusStyles` and `statusLabels` |
| `src/pages/partner/PartnerDashboard.tsx` | Use shared constants; add "View All" link |
| `src/pages/partner/DonorsList.tsx` | Use shared constants |
| `src/pages/partner/DonorDetail.tsx` | Use shared constants |
| `src/pages/admin/AdminDashboard.tsx` | Use shared constants |
| `src/pages/admin/AdminDonorsList.tsx` | Use shared constants |
| `src/pages/partner/DonorForm.tsx` | Remove title; fix label/input sizing |
| `src/pages/admin/TeamManagement.tsx` | Remove Card wrappers; remove inline Activity Log |

