

# Apply Minimal Design System Across All Pages

## Scope

Every page not yet updated to match the new Apple-inspired design language established in the Admin Donors List. This covers 13 pages/components across admin, partner, and public areas.

---

## Consistent Changes Applied Everywhere

These patterns will be applied uniformly to every page below:

- **Remove redundant page titles and subtitles** -- the sidebar already shows which page the user is on. Exception: detail pages (donor review, donor detail) keep the donor code as a header since it's contextual data, not a page label.
- **Remove Card wrappers around tables and filters** -- tables sit directly on the page inside a thin `border border-border rounded-lg` container. No nested Card > CardHeader > CardTitle > CardContent > Table pattern.
- **Font sizes**: body text `text-[13px]`, table headers `text-xs uppercase tracking-wider text-muted-foreground/70`, stat numbers `text-2xl` (down from `text-3xl`).
- **Status badges**: use the new `statusStyles` map (`bg-gray-50 text-gray-500 border border-gray-200`, etc.) with `rounded-md` instead of the old `statusColors` (`bg-blue-100 text-blue-800`).
- **Stat cards**: remove CardTitle/CardDescription nesting, simplify to compact layout with `text-[13px]` labels and `text-2xl font-semibold` values.
- **Buttons**: standardize to `h-9 text-[13px]` for toolbar actions, `size="sm"` for inline actions.
- **Spacing**: `space-y-5` between sections (not `space-y-6`), `max-w-6xl` for list pages, `max-w-4xl` for detail/form pages.
- **DashboardLayout title**: change all instances from "Admin Panel" / "Partner Portal" to "DonorIQ" for brand consistency.

---

## Page-by-Page Changes

### 1. Admin Dashboard (`src/pages/admin/AdminDashboard.tsx`)

Current issues:
- Has `h1 text-2xl font-bold "Dashboard"` and subtitle -- redundant
- Stat cards use `text-3xl` -- too large
- Status badges use old `statusColors` map
- Pending donors table wrapped in Card with CardHeader/CardTitle "Pending Review"
- Uses `Eye` icon button per row instead of clickable rows
- Layout title is "Admin Panel"

Changes:
- Remove the header div (h1 + subtitle)
- Stat cards: reduce number size to `text-2xl font-semibold`, labels to `text-[13px] text-muted-foreground`
- Replace `statusColors` with `statusStyles` (same map as AdminDonorsList)
- Remove Card wrapper from pending donors table, use `border border-border rounded-lg` directly
- Remove "Pending Review" CardTitle, add a simple `text-sm font-medium` section label if needed
- Make table rows clickable, remove Eye button column
- Add `hover:bg-muted/30 cursor-pointer` to rows
- Change layout title to "DonorIQ"
- Table text to `text-[13px]`, headers to `text-xs`

### 2. Admin Partners List (`src/pages/admin/PartnersList.tsx`)

Current issues:
- Has h1 "Partners" + subtitle
- Table wrapped in Card > CardHeader("All Partners") > CardContent
- Layout title "Admin Panel"

Changes:
- Remove h1/subtitle, keep just the "Add Partner" button aligned right
- Remove Card wrapper, table goes directly in `border border-border rounded-lg`
- Change layout title to "DonorIQ"

### 3. Partners Table Component (`src/components/admin/PartnersTable.tsx`)

Current issues:
- Uses default table sizing (no `text-[13px]` body, no `text-xs` headers)
- No row hover states

Changes:
- Table cells to `text-[13px] py-3.5`
- Table headers already use default component styling (now updated globally)
- Add `hover:bg-muted/30` to rows

### 4. Admin Donor Form (`src/pages/admin/AdminDonorForm.tsx`)

Current issues:
- h1 "Edit Donor" / "New Donor" with subtitle
- Multiple Card sections with CardTitle + CardDescription (Call Information, Demographics, etc.)
- Layout title "Admin Panel"

Changes:
- Keep back arrow button, simplify header: just `text-lg font-semibold` for "Edit Donor" / "New Donor", remove subtitle
- Card sections: keep Cards for form grouping (they serve a structural purpose in forms), but simplify headers -- `text-sm font-medium` section title instead of CardTitle, remove CardDescription
- Change layout title to "DonorIQ"
- Max width stays `max-w-3xl`

