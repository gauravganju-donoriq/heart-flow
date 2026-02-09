import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RETELL_API_KEY = Deno.env.get("RETELL_API_KEY");
    if (!RETELL_API_KEY) {
      return new Response(
        JSON.stringify({ phone_number: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const retellHeaders = {
      Authorization: `Bearer ${RETELL_API_KEY}`,
      "Content-Type": "application/json",
    };

    // Find HeartStream agent
    const agentsRes = await fetch("https://api.retellai.com/list-agents", {
      method: "GET",
      headers: retellHeaders,
    });

    if (!agentsRes.ok) {
      throw new Error("Failed to list agents");
    }

    const agents = await agentsRes.json();
    const agent = agents.find(
      (a: { agent_name: string }) => a.agent_name === "HeartStream Donor Intake"
    );

    if (!agent) {
      return new Response(
        JSON.stringify({ phone_number: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get phone number for agent
    const phonesRes = await fetch("https://api.retellai.com/list-phone-numbers", {
      method: "GET",
      headers: retellHeaders,
    });

    if (!phonesRes.ok) {
      throw new Error("Failed to list phone numbers");
    }

    const phones = await phonesRes.json();
    const match = phones.find(
      (p: { inbound_agent_id: string }) => p.inbound_agent_id === agent.agent_id
    );

    return new Response(
      JSON.stringify({ phone_number: match?.phone_number || null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ phone_number: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
