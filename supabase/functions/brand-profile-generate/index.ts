import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple HTML to text extraction
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, " [HEADER] ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPageText(url: string): Promise<{ text: string; ok: boolean }> {
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BrandProfileBot/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!resp.ok) return { text: "", ok: false };
    const html = await resp.text();
    return { text: htmlToText(html).slice(0, 8000), ok: true };
  } catch {
    return { text: "", ok: false };
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

    // Format base URL
    let baseUrl = websiteUrl.trim();
    if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = `https://${baseUrl}`;
    }

    let crawledContent = "";
    let crawlWarnings: string[] = [];
    let crawledPages: string[] = [];
    let sourceMode: "url_only" | "url_plus_text" | "text_only" = hasText ? "url_plus_text" : "url_only";

    // Attempt to fetch key pages via simple HTTP
    const pathsToTry = [
      "", "pricing", "products", "solutions", "features", "about",
    ];
    const urlsToFetch = pathsToTry.map(p => {
      const origin = new URL(baseUrl).origin;
      return p ? `${origin}/${p}` : origin;
    });

    console.log(`Fetching up to ${urlsToFetch.length} pages for ${baseUrl}`);

    const results = await Promise.allSettled(urlsToFetch.map(u => fetchPageText(u)));
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled" && r.value.ok && r.value.text.length > 200) {
        crawledContent += `\n\n--- PAGE: ${urlsToFetch[i]} ---\n${r.value.text}`;
        crawledPages.push(urlsToFetch[i]);
      }
    }

    if (crawledPages.length === 0 && !hasText) {
      crawlWarnings.push("Could not fetch website content. The site may block automated access. Please provide Website Text manually.");
      sourceMode = "text_only";
    }

    if (!hasText && crawledPages.length === 0) {
      return new Response(JSON.stringify({
        error: "Could not access website. Please paste your website text in the 'Website Text' field.",
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Combine all text sources
    let combinedText = "";
    if (hasText) {
      combinedText = websiteText;
      if (crawledContent) combinedText += `\n\n--- CRAWLED CONTENT ---\n${crawledContent}`;
    } else {
      combinedText = crawledContent;
    }

    // Additional context
    const contextStr = additionalContext ? Object.entries(additionalContext)
      .filter(([_, v]) => v && String(v).trim())
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n") : "";
    if (contextStr) combinedText += `\n\n--- ADDITIONAL CONTEXT ---\n${contextStr}`;

    // Call AI
    const systemPrompt = `You are a brand intelligence extraction engine. You analyze website content and business context to produce a structured Brand JSON profile.

CRITICAL RULES:
- Extract ONLY what is evidenced in the provided text
- For each major section, include evidence_snippets (1-2 short quotes from the source text that support your extraction)
- Assign a confidence level per section: "high" (clear evidence), "medium" (inferred from context), "low" (weak/no evidence)
- Do NOT fabricate or hallucinate data. If information is not present, use empty arrays or "Not detected"
- Use industry vocabulary appropriate to: ${industry}

OUTPUT: Return a valid JSON object with this EXACT structure:
{
  "brand_identity": {
    "brand_name": "string", "website": "string", "industry": "string",
    "geography_focus": "string", "tagline": "string", "positioning": "string", "tone_of_voice": "string"
  },
  "business_model": {
    "business_model_description": "string", "monetization_model": "string", "pricing_tiers": ["string"]
  },
  "product_ecosystem": {
    "core_products": ["string"], "product_modules": ["string"], "feature_modules": ["string"],
    "feature_clusters": ["string"], "platforms": ["string"], "primary_platforms": ["string"],
    "has_mobile_app": false, "has_web_platform": false
  },
  "audience_intelligence": {
    "primary_segments": ["string"], "secondary_segments": ["string"],
    "experience_levels": ["string"], "risk_profiles": ["string"], "personas_detected": ["string"]
  },
  "value_framework": { "value_propositions": ["string"], "differentiators": ["string"] },
  "engagement_architecture": {
    "engagement_drivers": ["string"], "seasonal_triggers": ["string"],
    "event_based_triggers": ["string"], "urgency_patterns": ["string"]
  },
  "lifecycle_signal_map": {
    "key_user_actions": ["string"], "key_user_events": ["string"],
    "activation_events": ["string"], "monetization_events": ["string"],
    "churn_signals": ["string"], "inactivity_markers": ["string"], "lifecycle_markers": ["string"]
  },
  "risk_compliance_layer": {
    "regulatory_environment": ["string"], "regulatory_flags": ["string"],
    "compliance_intensity": "High|Medium|Low", "risk_signals": ["string"], "high_risk_behaviors": ["string"]
  },
  "industry_signal_layer": {
    "industry_kpis": ["string"], "industry_vocabulary": ["string"], "industry_signal_vocabulary": ["string"]
  },
  "kpi_framework": { "primary_kpis": ["string"], "secondary_kpis": ["string"], "risk_kpis": ["string"] },
  "tech_scale_layer": {
    "has_cdp": false, "has_crm": false, "supports_real_time_triggers": false,
    "has_mobile_app": false, "supports_primary_channels": false,
    "supported_channels": ["string"], "volume_indicators_found": ["string"], "monthly_active_users_band": "string"
  },
  "extraction_metadata": {
    "source_mode": "${sourceMode}",
    "pages_crawled": ${JSON.stringify(crawledPages)},
    "confidence_by_section": {},
    "evidence_snippets": [],
    "missing_sections": [],
    "warnings": ${JSON.stringify(crawlWarnings)}
  }
}`;

    const userPrompt = `Extract a complete Brand JSON profile from the following content.

Industry: ${industry}
Website URL: ${websiteUrl}
Source Mode: ${sourceMode}

--- CONTENT ---
${combinedText.slice(0, 30000)}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error("AI extraction failed");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("No AI response");

    // Parse JSON from response
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("JSON parse failed:", jsonStr.substring(0, 500));
      throw new Error("Failed to parse brand profile");
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
