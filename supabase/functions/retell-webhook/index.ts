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

    // Build transcript text
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

    // Use Lovable AI to extract all 25 screening fields
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
                "You extract structured donor screening information from phone call transcripts between a tissue recovery partner and an AI intake agent. Extract all fields mentioned clearly. Use null for anything unclear or not mentioned.",
            },
            {
              role: "user",
              content: `Extract all donor screening information from this transcript. Map to the LeMaitre 25-question screening format:\n\n${transcriptText}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_donor_data",
                description:
                  "Extract all 25 screening fields from a tissue recovery intake call transcript.",
                parameters: {
                  type: "object",
                  properties: {
                    // Q1: Type of call
                    call_type: {
                      type: "string",
                      nullable: true,
                      description: "Type of call: initial screening, prescreen update, courier update, etc.",
                    },
                    // Q2: Caller's name
                    caller_name: {
                      type: "string",
                      nullable: true,
                      description: "Name of the person calling (not the donor).",
                    },
                    // Q3: Recovery group / partner code
                    partner_code: {
                      type: "string",
                      description: "The partner code/slug/PIN the caller identified themselves with.",
                    },
                    // Q4: Age
                    donor_age: {
                      type: "integer",
                      nullable: true,
                      description: "Donor's age at death.",
                    },
                    // Q5: Sex at birth
                    gender: {
                      type: "string",
                      nullable: true,
                      enum: ["male", "female"],
                      description: "Donor's sex at birth.",
                    },
                    // Q6: Date of death
                    death_date: {
                      type: "string",
                      nullable: true,
                      description: "Date of death in YYYY-MM-DD format.",
                    },
                    // Q7: Time of death
                    time_of_death: {
                      type: "string",
                      nullable: true,
                      description: "Time of death, e.g. '14:30' or '2:30 PM'.",
                    },
                    // Q8: Type of death
                    death_type: {
                      type: "string",
                      nullable: true,
                      description: "Type of death: cardiac, brain death, DCD, etc.",
                    },
                    // Q9: Time zone
                    death_timezone: {
                      type: "string",
                      nullable: true,
                      description: "Time zone: EST, CST, MST, PST, etc.",
                    },
                    // Q10: Cause of death
                    cause_of_death: {
                      type: "string",
                      nullable: true,
                      description: "Cause of death.",
                    },
                    // Q11: Clinical course
                    clinical_course: {
                      type: "string",
                      nullable: true,
                      description: "Clinical course narrative.",
                    },
                    // Q12: Height in inches
                    height_inches: {
                      type: "number",
                      nullable: true,
                      description: "Donor's height in inches.",
                    },
                    // Q13: Weight in kgs
                    weight_kgs: {
                      type: "number",
                      nullable: true,
                      description: "Donor's weight in kilograms.",
                    },
                    // Q14: Medical history
                    medical_history: {
                      type: "string",
                      nullable: true,
                      description: "Relevant medical history (free text).",
                    },
                    // Q15: High risk / additional notes
                    high_risk_notes: {
                      type: "string",
                      nullable: true,
                      description: "High-risk factors or additional relevant notes.",
                    },
                    // Q16: Donor accepted/deferred
                    donor_accepted: {
                      type: "string",
                      nullable: true,
                      description: "Whether donor is accepted, deferred, or notes about the decision.",
                    },
                    // Q17: Heart valves
                    hv_heart_valves: {
                      type: "boolean",
                      nullable: true,
                      description: "Are heart valves being recovered?",
                    },
                    // Q18: Heart valve pathology request
                    hv_pathology_request: {
                      type: "string",
                      nullable: true,
                      description: "Heart valve pathology request details.",
                    },
                    // Q19: Aorto Iliac
                    ai_aorto_iliac: {
                      type: "boolean",
                      nullable: true,
                      description: "Is Aorto Iliac being recovered?",
                    },
                    // Q20: Femoral En Bloc
                    fm_femoral: {
                      type: "boolean",
                      nullable: true,
                      description: "Is Femoral En Bloc being recovered?",
                    },
                    // Q21: Saphenous Vein
                    sv_saphenous_vein: {
                      type: "boolean",
                      nullable: true,
                      description: "Is Saphenous Vein being recovered?",
                    },
                    // Q22: Autopsy
                    has_autopsy: {
                      type: "boolean",
                      nullable: true,
                      description: "Is an autopsy being performed?",
                    },
                    // Q23: Donor ID / number
                    external_donor_id: {
                      type: "string",
                      nullable: true,
                      description: "The partner's own donor ID or donor number.",
                    },
                    // Q24: Prescreen / update
                    is_prescreen_update: {
                      type: "boolean",
                      nullable: true,
                      description: "Is this a prescreen or update on a pre-existing donor?",
                    },
                    // Q25: Courier update
                    courier_update: {
                      type: "string",
                      nullable: true,
                      description: "Courier/logistics updates or notes.",
                    },
                    // Legacy fields kept for backward compatibility
                    first_name: { type: "string", nullable: true },
                    last_name: { type: "string", nullable: true },
                    date_of_birth: {
                      type: "string",
                      nullable: true,
                      description: "YYYY-MM-DD format",
                    },
                    blood_type: {
                      type: "string",
                      nullable: true,
                      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"],
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

    // Create donor record with all 25 screening fields
    const donorFields: Record<string, unknown> = {
      partner_id: partner.id,
      status: "draft",
      intake_method: "phone",
      // Q1-Q3
      call_type: extracted.call_type || null,
      caller_name: extracted.caller_name || null,
      // Q4: Age
      donor_age: extracted.donor_age ?? null,
      // Q5: Sex at birth
      gender: extracted.gender || null,
      // Q6: Date of death
      death_date: extracted.death_date || null,
      // Q7: Time of death
      time_of_death: extracted.time_of_death || null,
      // Q8: Type of death
      death_type: extracted.death_type || null,
      // Q9: Time zone
      death_timezone: extracted.death_timezone || null,
      // Q10: Cause of death
      cause_of_death: extracted.cause_of_death || null,
      // Q11: Clinical course
      clinical_course: extracted.clinical_course || null,
      // Q12: Height
      height_inches: extracted.height_inches ?? null,
      // Q13: Weight
      weight_kgs: extracted.weight_kgs ?? null,
      // Q14: Medical history
      medical_history: extracted.medical_history || null,
      // Q15: High risk notes
      high_risk_notes: extracted.high_risk_notes || null,
      // Q16: Donor accepted/deferred
      donor_accepted: extracted.donor_accepted || null,
      // Q17: Heart valves
      hv_heart_valves: extracted.hv_heart_valves ?? null,
      // Q18: HV pathology request
      hv_pathology_request: extracted.hv_pathology_request || null,
      // Q19: Aorto Iliac
      ai_aorto_iliac: extracted.ai_aorto_iliac ?? null,
      // Q20: Femoral En Bloc
      fm_femoral: extracted.fm_femoral ?? null,
      // Q21: Saphenous Vein
      sv_saphenous_vein: extracted.sv_saphenous_vein ?? null,
      // Q22: Autopsy
      has_autopsy: extracted.has_autopsy ?? null,
      // Q23: External donor ID
      external_donor_id: extracted.external_donor_id || null,
      // Q24: Prescreen/update
      is_prescreen_update: extracted.is_prescreen_update ?? null,
      // Q25: Courier update
      courier_update: extracted.courier_update || null,
      // Legacy fields
      first_name: extracted.first_name || null,
      last_name: extracted.last_name || null,
      date_of_birth: extracted.date_of_birth || null,
      blood_type: extracted.blood_type || null,
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
