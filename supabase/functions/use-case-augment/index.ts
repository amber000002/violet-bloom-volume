import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Robustly extract JSON from potentially truncated AI responses.
 * Handles: markdown wrappers, truncated strings, unbalanced braces/brackets.
 */
function robustJsonExtract(raw: string): any {
  // Step 1: Strip markdown code blocks
  let cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Step 2: Find JSON start
  const jsonStart = cleaned.search(/[\{\[]/);
  if (jsonStart === -1) throw new Error("No JSON object found in response");
  cleaned = cleaned.substring(jsonStart);

  // Step 3: Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {
    // continue to repair
  }

  // Step 4: Fix common issues
  cleaned = cleaned
    .replace(/[\x00-\x1F\x7F]/g, (ch) => ch === '\n' || ch === '\t' ? ch : '') // keep newlines/tabs
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]");

  // Step 5: Handle truncation — close any open JSON string first
  // Count unescaped quotes to detect if we're inside a string
  let inString = false;
  let lastCharWasEscape = false;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (lastCharWasEscape) {
      lastCharWasEscape = false;
      continue;
    }
    if (ch === '\\') {
      lastCharWasEscape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
    }
  }

  // If we ended inside a string, close it
  if (inString) {
    // Remove any trailing incomplete escape sequence
    cleaned = cleaned.replace(/\\+$/, '');
    cleaned += '"';
  }

  // Step 6: Remove any trailing comma after closing the string
  cleaned = cleaned.replace(/,\s*$/, '');

  // Step 7: Balance braces and brackets
  let braces = 0, brackets = 0;
  inString = false;
  lastCharWasEscape = false;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (lastCharWasEscape) { lastCharWasEscape = false; continue; }
    if (ch === '\\') { lastCharWasEscape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
    else if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
  }

  // Close brackets before braces (inner structures first)
  while (brackets > 0) { cleaned += ']'; brackets--; }
  while (braces > 0) { cleaned += '}'; braces--; }

  // Step 8: Try parse again
  try {
    return JSON.parse(cleaned);
  } catch {
    // Step 9: Last resort — find the last complete use case object and truncate there
    const lastCompleteObj = cleaned.lastIndexOf('},');
    if (lastCompleteObj > 0) {
      let truncated = cleaned.substring(0, lastCompleteObj + 1);
      // Re-balance after truncation
      braces = 0; brackets = 0;
      inString = false; lastCharWasEscape = false;
      for (let i = 0; i < truncated.length; i++) {
        const ch = truncated[i];
        if (lastCharWasEscape) { lastCharWasEscape = false; continue; }
        if (ch === '\\') { lastCharWasEscape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === '{') braces++;
        else if (ch === '}') braces--;
        else if (ch === '[') brackets++;
        else if (ch === ']') brackets--;
      }
      while (brackets > 0) { truncated += ']'; brackets--; }
      while (braces > 0) { truncated += '}'; braces--; }

      try {
        const result = JSON.parse(truncated);
        console.warn("Recovered partial JSON by truncating incomplete last object");
        return result;
      } catch {
        // fall through
      }
    }

    throw new Error("Could not extract valid JSON after all repair attempts");
  }
}

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

    // ---- Chunked per-stage execution to avoid 150s edge timeout ----
    // One AI call per lifecycle stage (smaller, faster, parallel) instead of
    // a single giant gemini-2.5-pro call that exceeds the 150s idle timeout.
    const stagesList: string[] = (lifecycleStages && lifecycleStages.length > 0)
      ? lifecycleStages
      : Object.keys(useCasesByStage);

    const channelCount = Math.max(1, channels?.length || 1);

    const callAIForStage = async (stageName: string, stageUcs: any[]) => {
      let stageSummary = "";
      for (const uc of stageUcs) {
        stageSummary += `- Title: ${uc.name}, Type: ${uc.type || "N/A"}, TriggerType: ${uc.triggerType || "N/A"}, Description: ${uc.description || "N/A"}, Channels: ${uc.channels?.join(", ") || channels.join(", ")}, BusinessGoal: ${uc.business_goal || "N/A"}, BusinessChallenge: ${uc.business_challenge || "N/A"}, Solution: ${uc.clevertap_solution || "N/A"}, MetricsImpacted: ${uc.metrics_impacted?.join(", ") || "N/A"}, BusinessImpact: ${uc.business_impact || "N/A"}\n`;
      }

      const expectedUcs = stageUcs.length + 2;
      const estimated = expectedUcs * (1200 + channelCount * 600);
      const maxTokens = Math.min(32000, Math.max(8000, estimated));

      const stagePrompt = `Augment lifecycle use cases for the ${industry} industry — LIFECYCLE STAGE: "${stageName}".

Selected Channels: ${channels.join(", ")}

${brandContext}

INTERNAL USE CASES TO AUGMENT (ALL ${stageUcs.length} must be augmented — 100% coverage):
${stageSummary || "(none — generate only the 2 AI-Native use cases for this stage)"}

REQUIRED OUTPUT:
1. Augmented versions of ALL ${stageUcs.length} internal use cases above (Source: "Internal Resource (AI Augmented)", Confidence: "High")
2. EXACTLY 2 AI-Native Expansion use cases for lifecycle stage "${stageName}" (Source: "AI-Native Expansion", Confidence: "Medium")

All use cases MUST have lifecycle_stage="${stageName}" exactly.

Rules:
- Only use channels from: [${channels.join(", ")}]
- Every internal use case MUST be augmented (no static pass-through)
- AI-Native must be meaningfully different from internal ones
- Apply brand tone: ${brandProfile?.brand_identity?.tone_of_voice || "Professional"}
- Include execution_details array with one structured block PER selected channel (${channels.join(", ")}). No skipping.

Return ONLY the JSON object with shape { "augmented_use_cases": [...] }.`;

      const body = JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: stagePrompt },
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
      });

      let resp: Response | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body,
        });
        if (resp.status !== 500) break;
        if (attempt < 2) await new Promise(r => setTimeout(r, 1500));
      }
      if (!resp || !resp.ok) {
        const txt = resp ? await resp.text() : "no response";
        throw new Error(`stage "${stageName}": ${resp?.status} ${txt.substring(0, 160)}`);
      }
      const aiJson = await resp.json();
      const content = aiJson.choices?.[0]?.message?.content;
      if (!content) throw new Error(`stage "${stageName}": empty content`);
      const parsed = robustJsonExtract(content);
      return parsed?.augmented_use_cases || [];
    };

    // Run with concurrency limit to stay well under 150s
    const CONCURRENCY = 3;
    const allUseCases: any[] = [];
    const errors: string[] = [];
    for (let i = 0; i < stagesList.length; i += CONCURRENCY) {
      const batch = stagesList.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(stage => callAIForStage(stage, useCasesByStage[stage] || []))
      );
      results.forEach((r, idx) => {
        if (r.status === "fulfilled") {
          allUseCases.push(...r.value);
        } else {
          console.error(`Stage "${batch[idx]}" failed:`, r.reason);
          errors.push(`${batch[idx]}: ${r.reason?.message || r.reason}`);
        }
      });
    }

    if (allUseCases.length === 0) {
      return new Response(JSON.stringify({ error: `All stages failed. ${errors.join("; ")}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: { augmented_use_cases: allUseCases },
      partial_errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("use-case-augment error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
