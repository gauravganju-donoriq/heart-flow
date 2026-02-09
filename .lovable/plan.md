

# Align Phone Intake with LeMaitre's 25 Screening Questions

## The Gap

The current `donors` table and forms only cover a fraction of LeMaitre's required screening questions. Here is the full mapping:

| # | Screening Question | Current DB Field | Status |
|---|-------------------|-----------------|--------|
| 1 | Type of Call | -- | MISSING |
| 2 | Caller's Name | -- (partner user) | MISSING (distinct from donor name) |
| 3 | Recovery Group | partner_id (via slug) | EXISTS |
| 4 | Age | -- (only DOB exists) | MISSING |
| 5 | Sex at Birth | gender | EXISTS |
| 6 | DOD - Date of Death | death_date | EXISTS (date only) |
| 7 | Time of Death | -- | MISSING |
| 8 | Type of Death | -- | MISSING |
| 9 | Time Zone | -- | MISSING |
| 10 | COD - Cause of Death | cause_of_death | EXISTS |
| 11 | Clinical Course | -- | MISSING |
| 12 | HT (Inches) | -- | MISSING |
| 13 | WT (Kgs) | -- | MISSING |
| 14 | Medical History | medical_history_reviewed (boolean only) | NEEDS EXPANSION |
| 15 | High Risk / Additional Notes | -- | MISSING |
| 16 | Donor Accepted/Deferred | -- | MISSING |
| 17 | HV - Heart Valves | -- | MISSING |
| 18 | Heart Valve Pathology Request | -- | MISSING |
| 19 | AI - Aorto Iliac | -- | MISSING |
| 20 | FM - Femoral En Bloc | -- | MISSING |
| 21 | SV - Saphenous Vein | -- | MISSING |
| 22 | Autopsy? | -- | MISSING |
| 23 | Donor ID / Donor Number | donor_code | EXISTS (auto-generated) |
| 24 | Prescreen / Update on pre-existing donor | -- | MISSING |
| 25 | Courier Update | -- | MISSING |

**17 fields are missing or incomplete.**

## What Changes

### 1. Database Migration -- Add New Columns to `donors`

Add the following columns to the `donors` table (all nullable text/boolean to stay flexible):

- `call_type` (text) -- e.g. "initial screening", "update", "prescreen"
- `caller_name` (text) -- name of the person calling (not the donor)
- `donor_age` (integer) -- age at death
- `time_of_death` (text) -- e.g. "14:30" or "2:30 PM"
- `death_type` (text) -- e.g. "cardiac", "brain death", "DCD"
- `death_timezone` (text) -- e.g. "EST", "CST", "PST"
- `clinical_course` (text) -- free text clinical narrative
- `height_inches` (numeric) -- height in inches
- `weight_kgs` (numeric) -- weight in kilograms
- `medical_history` (text) -- free text medical history (replaces boolean-only approach)
- `high_risk_notes` (text) -- high risk / additional / relevant notes
- `donor_accepted` (text) -- "accepted", "deferred", or notes
- `hv_heart_valves` (boolean) -- Heart Valves accepted?
- `hv_pathology_request` (text) -- pathology request details if heart accepted
- `ai_aorto_iliac` (boolean) -- Aorto Iliac accepted?
- `fm_femoral` (boolean) -- Femoral En Bloc accepted?
- `sv_saphenous_vein` (boolean) -- Saphenous Vein accepted?
- `has_autopsy` (boolean) -- is autopsy being performed?
- `external_donor_id` (text) -- the partner's own donor ID/number
- `is_prescreen_update` (boolean) -- is this a prescreen or update on existing donor?
- `courier_update` (text) -- courier/logistics notes

### 2. Update Retell AI Agent Prompt (setup-retell edge function)

Replace the current 10-question prompt with a comprehensive prompt that asks all 25 questions in order:

```
You are a professional tissue recovery intake agent for LeMaitre Vascular.
Your job is to collect initial screening information from tissue recovery
partners over the phone. Ask the following questions in order:

1. "What type of call is this?" (initial screening, prescreen update, etc.)
2. "May I have your name please?" (caller's name)
3. "Which recovery group are you calling from?" (their partner code)
4. "What is the donor's age?"
5. "What was the donor's sex at birth?"
6. "What is the date of death?"
7. "What was the time of death?"
8. "What type of death was this?" (cardiac, brain death, DCD, etc.)
9. "What time zone?"
10. "What was the cause of death?"
11. "Can you describe the clinical course?"
12. "What is the donor's height in inches?"
13. "What is the donor's weight in kilograms?"
14. "Any relevant medical history?"
15. "Are there any high-risk factors or additional relevant notes?"
16. "Is the donor accepted or deferred?"
[If accepted, ask about tissue types:]
17. "Are heart valves being recovered?"
18. [If yes] "Any heart valve pathology requests?"
19. "Is Aorto Iliac being recovered?"
20. "Is Femoral En Bloc being recovered?"
21. "Is Saphenous Vein being recovered?"
22. [If any tissue accepted] "Is this donor having any type of autopsy?"
23. "Do you have a donor ID or donor number?"
24. "Is this a prescreen or an update on a pre-existing donor?"
25. "Any courier updates?"
```

### 3. Update Webhook AI Extraction (retell-webhook edge function)

Update the tool-calling schema to extract all 25 fields from the transcript instead of the current 9 fields.

### 4. Update Donor Forms (AdminDonorForm.tsx and DonorForm.tsx)

Add new form sections:
- **Call Information**: call type, caller name, prescreen/update flag
- **Demographics**: add age, height, weight fields
- **Death Details**: add time of death, death type, time zone
- **Clinical**: clinical course, medical history (text), high risk notes
- **Tissue Recovery**: heart valves (+ pathology request), aorto iliac, femoral, saphenous vein, autopsy
- **Logistics**: external donor ID, donor accepted/deferred, courier update

### 5. Update Donor Review Pages

Show all new fields in `AdminDonorReview.tsx` and `DonorDetail.tsx`.

## Technical Details

### Files Modified

| File | Change |
|------|--------|
| **DB Migration** | Add 21 new columns to `donors` table |
| `supabase/functions/setup-retell/index.ts` | Update LLM prompt with all 25 questions |
| `supabase/functions/retell-webhook/index.ts` | Update AI extraction schema for all 25 fields |
| `src/pages/admin/AdminDonorForm.tsx` | Add all new form fields |
| `src/pages/partner/DonorForm.tsx` | Add all new form fields |
| `src/pages/admin/AdminDonorReview.tsx` | Display all new fields |
| `src/pages/partner/DonorDetail.tsx` | Display all new fields |

### Implementation Sequence

1. Run the database migration to add all 21 new columns
2. Update `setup-retell` edge function with the full 25-question agent prompt
3. Update `retell-webhook` edge function with complete extraction schema
4. Update both donor forms with new field sections
5. Update donor detail/review pages to display all fields

