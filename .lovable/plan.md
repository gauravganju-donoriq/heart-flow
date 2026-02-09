

# Smart Pre-Fill Across All Forms

## Overview

Maximize auto-population of the Plasma Dilution (7059F) and Recovery (7033F) forms using data already captured during the donor intake (the 25 screening questions). This reduces admin workload by eliminating redundant data entry.

## What Gets Pre-Filled

### Plasma Dilution (7059F) -- Current vs. Proposed

| Field | Currently | Proposed |
|-------|-----------|----------|
| DIN | Pre-filled | No change |
| Recovery Agency Donor # | Pre-filled | No change |
| Donor Weight (kg) | Pre-filled | No change |
| Sex at Birth | Pre-filled | No change |
| **Sample Date/Time** | Manual entry | **Auto-fill from death_date + time_of_death, default to Post Mortem** |
| **Death Type** | Manual entry | **Auto-fill from donor's death_type (Q8): map "Cardiac" to "asystole", "Neurological" to "cct"** |

### Recovery (7033F) -- Current vs. Proposed

| Field | Currently | Proposed |
|-------|-----------|----------|
| DIN | Pre-filled | No change |
| Recovery Agency | Pre-filled | No change |
| Donor Age, Gender, Death Date/Time/Type/Timezone | Pre-filled (read-only header) | No change |
| **LeMaitre Donor #** | Editable, blank by default | **Already pre-fills from DIN -- no change needed** |
| **Tissue rows** | Manual entry | **Auto-create rows based on Q17-Q21 answers** |

### Tissue Recovery Auto-Rows (New)

When opening the Recovery (7033F) form for the first time (no existing record), pre-populate tissue rows based on the donor's intake answers:

- If **HV Heart Valves (Q17)** is true: add a cardiac row for "Heart for Valves"
- If **AI Aorto Iliac (Q19)** is true: add a cardiac row for "Aortoiliac Artery"
- If **FM Femoral (Q20)** is true: add vascular rows for "RIGHT Femoral Vessels" and "LEFT Femoral Vessels"
- If **SV Saphenous Vein (Q21)** is true: add vascular rows for "RIGHT Saphenous Vein" and "LEFT Saphenous Vein"

The admin can still add/remove/edit rows -- these are just pre-populated defaults.

## Bug Fix

The last edit introduced a **duplicate "Logistics" tab** in the partner DonorDetail page (lines 128-129). This will be fixed by removing the duplicate.

## Technical Details

### Files Modified

**`src/components/PlasmaDilutionForm.tsx`**
- On initial load (no saved worksheet), auto-set `sample_type` to `'post_mortem'`
- Auto-set `sample_datetime` from `donorInfo.death_date` + `donorInfo.time_of_death` (combine into datetime-local value)
- Auto-set `death_type` by mapping donor's `death_type`: "Cardiac" maps to "asystole", "Neurological" maps to "cct", otherwise leave blank
- These pre-fills only apply when creating a new worksheet (not when loading an existing saved one)

**`src/components/TissueRecoveryForm.tsx`**
- Add `donorInfo` fields for tissue flags: `hv_heart_valves`, `ai_aorto_iliac`, `fm_femoral`, `sv_saphenous_vein`
- On initial load when no recovery record exists, auto-populate `tissues` array based on these flags
- Pre-populated rows will have empty timestamp and technician fields (to be filled by admin)

**`src/pages/admin/AdminDonorReview.tsx`**
- Pass additional donor fields (`hv_heart_valves`, `ai_aorto_iliac`, `fm_femoral`, `sv_saphenous_vein`) to `TissueRecoveryForm` via `donorInfo`

**`src/pages/partner/DonorDetail.tsx`**
- Remove duplicate "Logistics" tab trigger (line 128 or 129)

