

# Follow-Up Call: Donor Identification and Update Flow

## Problem

Currently, every phone call creates a brand new donor record. When a partner calls back to update an existing donor (e.g., add courier info, update medical history), the system has no way to link that call to the existing donor -- it just creates a duplicate.

## Identification Strategy

We'll use a **two-key match**: `partner_code` + `external_donor_id` (the partner's own donor number, Q23). This is the most natural identifier because:

- Partners always know their own donor ID
- Combined with the partner code, it's guaranteed unique
- The system `donor_code` (DN-XXXXXXXX) is auto-generated and partners may not remember it

As a fallback, we'll also try matching by `donor_code` if the caller provides it instead.

## Flow for Follow-Up Calls

```text
Caller dials in
  |
  v
Q1: "What type of call is this?"
  |
  +--> "initial screening" --> Full 25 questions --> CREATE new donor
  |
  +--> "prescreen update" / "courier update" / "update"
        |
        v
      "Do you have the donor ID or donor number?"
        |
        v
      "Which recovery group?" (partner code)
        |
        v
      Webhook receives transcript
        |
        v
      AI extracts: is_update=true, external_donor_id, partner_code
        |
        v
      Lookup donor by (partner_id + external_donor_id) OR donor_code
        |
        +--> FOUND + status is "draft" --> UPDATE donor fields (merge, don't overwrite nulls)
        |
        +--> FOUND + status is NOT "draft" --> CREATE new donor, flag as linked update
        |
        +--> NOT FOUND --> CREATE new donor (treat as new screening)
```

## Changes Required

### 1. Update AI Agent Prompt (setup-retell)

Modify the conversational flow so the agent:
- When Q1 answer is "update" / "prescreen update" / "courier update", immediately asks for the donor ID (Q23) and partner code (Q3) first
- Then asks only the fields the caller wants to update (rather than all 25 questions again)
- At the end, confirms what was updated

### 2. Update AI Extraction Schema (retell-webhook)

Add a new extraction field:
- `is_update` (boolean) -- explicitly extracted: did the caller say this is an update to an existing donor?

### 3. Update Webhook Logic (retell-webhook)

Replace the current "always insert" logic with:

```
IF is_update AND (external_donor_id OR donor_code provided):
  1. Look up partner by partner_code
  2. Search donors table for match:
     - First try: partner_id + external_donor_id
     - Fallback: donor_code (if provided)
  3. IF match found AND status = 'draft':
     - MERGE extracted fields into existing record (only update non-null extracted values)
     - Save transcript linked to existing donor
     - Notify partner: "Donor XYZ updated from phone call"
  4. IF match found AND status != 'draft':
     - Cannot edit (already submitted/reviewed)
     - Create new donor record anyway, marked as linked
     - Notify partner: "Update received but donor already submitted. New record created."
  5. IF no match:
     - Create new donor (treat as initial screening)
     - Notify partner: "Donor ID not found. New record created."
ELSE:
  - Create new donor (current behavior)
```

### 4. Loopholes Blocked

| Loophole | How It's Blocked |
|----------|-----------------|
| Caller says "update" but gives no donor ID | System creates a new donor and notifies the partner |
| Caller gives wrong partner code | Partner lookup fails, returns 404 -- no data leakage |
| Caller gives donor ID belonging to a different partner | Query filters by `partner_id`, so no cross-partner access |
| Donor already submitted/approved | System refuses to modify, creates a new linked record instead |
| Null fields in update overwriting real data | Merge logic only updates fields where extracted value is non-null |
| Duplicate external_donor_id within same partner | First match is used; uniqueness constraint added to DB |

### 5. Database Changes

- Add a **unique constraint** on `(partner_id, external_donor_id)` where `external_donor_id IS NOT NULL` to prevent duplicates
- Add a `linked_donor_id` column (uuid, nullable, FK to donors.id) for cases where an update call creates a new record because the original was already submitted

## Technical Details

### Files Modified

| File | Change |
|------|--------|
| **DB Migration** | Add unique partial index on `(partner_id, external_donor_id)`, add `linked_donor_id` column |
| `supabase/functions/setup-retell/index.ts` | Update agent prompt with update-aware conversational flow |
| `supabase/functions/retell-webhook/index.ts` | Add donor lookup + merge logic, add `is_update` extraction field |

### Implementation Sequence

1. Database migration (unique index + linked_donor_id column)
2. Update setup-retell prompt for update-aware flow
3. Rewrite retell-webhook with lookup/merge/create branching logic

