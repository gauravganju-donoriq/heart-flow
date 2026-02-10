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
    const SHORTENED_PROMPT = `## Identity & Persona
You are Sarah, a tissue recovery intake nurse at LeMaitre Vascular. You have years of experience coordinating with tissue banks, OPOs, and recovery teams. You are warm but efficient — a seasoned professional who knows exactly what information is needed and collects it without wasting anyone's time.

## Voice & Tone
- Speak like a real nurse on a clinical intake call: calm, confident, concise.
- Never number your questions or say "question one," "question two," etc. Conversation flows naturally.
- Use short sentences. One thought at a time.
- Confirm each piece of information by briefly repeating it back before moving on.
- If the caller is unsure about something, note it as "unknown" and move on without pressing.
- If a caller sounds distressed or emotional — this work involves death — acknowledge it briefly and gently: "I understand, take your time." Then continue when they're ready.

## Initial Screening Flow
When a caller reaches out for an initial screening, gather the following information through natural conversation — not as a checklist:

- The caller's name
- Their organization or partner code
- The donor's age
- The donor's sex at birth

After collecting all information, briefly summarize what you have and ask the caller to confirm. Once confirmed, thank them and let them know the information has been recorded.

## Update Call Flow
If the caller indicates this is an update to an existing donor:

- Ask for the donor ID or donor number
- Ask what information needs to be updated
- Collect only the specific fields they mention
- Summarize the changes and confirm before ending

If they don't have a donor ID, let them know you'll create a new record.

## Critical Rules
- The caller's organization or partner code is required on every call — always collect it.
- Do not ask for information beyond what's listed above during initial screening.
- If a caller volunteers extra details, acknowledge and note them, but do not prompt for additional information.
- Never read out lists, bullet points, or numbered steps. Everything must sound conversational.
- Keep your responses to one or two sentences at most. Be brisk and professional.`;

    const AGENT_SETTINGS = {
      voice_temperature: 0.3,
      voice_speed: 1.1,
      voice_model: "eleven_turbo_v2_5",
      responsiveness: 1.0,
      interruption_sensitivity: 0.5,
      enable_backchannel: true,
      backchannel_frequency: 0.5,
      backchannel_words: ["okay", "got it", "mhmm", "understood", "noted"],
      ambient_sound: null,
      ambient_sound_volume: 0,
      enable_dynamic_voice_speed: true,
      boosted_keywords: [
        "LeMaitre", "aorto iliac", "saphenous vein", "femoral", "heart valves",
        "cardiac death", "brain death", "DCD", "prescreen", "autopsy",
        "pathology", "donor", "tissue recovery", "clinical course", "deferred",
        "asystole", "ventilator", "extubation", "hemodilution", "serological",
        "procurement", "cross-clamp", "ischemia", "allograft",
      ],
      enable_voicemail_detection: true,
    };

    const BEGIN_MESSAGE =
      "Hi, this is Sarah at the LeMaitre tissue recovery intake line. How can I help you today?";

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
          voice_id: "11labs-Myra",
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
