import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CRAWL_PATHS = [
  "", // homepage
  "pricing",
  "products", "solutions", "platform",
  "features",
  "industries", "segments", "customers",
  "about", "about-us",
  "blog",
  "terms", "privacy-policy", "privacy",
];

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

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    // Determine source mode
    const hasText = websiteText && websiteText.trim().length > 50;
    let sourceMode: "url_only" | "url_plus_text" | "text_only" = hasText ? "text_only" : "url_only";
    
    let crawledContent = "";
    let crawlWarnings: string[] = [];
    let crawledPages: string[] = [];

    // Attempt URL crawl if we have Firecrawl and need URL content
    if (FIRECRAWL_API_KEY && (sourceMode === "url_only" || hasText)) {
      if (hasText) sourceMode = "url_plus_text";

      // Format base URL
      let baseUrl = websiteUrl.trim();
      if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
        baseUrl = `https://${baseUrl}`;
      }
      const urlObj = new URL(baseUrl);
      const origin = urlObj.origin;

      // First, use map to discover actual pages
      let discoveredUrls: string[] = [];
      try {
        const mapResp = await fetch("https://api.firecrawl.dev/v1/map", {
          method: "POST",
          headers: { "Authorization": `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url: origin, limit: 50, includeSubdomains: false }),
        });
        if (mapResp.ok) {
          const mapData = await mapResp.json();
          discoveredUrls = (mapData.links || []).slice(0, 50);
        }
      } catch (e) {
        console.error("Map failed:", e);
      }

      // Prioritize pages matching our target paths
      const targetUrls: string[] = [];
      for (const path of CRAWL_PATHS) {
        const fullPath = path ? `${origin}/${path}` : origin;
        // Check if any discovered URL starts with this path
        const match = discoveredUrls.find(u => 
          u.toLowerCase().startsWith(fullPath.toLowerCase()) ||
          u.toLowerCase().includes(`/${path}`)
        );
        if (match && !targetUrls.includes(match)) {
          targetUrls.push(match);
        } else if (!match && path === "") {
          targetUrls.push(origin);
        }
      }

      // Cap at 10 pages
      const pagesToCrawl = targetUrls.slice(0, 10);
      console.log(`Crawling ${pagesToCrawl.length} pages for ${origin}`);

      // Scrape pages in parallel batches of 3
      for (let i = 0; i < pagesToCrawl.length; i += 3) {
        const batch = pagesToCrawl.slice(i, i + 3);
        const results = await Promise.allSettled(
          batch.map(async (pageUrl) => {
            const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: { "Authorization": `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({ url: pageUrl, formats: ["markdown"], onlyMainContent: true, waitFor: 3000 }),
            });
            if (!resp.ok) throw new Error(`Scrape failed: ${resp.status}`);
            return { url: pageUrl, data: await resp.json() };
          })
        );

        for (const result of results) {
          if (result.status === "fulfilled") {
            const md = result.value.data?.data?.markdown || result.value.data?.markdown || "";
            if (md.length > 100) {
              crawledContent += `\n\n--- PAGE: ${result.value.url} ---\n${md.slice(0, 5000)}`;
              crawledPages.push(result.value.url);
            }
          } else {
            crawlWarnings.push(`Failed to scrape a page: ${result.reason}`);
          }
        }

        // Stop early if we have enough content (>15k chars)
        if (crawledContent.length > 15000) break;
      }

      if (crawledContent.length < 500 && !hasText) {
        crawlWarnings.push("Limited content extracted from website. Bot protection or dynamic rendering may be blocking access.");
      }
    } else if (!FIRECRAWL_API_KEY && !hasText) {
      return new Response(JSON.stringify({ 
        error: "Firecrawl connector not configured. Please provide Website Text manually or enable Firecrawl." 
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Combine all text sources
    let combinedText = "";
    if (hasText) {
      combinedText = websiteText;
      if (crawledContent) {
        combinedText += `\n\n--- ADDITIONAL CRAWLED CONTENT ---\n${crawledContent}`;
      }
    } else {
      combinedText = crawledContent;
    }

    // Additional context
    const contextStr = additionalContext ? Object.entries(additionalContext)
      .filter(([_, v]) => v && String(v).trim())
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n") : "";

    if (contextStr) {
      combinedText += `\n\n--- ADDITIONAL CONTEXT ---\n${contextStr}`;
    }

    // Call AI to generate structured brand JSON
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
    "brand_name": "string",
    "website": "string",
    "industry": "string",
    "geography_focus": "string",
    "tagline": "string",
    "positioning": "string",
    "tone_of_voice": "string"
  },
  "business_model": {
    "business_model_description": "string",
    "monetization_model": "string",
    "pricing_tiers": ["string"]
  },
  "product_ecosystem": {
    "core_products": ["string"],
    "product_modules": ["string"],
    "feature_modules": ["string"],
    "feature_clusters": ["string"],
    "platforms": ["string"],
    "primary_platforms": ["string"],
    "has_mobile_app": boolean,
    "has_web_platform": boolean
  },
  "audience_intelligence": {
    "primary_segments": ["string"],
    "secondary_segments": ["string"],
    "experience_levels": ["string"],
    "risk_profiles": ["string"],
    "personas_detected": ["string"]
  },
  "value_framework": {
    "value_propositions": ["string"],
    "differentiators": ["string"]
  },
  "engagement_architecture": {
    "engagement_drivers": ["string"],
    "seasonal_triggers": ["string"],
    "event_based_triggers": ["string"],
    "urgency_patterns": ["string"]
  },
  "lifecycle_signal_map": {
    "key_user_actions": ["string"],
    "key_user_events": ["string"],
    "activation_events": ["string"],
    "monetization_events": ["string"],
    "churn_signals": ["string"],
    "inactivity_markers": ["string"],
    "lifecycle_markers": ["string"]
  },
  "risk_compliance_layer": {
    "regulatory_environment": ["string"],
    "regulatory_flags": ["string"],
    "compliance_intensity": "High|Medium|Low",
    "risk_signals": ["string"],
    "high_risk_behaviors": ["string"]
  },
  "industry_signal_layer": {
    "industry_kpis": ["string"],
    "industry_vocabulary": ["string"],
    "industry_signal_vocabulary": ["string"]
  },
  "kpi_framework": {
    "primary_kpis": ["string"],
    "secondary_kpis": ["string"],
    "risk_kpis": ["string"]
  },
  "tech_scale_layer": {
    "has_cdp": boolean,
    "has_crm": boolean,
    "supports_real_time_triggers": boolean,
    "has_mobile_app": boolean,
    "supports_primary_channels": boolean,
    "supported_channels": ["string"],
    "volume_indicators_found": ["string"],
    "monthly_active_users_band": "string"
  },
  "extraction_metadata": {
    "source_mode": "${sourceMode}",
    "pages_crawled": ${JSON.stringify(crawledPages)},
    "confidence_by_section": {
      "brand_identity": "high|medium|low",
      "business_model": "high|medium|low",
      "product_ecosystem": "high|medium|low",
      "audience_intelligence": "high|medium|low",
      "engagement_architecture": "high|medium|low",
      "lifecycle_signal_map": "high|medium|low",
      "risk_compliance_layer": "high|medium|low",
      "tech_scale_layer": "high|medium|low"
    },
    "evidence_snippets": [
      {"section": "string", "snippet": "short quote from source", "confidence": "high|medium|low"}
    ],
    "missing_sections": ["list sections with low/no evidence"],
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
        model: "google/gemini-3-flash-preview",
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
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
