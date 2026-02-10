

## Improve Sarah's Conversational Prompt and Pacing

### Problems Identified

1. **Too fast** -- `voice_speed` is set to 1.1x, making Sarah sound rushed for a clinical context where clarity matters.
2. **Repetition risk** -- The prompt doesn't explicitly instruct against repeating confirmations or thanking the caller multiple times.
3. **Comfort and warmth** -- The prompt is brisk but lacks explicit guidance on making callers feel at ease and building rapport.
4. **Grammar and clarity** -- No explicit instruction about speaking in complete, well-formed sentences with natural pauses.

### Changes

#### 1. Slow Down Voice Speed

Change `voice_speed` from `1.1` to `0.95` for a measured, clear clinical pace. Also reduce `responsiveness` from `1.0` to `0.8` so Sarah doesn't jump in too quickly after the caller finishes speaking.

#### 2. Enhance the Prompt

Add new sections to the system prompt:

- **Pacing and Clarity** -- Speak in complete sentences. Use periods. Pause between thoughts. Never rush through information.
- **No Repetition** -- Do not repeat the same acknowledgment or thank-you phrase. Vary your responses naturally. Once you have confirmed a piece of information, move on.
- **Caller Comfort** -- At the start of the call, set a calm tone. If there is silence, wait patiently. Let the caller lead the pace. Use gentle transitions like "Alright," "Great," or "And" to connect questions naturally.
- **Grammar** -- Always use proper grammar and complete sentences. Avoid sentence fragments or trailing off.

#### 3. Updated Prompt (key additions)

Add these guidelines to the Voice and Tone section:

```text
## Pacing and Clarity
- Speak at a measured, unhurried pace. This is a clinical call, not a customer service line.
- Use complete sentences with proper grammar. Every sentence ends with a period.
- Pause naturally between thoughts. Do not chain multiple questions together.
- Say one thing, then wait for a response.

## Conversational Comfort
- Make the caller feel welcome and unhurried. You are a trusted colleague, not a gatekeeper.
- Use warm, varied transitions: "Alright." "Great, thank you." "Got it." "Perfect."
- Never repeat the same phrase twice in a row. If you just said "thank you," use a different acknowledgment next.
- If the caller pauses or seems to be thinking, wait quietly. Do not fill silence with chatter.
- Do not re-summarize information you have already confirmed.
```

Remove the line "Be brisk and professional" from Critical Rules and replace with "Be clear, professional, and unhurried."

### Technical Details

**File:** `supabase/functions/setup-retell/index.ts`

Voice settings changes:
- `voice_speed`: 1.1 to 0.95
- `responsiveness`: 1.0 to 0.8
- `voice_temperature`: 0.3 to 0.4 (slightly warmer, more natural variation)

Prompt changes:
- Add "Pacing and Clarity" section
- Add "Conversational Comfort" section  
- Replace "Be brisk and professional" with "Be clear, professional, and unhurried"
- Remove redundant confirmation language that could cause repetition

After updating the code, redeploy `setup-retell` and trigger the "Update Agent Settings" button to push changes to the live Retell agent.
