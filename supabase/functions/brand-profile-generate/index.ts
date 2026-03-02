import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#?\w+;/g, " ")
    .replace(/[^\x20-\x7E\n]/g, " ") // strip non-ASCII
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPageText(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BrandBot/1.0)",
        "Accept": "text/html",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) return "";
    const html = await resp.text();
    return htmlToText(html).slice(0, 4000);
  } catch {
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { websiteUrl, websiteText, additionalContext, industry } = await req.json();

    if (!websiteUrl || !industry) {
      return new Response(JSON.stringify({ error: "websiteUrl and industry are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const hasText = websiteText && websiteText.trim().length > 50;
    let baseUrl = websiteUrl.trim();
    if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = `https://${baseUrl}`;
    }

    let crawledContent = "";
    const crawlWarnings: string[] = [];
    const crawledPages: string[] = [];
    let sourceMode: "url_only" | "url_plus_text" | "text_only" = hasText ? "url_plus_text" : "url_only";

    // Fetch homepage + a few key pages
    const origin = new URL(baseUrl).origin;
    const urls = [origin, `${origin}/pricing`, `${origin}/products`, `${origin}/about`, `${origin}/features`];
    console.log(`Fetching pages for ${origin}`);

    const results = await Promise.allSettled(urls.map(u => fetchPageText(u)));
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled" && r.value.length > 150) {
        crawledContent += `\n[PAGE: ${urls[i]}]\n${r.value}\n`;
        crawledPages.push(urls[i]);
      }
    }

    if (crawledPages.length === 0 && !hasText) {
      return new Response(JSON.stringify({
        error: "Could not access website. Please paste your website text in the 'Website Text' field.",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (crawledPages.length === 0) sourceMode = "text_only";

    let combinedText = hasText ? websiteText : "";
    if (crawledContent) combinedText += (combinedText ? "\n\n" : "") + crawledContent;

    const contextParts = additionalContext ? Object.entries(additionalContext)
      .filter(([_, v]) => v && String(v).trim())
      .map(([k, v]) => `${k}: ${v}`) : [];
    if (contextParts.length) combinedText += `\n\nAdditional context: ${contextParts.join("; ")}`;

    // Trim to safe size
    combinedText = combinedText.slice(0, 15000);

    console.log(`Content length: ${combinedText.length}, pages: ${crawledPages.length}, mode: ${sourceMode}`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a brand intelligence extraction engine. Analyze website content to produce a structured Brand JSON. Extract ONLY what is evidenced. Use empty arrays for missing data. For brand_colors, extract the actual hex color codes used on the website (from CSS, inline styles, or visual cues in the content). Primary = main brand color, secondary = supporting color, accent = highlight/CTA color. If colors cannot be determined, leave as empty strings. Industry context: ${industry}. Return ONLY valid JSON, no markdown fences.`,
          },
          {
            role: "user",
            content: `Extract a Brand JSON from this content for industry "${industry}", website "${websiteUrl}".

Return this exact JSON structure:
{"brand_identity":{"brand_name":"","website":"","industry":"","geography_focus":"","tagline":"","positioning":"","tone_of_voice":""},"business_model":{"business_model_description":"","monetization_model":"","pricing_tiers":[]},"product_ecosystem":{"core_products":[],"product_modules":[],"feature_modules":[],"feature_clusters":[],"platforms":[],"primary_platforms":[],"has_mobile_app":false,"has_web_platform":false},"audience_intelligence":{"primary_segments":[],"secondary_segments":[],"experience_levels":[],"risk_profiles":[],"personas_detected":[]},"value_framework":{"value_propositions":[],"differentiators":[]},"engagement_architecture":{"engagement_drivers":[],"seasonal_triggers":[],"event_based_triggers":[],"urgency_patterns":[]},"lifecycle_signal_map":{"key_user_actions":[],"key_user_events":[],"activation_events":[],"monetization_events":[],"churn_signals":[],"inactivity_markers":[],"lifecycle_markers":[]},"risk_compliance_layer":{"regulatory_environment":[],"regulatory_flags":[],"compliance_intensity":"Low","risk_signals":[],"high_risk_behaviors":[]},"industry_signal_layer":{"industry_kpis":[],"industry_vocabulary":[],"industry_signal_vocabulary":[]},"kpi_framework":{"primary_kpis":[],"secondary_kpis":[],"risk_kpis":[]},"tech_scale_layer":{"has_cdp":false,"has_crm":false,"supports_real_time_triggers":false,"has_mobile_app":false,"supports_primary_channels":false,"supported_channels":[],"volume_indicators_found":[],"monthly_active_users_band":""},"brand_colors":{"primary":"","secondary":"","accent":"","background":"","text_primary":"","text_secondary":"","additional_colors":[]},"extraction_metadata":{"source_mode":"${sourceMode}","pages_crawled":${JSON.stringify(crawledPages)},"confidence_by_section":{},"evidence_snippets":[],"missing_sections":[],"warnings":${JSON.stringify(crawlWarnings)}}}

Content:
${combinedText}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 6000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI extraction failed");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("No AI response content");

    let jsonStr = content.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
    // Also strip leading/trailing non-JSON chars
    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("JSON parse failed, first 300 chars:", jsonStr.substring(0, 300));
      throw new Error("Failed to parse brand profile JSON");
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Brand profile error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
