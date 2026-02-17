import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { industry, channels, allInternalUseCases, lifecycleStages, brandProfile } = await req.json();

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
      const isl = brandProfile.industry_signal_layer || {};

      brandContext = `BRAND PROFILE:
Brand: ${bi.brand_name || "Unknown"}
Industry: ${bi.industry || industry}
Tagline: ${bi.tagline || "N/A"}
Positioning: ${bi.positioning || "N/A"}
Tone of Voice: ${bi.tone_of_voice || "Professional"}
Business Model: ${bm.business_model_description || "N/A"}
Monetization: ${bm.monetization_model || "N/A"}
Pricing Tiers: ${bm.pricing_tiers?.join(", ") || "N/A"}
Core Products: ${pe.core_products?.join(", ") || "N/A"}
Product Modules: ${pe.product_modules?.join(", ") || "N/A"}
Feature Modules: ${pe.feature_modules?.join(", ") || "N/A"}
Primary Segments: ${ai_intel.primary_segments?.join(", ") || "N/A"}
Personas: ${ai_intel.personas_detected?.join(", ") || "N/A"}
Value Propositions: ${brandProfile.value_framework?.value_propositions?.join(", ") || "N/A"}
Differentiators: ${brandProfile.value_framework?.differentiators?.join(", ") || "N/A"}
Engagement Drivers: ${ea.engagement_drivers?.join(", ") || "N/A"}
Event Triggers: ${ea.event_based_triggers?.join(", ") || "N/A"}
Seasonal Triggers: ${ea.seasonal_triggers?.join(", ") || "N/A"}
Urgency Patterns: ${ea.urgency_patterns?.join(", ") || "N/A"}
Key User Actions: ${lsm.key_user_actions?.join(", ") || "N/A"}
Key User Events: ${lsm.key_user_events?.join(", ") || "N/A"}
Activation Events: ${lsm.activation_events?.join(", ") || "N/A"}
Monetization Events: ${lsm.monetization_events?.join(", ") || "N/A"}
Churn Signals: ${lsm.churn_signals?.join(", ") || "N/A"}
Inactivity Markers: ${lsm.inactivity_markers?.join(", ") || "N/A"}
Primary KPIs: ${kpi.primary_kpis?.join(", ") || "N/A"}
Secondary KPIs: ${kpi.secondary_kpis?.join(", ") || "N/A"}
Industry KPIs: ${isl.industry_kpis?.join(", ") || "N/A"}
Industry Vocabulary: ${isl.industry_vocabulary?.join(", ") || "N/A"}
Regulatory Environment: ${rcl.regulatory_environment?.join(", ") || "N/A"}
Compliance Intensity: ${rcl.compliance_intensity || "Low"}
Risk Signals: ${rcl.risk_signals?.join(", ") || "N/A"}`;
    }

    // Build channel-specific execution format instructions
    const channelFormatInstructions = channels.map((ch: string) => {
      const norm = ch.toLowerCase();
      if (norm === "email") return `Email Format:
  execution_detail block:
  • trigger: "Email Triggered When <Brand Event>"
  • subject: Subject line
  • preheader: Preheader text
  • content: Email body description
  • visual: Visual element description
  • cta: Call-to-action text`;
      if (norm === "push") return `Push Format:
  execution_detail block:
  • trigger: "Push Triggered When <Condition>"
  • title: Push title
  • message: Push message
  • deep_link: Deep link target`;
      if (norm === "in-app" || norm === "in_app") return `In-App Format:
  execution_detail block:
  • trigger: "In-App Triggered When <Condition>"
  • headline: Headline text
  • body: Body text
  • cta: Call-to-action
  • placement: Placement location`;
      if (norm === "whatsapp") return `WhatsApp Format:
  execution_detail block:
  • trigger: "WhatsApp Triggered When <Condition>"
  • opening: Opening line
  • core_message: Core message
  • dynamic_variable: Dynamic variable
  • cta: Call-to-action
  • compliance_note: Compliance note`;
      if (norm === "sms") return `SMS Format:
  execution_detail block:
  • trigger: "SMS Triggered When <Condition>"
  • message: SMS message text
  • dynamic_variable: Dynamic variable
  • short_cta: Short CTA`;
      return "";
    }).filter(Boolean).join("\n\n");

    const systemPrompt = `You are a lifecycle marketing intelligence engine. You perform TWO tasks:

TASK A — AUGMENT ALL INTERNAL USE CASES (100% Coverage)
For EVERY internal use case provided, you MUST:
1. Rewrite the title using brand vocabulary
2. Rewrite execution_strategy with deep brand personalization
3. Rewrite trigger_logic using brand-specific event logic
4. Rewrite segmentation_logic using brand segments and behavioral criteria
5. Rewrite metrics_to_impact with brand + industry KPIs
6. Apply risk_overlay (regulatory/compliance considerations)
7. Apply tone alignment (use brand tone_of_voice)
8. Apply business model logic (monetization model, pricing tiers)
9. Apply product mapping (core products, product modules, feature modules)
10. Apply industry KPI logic

NO internal use case should remain static. Every single one must be deeply augmented.
Source label: "Internal Resource (AI Augmented)"
Confidence: "High"

TASK B — GENERATE 2 AI-NATIVE USE CASES PER LIFECYCLE STAGE
After augmenting all internal use cases:
- For EACH lifecycle stage present, generate EXACTLY 2 new use cases that:
  • Are NOT present in the internal resource
  • Follow the same structured format
  • Use the EXACT same lifecycle stage name (no hallucinated stages)
  • Respect the selected channel filter
  • Apply deep brand context
  • Address strategic gaps not covered in internal resources
Source label: "AI-Native Expansion"
Confidence: "Medium"

STRICT RULES:
1. Lifecycle stage MUST be preserved EXACTLY as provided. NEVER rename, invent, or modify lifecycle stage names.
2. ONLY use channels from: [${channels.join(", ")}]
3. AI-Native use cases MUST differ from internal ones by at least ONE of: trigger depth, monetization logic, user behavior intensity, risk scenario, channel orchestration, lifecycle timing, engagement driver, KPI target
4. No duplication allowed — no two use cases should differ only in wording.
5. For EACH channel used, provide a structured execution_detail block following the channel format below.

CHANNEL-SPECIFIC EXECUTION FORMATS:
${channelFormatInstructions}

OUTPUT FORMAT: Return a JSON object with this structure:
{
  "augmented_use_cases": [
    {
      "use_case_title": "Brand-personalized title",
      "lifecycle_stage": "EXACT stage from input — DO NOT MODIFY",
      "confidence_level": "High" or "Medium",
      "source": "Internal Resource (AI Augmented)" or "AI-Native Expansion",
      "channels": ["channels used"],
      "why_it_matters": "Strategic rationale tied to brand",
      "execution_strategy": "Step-by-step execution approach",
      "execution_details": [
        {
          "channel": "email|push|in-app|whatsapp|sms",
          "trigger": "Triggered When <condition>",
          "fields": { ... channel-specific fields ... }
        }
      ],
      "trigger_logic": "Specific trigger events using brand signals",
      "segmentation_logic": "Target segments with behavioral criteria",
      "metrics_to_impact": ["specific KPIs"],
      "risk_overlay": "Regulatory/compliance considerations if any",
      "why_this_fits_brand": "Brand-specific justification",
      "personalization_layers": ["layers applied"]
    }
  ]
}`;

    // Build use case summary grouped by stage
    const useCasesByStage: Record<string, any[]> = {};
    for (const uc of (allInternalUseCases || [])) {
      const stage = uc.stage || "unknown";
      if (!useCasesByStage[stage]) useCasesByStage[stage] = [];
      useCasesByStage[stage].push(uc);
    }

    let useCaseSummary = "";
    for (const [stage, ucs] of Object.entries(useCasesByStage)) {
      useCaseSummary += `\n=== STAGE: ${stage} (${ucs.length} internal use cases) ===\n`;
      for (const uc of ucs) {
        useCaseSummary += `- Title: ${uc.name}, Type: ${uc.type || "N/A"}, TriggerType: ${uc.triggerType || "N/A"}, Description: ${uc.description || "N/A"}, Channels: ${uc.channels?.join(", ") || channels.join(", ")}, BusinessGoal: ${uc.business_goal || "N/A"}, BusinessChallenge: ${uc.business_challenge || "N/A"}, Solution: ${uc.clevertap_solution || "N/A"}, MetricsImpacted: ${uc.metrics_impacted?.join(", ") || "N/A"}, BusinessImpact: ${uc.business_impact || "N/A"}\n`;
      }
    }

    const stagesStr = (lifecycleStages || []).join(", ");

    const userPrompt = `Augment these lifecycle use cases for the ${industry} industry.

Selected Channels: ${channels.join(", ")}
Lifecycle Stages Present: ${stagesStr}

${brandContext}

INTERNAL USE CASES TO AUGMENT (ALL must be augmented — 100% coverage):
${useCaseSummary}

REQUIRED OUTPUT:
1. Augmented versions of ALL ${allInternalUseCases?.length || 0} internal use cases above (Source: "Internal Resource (AI Augmented)", Confidence: "High")
2. EXACTLY 2 AI-Native Expansion use cases for EACH lifecycle stage: ${stagesStr} (Source: "AI-Native Expansion", Confidence: "Medium")

Total expected: ${(allInternalUseCases?.length || 0)} augmented + ${(lifecycleStages?.length || 0) * 2} AI-native = ${(allInternalUseCases?.length || 0) + (lifecycleStages?.length || 0) * 2} use cases

Rules:
- Preserve lifecycle_stage EXACTLY
- Only use channels from: [${channels.join(", ")}]
- Every internal use case MUST be augmented (no static pass-through)
- AI-Native must be meaningfully different from internal ones
- Apply brand tone: ${brandProfile?.brand_identity?.tone_of_voice || "Professional"}
- Include execution_details array with channel-specific structured blocks

Return ONLY the JSON object.`;

    // Retry up to 3 times on 500 errors
    let response: Response | null = null;
    const requestBody = JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 32000,
    });

    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: requestBody,
      });
      if (response.status !== 500) break;
      console.warn(`AI gateway returned 500, retry ${attempt + 1}/3`);
      if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
    }

    if (!response || !response.ok) {
      if (response?.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response?.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response!.text();
      console.error("AI gateway error:", response!.status, errorText);
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

    let parsed;
    try {
      // Remove markdown code blocks
      let cleaned = content
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      // Find JSON boundaries
      const jsonStart = cleaned.search(/[\{\[]/);
      const jsonEnd = cleaned.lastIndexOf(jsonStart !== -1 && cleaned[jsonStart] === '[' ? ']' : '}');

      if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON object found");

      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

      try {
        parsed = JSON.parse(cleaned);
      } catch {
        // Fix common issues: trailing commas, control chars
        cleaned = cleaned
          .replace(/,\s*}/g, "}")
          .replace(/,\s*]/g, "]")
          .replace(/[\x00-\x1F\x7F]/g, "");

        // Repair unbalanced braces/brackets (truncated response)
        let braces = 0, brackets = 0;
        for (const char of cleaned) {
          if (char === '{') braces++;
          if (char === '}') braces--;
          if (char === '[') brackets++;
          if (char === ']') brackets--;
        }
        while (brackets > 0) { cleaned += ']'; brackets--; }
        while (braces > 0) { cleaned += '}'; braces--; }

        parsed = JSON.parse(cleaned);
      }
    } catch (parseErr) {
      console.error("Failed to parse AI response:", content.substring(0, 500));
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
