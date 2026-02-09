

# Modern Minimal UI Redesign -- Starting with Admin Donors List

## Design Philosophy

Apple-inspired: clean white space, thin light-grey borders, no shadows, restrained typography, single primary color with grey/white shades. Every element earns its place.

---

## Step 1: Global Design Tokens

Update `src/index.css` and `tailwind.config.ts` to establish the new system.

### Font

- Import **Inter** from Google Fonts (consistently rated top for UI readability) via `index.html`
- Set `font-family: 'Inter', sans-serif` on body

### Color Palette (single primary + greys)

| Token | New Value | Purpose |
|-------|-----------|---------|
| `--background` | `0 0% 100%` | Pure white (keep) |
| `--foreground` | `220 9% 16%` | Soft black for text |
| `--card` | `0 0% 100%` | White, no shadow |
| `--border` | `220 9% 91%` | Very light grey border |
| `--muted` | `220 9% 97%` | Barely-there grey for backgrounds |
| `--muted-foreground` | `220 9% 55%` | Medium grey for secondary text |
| `--primary` | `220 70% 50%` | Single blue primary |
| `--primary-foreground` | `0 0% 100%` | White on primary |
| `--accent` | `220 9% 95%` | Light grey hover |
| `--destructive` | `0 72% 51%` | Red (for reject) |

Status badge colors will use subtle, muted tones (no heavy saturated backgrounds).

### Shadows and Borders

- Remove `shadow-sm` from Card component -- borders only
- All borders: 1px solid using the light grey `--border` token

---

## Step 2: Update Base UI Components

### Card (`src/components/ui/card.tsx`)
- Remove `shadow-sm` from default class
- Keep `rounded-lg border` with the thin grey border

### Table (`src/components/ui/table.tsx`)
- Reduce `TableHead` height from `h-12` to `h-10`
- Use smaller font: `text-xs uppercase tracking-wider` for table headers
- Lighter text for headers: `text-muted-foreground/70`

### Badge (`src/components/ui/badge.tsx`)
- Reduce padding slightly for a more compact look
- Status colors become subtle: light tinted backgrounds with muted text

### Button
- No changes needed -- current variants work well with the new palette

### DashboardLayout (`src/components/layouts/DashboardLayout.tsx`)
- Sidebar: use `bg-white` (not `bg-card`), thin right border
- Navigation links: smaller text (`text-[13px]`), lighter active state using the primary color at low opacity instead of solid fill
- Top header bar: simplify, thinner border-bottom
- Main content area: increase padding slightly for breathing room (`p-6 lg:p-8`)

---

## Step 3: Redesign Admin Donors List Page

### Remove
- Page title "All Donors" and subtitle (already shown as "Donors" in sidebar nav)
- Card wrapper around the filter (unnecessary chrome)
- Card wrapper + "Donors" CardTitle around the table (remove double-boxing)

### New Layout

```text
+--------------------------------------------------+
|  [Filter: Pending Review v]          [+ Add Donor]|
+--------------------------------------------------+
|  Code    Name    Partner   Type   Status   AI   > |
|  ------------------------------------------------ |
|  DNR-001 Robert  DonorIQ  Cornea  Review  Accept >|
|  DNR-002 Margar  DonorIQ  Cornea  Submit  Accept >|
|  ...                                              |
+--------------------------------------------------+
```

- Filter dropdown and "Add Donor" button on one row, inline (no card wrapper)
- Table sits directly on the page -- thin `border border-border rounded-lg` container, no shadow
- Table rows have generous vertical padding (`py-3.5`) and thin bottom borders
- Hover state: very subtle `bg-muted/30`
- Row click navigates to detail (entire row clickable, not just eye icon)
- Remove the eye icon button -- the row itself is the click target
- Font sizes: `text-[13px]` for table body, `text-xs` for table headers

### Status Badges (refined)
| Status | Style |
|--------|-------|
| Draft | `bg-gray-50 text-gray-500 border-gray-200` |
| Submitted | `bg-blue-50 text-blue-600 border-blue-100` |
| Under Review | `bg-amber-50 text-amber-600 border-amber-100` |
| Approved | `bg-emerald-50 text-emerald-600 border-emerald-100` |
| Rejected | `bg-red-50 text-red-500 border-red-100` |

All with `border` and `rounded-md` (not fully rounded pills -- more Apple-like).

---

## Step 4: Update the Style Guide Page

Refresh `src/pages/admin/StyleGuide.tsx` to reflect the new design tokens so it stays accurate as a living reference.

---

## Files to Change

1. `index.html` -- Add Inter font import from Google Fonts
2. `src/index.css` -- Update CSS custom properties, set Inter as body font
3. `tailwind.config.ts` -- Add Inter to `fontFamily.sans`
4. `src/components/ui/card.tsx` -- Remove `shadow-sm`
5. `src/components/ui/table.tsx` -- Refine header sizing and typography
6. `src/components/ui/badge.tsx` -- Adjust to `rounded-md`, slightly smaller padding
7. `src/components/layouts/DashboardLayout.tsx` -- Lighter sidebar, refined nav styles, more content padding
8. `src/pages/admin/AdminDonorsList.tsx` -- Full redesign per the layout above
9. `src/pages/admin/StyleGuide.tsx` -- Update to reflect new tokens

