

## Retell AI Voice Agent -- Parameter Audit and Optimization

### Current Configuration Audit

Here is a side-by-side comparison of every tunable parameter with its current value, what's wrong with it, and the recommended change.

---

### 1. Voice Selection

| Parameter | Current | Issue | Recommended |
|---|---|---|---|
| `voice_id` | `11labs-Adrian` | Adrian is a male, generic voice. You want a female nurse persona. | `11labs-Myra` or another warm, professional female voice from the Retell dashboard. Myra is a clear, calm American female voice well-suited for medical intake. |
| `voice_model` | Not set (defaults to basic) | Missing entirely -- defaults to the base ElevenLabs model. | `eleven_turbo_v2_5` -- best balance of quality and low latency (~250ms). Premium quality without the cost of multilingual v2. |

---

### 2. Voice and Speech Settings

| Parameter | Current | Issue | Recommended |
|---|---|---|---|
| `voice_speed` | `0.9` (slower than normal) | User wants faster speech. 0.9 is *below* default. | `1.1` -- slightly faster than natural, professional and brisk without sounding rushed. |
| `voice_temperature` | `0.5` | Moderate variance. For medical intake, consistency matters more. | `0.3` -- more stable, consistent delivery appropriate for clinical context. |
| `responsiveness` | `0.8` | Good but not optimal for fast exchanges with trained nurses/coordinators. | `1.0` -- maximum responsiveness. These callers are professionals, not elderly patients. They expect snappy exchanges. |
| `interruption_sensitivity` | `0.6` | Too sensitive -- agent gets cut off easily by background noise. | `0.5` -- slightly lower to avoid false interruptions in noisy hospital/morgue environments. |
| `enable_dynamic_voice_speed` | Not set | Missing. Could help with natural pacing. | `true` -- lets the agent speed up or slow down naturally based on context. |

---

### 3. Backchannel Settings

| Parameter | Current | Issue | Recommended |
|---|---|---|---|
| `enable_backchannel` | `true` | Good. | Keep `true`. |
| `backchannel_frequency` | `0.8` | Too frequent -- sounds like the agent is constantly saying "mhmm". | `0.5` -- more measured, professional. A nurse listens quietly and confirms when appropriate. |
| `backchannel_words` | `["yeah", "I see", "okay", "got it", "mhmm"]` | "yeah" is too casual for a medical professional. | `["okay", "got it", "mhmm", "understood", "noted"]` -- clinical and professional. |

---

### 4. Ambient Sound

| Parameter | Current | Issue | Recommended |
|---|---|---|---|
| `ambient_sound` | `"call-center"` | Sounds like a sales floor, not a medical office. | `"office"` -- quieter, more appropriate for a clinical intake line. |
| `ambient_sound_volume` | `0.3` | Fine for call-center but too loud for office. | `0.2` -- subtle background, not distracting. |

---

### 5. Prompt Rewrite

**Current issues with the prompt:**
- Opens with a numbered list ("Ask these 5 questions in order: 1. 2. 3...") -- robotic, not conversational
- Says "What type of call is this" as the first question -- callers already know why they're calling; the agent should infer from context
- "May I have your name, please?" is generic -- should establish clinical rapport
- No persona definition -- the agent has no bedside manner
- Lacks phonetic guidance for medical terms
- No graceful handling of emotional callers (tissue recovery involves death)

**Proposed rewrite -- key changes:**
- Establish a nurse persona ("You are Sarah, a tissue recovery intake nurse")
- Remove numbered question format; use natural conversational flow
- Add empathetic guardrails for sensitive topics
- Add pronunciation guide for medical terms using Retell's boosted_keywords and the prompt itself
- Make the opening greeting warmer and more direct
- Add explicit instruction to never spell out or list question numbers

---

### 6. Begin Message

| Current | Recommended |
|---|---|
| "Hello, this is the LeMaitre Vascular tissue recovery intake line. I'll help you record donor screening information. First, what type of call is this -- initial screening or an update to an existing donor?" | "Hi, this is Sarah at the LeMaitre tissue recovery intake line. How can I help you today?" |

**Why:** Shorter, warmer, lets the caller state their purpose naturally instead of forcing a multiple-choice question upfront.

---

### 7. Boosted Keywords

| Current | Recommended Addition |
|---|---|
| 15 keywords | Add: `"asystole"`, `"ventilator"`, `"extubation"`, `"hemodilution"`, `"serological"`, `"procurement"`, `"cross-clamp"`, `"ischemia"`, `"allograft"` |

These are terms commonly used by tissue recovery coordinators that the speech-to-text engine may struggle with.

---

### 8. LLM Model (not currently configurable via Retell-LLM API but noted)

Retell recommends GPT-4.1 for optimal balance. The current setup uses Retell's built-in LLM which defaults to their recommended model. No change needed here -- Retell handles LLM selection internally.

---

### Summary of All Changes

**File: `supabase/functions/setup-retell/index.ts`**

Changes to `AGENT_SETTINGS`:
- `voice_id`: `11labs-Adrian` to a female voice (e.g., `11labs-Myra`)
- Add `voice_model`: `eleven_turbo_v2_5`
- `voice_speed`: `0.9` to `1.1`
- `voice_temperature`: `0.5` to `0.3`
- `responsiveness`: `0.8` to `1.0`
- `interruption_sensitivity`: `0.6` to `0.5`
- Add `enable_dynamic_voice_speed`: `true`
- `backchannel_frequency`: `0.8` to `0.5`
- `backchannel_words`: remove "yeah", add "understood", "noted"
- `ambient_sound`: `call-center` to `office`
- `ambient_sound_volume`: `0.3` to `0.2`
- Expand `boosted_keywords` with additional medical terms

Changes to `SHORTENED_PROMPT`:
- Full rewrite with nurse persona, natural conversational flow, empathetic guardrails, no numbered lists

Changes to `BEGIN_MESSAGE`:
- Shorter, warmer greeting that lets the caller lead

After deploying, the "Update Agent Settings" button on the Admin Settings page will push these changes to the live Retell agent.

