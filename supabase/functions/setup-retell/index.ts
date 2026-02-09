import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RETELL_BASE = "https://api.retellai.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check - only admins
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Check admin role
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RETELL_API_KEY = Deno.env.get("RETELL_API_KEY");
    if (!RETELL_API_KEY) {
      throw new Error("RETELL_API_KEY is not configured");
    }

    const body = await req.json();
    const { action } = body;

    const retellHeaders = {
      Authorization: `Bearer ${RETELL_API_KEY}`,
      "Content-Type": "application/json",
    };

    // Build the webhook URL
    const webhookUrl = `${supabaseUrl}/functions/v1/retell-webhook`;

    // Shared prompt and agent settings
    const SHORTENED_PROMPT = `## Identity
You are a professional tissue recovery intake agent for LeMaitre Vascular. You collect donor screening information from tissue recovery partners over the phone.

## Style Guardrails
- Be concise and professional. One question at a time.
- Always confirm each answer before moving on: repeat back what you heard.
- If the caller is unsure, note "unknown" and move on.
- Use short, clear sentences. Avoid medical jargon unless the caller uses it first.
- Never rush the caller. Wait for complete answers.

## Task — Initial Screening
Ask these 5 questions in order, one at a time:

1. "What type of call is this — initial screening or an update to an existing donor?"
2. "May I have your name, please?"
3. "Which recovery group are you calling from? I'll need your partner code or organization name."
4. "What is the donor's age?"
5. "What was the donor's sex at birth — male or female?"

After all 5 questions, summarize:
"Let me confirm what I have: [repeat all answers]. Is that correct?"
Then say: "Thank you, I've recorded this information. Goodbye."

## Task — Update Call
If the caller says this is an update:
1. "Do you have the donor ID or donor number?"
2. "What information would you like to update?"
3. Collect only the specific fields they mention.
4. Summarize changes and confirm before ending.

## Rules
- Always collect the partner code/organization name — it is required for every call.
- If the caller cannot provide a donor ID for an update, let them know a new record will be created.
- Do not ask questions beyond the 5 listed for initial screening.
- If the caller volunteers extra information, acknowledge it and note it, but do not prompt for more.`;

    const AGENT_SETTINGS = {
      voice_temperature: 0.5,
      voice_speed: 0.9,
      responsiveness: 0.8,
      interruption_sensitivity: 0.6,
      enable_backchannel: true,
      backchannel_frequency: 0.8,
      backchannel_words: ["yeah", "I see", "okay", "got it", "mhmm"],
      ambient_sound: "office",
      ambient_sound_volume: 0.3,
      boosted_keywords: [
        "LeMaitre", "aorto iliac", "saphenous vein", "femoral", "heart valves",
        "cardiac death", "brain death", "DCD", "prescreen", "autopsy",
        "pathology", "donor", "tissue recovery", "clinical course", "deferred",
      ],
      enable_voicemail_detection: true,
    };

    const BEGIN_MESSAGE =
      "Hello, this is the LeMaitre Vascular tissue recovery intake line. I'll help you record donor screening information. First, what type of call is this — initial screening or an update to an existing donor?";

    if (action === "update") {
      // Find existing agent
      const agentsRes = await fetch(`${RETELL_BASE}/list-agents`, {
        method: "GET",
        headers: retellHeaders,
      });
      if (!agentsRes.ok) throw new Error(`Failed to list agents: ${agentsRes.status}`);

      const agents = await agentsRes.json();
      const agent = agents.find(
        (a: { agent_name: string }) => a.agent_name === "HeartStream Donor Intake"
      );
      if (!agent) throw new Error("Agent 'HeartStream Donor Intake' not found. Run setup first.");

      const llmId = agent.response_engine?.llm_id;
      if (!llmId) throw new Error("Could not find LLM ID on existing agent.");

      // PATCH LLM with new prompt
      const llmPatch = await fetch(`${RETELL_BASE}/update-retell-llm/${llmId}`, {
        method: "PATCH",
        headers: retellHeaders,
        body: JSON.stringify({
          begin_message: BEGIN_MESSAGE,
          general_prompt: SHORTENED_PROMPT,
        }),
      });
      if (!llmPatch.ok) {
        const err = await llmPatch.text();
        throw new Error(`Failed to update LLM: ${llmPatch.status} ${err}`);
      }

      // PATCH agent with optimized settings
      const agentPatch = await fetch(`${RETELL_BASE}/update-agent/${agent.agent_id}`, {
        method: "PATCH",
        headers: retellHeaders,
        body: JSON.stringify(AGENT_SETTINGS),
      });
      if (!agentPatch.ok) {
        const err = await agentPatch.text();
        throw new Error(`Failed to update agent: ${agentPatch.status} ${err}`);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Agent and LLM updated successfully." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "setup") {
      // Step 1: Create LLM
      const llmRes = await fetch(`${RETELL_BASE}/create-retell-llm`, {
        method: "POST",
        headers: retellHeaders,
        body: JSON.stringify({
          begin_message: BEGIN_MESSAGE,
          general_prompt: SHORTENED_PROMPT,
        }),
      });

      if (!llmRes.ok) {
        const err = await llmRes.text();
        console.error("Create LLM failed:", llmRes.status, err);
        throw new Error(`Failed to create LLM: ${llmRes.status}`);
      }

      const llmData = await llmRes.json();
      console.log("Created LLM:", llmData.llm_id);

      // Step 2: Create Agent
      const agentRes = await fetch(`${RETELL_BASE}/create-agent`, {
        method: "POST",
        headers: retellHeaders,
        body: JSON.stringify({
          response_engine: {
            type: "retell-llm",
            llm_id: llmData.llm_id,
          },
          voice_id: "11labs-Adrian",
          agent_name: "HeartStream Donor Intake",
          webhook_url: webhookUrl,
          language: "en-US",
          ...AGENT_SETTINGS,
        }),
      });

      if (!agentRes.ok) {
        const err = await agentRes.text();
        console.error("Create agent failed:", agentRes.status, err);
        throw new Error(`Failed to create agent: ${agentRes.status}`);
      }

      const agentData = await agentRes.json();
      console.log("Created agent:", agentData.agent_id);

      // Step 3: Buy phone number
      const phoneRes = await fetch(`${RETELL_BASE}/create-phone-number`, {
        method: "POST",
        headers: retellHeaders,
        body: JSON.stringify({
          inbound_agent_id: agentData.agent_id,
          nickname: "HeartStream Intake Line",
        }),
      });

      if (!phoneRes.ok) {
        const err = await phoneRes.text();
        console.error("Create phone number failed:", phoneRes.status, err);
        throw new Error(`Failed to buy phone number: ${phoneRes.status}`);
      }

      const phoneData = await phoneRes.json();
      console.log("Phone number:", phoneData.phone_number);

      return new Response(
        JSON.stringify({
          success: true,
          llm_id: llmData.llm_id,
          agent_id: agentData.agent_id,
          phone_number: phoneData.phone_number,
          webhook_url: webhookUrl,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "status") {
      // List agents to check if setup has been done
      const agentsRes = await fetch(`${RETELL_BASE}/list-agents`, {
        method: "GET",
        headers: retellHeaders,
      });

      if (!agentsRes.ok) {
        const err = await agentsRes.text();
        throw new Error(`Failed to list agents: ${agentsRes.status} ${err}`);
      }

      const agents = await agentsRes.json();
      const heartStreamAgent = agents.find(
        (a: { agent_name: string }) =>
          a.agent_name === "HeartStream Donor Intake"
      );

      if (!heartStreamAgent) {
        return new Response(
          JSON.stringify({ configured: false }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Get phone numbers for this agent
      const phonesRes = await fetch(`${RETELL_BASE}/list-phone-numbers`, {
        method: "GET",
        headers: retellHeaders,
      });

      let phoneNumber = null;
      if (phonesRes.ok) {
        const phones = await phonesRes.json();
        const match = phones.find(
          (p: { inbound_agent_id: string }) =>
            p.inbound_agent_id === heartStreamAgent.agent_id
        );
        phoneNumber = match?.phone_number || null;
      }

      return new Response(
        JSON.stringify({
          configured: true,
          agent_id: heartStreamAgent.agent_id,
          phone_number: phoneNumber,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'setup', 'status', or 'update'." }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Setup error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
