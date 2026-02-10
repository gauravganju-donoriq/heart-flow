import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { donor_id } = await req.json();
    if (!donor_id) {
      return new Response(JSON.stringify({ error: "donor_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for DB reads to bypass RLS for the screening operation
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check admin role
    const userId = claimsData.claims.sub;
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

    // 1. Fetch donor
    const { data: donor, error: donorError } = await serviceClient
      .from("donors")
      .select("*, partners(organization_name)")
      .eq("id", donor_id)
      .single();

    if (donorError || !donor) {
      return new Response(JSON.stringify({ error: "Donor not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch active guidelines
    const { data: guidelines } = await serviceClient
      .from("screening_guidelines")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    const activeGuidelines = guidelines || [];

    // 3. Compose policy document
    const policyDocument = activeGuidelines
      .map((g: any) => `## ${g.title} [Category: ${g.category}]\n${g.content}`)
      .join("\n\n---\n\n");

    // 4. Snapshot guidelines for audit
    const guidelinesSnapshot = activeGuidelines.map((g: any) => ({
      id: g.id,
      title: g.title,
      content: g.content,
      category: g.category,
    }));

    // 5. Build donor profile summary
    const donorProfile = JSON.stringify(donor, null, 2);

    const systemPrompt = `You are a senior clinical screening specialist for LeMaitre Vascular's tissue donor program. You evaluate donor profiles against the organization's screening guidelines.

APPROACH:
- Read the full donor profile holistically, not field-by-field
- Consider how factors interact (age + cause of death + medical history together)
- Apply the screening guidelines as policy guidance, using clinical judgment
- Flag concerns even if no specific guideline addresses them
- If critical data is missing, you CANNOT accept — mark as needs_review
- Be conservative: when uncertain, recommend needs_review
- Your evaluation is ADVISORY ONLY. A human makes the final decision.

WRITING STYLE FOR REASONING:
- Write in plain, clear language that a non-clinical administrator can understand
- Avoid medical jargon — if you must use a clinical term, briefly explain it in parentheses
- Keep reasoning to 3-5 concise sentences summarizing why you reached your verdict
- Lead with the most important factor, then mention supporting factors
- Do NOT use markdown headers, bullet lists, or formatting — write a short paragraph
- Reference specific guideline titles when they apply

OUTPUT:
Use the provided tool to return your structured evaluation.`;

    const userPrompt = `Please evaluate the following donor profile against our screening guidelines.

## SCREENING GUIDELINES (Policy Document)

${policyDocument || "No screening guidelines have been configured yet. Evaluate the donor using general clinical best practices for tissue donation screening."}

## DONOR PROFILE

${donorProfile}

Evaluate this donor holistically and return your structured assessment.`;

    // 6. Call Lovable AI with tool calling
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_screening_evaluation",
              description:
                "Submit the structured screening evaluation for this donor.",
              parameters: {
                type: "object",
                properties: {
                  verdict: {
                    type: "string",
                    enum: ["accept", "reject", "needs_review"],
                    description: "The screening verdict",
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence score between 0.0 and 1.0",
                  },
                  reasoning: {
                    type: "string",
                    description:
                      "Full markdown explanation of clinical thinking and reasoning",
                  },
                  concerns: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        concern: { type: "string" },
                        severity: {
                          type: "string",
                          enum: ["low", "medium", "high", "critical"],
                        },
                        guideline_ref: {
                          type: "string",
                          description:
                            "Title of the guideline this concern relates to, or 'Clinical Judgment' if none",
                        },
                      },
                      required: ["concern", "severity", "guideline_ref"],
                      additionalProperties: false,
                    },
                    description: "List of specific concerns identified",
                  },
                  missing_data: {
                    type: "array",
                    items: { type: "string" },
                    description:
                      "List of field names that were absent but needed for evaluation",
                  },
                },
                required: [
                  "verdict",
                  "confidence",
                  "reasoning",
                  "concerns",
                  "missing_data",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "submit_screening_evaluation" },
        },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      return new Response(
        JSON.stringify({ error: "AI evaluation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();

    // 7. Parse tool call response
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in AI response:", JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ error: "AI did not return structured evaluation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const evaluation = JSON.parse(toolCall.function.arguments);

    // 8. Save to screening_results using the authenticated client
    const { data: result, error: insertError } = await supabase
      .from("screening_results")
      .insert({
        donor_id,
        verdict: evaluation.verdict,
        confidence: evaluation.confidence,
        reasoning: evaluation.reasoning,
        concerns: evaluation.concerns,
        missing_data: evaluation.missing_data,
        model_used: "atlas-screening-v1",
        guidelines_snapshot: guidelinesSnapshot,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save screening result" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 9. Return result
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("screen-donor error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
