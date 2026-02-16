import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { brandProfile, industry, websiteUrl, strategicContext, campaignSummary, mode } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build a rich context prompt from brand profile
    let brandContext = "";
    if (brandProfile) {
      brandContext = `
BRAND IDENTITY:
- Name: ${brandProfile.brand_identity?.brand_name || "Unknown"}
- Website: ${brandProfile.brand_identity?.website || websiteUrl || "Unknown"}
- Industry: ${brandProfile.brand_identity?.industry || industry}
- Geography: ${brandProfile.brand_identity?.geography_focus || "Not specified"}
- Tagline: ${brandProfile.brand_identity?.tagline || "Not specified"}
- Positioning: ${brandProfile.brand_identity?.positioning || "Not specified"}
- Tone: ${brandProfile.brand_identity?.tone_of_voice || "Not specified"}

BUSINESS MODEL:
- Description: ${brandProfile.business_model?.business_model_description || "Not specified"}
- Monetization: ${brandProfile.business_model?.monetization_model || "Not specified"}
- Pricing Tiers: ${brandProfile.business_model?.pricing_tiers?.join(", ") || "Not specified"}

PRODUCT ECOSYSTEM:
- Core Products: ${brandProfile.product_ecosystem?.core_products?.join(", ") || "Not specified"}
- Platforms: ${brandProfile.product_ecosystem?.platforms?.join(", ") || "Not specified"}
- Has Mobile App: ${brandProfile.product_ecosystem?.has_mobile_app || false}
- Has Web Platform: ${brandProfile.product_ecosystem?.has_web_platform || false}

AUDIENCE:
- Primary Segments: ${brandProfile.audience_intelligence?.primary_segments?.join(", ") || "Not specified"}
- Secondary Segments: ${brandProfile.audience_intelligence?.secondary_segments?.join(", ") || "Not specified"}
- Personas: ${brandProfile.audience_intelligence?.personas_detected?.join(", ") || "Not specified"}

VALUE FRAMEWORK:
- Value Props: ${brandProfile.value_framework?.value_propositions?.join(", ") || "Not specified"}
- Differentiators: ${brandProfile.value_framework?.differentiators?.join(", ") || "Not specified"}

ENGAGEMENT ARCHITECTURE:
- Drivers: ${brandProfile.engagement_architecture?.engagement_drivers?.join(", ") || "Not specified"}
- Seasonal Triggers: ${brandProfile.engagement_architecture?.seasonal_triggers?.join(", ") || "Not specified"}
- Event Triggers: ${brandProfile.engagement_architecture?.event_based_triggers?.join(", ") || "Not specified"}

LIFECYCLE SIGNALS:
- Key Actions: ${brandProfile.lifecycle_signal_map?.key_user_actions?.join(", ") || "Not specified"}
- Activation Events: ${brandProfile.lifecycle_signal_map?.activation_events?.join(", ") || "Not specified"}
- Monetization Events: ${brandProfile.lifecycle_signal_map?.monetization_events?.join(", ") || "Not specified"}
- Churn Signals: ${brandProfile.lifecycle_signal_map?.churn_signals?.join(", ") || "Not specified"}

KPI FRAMEWORK:
- Primary KPIs: ${brandProfile.kpi_framework?.primary_kpis?.join(", ") || "Not specified"}
- Risk KPIs: ${brandProfile.kpi_framework?.risk_kpis?.join(", ") || "Not specified"}

TECH & SCALE:
- Has CDP: ${brandProfile.tech_scale_layer?.has_cdp || false}
- Has CRM: ${brandProfile.tech_scale_layer?.has_crm || false}
- Supported Channels: ${brandProfile.tech_scale_layer?.supported_channels?.join(", ") || "Not specified"}
- MAU Band: ${brandProfile.tech_scale_layer?.monthly_active_users_band || "Not specified"}

COMPLIANCE:
- Regulatory Environment: ${brandProfile.risk_compliance_layer?.regulatory_environment?.join(", ") || "Not specified"}
- Compliance Intensity: ${brandProfile.risk_compliance_layer?.compliance_intensity || "Not specified"}

INDUSTRY SIGNALS:
- Industry KPIs: ${brandProfile.industry_signal_layer?.industry_kpis?.join(", ") || "Not specified"}
- Industry Vocabulary: ${brandProfile.industry_signal_layer?.industry_vocabulary?.join(", ") || "Not specified"}`;
    }

    let campaignContext = "";
    if (campaignSummary) {
      campaignContext = `

CAMPAIGN DATA SUMMARY (from uploaded CSV):
- Total Campaigns: ${campaignSummary.totalCampaigns}
- Total Volume: ${campaignSummary.totalVolume}
- Average Open Rate: ${campaignSummary.avgOpenRate}%
- Average Click Rate: ${campaignSummary.avgClickRate}%
- Average Bounce Rate: ${campaignSummary.avgBounceRate}%
- Average Unsubscribe Rate: ${campaignSummary.avgUnsubRate}%
- Channels Used: ${campaignSummary.channels?.join(", ") || "Email only"}
- Date Range: ${campaignSummary.dateRange || "Not specified"}
- Trigger vs Batch Ratio: ${campaignSummary.triggerRatio || "Not calculated"}
- Has Segmentation Data: ${campaignSummary.hasSegmentation || false}
- Top Campaign Names (sample): ${campaignSummary.sampleCampaignNames?.join("; ") || "Not available"}
- Subject Line Samples: ${campaignSummary.sampleSubjectLines?.join("; ") || "Not available"}
${campaignSummary.segmentSummary ? `- Segment Summary: ${campaignSummary.segmentSummary}` : ""}`;
    }

    const systemPrompt = `You are a strategic growth advisory engine for enterprise marketing leaders (CMOs, Heads of Growth, Digital Transformation Leaders). You produce leadership-grade, board-ready strategic intelligence.

CRITICAL RULES:
- Be persuasive but NOT salesy
- Be strategic but NOT abstract  
- Be revenue-oriented and deployment-ready
- NEVER use vague phrases like "huge opportunity", "game-changing", "revolutionary"
- NEVER fabricate competitor performance metrics or revenue numbers
- NEVER use generic lifecycle statements - everything must be brand-specific
- Adapt all language to the brand's industry vocabulary and positioning
- Reference the brand by name throughout
- Map every recommendation to specific CleverTap capabilities
- Confidence levels: only "High" or "Medium" (no numerical probabilities)

OUTPUT FORMAT: Return a valid JSON object with this exact structure:
{
  "mode": "${mode}",
  "executiveSnapshot": {
    "strengths": ["3-5 specific growth architecture strengths based on brand data"],
    "underMonetizedAreas": ["2-4 specific lifecycle under-monetized areas"],
    "competitiveGaps": ["2-4 competitive advancement gaps"],
    "cleverTapLeverageOpportunities": ["3-5 specific CleverTap leverage opportunities"],
    "strategicFocus": "One sentence strategic focus recommendation"
  },
  "lifecycleAssessment": {
    "stages": [
      {
        "stage": "Stage Name",
        "coverage": "Strong|Partial|Weak|Missing",
        "campaignCount": 0,
        "volumeShare": 0,
        "assessment": "Specific assessment text"
      }
    ],
    "overConcentrated": ["stage names with >40% volume"],
    "underInvested": ["stage names with weak/missing coverage"],
    "summary": "Lifecycle architecture summary"
  },
  ${mode !== "website-only" ? `"engagementSophistication": {
    "tier": "Foundational|Structured|Advanced|Orchestrated",
    "batchVsTriggerRatio": "description",
    "channelDiversification": "description",
    "cadenceIntensity": "description",
    "subjectLineVariation": "description",
    "automationPresence": "description",
    "details": ["specific observations"]
  },` : `"engagementSophistication": null,`}
  ${mode === "website-csv-segmentation" ? `"segmentationIntelligence": {
    "behavioralVsBroad": "assessment",
    "lifecycleClarity": "assessment",
    "highValueActivation": "assessment",
    "inactiveRecovery": "assessment",
    "segmentReuse": "assessment",
    "assessment": "overall assessment"
  },` : `"segmentationIntelligence": null,`}
  "competitiveAcceleration": {
    "competitors": [
      {"name": "competitor name", "messagingSophistication": "...", "lifecycleCues": "...", "urgencyMechanics": "..."}
    ],
    "whereLeadersAdvance": ["3-5 areas where industry leaders are advancing"],
    "strategicImplications": ["2-4 strategic implications for this brand"],
    "cleverTapAlignment": ["4-6 CleverTap capabilities that address these gaps"]
  },
  "initiatives": [
    {
      "title": "Dynamic title using brand vocabulary",
      "lifecycleStage": "relevant stage",
      "businessRationale": "specific rationale tied to brand data",
      "primaryKpiImpact": "specific KPI impact",
      "confidence": "High|Medium",
      "effort": "Low|Moderate|High",
      "cleverTapCapabilities": ["specific capabilities"],
      "competitiveJustification": "why this matters competitively"
    }
  ],
  "riskMapping": {
    "risks": [
      {"risk": "specific risk", "evidence": "evidence from data", "severity": "High|Medium|Low"}
    ],
    "summary": "risk summary"
  },
  "blueprint": {
    "phase1": [{"action": "specific action", "cleverTapModule": "module name"}],
    "phase2": [{"action": "specific action", "cleverTapModule": "module name"}],
    "phase3": [{"action": "specific action", "cleverTapModule": "module name"}]
  }
}

Generate 5-7 initiatives maximum. Each must have a dynamic title adapted to brand vocabulary.
For the 90-Day Blueprint: Phase 1 = Immediate Wins, Phase 2 = Lifecycle Expansion, Phase 3 = Predictive & AI Deployment.
Each phase should have 3-5 actions mapped to CleverTap modules.`;

    const userPrompt = `Generate a comprehensive Strategic Growth & Lifecycle Acceleration analysis for the following brand:

Industry: ${industry}
Website: ${websiteUrl || "Not provided"}
Intelligence Mode: ${mode}
${strategicContext ? `Strategic Priorities (from leadership): ${strategicContext}` : "No specific strategic priorities provided — default to revenue expansion and lifecycle strengthening."}

${brandContext}
${campaignContext}

Produce the complete JSON output following the exact structure specified. Make every insight specific to this brand — reference their products, audience segments, business model, and industry context. Do NOT produce generic advice.`;

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
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI analysis failed. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: "No response from AI. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract JSON from the response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", jsonStr.substring(0, 500));
      return new Response(JSON.stringify({ error: "Failed to parse AI analysis. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Strategic insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
