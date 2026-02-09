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

    if (action === "setup") {
      // Step 1: Create LLM
      const llmRes = await fetch(`${RETELL_BASE}/create-retell-llm`, {
        method: "POST",
        headers: retellHeaders,
        body: JSON.stringify({
          begin_message:
            "Hello, this is the LeMaitre Vascular tissue recovery intake line. I'll help you record donor screening information. First, what type of call is this — initial screening, prescreen update, or something else?",
          general_prompt: `You are a professional tissue recovery intake agent for LeMaitre Vascular. Your job is to collect initial screening information from tissue recovery partners over the phone. Ask the following questions in order, one at a time. Be professional, empathetic, and patient. Confirm details as you go. If the caller is unsure about a field, note it and move on.

1. "What type of call is this?" (initial screening, prescreen update, courier update, etc.)
2. "May I have your name please?" (caller's name — not the donor)
3. "Which recovery group are you calling from?" (their partner code/slug)
4. "What is the donor's age?"
5. "What was the donor's sex at birth?" (male or female)
6. "What is the date of death?"
7. "What was the time of death?"
8. "What type of death was this?" (cardiac death, brain death, DCD, etc.)
9. "What time zone are you in?" (EST, CST, MST, PST, etc.)
10. "What was the cause of death?"
11. "Can you describe the clinical course?"
12. "What is the donor's height in inches?"
13. "What is the donor's weight in kilograms?"
14. "Any relevant medical history?"
15. "Are there any high-risk factors or additional relevant notes?"
16. "Is the donor accepted or deferred?"

If the donor is accepted, continue with tissue-specific questions:
17. "Are heart valves being recovered?" (yes/no)
18. If heart valves yes: "Any heart valve pathology requests?"
19. "Is Aorto Iliac being recovered?" (yes/no)
20. "Is Femoral En Bloc being recovered?" (yes/no)
21. "Is Saphenous Vein being recovered?" (yes/no)
22. If any tissue is accepted: "Is this donor having any type of autopsy?" (yes/no)

Then wrap up:
23. "Do you have a donor ID or donor number?"
24. "Is this a prescreen or an update on a pre-existing donor?"
25. "Any courier updates?"

Once all information is collected, summarize what you've recorded and confirm with the caller before ending the call.`,
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
      JSON.stringify({ error: "Invalid action. Use 'setup' or 'status'." }),
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
