import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { industry, channels, filteredUseCases, brandProfile } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build brand context
    let brandContext = "No brand profile available. Use generic industry best practices.";
    if (brandProfile) {
      const bi = brandProfile.brand_identity || {};
      const bm = brandProfile.business_model || {};
      const pe = brandProfile.product_ecosystem || {};
      const ai_intel = brandProfile.audience_intelligence || {};
      const ea = brandProfile.engagement_architecture || {};
      const lsm = brandProfile.lifecycle_signal_map || {};
      const rcl = brandProfile.risk_compliance_layer || {};
      const kpi = brandProfile.kpi_framework || {};

      brandContext = `BRAND PROFILE:
Brand: ${bi.brand_name || "Unknown"}
Industry: ${bi.industry || industry}
Tagline: ${bi.tagline || "N/A"}
Positioning: ${bi.positioning || "N/A"}
Tone of Voice: ${bi.tone_of_voice || "Professional"}
Business Model: ${bm.business_model_description || "N/A"}
Monetization: ${bm.monetization_model || "N/A"}
Core Products: ${pe.core_products?.join(", ") || "N/A"}
Product Modules: ${pe.product_modules?.join(", ") || "N/A"}
Primary Segments: ${ai_intel.primary_segments?.join(", ") || "N/A"}
Personas: ${ai_intel.personas_detected?.join(", ") || "N/A"}
Engagement Drivers: ${ea.engagement_drivers?.join(", ") || "N/A"}
Event Triggers: ${ea.event_based_triggers?.join(", ") || "N/A"}
Seasonal Triggers: ${ea.seasonal_triggers?.join(", ") || "N/A"}
Urgency Patterns: ${ea.urgency_patterns?.join(", ") || "N/A"}
Key User Events: ${lsm.key_user_events?.join(", ") || "N/A"}
Activation Events: ${lsm.activation_events?.join(", ") || "N/A"}
Monetization Events: ${lsm.monetization_events?.join(", ") || "N/A"}
Churn Signals: ${lsm.churn_signals?.join(", ") || "N/A"}
Primary KPIs: ${kpi.primary_kpis?.join(", ") || "N/A"}
Regulatory Environment: ${rcl.regulatory_environment?.join(", ") || "N/A"}
Compliance Intensity: ${rcl.compliance_intensity || "Low"}`;
    }

    const systemPrompt = `You are a lifecycle marketing intelligence engine. You augment internal use cases with brand-specific personalization.

STRICT GOVERNANCE RULES:
1. You MUST preserve the lifecycle_stage EXACTLY as provided. Never rename, invent, or modify lifecycle stages.
2. You MUST only output use cases that match the selected channels: [${channels.join(", ")}].
3. You MUST NOT contradict the internal resource objectives.
4. You MUST differentiate each use case meaningfully — no two should differ only in wording. They must vary by lifecycle signal, trigger timing, monetization logic, risk pattern, channel flow, or user depth.
5. You MAY create up to 3 "AI-Augmented Extension" use cases that respect lifecycle stages and channel filters.
6. For each use case, rewrite titles using brand vocabulary, replace generic triggers with brand event logic, replace product placeholders with real products, adjust KPIs to industry + brand model, apply tone_of_voice, and apply regulatory overlay if applicable.

OUTPUT FORMAT: Return a JSON object with this structure:
{
  "augmented_use_cases": [
    {
      "use_case_title": "Brand-personalized title",
      "lifecycle_stage": "EXACT stage from input — DO NOT MODIFY",
      "confidence_level": "High|Medium|Low",
      "source": "Internal|AI-Augmented Extension",
      "channels": ["channels used"],
      "why_it_matters": "Strategic rationale tied to brand",
      "execution_strategy": "Step-by-step execution approach",
      "trigger_logic": "Specific trigger events using brand signals",
      "segmentation_logic": "Target segments with behavioral criteria",
      "metrics_to_impact": ["specific KPIs"],
      "risk_overlay": "Regulatory/compliance considerations if any",
      "why_this_fits_brand": "Brand-specific justification",
      "personalization_layers": ["layers applied e.g. Product Module, Audience Segment, Trigger Event"]
    }
  ]
}`;

    const useCaseSummary = filteredUseCases.map((uc: any) => 
      `- Title: ${uc.title}, Stage: ${uc.stage}, Source: ${uc.source}, TriggerType: ${uc.triggerType || "N/A"}, Objective: ${uc.objective || "N/A"}, Channels: ${uc.channelsUsed?.join(", ") || channels.join(", ")}`
    ).join("\n");

    const userPrompt = `Augment these lifecycle use cases for the ${industry} industry.

Selected Channels: ${channels.join(", ")}

${brandContext}

INTERNAL USE CASES TO AUGMENT:
${useCaseSummary}

Rules reminder:
- Preserve lifecycle_stage EXACTLY
- Only use channels from: [${channels.join(", ")}]
- Make each use case meaningfully unique
- Use brand vocabulary, products, segments, and events
- Apply tone: ${brandProfile?.brand_identity?.tone_of_voice || "Professional"}
- You may add up to 3 AI-Augmented Extension use cases that fit the lifecycle stages present
- Confidence: High = strong brand+industry+lifecycle alignment, Medium = industry aligned but weak brand signal, Low = generic or extension

Return ONLY the JSON object.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI augmentation failed." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: "No AI response." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", jsonStr.substring(0, 500));
      return new Response(JSON.stringify({ error: "Failed to parse AI output." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("use-case-augment error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
