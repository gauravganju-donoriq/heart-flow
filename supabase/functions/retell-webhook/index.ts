import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-retell-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RETELL_API_KEY = Deno.env.get("RETELL_API_KEY");
    if (!RETELL_API_KEY) {
      throw new Error("RETELL_API_KEY is not configured");
    }

    // Verify x-retell-signature
    const signature = req.headers.get("x-retell-signature");
    if (!signature || signature !== RETELL_API_KEY) {
      console.error("Invalid retell signature");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const { event, call } = payload;

    // Only process call_ended events
    if (event !== "call_ended") {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Processing call_ended event:", call.call_id);

    // Build transcript text from transcript_object or use transcript string
    let transcriptText = call.transcript || "";
    if (call.transcript_object && Array.isArray(call.transcript_object)) {
      transcriptText = call.transcript_object
        .map((u: { role: string; content: string }) => `${u.role}: ${u.content}`)
        .join("\n");
    }

    if (!transcriptText) {
      console.error("No transcript found in call data");
      return new Response(JSON.stringify({ error: "No transcript" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Lovable AI to extract donor data and partner code
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "You extract structured donor information from phone call transcripts between a tissue recovery partner and an AI agent. Extract all fields mentioned clearly. Use null for anything unclear or not mentioned.",
            },
            {
              role: "user",
              content: `Extract donor information and the partner code from this transcript:\n\n${transcriptText}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_donor_data",
                description:
                  "Extract structured donor data and partner identifier from a call transcript.",
                parameters: {
                  type: "object",
                  properties: {
                    partner_code: {
                      type: "string",
                      description:
                        "The partner code/slug/PIN the caller identified themselves with.",
                    },
                    first_name: { type: "string", nullable: true },
                    last_name: { type: "string", nullable: true },
                    date_of_birth: {
                      type: "string",
                      nullable: true,
                      description: "YYYY-MM-DD format",
                    },
                    gender: {
                      type: "string",
                      nullable: true,
                      enum: ["male", "female", "other"],
                    },
                    blood_type: {
                      type: "string",
                      nullable: true,
                      enum: [
                        "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown",
                      ],
                    },
                    cause_of_death: { type: "string", nullable: true },
                    death_date: {
                      type: "string",
                      nullable: true,
                      description: "YYYY-MM-DD format",
                    },
                    tissue_type: {
                      type: "string",
                      nullable: true,
                      enum: ["vascular", "cardiac", "other"],
                    },
                    tissue_condition: {
                      type: "string",
                      nullable: true,
                      enum: ["excellent", "good", "fair", "poor"],
                    },
                  },
                  required: ["partner_code"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "extract_donor_data" },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error(`AI extraction failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("AI did not return tool call");
    }

    const extracted = JSON.parse(toolCall.function.arguments);
    console.log("Extracted data:", JSON.stringify(extracted));

    // Look up partner by slug
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: partner, error: partnerError } = await supabase
      .from("partners")
      .select("id, user_id")
      .eq("slug", extracted.partner_code?.toLowerCase())
      .eq("is_active", true)
      .single();

    if (partnerError || !partner) {
      console.error("Partner not found for code:", extracted.partner_code);
      return new Response(
        JSON.stringify({ error: "Partner not found", code: extracted.partner_code }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create donor record
    const donorFields: Record<string, unknown> = {
      partner_id: partner.id,
      status: "draft",
      intake_method: "phone",
      first_name: extracted.first_name || null,
      last_name: extracted.last_name || null,
      date_of_birth: extracted.date_of_birth || null,
      gender: extracted.gender || null,
      blood_type: extracted.blood_type || null,
      cause_of_death: extracted.cause_of_death || null,
      death_date: extracted.death_date || null,
      tissue_type: extracted.tissue_type || null,
      tissue_condition: extracted.tissue_condition || null,
    };

    const { data: donor, error: donorError } = await supabase
      .from("donors")
      .insert(donorFields)
      .select("id, donor_code")
      .single();

    if (donorError) {
      console.error("Failed to create donor:", donorError);
      throw new Error(`Donor creation failed: ${donorError.message}`);
    }

    // Save transcript
    const callDuration =
      call.start_timestamp && call.end_timestamp
        ? Math.round((call.end_timestamp - call.start_timestamp) / 1000)
        : null;

    const { error: transcriptError } = await supabase
      .from("call_transcripts")
      .insert({
        donor_id: donor.id,
        partner_id: partner.id,
        retell_call_id: call.call_id,
        transcript: transcriptText,
        call_duration_seconds: callDuration,
        caller_phone: call.from_number || null,
        extracted_data: extracted,
      });

    if (transcriptError) {
      console.error("Failed to save transcript:", transcriptError);
    }

    // Send notification to partner
    await supabase.from("notifications").insert({
      user_id: partner.user_id,
      title: "New Donor from Phone Call",
      message: `A new donor (${donor.donor_code}) was created from a phone call. Please review the details.`,
      donor_id: donor.id,
    });

    console.log("Successfully created donor:", donor.id);

    return new Response(
      JSON.stringify({ success: true, donor_id: donor.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
