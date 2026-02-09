

# Phone-Based Donor Intake with Retell AI

## Overview

Add a phone call option for partners to submit donor information. Partners call a dedicated number, speak with a Retell AI voice agent that collects donor details conversationally, and the system saves the raw transcript plus AI-extracted structured data as a new donor record in draft status.

## How It Works

1. **Partner calls the Retell AI phone number** (configured in Retell dashboard)
2. **Retell AI agent** asks for donor details conversationally -- name, date of birth, gender, blood type, cause of death, tissue type, tissue condition, etc.
3. **When the call ends**, Retell sends a webhook to a backend function with the call transcript and metadata
4. The backend function uses **Lovable AI (Gemini)** to extract structured donor fields from the transcript
5. A new **draft donor record** is created in the database with the extracted data, linked to the partner
6. The **raw transcript is saved** alongside the donor record for reference
7. The partner (and admin) can see the call-created donor in their donors list, review the transcript, and edit/correct any fields before submitting

## Partner Identification

The Retell AI agent will ask the partner for a **partner code** (the partner's slug or a PIN) at the start of the call. The webhook handler will look up the partner by this code to link the donor to the correct partner.

## What Gets Built

### 1. Database Changes

**New table: `call_transcripts`**
- `id` (uuid, primary key)
- `donor_id` (uuid, FK to donors, nullable -- linked after donor is created)
- `partner_id` (uuid, FK to partners)
- `retell_call_id` (text, unique -- Retell's call identifier)
- `transcript` (text -- full conversation transcript)
- `call_duration_seconds` (integer, nullable)
- `caller_phone` (text, nullable)
- `extracted_data` (jsonb, nullable -- the raw AI-extracted fields before mapping)
- `created_at` (timestamptz)

**RLS Policies on `call_transcripts`:**
- Admins can view all transcripts
- Partners can view their own transcripts
- Insert via service role only (webhook handler)

**New column on `donors` table:**
- `intake_method` (text, nullable, default null) -- values: `'form'`, `'phone'`, or null for legacy records

### 2. Backend Function: `retell-webhook`

A public endpoint (no JWT required -- validated by Retell webhook secret) that:
- Receives the Retell `call_ended` webhook payload (contains transcript, call metadata)
- Extracts the partner identifier from the conversation
- Calls Lovable AI (Gemini) with the transcript + a structured extraction prompt to pull out donor fields (first_name, last_name, date_of_birth, gender, blood_type, cause_of_death, death_date, tissue_type, tissue_condition)
- Creates a donor record in `draft` status with `intake_method = 'phone'`
- Saves the transcript in `call_transcripts` linked to the new donor
- Sends a notification to the partner: "New donor created from phone call -- please review"

### 3. Frontend Changes

**Donor Detail / Review pages** (`AdminDonorReview.tsx`, `DonorDetail.tsx`):
- Show a "Phone Intake" badge when `intake_method = 'phone'`
- Display the call transcript in a collapsible section below the donor details

**Donors List** (`AdminDonorsList.tsx`, `DonorsList.tsx`):
- Show an icon or badge next to donors created via phone call

**New component: `CallTranscript.tsx`**
- Displays the transcript text in a readable format
- Shows call metadata (duration, caller phone, date)

### 4. Retell AI Configuration (Manual Setup by You)

You will need to configure the following in the Retell AI dashboard:
- Create an AI agent with a prompt that collects donor information conversationally
- Set up a phone number linked to the agent
- Configure the webhook URL pointing to your backend function
- Add a webhook secret for validation

### 5. Secrets Needed

- `RETELL_API_KEY` -- your Retell AI API key (for optional outbound calls or agent management later)
- `RETELL_WEBHOOK_SECRET` -- to validate incoming webhook signatures (if Retell supports it; otherwise IP-based or shared secret)

## Technical Details

### Retell Webhook Payload (call_ended event)

The webhook sends call data including the transcript as an array of utterances. The backend function will concatenate these into a full text transcript and pass it to Lovable AI.

### AI Extraction Prompt

The backend function will call Lovable AI with tool calling to extract structured data:

```text
Extract donor information from this phone call transcript.
Fields to extract: first_name, last_name, date_of_birth (YYYY-MM-DD),
gender (male/female/other), blood_type (A+/A-/B+/B-/AB+/AB-/O+/O-/unknown),
cause_of_death, death_date (YYYY-MM-DD), tissue_type (vascular/cardiac/other),
tissue_condition (excellent/good/fair/poor).
Only include fields that were clearly mentioned. Use null for anything unclear.
```

### File Changes Summary

| File | Change |
|------|--------|
| **New** `supabase/functions/retell-webhook/index.ts` | Webhook handler + AI extraction |
| **New** `src/components/CallTranscript.tsx` | Transcript display component |
| **Modify** `src/pages/admin/AdminDonorReview.tsx` | Show transcript + phone badge |
| **Modify** `src/pages/partner/DonorDetail.tsx` | Show transcript + phone badge |
| **Modify** `src/pages/admin/AdminDonorsList.tsx` | Phone intake indicator |
| **Modify** `src/pages/partner/DonorsList.tsx` | Phone intake indicator |
| **Modify** `supabase/config.toml` | Add retell-webhook function config |
| **DB Migration** | Add `call_transcripts` table + `intake_method` column on donors |

### Sequence of Implementation

1. Add the `RETELL_API_KEY` secret (will ask you to provide it)
2. Create the database migration (new table + column)
3. Build the `retell-webhook` edge function
4. Build the `CallTranscript` component
5. Update donor detail/review pages to show transcripts
6. Update donor list pages with phone intake indicators

