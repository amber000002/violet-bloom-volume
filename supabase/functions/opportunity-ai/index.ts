import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const {
      brandProfile,
      websiteUrl,
      activeCoverageSnippet,
      campaignSummary,
      eventSnippet,
      existingCampaignNames,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const brandName = brandProfile?.brand_identity?.brand_name || "the brand";
    const industry = brandProfile?.industry_signals?.industry_vertical || "general";
    const products = (brandProfile?.product_ecosystem?.core_products || []).join(", ");
    const positioning = brandProfile?.brand_identity?.positioning || "";

    const systemPrompt = `You are a senior lifecycle marketing strategist. Generate exactly 4 highly creative, non-obvious campaign suggestions for a brand.

RULES:
- Each campaign must be genuinely novel — NOT a rehash of standard welcome/cart-abandon/winback flows.
- Focus on revenue-expansion, behavioral monetization, predictive segments, or content-driven engagement.
- DO NOT duplicate any campaign that already exists (provided below).
- Campaigns must be actionable and tied to measurable KPIs.
- Return ONLY valid JSON — no markdown, no explanation.

Return a JSON array of exactly 4 objects with these fields:
- campaignName (string)
- channel (string: "Email", "Push", "In-App", "SMS", or "WhatsApp")
- targetSegment (string)
- trigger (string)
- messageTheme (string)
- successMetric (string)
- sourceType (string: one of "revenue_expansion", "content_program", "predictive_segment", "loyalty_program", "referral_growth", "frequency_optimization")
- revenueImpactLevel (string: "High", "Medium", or "Low")
- readinessStatus (string: "Ready", "Requires Event", "Requires Property", or "Requires Predictive Layer")`;

    const userPrompt = `Brand: ${brandName}
Industry: ${industry}
Products: ${products}
Positioning: ${positioning}
Website: ${websiteUrl || "N/A"}

Active lifecycle stages covered: ${activeCoverageSnippet || "Unknown"}

Campaign performance summary: ${campaignSummary || "No data"}

Event schema snippet: ${eventSnippet || "No schema uploaded"}

Existing campaign names to AVOID duplicating:
${(existingCampaignNames || []).join("\n")}

Generate 4 creative, high-impact campaigns this brand should launch.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
          temperature: 0.8,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited — please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted — please top up your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI gateway request failed");
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "[]";

    // Strip markdown fences if present
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();

    let campaigns;
    try {
      campaigns = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", cleaned);
      campaigns = [];
    }

    return new Response(JSON.stringify({ campaigns }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("opportunity-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
