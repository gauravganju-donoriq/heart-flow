

# Agentic AI Donor Screening System

## Overview

Build a fully agentic AI screening system -- not a programmatic rule engine. Admins write free-form screening guidelines (like a policy document), and an AI agent autonomously evaluates each donor against those guidelines, reasoning holistically like a human reviewer would. The agent produces a verdict with detailed clinical reasoning, flags concerns, and highlights missing data -- all advisory for the human admin to act on.

## What Makes This "Agentic" vs Programmatic

- **No structured rules table with pass/fail per row.** Instead, a single rich screening policy document (editable by admins) that the AI agent interprets holistically.
- **The agent reasons across the full donor profile**, weighing factors against each other (e.g., "age is borderline but cause of death is low-risk, so acceptable").
- **The agent identifies concerns the admin may not have written rules for** -- it flags anything clinically unusual.
- **Conversation-style output**: The agent explains its thinking in natural language, not just checkboxes.

---

## Database Changes

### New Table: `screening_guidelines`

Stores the admin's screening policy as a living document -- not individual rules, but a comprehensive set of instructions the AI agent follows.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `title` | text | Section title (e.g., "Age Criteria", "High-Risk Exclusions") |
| `content` | text | Free-form natural language guideline |
| `category` | text | Grouping: `eligibility`, `medical`, `logistics`, `general` |
| `is_active` | boolean | Whether this guideline is currently in effect |
| `sort_order` | integer | Display/evaluation ordering |
| `created_by` | uuid | Admin who wrote it |
| `created_at` / `updated_at` | timestamptz | Timestamps |

RLS: Admin-only read/write.

### New Table: `screening_results`

Stores the agent's full evaluation output.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated |
| `donor_id` | uuid | Reference to donors table |
| `verdict` | text | `accept`, `reject`, `needs_review` |
| `confidence` | numeric | 0-1 confidence score |
| `reasoning` | text | Full agent reasoning in markdown |
| `concerns` | jsonb | Array of `{concern, severity, guideline_ref}` |
| `missing_data` | jsonb | Array of fields the agent couldn't evaluate |
| `model_used` | text | AI model identifier |
| `guidelines_snapshot` | jsonb | Snapshot of guidelines used (audit trail) |
| `created_at` | timestamptz | When screening was run |

RLS: Admin-only read/write.

---

## Edge Function: `screen-donor`

This is the agentic core. It does not match rules mechanically -- it sends the entire donor profile and the full guidelines document to an LLM and asks it to reason like a clinical screening specialist.

### Agent System Prompt (key excerpt)

```text
You are a senior clinical screening specialist for LeMaitre Vascular's 
tissue donor program. You evaluate donor profiles against the organization's 
screening guidelines.

APPROACH:
- Read the full donor profile holistically, not field-by-field
- Consider how factors interact (age + cause of death + medical history together)
- Apply the screening guidelines as policy guidance, using clinical judgment
- Flag concerns even if no specific guideline addresses them
- If critical data is missing, you CANNOT accept -- mark as needs_review
- Be conservative: when uncertain, recommend needs_review
- Your evaluation is ADVISORY ONLY. A human makes the final decision.

OUTPUT:
Use the provided tool to return your structured evaluation.
```

### Tool-Call Schema

The agent returns structured output via tool calling:

```text
verdict: accept | reject | needs_review
confidence: 0.0 - 1.0
reasoning: Full markdown explanation of clinical thinking
concerns: [{concern, severity (low/medium/high/critical), guideline_ref}]
missing_data: [field names that were absent but needed]
```

### Flow

1. Fetch donor record with all fields
2. Fetch all active screening guidelines, ordered by sort_order
3. Compose the guidelines into a single policy document
4. Snapshot the guidelines for audit
5. Call Lovable AI (google/gemini-3-flash-preview) with tool calling
6. Parse the structured response
7. Save to `screening_results`
8. Return to frontend

---

## Admin UI: Screening Guidelines Page

**Route**: `/admin/screening-settings`

A page where admins manage their screening policy document. Not a rigid rules table -- more like editing a policy handbook.

### Layout
- Grouped by category tabs: Eligibility, Medical, Logistics, General
- Each guideline is a card with a title, rich text content area, and active toggle
- "Add Guideline" button opens a dialog with title, content (large textarea), category selector
- Edit inline or via dialog
- Drag to reorder (sort_order)
- Starter templates provided on first visit (e.g., "Donors under age 2 should be rejected", "Donors with active systemic infection should be rejected")

---

## Admin UI: AI Screening Panel (on Donor Review page)

**Component**: `AIScreeningPanel` -- embedded in `AdminDonorReview.tsx`

### States

1. **No screening run yet**: Shows "Run AI Screening" button
2. **Screening in progress**: Loading spinner with "Agent is evaluating..."
3. **Results displayed**:
   - Verdict badge (Accept = green, Reject = red, Needs Review = amber)
   - Confidence meter (visual bar)
   - Agent reasoning in markdown (expandable)
   - Concerns list with severity badges
   - Missing data warnings
   - "Re-run Screening" button
   - Timestamp and model info
   - Clear label: "AI Recommendation -- Final decision is yours"

### Interaction with Existing Review Actions

The AI panel sits **above** the manual review actions card. The admin reads the AI's reasoning, then uses the existing Approve/Reject/Under Review buttons to make their decision. The AI does not auto-approve anything.

---

## Navigation Updates

Add to admin nav items across all admin pages:

```text
{ label: 'Screening', href: '/admin/screening-settings', icon: <Shield /> }
```

Add route in App.tsx:

```text
/admin/screening-settings -> ScreeningSettings (admin protected)
```

---

## New Files Summary

| File | Purpose |
|------|---------|
| `supabase/functions/screen-donor/index.ts` | Agentic AI screening edge function |
| `src/pages/admin/ScreeningSettings.tsx` | Guidelines management page |
| `src/components/admin/AIScreeningPanel.tsx` | Screening results panel for donor review |

## Modified Files

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/admin/screening-settings` route |
| `src/pages/admin/AdminDonorReview.tsx` | Embed `AIScreeningPanel` |
| `src/pages/admin/AdminDonorsList.tsx` | Add Screening nav item |
| `src/pages/admin/AdminDonorForm.tsx` | Add Screening nav item |
| `src/pages/admin/AdminDashboard.tsx` | Add Screening nav item |
| `src/pages/admin/AdminNotifications.tsx` | Add Screening nav item |
| `src/pages/admin/PartnersList.tsx` | Add Screening nav item |
| `supabase/config.toml` | Add `screen-donor` function config |

## Implementation Sequence

1. Create `screening_guidelines` and `screening_results` tables with RLS
2. Create the `screen-donor` edge function with Lovable AI integration
3. Build `ScreeningSettings` admin page
4. Build `AIScreeningPanel` component
5. Integrate panel into `AdminDonorReview`
6. Add route and nav items
7. Deploy and test end-to-end

