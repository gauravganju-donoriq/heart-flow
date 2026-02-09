

# Shorten Test Questions + Optimize Retell AI Agent Quality

## Overview

Two changes: (1) reduce the agent's question set to just 5 questions for faster testing, and (2) apply Retell AI best practices for voice quality, transcription accuracy, and data extraction.

## Important Note

The Retell agent and LLM were already created via the setup flow. To apply these changes, the `setup-retell` function needs to **update the existing agent and LLM** rather than creating new ones. We will add an `"update"` action to the function.

---

## Part 1: Shortened 5-Question Test Prompt

The new prompt will ask only these 5 questions for initial screening:

1. "What type of call is this?" (initial screening vs update)
2. "May I have your name?" (caller name)
3. "Which recovery group are you calling from?" (partner code)
4. "What is the donor's age?"
5. "What was the donor's sex at birth?" (male/female)

The update flow stays the same (ask for donor ID, then collect updates).

---

## Part 2: Retell AI Best Practices Applied

Based on Retell's documentation, these optimizations will be applied:

### Agent-Level Settings (create-agent API)

| Parameter | Value | Why |
|-----------|-------|-----|
| `voice_temperature` | `0.5` | More stable, consistent voice (default 1 is too variable for medical intake) |
| `voice_speed` | `0.9` | Slightly slower for clarity when collecting medical data |
| `responsiveness` | `0.8` | Adds ~0.1s wait time, reduces cutting off callers mid-sentence |
| `interruption_sensitivity` | `0.6` | Lower sensitivity to prevent background noise from interrupting the agent |
| `enable_backchannel` | `true` | Natural "uh-huh", "I see" during caller speech |
| `backchannel_frequency` | `0.8` | Frequent enough to feel natural |
| `backchannel_words` | `["yeah", "I see", "okay", "got it", "mhmm"]` | Professional acknowledgment words |
| `ambient_sound` | `"office"` | Professional office environment sound |
| `ambient_sound_volume` | `0.3` | Subtle background, not distracting |
| `boosted_keywords` | Medical/domain terms | Improves transcription accuracy for specialized vocabulary |
| `enable_voicemail_detection` | `true` | Avoid wasting time on voicemail |

### Boosted Keywords (improves ASR accuracy)

```
["LeMaitre", "aorto iliac", "saphenous vein", "femoral", "heart valves", 
 "cardiac death", "brain death", "DCD", "prescreen", "autopsy", 
 "pathology", "donor", "tissue recovery", "clinical course", "deferred"]
```

### Prompt Structure (Retell best practice: sectional prompts with XML-like headers)

Restructure the prompt using Retell's recommended format with clear sections:
- **Identity**: Who the agent is
- **Style Guardrails**: Concise, professional, confirm details
- **Task**: The 5 questions in order
- **Rules**: Edge cases and important behaviors

---

## Technical Details

### Files Modified

| File | Change |
|------|--------|
| `supabase/functions/setup-retell/index.ts` | Add `"update"` action that PATCHes the existing LLM prompt and agent settings. Restructure the prompt to 5 questions. Apply all agent-level optimizations. |

### How the Update Works

1. The `"update"` action will:
   - List existing agents to find "HeartStream Donor Intake"
   - Get the agent's `llm_id` from its response engine config
   - PATCH the LLM with the new shortened prompt via `PATCH /update-retell-llm/{llm_id}`
   - PATCH the agent with optimized voice/interaction settings via `PATCH /update-agent/{agent_id}`
2. The admin dashboard's RetellSetup component will get a new "Update Agent Settings" button that triggers this action

### Implementation Sequence

1. Add the `"update"` action to `setup-retell/index.ts` with the new 5-question prompt and all agent parameters
2. Add an "Update Settings" button to the `RetellSetup.tsx` component so the admin can trigger it
3. Deploy and test

