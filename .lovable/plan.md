

# UI Style Guide Playbook

## Overview

Create a dedicated `/admin/style-guide` page that serves as a living reference for the DonorIQ design system. This page will document and visually demonstrate every design token and component pattern used across the platform. Once confirmed, we will then apply any refinements consistently across all existing pages.

## What the Style Guide Page Will Include

### Section 1: Color Palette
- Display all CSS custom property colors as visual swatches with their HSL values and semantic names
- Groups: Primary, Secondary, Muted, Accent, Destructive, Background/Foreground, Border/Input
- Status colors used in badges: blue (submitted), yellow (under review), green (approved), red (rejected)
- AI screening colors: green (accept), red (reject), amber (needs review)

### Section 2: Typography
- Font family (currently system default -- we can define one if you prefer)
- Heading hierarchy: h1 through h4 with sizes, weights, and line-heights
- Body text, small text, muted text, and mono text (used for donor codes)
- Current patterns found in the app:
  - Page titles: `text-2xl font-bold`
  - Page subtitles: `text-muted-foreground`
  - Card titles: `text-2xl font-semibold`
  - Table text: default `text-sm`

### Section 3: Buttons
- All 6 variants rendered side by side: default, destructive, outline, secondary, ghost, link
- All 4 sizes: default, sm, lg, icon
- Disabled states

### Section 4: Form Elements
- Input, Label, Select, Checkbox, Switch, Textarea
- Error states and validation messaging

### Section 5: Cards
- Standard card with header, description, content, and footer
- Stat cards (as used on the dashboard)

### Section 6: Badges and Status Indicators
- Badge variants: default, secondary, destructive, outline
- Status badges with custom colors (draft, submitted, under review, approved, rejected)
- AI screening badges (accept, reject, needs review, not screened)

### Section 7: Tables
- Standard table layout with header, rows, and actions
- Sortable/filterable patterns

### Section 8: Spacing and Layout
- Border radius values (lg, md, sm)
- Common spacing patterns (gap-4, space-y-6, p-6, etc.)
- Grid layouts used (md:grid-cols-4 for stats, etc.)

---

## Implementation

### Step 1: Create the Style Guide Page
- New file: `src/pages/admin/StyleGuide.tsx`
- Self-contained page that renders all the sections above using actual components (Button, Badge, Card, Input, Table, etc.)
- Wrapped in the existing `DashboardLayout` for consistency

### Step 2: Add Route
- Add `/admin/style-guide` route in `src/App.tsx` behind admin auth

### Step 3: Add Nav Link
- Add a "Style Guide" nav item to the admin sidebar (using a Palette icon)

### Step 4: Review and Refine
- Once the page is live, review it together to confirm the design tokens
- Identify any inconsistencies or desired changes (e.g., switching to a specific font, adjusting the primary color)

### Step 5: Apply Across the Platform
- Update `src/index.css` with any refined design tokens
- Update `tailwind.config.ts` if new values are needed
- Sweep through all pages to normalize any one-off styles to match the confirmed playbook