### 5. Admin Donor Review (`src/pages/admin/AdminDonorReview.tsx`)

Current issues:
- h1 uses `text-2xl font-bold font-mono` for donor code -- keep this (contextual)
- Status badges use old `statusColors`
- Multiple Card sections with CardTitle
- Review action card uses `border-primary/20 bg-primary/5` -- too heavy
- Layout title "Admin Panel"

Changes:
- Replace `statusColors` with `statusStyles`
- Card section headers: simplify to `text-sm font-medium` instead of CardTitle
- Review actions card: use `border border-border` with subtle `bg-muted/30` instead of primary tint
- Review notes (approved/rejected): lighter styling, no bg-red-50/bg-green-50 cards -- use a border-left accent instead
- Donor code header: reduce to `text-lg font-semibold font-mono`
- Change layout title to "DonorIQ"
- Field component `dd`: change from `font-medium` to `text-[13px]` for consistency

### 6. Admin Notifications (`src/pages/admin/AdminNotifications.tsx`)

Current issues:
- h1 "Notifications" + subtitle
- Notifications list wrapped in Card > CardHeader("All Notifications") > CardContent
- Layout title "Admin Panel"

Changes:
- Remove h1/subtitle, keep "Mark All as Read" button aligned right with unread count as small text
- Remove Card wrapper, notification items sit directly in the page
- Notification items: simplify styling, `text-[13px]` for body, `text-xs` for timestamp
- Change layout title to "DonorIQ"

### 7. Screening Settings (`src/pages/admin/ScreeningSettings.tsx`)

Current issues:
- h1 "Screening Guidelines" + subtitle
- Guideline cards use CardTitle `text-lg` -- too large
- Layout title "Admin Panel"

Changes:
- Remove h1/subtitle, keep "Add Guideline" button aligned right
- Guideline card titles: `text-sm font-medium` instead of `text-lg`
- Change layout title to "DonorIQ"

### 8. Partner Dashboard (`src/pages/partner/PartnerDashboard.tsx`)

Current issues:
- h1 "Dashboard" + subtitle
- Stat cards with `text-3xl`
- Status badges use old `statusColors`
- Recent donors table in Card > CardHeader/CardTitle
- Eye button per row
- Phone intake card uses `border-primary/20 bg-primary/5`
- Layout title "Partner Portal"

Changes:
- Remove h1/subtitle, keep "Add Donor" button
- Stat cards: `text-2xl font-semibold`, `text-[13px]` labels
- Replace `statusColors` with `statusStyles`
- Remove Card wrapper from recent donors table
- Make table rows clickable, remove Eye button
- Phone intake card: use subtle `border border-border bg-muted/30` instead of primary tint
- Change layout title to "DonorIQ"

### 9. Partner Donors List (`src/pages/partner/DonorsList.tsx`)

Current issues:
- h1 "Donors" + subtitle
- Filter in Card wrapper
- Table in Card > CardHeader("All Donors") > CardContent
- Status badges use old `statusColors`
- Eye/Edit icon buttons per row
- Layout title "Partner Portal"

Changes:
- Remove h1/subtitle
- Remove Card wrapper from filter, inline filter + "Add Donor" button in one row (same as AdminDonorsList)
- Remove Card wrapper from table
- Replace `statusColors` with `statusStyles`
- Make rows clickable, remove Eye button. Keep Edit button only for draft rows as a small inline action
- Change layout title to "DonorIQ"
- Table cells: `text-[13px] py-3.5`

### 10. Partner Donor Detail (`src/pages/partner/DonorDetail.tsx`)

Current issues:
- Status badges use old `statusColors`
- Card section headers use CardTitle
- h1 `text-2xl font-bold font-mono` for donor code
- Review notes card uses bg-red-50 for rejected
- Layout title "Partner Portal"

