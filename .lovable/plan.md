

# Test the AI Screening System End-to-End

## Overview

Clear all existing donor data, insert 5 realistic test cases (3 eligible, 2 non-eligible), run the AI screening agent on each, and verify the results match expectations.

---

## Step 1: Clear Existing Data

Delete all related records first (to avoid foreign key issues), then delete all donors:

- 3 screening results
- 4 donors (Jon Doe, Sara Ann, Michael, and one unnamed draft)
- No documents, shipments, or tissue recoveries to worry about

---

## Step 2: Insert 5 Realistic Donor Cases

All donors will be linked to the existing partner **DonorIQ** and set to `submitted` status with fully populated fields.

### 3 Eligible Cases (should get "accept")

| # | Name | Age | Gender | Cause of Death | Medical History | Why Eligible |
|---|------|-----|--------|----------------|-----------------|--------------|
| 1 | **Robert Williams** | 58 | Male | Acute myocardial infarction | Hypertension controlled with medication. No cancer, no infectious disease. Non-smoker. | Clean medical history, common cardiac death, consent obtained, all data complete |
| 2 | **Margaret Chen** | 45 | Female | Motor vehicle accident (blunt force trauma) | No significant medical history. No medications. Annual physical normal. | Traumatic death (low disease risk), young, no medical issues, fully documented |
| 3 | **James Patterson** | 67 | Male | Ischemic stroke | Type 2 diabetes managed with metformin. Mild osteoarthritis. No cancer, no infections. | Manageable chronic conditions, clear cause of death, complete data |

### 2 Non-Eligible Cases (should get "reject" or "needs_review")

| # | Name | Age | Gender | Cause of Death | Medical History | Why Non-Eligible |
|---|------|-----|--------|----------------|-----------------|------------------|
| 4 | **David Morrison** | 52 | Male | Liver failure secondary to Hepatitis C | Chronic Hepatitis C diagnosed 2019. IV drug use history 2015-2018. | Active Hepatitis C (infectious disease exclusion) + IV drug use (high-risk behavior) |
| 5 | **Patricia Gomez** | 71 | Female | Unknown -- found deceased at home | No medical records available. No next of kin located. No consent obtained. | Unknown cause of death + no medical history + no consent + multiple missing critical fields |

---

## Step 3: Run AI Screening on All 5

Call the `screen-donor` edge function for each donor and collect results.

---

## Step 4: Verify Results

Check `screening_results` table to confirm:
- Cases 1-3 received **"accept"** (or at minimum "needs_review" with high confidence)
- Case 4 received **"reject"** (Hepatitis C + IV drug use)
- Case 5 received **"reject"** or **"needs_review"** (too much missing data, no consent, unknown COD)

---

## Technical Details

- All data operations use the service role via SQL insert tool (since RLS restricts normal inserts)
- AI screening calls go through the deployed `screen-donor` edge function using the current admin session
- Results are verified by querying `screening_results` and checking verdict + concerns
