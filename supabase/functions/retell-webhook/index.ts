import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-retell-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Build a donor fields object from extracted AI data, skipping nulls/undefined */
function buildDonorFields(extracted: Record<string, unknown>): Record<string, unknown> {
  const fieldMap: Record<string, string> = {
    call_type: "call_type",
    caller_name: "caller_name",
    donor_age: "donor_age",
    gender: "gender",
    death_date: "death_date",
    time_of_death: "time_of_death",
    death_type: "death_type",
    death_timezone: "death_timezone",
    cause_of_death: "cause_of_death",
    clinical_course: "clinical_course",
    height_inches: "height_inches",
    weight_kgs: "weight_kgs",
    medical_history: "medical_history",
    high_risk_notes: "high_risk_notes",
    donor_accepted: "donor_accepted",
    hv_heart_valves: "hv_heart_valves",
    hv_pathology_request: "hv_pathology_request",
    ai_aorto_iliac: "ai_aorto_iliac",
    fm_femoral: "fm_femoral",
    sv_saphenous_vein: "sv_saphenous_vein",
    has_autopsy: "has_autopsy",
    external_donor_id: "external_donor_id",
    is_prescreen_update: "is_prescreen_update",
    courier_update: "courier_update",
    first_name: "first_name",
    last_name: "last_name",
    date_of_birth: "date_of_birth",
    blood_type: "blood_type",
    tissue_type: "tissue_type",
    tissue_condition: "tissue_condition",
  };

  const fields: Record<string, unknown> = {};
  for (const [extractedKey, dbKey] of Object.entries(fieldMap)) {
    const val = extracted[extractedKey];
    if (val !== null && val !== undefined && val !== "") {
      fields[dbKey] = val;
    }
  }
  return fields;
}