Changes:
- Replace `statusColors` with `statusStyles`
- Card section headers: `text-sm font-medium` instead of CardTitle
- Donor code: `text-lg font-semibold font-mono`
- Review notes: use border-left accent, no colored background
- Field dd: `text-[13px]`
- Change layout title to "DonorIQ"

### 11. Partner Donor Form (`src/pages/partner/DonorForm.tsx`)

Current issues:
- h1 "Edit Donor" / "New Donor" with subtitle
- Card sections with CardTitle + CardDescription
- Layout title "Partner Portal"

Changes:
- Simplify header: `text-lg font-semibold`, remove subtitle
- Card section headers: `text-sm font-medium`, remove CardDescription
- Change layout title to "DonorIQ"

### 12. Partner Notifications (`src/pages/partner/Notifications.tsx`)

Current issues:
- h1 "Notifications" + subtitle
- List in Card > CardHeader("All Notifications") > CardContent
- Layout title "Partner Portal"

Changes:
- Same treatment as Admin Notifications
- Remove h1/subtitle, keep "Mark All as Read" aligned right
- Remove Card wrapper
- Change layout title to "DonorIQ"

### 13. AI Screening Panel (`src/components/admin/AIScreeningPanel.tsx`)

Current issues:
- Uses `border-primary/20` on card
- Verdict badges use old heavy color scheme (`bg-green-100 text-green-800`)
- Severity badges use old heavy colors

Changes:
- Card: use `border border-border` instead of `border-primary/20`
- Verdict badges: use the new subtle status palette (`bg-emerald-50 text-emerald-600 border-emerald-100`)
- Severity badges: same subtle treatment
- Section text: `text-[13px]`

---

## Minor Component Updates

### Retell Setup (`src/components/admin/RetellSetup.tsx`)
- Active badge: use new subtle green (`bg-emerald-50 text-emerald-600 border-emerald-100`)

### Pending Donor Updates (`src/components/admin/PendingDonorUpdates.tsx`)
- Card: change from `border-amber-300 bg-amber-50/50` to `border border-amber-200 bg-amber-50/30` (subtler)
- Text sizes: `text-[13px]`

### Auth Pages (`src/pages/Auth.tsx`, `src/pages/PartnerLogin.tsx`)
- Already clean and minimal, but ensure Card has no shadow (already handled by global Card update)
- No other changes needed

### NotFound (`src/pages/NotFound.tsx`)
- Change `bg-muted` to `bg-background` for consistency

---

## Technical Summary

### Files to modify (17 total):

1. `src/pages/admin/AdminDashboard.tsx`
2. `src/pages/admin/PartnersList.tsx`
3. `src/pages/admin/AdminDonorForm.tsx`
4. `src/pages/admin/AdminDonorReview.tsx`
5. `src/pages/admin/AdminNotifications.tsx`
6. `src/pages/admin/ScreeningSettings.tsx`
7. `src/pages/partner/PartnerDashboard.tsx`
8. `src/pages/partner/DonorsList.tsx`
9. `src/pages/partner/DonorDetail.tsx`
10. `src/pages/partner/DonorForm.tsx`
11. `src/pages/partner/Notifications.tsx`
12. `src/components/admin/PartnersTable.tsx`
13. `src/components/admin/AIScreeningPanel.tsx`
14. `src/components/admin/RetellSetup.tsx`
15. `src/components/admin/PendingDonorUpdates.tsx`
16. `src/pages/NotFound.tsx`
17. `src/pages/admin/StyleGuide.tsx` (update to reflect the final token values)

### No changes needed:
- `src/pages/Auth.tsx` -- already minimal
- `src/pages/PartnerLogin.tsx` -- already minimal
- `src/components/admin/CreatePartnerDialog.tsx` -- dialog content is fine
- `src/components/admin/EditPartnerDialog.tsx` -- dialog content is fine
- `src/components/DocumentUpload.tsx` -- Card usage is appropriate for embedded component
- `src/components/ShipmentTracking.tsx` -- Card usage is appropriate
- `src/components/CallTranscript.tsx` -- collapsible Card is appropriate
- `src/components/TissueRecoveryForm.tsx` -- complex form, Card grouping is appropriate

