

## Add Web-Based Test Call to Admin Settings

### How Retell Web Calls Work

Retell provides a **Web Call API** and a **client-side JS SDK** (`retell-client-js-sdk`) that lets you talk to your agent directly from the browser using WebRTC -- no phone call needed. The flow is:

1. **Backend** calls `POST https://api.retellai.com/v2/create-web-call` with the `agent_id` to get an `access_token`
2. **Frontend** uses `retell-client-js-sdk` to start a WebRTC conversation with that token
3. The call goes through the same agent, same prompt, same webhook -- identical to a phone call

This means you can test the full Sarah persona, transcript extraction, and donor creation flow without spending phone minutes.

### Implementation

#### 1. New Edge Function: `create-web-call`

A small edge function that:
- Authenticates the caller as an admin (same pattern as `setup-retell`)
- Looks up the existing agent ID (same "HeartStream Donor Intake" lookup)
- Calls the Retell `create-web-call` API with that agent ID
- Returns the `access_token` to the frontend

#### 2. Install `retell-client-js-sdk`

Add the npm package which provides the `RetellWebClient` class for browser-based WebRTC calls.

#### 3. New Component: `RetellTestCall.tsx`

A card component on the Admin Settings page (below the existing RetellSetup card) that:
- Only shows when the agent is configured
- Has a "Start Test Call" button
- Requests microphone permission
- Calls the `create-web-call` edge function to get an access token
- Uses `RetellWebClient` to start a WebRTC conversation
- Shows real-time status (connecting, connected, agent speaking/listening)
- Has an "End Call" button to stop the session
- Displays a simple transcript of the conversation as it happens (using SDK events)

#### 4. Update Admin Settings Page

Add the `RetellTestCall` component below `RetellSetup` on the settings page, passing the agent status so it only renders when configured.

### Technical Details

**Edge Function (`supabase/functions/create-web-call/index.ts`):**
```text
POST /v2/create-web-call
Headers: Authorization: Bearer RETELL_API_KEY
Body: { "agent_id": "<agent_id>" }
Response: { "access_token": "...", "call_id": "..." }
```

**Frontend SDK usage:**
```text
import { RetellWebClient } from "retell-client-js-sdk";

const client = new RetellWebClient();
await client.startCall({ accessToken: data.access_token });

// Events:
client.on("call_started", ...)
client.on("call_ended", ...)
client.on("agent_start_talking", ...)
client.on("agent_stop_talking", ...)
client.on("update", (update) => {
  // update.transcript gives real-time transcript
})
```

**UI layout of the test call card:**
- Microphone permission prompt (if not granted)
- "Start Test Call" button with mic icon
- During call: pulsing indicator, agent speaking/listening status, live transcript
- "End Call" button
- After call ends: summary showing call duration and a note that the webhook will process it like a real call

**Config:** Add `[functions.create-web-call]` with `verify_jwt = false` to `supabase/config.toml`.

### Cost Note

Web calls use the same per-minute pricing as phone calls (~$0.20/min with current settings) but do NOT incur the phone number telephony charge, so they're slightly cheaper for testing.