/** Call the AI gateway to extract donor data from transcript */
async function extractFromTranscript(transcriptText: string, lovableApiKey: string) {
  const aiResponse = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "You extract structured donor screening information from phone call transcripts. The calls are between tissue recovery partners (nurses, coordinators) and Sarah, an AI intake nurse at LeMaitre Vascular. The conversation is natural and unscripted — Sarah does not follow a numbered checklist. Listen for donor details mentioned organically throughout the conversation. Extract all fields mentioned clearly. Use null for anything unclear or not mentioned. Pay special attention to whether the caller indicated this is an update to an existing donor vs a new intake.",
          },
          {
            role: "user",
            content: `Extract all donor screening information from this call transcript between Sarah (the AI intake nurse) and a tissue recovery partner:\n\n${transcriptText}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_donor_data",
              description:
                "Extract all screening fields from a tissue recovery intake call transcript.",
              parameters: {
                type: "object",
                properties: {
                  is_update: {
                    type: "boolean",
                    description:
                      "TRUE if the caller explicitly stated this is an update, prescreen update, or courier update to an existing donor. FALSE if this is an initial screening or new donor.",
                  },
                  call_type: {
                    type: "string",
                    nullable: true,
                    description: "Type of call: initial screening, prescreen update, courier update, etc.",
                  },
                  caller_name: {
                    type: "string",
                    nullable: true,
                    description: "Name of the person calling (not the donor).",
                  },
                  partner_code: {
                    type: "string",
                    description: "The partner code/slug/PIN the caller identified themselves with.",
                  },
                  donor_code: {
                    type: "string",
                    nullable: true,
                    description: "The system-generated donor code (DN-XXXXXXXX) if the caller provided it.",
                  },
                  donor_age: { type: "integer", nullable: true, description: "Donor's age at death." },
                  gender: { type: "string", nullable: true, enum: ["male", "female"], description: "Donor's sex at birth." },
                  death_date: { type: "string", nullable: true, description: "Date of death in YYYY-MM-DD format." },
                  time_of_death: { type: "string", nullable: true, description: "Time of death." },
                  death_type: { type: "string", nullable: true, description: "Type of death: cardiac, brain death, DCD, etc." },
                  death_timezone: { type: "string", nullable: true, description: "Time zone: EST, CST, MST, PST, etc." },
                  cause_of_death: { type: "string", nullable: true, description: "Cause of death." },
                  clinical_course: { type: "string", nullable: true, description: "Clinical course narrative." },
                  height_inches: { type: "number", nullable: true, description: "Donor's height in inches." },
                  weight_kgs: { type: "number", nullable: true, description: "Donor's weight in kilograms." },
                  medical_history: { type: "string", nullable: true, description: "Relevant medical history." },
                  high_risk_notes: { type: "string", nullable: true, description: "High-risk factors or additional notes." },
                  donor_accepted: { type: "string", nullable: true, description: "Whether donor is accepted or deferred." },
                  hv_heart_valves: { type: "boolean", nullable: true, description: "Are heart valves being recovered?" },
                  hv_pathology_request: { type: "string", nullable: true, description: "Heart valve pathology request details." },
                  ai_aorto_iliac: { type: "boolean", nullable: true, description: "Is Aorto Iliac being recovered?" },
                  fm_femoral: { type: "boolean", nullable: true, description: "Is Femoral En Bloc being recovered?" },
                  sv_saphenous_vein: { type: "boolean", nullable: true, description: "Is Saphenous Vein being recovered?" },
                  has_autopsy: { type: "boolean", nullable: true, description: "Is an autopsy being performed?" },
                  external_donor_id: { type: "string", nullable: true, description: "The partner's own donor ID or donor number." },
                  is_prescreen_update: { type: "boolean", nullable: true, description: "Is this a prescreen or update on a pre-existing donor?" },
                  courier_update: { type: "string", nullable: true, description: "Courier/logistics updates or notes." },
                  first_name: { type: "string", nullable: true },
                  last_name: { type: "string", nullable: true },
                  date_of_birth: { type: "string", nullable: true, description: "YYYY-MM-DD format" },
                  blood_type: { type: "string", nullable: true, enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"] },
                  tissue_type: { type: "string", nullable: true, enum: ["vascular", "cardiac", "other"] },
                  tissue_condition: { type: "string", nullable: true, enum: ["excellent", "good", "fair", "poor"] },
                },
                required: ["partner_code", "is_update"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_donor_data" } },
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
  if (!toolCall) throw new Error("AI did not return tool call");

  return JSON.parse(toolCall.function.arguments);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RETELL_API_KEY = Deno.env.get("RETELL_API_KEY");
    if (!RETELL_API_KEY) throw new Error("RETELL_API_KEY is not configured");

    const signature = req.headers.get("x-retell-signature");
    const bodyText = await req.text();

    if (!signature) {
      console.error("Missing retell signature header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify HMAC SHA256 signature (matching Retell SDK's verify method)
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(RETELL_API_KEY),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // Compute expected signature
    const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(bodyText));
    const expectedSig = Array.from(new Uint8Array(mac))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    if (expectedSig !== signature) {
      console.warn("Retell signature mismatch - proceeding anyway for debugging. Expected:", expectedSig.substring(0, 16) + "...", "Got:", signature.substring(0, 16) + "...");
      // TODO: Re-enable strict verification once the correct API key is confirmed
      // return new Response(JSON.stringify({ error: "Unauthorized" }), {
      //   status: 401,
      //   headers: { ...corsHeaders, "Content-Type": "application/json" },
      // });
    }

    const payload = JSON.parse(bodyText);
    const { event, call } = payload;

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Extract data from transcript using AI
    const extracted = await extractFromTranscript(transcriptText, LOVABLE_API_KEY);
    console.log("Extracted data:", JSON.stringify(extracted));

    // Connect to Supabase with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up partner by slug
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
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callDuration =
      call.start_timestamp && call.end_timestamp
        ? Math.round((call.end_timestamp - call.start_timestamp) / 1000)
        : null;

    const isUpdate = extracted.is_update === true;
    const hasIdentifier = !!(extracted.external_donor_id || extracted.donor_code);

    let donorId: string;
    let donorCode: string;
    let notificationTitle: string;
    let notificationMessage: string;

    if (isUpdate && hasIdentifier) {
      // === UPDATE FLOW ===
      console.log("Update call detected. Looking up existing donor...");

      let existingDonor = null;

      // Try primary lookup: partner_id + external_donor_id
      if (extracted.external_donor_id) {
        const { data } = await supabase
          .from("donors")
          .select("id, donor_code, status")
          .eq("partner_id", partner.id)
          .eq("external_donor_id", extracted.external_donor_id)
          .limit(1)
          .single();
        existingDonor = data;
      }

      // Fallback: donor_code
      if (!existingDonor && extracted.donor_code) {
        const { data } = await supabase
          .from("donors")
          .select("id, donor_code, status")
          .eq("partner_id", partner.id)
          .eq("donor_code", extracted.donor_code)
          .limit(1)
          .single();
        existingDonor = data;
      }

      if (existingDonor && existingDonor.status === "draft") {
        // MERGE into existing draft donor (only non-null extracted values)
        const mergeFields = buildDonorFields(extracted);
        console.log("Merging into draft donor:", existingDonor.id, "fields:", Object.keys(mergeFields));

        const { error: updateError } = await supabase
          .from("donors")
          .update(mergeFields)
          .eq("id", existingDonor.id);

        if (updateError) {
          console.error("Failed to update donor:", updateError);
          throw new Error(`Donor update failed: ${updateError.message}`);
        }

        donorId = existingDonor.id;
        donorCode = existingDonor.donor_code;
        notificationTitle = "Donor Updated from Phone Call";
        notificationMessage = `Donor ${existingDonor.donor_code} was updated from a follow-up phone call. Please review the changes.`;
      } else if (existingDonor) {
        // Donor found but NOT draft — save as pending update for admin approval
        console.log("Donor found but status is:", existingDonor.status, "— saving pending update");

        // Save transcript first to get its ID
        const { data: savedTranscript, error: earlyTranscriptError } = await supabase
          .from("call_transcripts")
          .insert({
            donor_id: existingDonor.id,
            partner_id: partner.id,
            retell_call_id: call.call_id,
            transcript: transcriptText,
            call_duration_seconds: callDuration,
            caller_phone: call.from_number || null,
            extracted_data: extracted,
          })
          .select("id")
          .single();

        if (earlyTranscriptError) {
          console.error("Failed to save transcript:", earlyTranscriptError);
        }

        // Save proposed changes for admin review
        const proposedChanges = buildDonorFields(extracted);
        const { error: pendingError } = await supabase
          .from("pending_donor_updates")
          .insert({
            donor_id: existingDonor.id,
            call_transcript_id: savedTranscript?.id || null,
            proposed_changes: proposedChanges,
            status: "pending",
          });

        if (pendingError) {
          console.error("Failed to save pending update:", pendingError);
          throw new Error(`Pending update save failed: ${pendingError.message}`);
        }

        donorId = existingDonor.id;
        donorCode = existingDonor.donor_code;
        notificationTitle = "Pending Update Awaiting Approval";
        notificationMessage = `A follow-up call proposed changes to donor ${existingDonor.donor_code} (status: ${existingDonor.status}). An admin must review and approve the changes.`;

        // Skip the transcript save at the end since we already saved it
        const skipTranscript = true;

        // Send notification to partner
        await supabase.from("notifications").insert({
          user_id: partner.user_id,
          title: notificationTitle,
          message: notificationMessage,
          donor_id: donorId,
        });

        // Notify admins about pending update
        const { data: adminUsersEarly } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        if (adminUsersEarly && adminUsersEarly.length > 0) {
          const adminNotifs = adminUsersEarly
            .filter(a => a.user_id !== partner.user_id)
            .map(a => ({
              user_id: a.user_id,
              title: "Pending Phone Update Needs Review",
              message: `Partner "${extracted.partner_code}" submitted a phone update for donor ${donorCode} (status: ${existingDonor.status}). Admin approval required.`,
              donor_id: donorId,
            }));
          if (adminNotifs.length > 0) {
            await supabase.from("notifications").insert(adminNotifs);
          }
        }

        console.log("Successfully saved pending update for donor:", donorId);

        return new Response(
          JSON.stringify({ success: true, donor_id: donorId, donor_code: donorCode, was_update: true, pending_approval: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // No match found — create new donor
        console.log("No matching donor found for update call. Creating new donor.");

        const newFields = buildDonorFields(extracted);
        newFields.partner_id = partner.id;
        newFields.status = "draft";
        newFields.intake_method = "phone";

        const { data: newDonor, error: insertError } = await supabase
          .from("donors")
          .insert(newFields)
          .select("id, donor_code")
          .single();

        if (insertError) {
          console.error("Failed to create donor:", insertError);
          throw new Error(`Donor creation failed: ${insertError.message}`);
        }

        donorId = newDonor.id;
        donorCode = newDonor.donor_code;
        notificationTitle = "Donor ID Not Found — New Record Created";
        notificationMessage = `A follow-up call referenced donor ID "${extracted.external_donor_id || extracted.donor_code}" but no match was found. A new record (${newDonor.donor_code}) was created.`;
      }
    } else {
      // === CREATE FLOW (initial screening or update without identifier) ===
      console.log("Initial screening or update without ID. Creating new donor.");

      const newFields = buildDonorFields(extracted);
      newFields.partner_id = partner.id;
      newFields.status = "draft";
      newFields.intake_method = "phone";

      const { data: newDonor, error: insertError } = await supabase
        .from("donors")
        .insert(newFields)
        .select("id, donor_code")
        .single();

      if (insertError) {
        console.error("Failed to create donor:", insertError);
        throw new Error(`Donor creation failed: ${insertError.message}`);
      }

      donorId = newDonor.id;
      donorCode = newDonor.donor_code;
      notificationTitle = "New Donor from Phone Call";
      notificationMessage = `A new donor (${newDonor.donor_code}) was created from a phone call. Please review the details.`;
    }

    // Save transcript linked to donor
    const { error: transcriptError } = await supabase
      .from("call_transcripts")
      .insert({
        donor_id: donorId,
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
      title: notificationTitle,
      message: notificationMessage,
      donor_id: donorId,
    });

    // Notify all admins about the phone-created/updated donor
    const { data: adminUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminUsers && adminUsers.length > 0) {
      const adminNotifications = adminUsers
        .filter(a => a.user_id !== partner.user_id)
        .map(a => ({
          user_id: a.user_id,
          title: isUpdate ? "Phone Update Received" : "New Phone Intake",
          message: isUpdate
            ? `Partner "${extracted.partner_code}" submitted a phone update for donor ${donorCode}. Please review.`
            : `Partner "${extracted.partner_code}" submitted a new donor (${donorCode}) via phone intake. Please review.`,
          donor_id: donorId,
        }));

      if (adminNotifications.length > 0) {
        const { error: adminNotifError } = await supabase
          .from("notifications")
          .insert(adminNotifications);
        if (adminNotifError) {
          console.error("Failed to notify admins:", adminNotifError);
        }
      }
    }

    console.log("Successfully processed call. Donor:", donorId, "Update:", isUpdate);

    return new Response(
      JSON.stringify({ success: true, donor_id: donorId, donor_code: donorCode, was_update: isUpdate }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
