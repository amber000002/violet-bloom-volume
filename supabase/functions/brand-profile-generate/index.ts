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
    .replace(/[^\x20-\x7E\n]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDesignSignals(html: string): string {
  // Extract CSS-relevant snippets: style blocks, inline styles, link tags, meta tags, icon refs
  const styleBlocks = [...html.matchAll(/<style[\s\S]*?<\/style>/gi)].map(m => m[0]).join("\n").slice(0, 6000);
  const metaTags = [...html.matchAll(/<meta[^>]+>/gi)].map(m => m[0]).join("\n").slice(0, 2000);
  const linkTags = [...html.matchAll(/<link[^>]+>/gi)].map(m => m[0]).join("\n").slice(0, 2000);
  const headerArea = html.match(/<header[\s\S]*?<\/header>/i)?.[0]?.slice(0, 2000) || "";
  const footerArea = html.match(/<footer[\s\S]*?<\/footer>/i)?.[0]?.slice(0, 1500) || "";
  const buttonStyles = [...html.matchAll(/<button[^>]*style="[^"]*"[^>]*>/gi)].map(m => m[0]).join("\n").slice(0, 1000);
  const svgIcons = [...html.matchAll(/<svg[^>]*>[\s\S]*?<\/svg>/gi)].slice(0, 5).map(m => m[0].slice(0, 200)).join("\n");
  
  return [
    "[STYLE BLOCKS]", styleBlocks,
    "[META TAGS]", metaTags,
    "[LINK TAGS]", linkTags,
    "[HEADER HTML]", headerArea,
    "[FOOTER HTML]", footerArea,
    "[BUTTON SAMPLES]", buttonStyles,
    "[SVG ICON SAMPLES]", svgIcons,
  ].join("\n").slice(0, 12000);
}

async function fetchPageRaw(url: string): Promise<{ text: string; html: string }> {
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
    if (!resp.ok) return { text: "", html: "" };
    const html = await resp.text();
    return { text: htmlToText(html).slice(0, 4000), html: html.slice(0, 50000) };
  } catch {
    return { text: "", html: "" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { websiteUrl, websiteText, additionalContext, industry, eventSchemaCSV, userPropertiesCSV } = await req.json();

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
    let designRawHtml = "";
    const crawlWarnings: string[] = [];
    const crawledPages: string[] = [];
    let sourceMode: "url_only" | "url_plus_text" | "text_only" = hasText ? "url_plus_text" : "url_only";

    const origin = new URL(baseUrl).origin;
    const urls = [origin, `${origin}/pricing`, `${origin}/products`, `${origin}/about`, `${origin}/features`, `${origin}/solutions`];
    console.log(`Fetching pages for ${origin}`);

    const results = await Promise.allSettled(urls.map(u => fetchPageRaw(u)));
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled" && r.value.text.length > 150) {
        crawledContent += `\n[PAGE: ${urls[i]}]\n${r.value.text}\n`;
        crawledPages.push(urls[i]);
        // Collect raw HTML for design extraction (homepage + first found page)
        if (designRawHtml.length < 30000) {
          designRawHtml += r.value.html;
        }
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

    // Append event schema and user properties data for lifecycle/engagement enrichment
    let schemaContext = "";
    if (eventSchemaCSV && eventSchemaCSV.trim().length > 20) {
      const eventLines = eventSchemaCSV.trim().split("\n").slice(0, 200);
      schemaContext += `\n\n[EVENT SCHEMA - ${eventLines.length - 1} events]\n${eventLines.join("\n")}`;
    }
    if (userPropertiesCSV && userPropertiesCSV.trim().length > 20) {
      const propLines = userPropertiesCSV.trim().split("\n").slice(0, 200);
      schemaContext += `\n\n[USER PROPERTIES SCHEMA - ${propLines.length - 1} properties]\n${propLines.join("\n")}`;
    }

    combinedText = combinedText.slice(0, 15000);

    console.log(`Content length: ${combinedText.length}, pages: ${crawledPages.length}, mode: ${sourceMode}`);

    // ===== STEP 1: Brand Profile extraction (existing) =====
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
            content: `You are a brand intelligence extraction engine. Analyze website content to produce a structured Brand JSON. Extract ONLY what is evidenced. Use empty arrays for missing data. For brand_colors, extract the actual hex color codes used on the website. If EVENT SCHEMA or USER PROPERTIES SCHEMA data is provided, use it to enrich lifecycle_signal_map (map events to key_user_actions, activation_events, monetization_events, churn_signals etc.), engagement_architecture (engagement_drivers, event_based_triggers), tech_scale_layer (supported_channels, volume_indicators), and kpi_framework sections with real instrumented data. Industry context: ${industry}. Return ONLY valid JSON, no markdown fences.`,
          },
          {
            role: "user",
            content: `Extract a Brand JSON from this content for industry "${industry}", website "${websiteUrl}".

Return this exact JSON structure:
{"brand_identity":{"brand_name":"","website":"","industry":"","geography_focus":"","tagline":"","positioning":"","tone_of_voice":""},"business_model":{"business_model_description":"","monetization_model":"","pricing_tiers":[]},"product_ecosystem":{"core_products":[],"product_modules":[],"feature_modules":[],"feature_clusters":[],"platforms":[],"primary_platforms":[],"has_mobile_app":false,"has_web_platform":false},"audience_intelligence":{"primary_segments":[],"secondary_segments":[],"experience_levels":[],"risk_profiles":[],"personas_detected":[]},"value_framework":{"value_propositions":[],"differentiators":[]},"engagement_architecture":{"engagement_drivers":[],"seasonal_triggers":[],"event_based_triggers":[],"urgency_patterns":[]},"lifecycle_signal_map":{"key_user_actions":[],"key_user_events":[],"activation_events":[],"monetization_events":[],"churn_signals":[],"inactivity_markers":[],"lifecycle_markers":[]},"risk_compliance_layer":{"regulatory_environment":[],"regulatory_flags":[],"compliance_intensity":"Low","risk_signals":[],"high_risk_behaviors":[]},"industry_signal_layer":{"industry_kpis":[],"industry_vocabulary":[],"industry_signal_vocabulary":[]},"kpi_framework":{"primary_kpis":[],"secondary_kpis":[],"risk_kpis":[]},"tech_scale_layer":{"has_cdp":false,"has_crm":false,"supports_real_time_triggers":false,"has_mobile_app":false,"supports_primary_channels":false,"supported_channels":[],"volume_indicators_found":[],"monthly_active_users_band":""},"brand_colors":{"primary":"","secondary":"","accent":"","background":"","text_primary":"","text_secondary":"","additional_colors":[]},"extraction_metadata":{"source_mode":"${sourceMode}","pages_crawled":${JSON.stringify(crawledPages)},"confidence_by_section":{},"evidence_snippets":[],"missing_sections":[],"warnings":${JSON.stringify(crawlWarnings)}}}

Content:
${combinedText}${schemaContext}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 7000,
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

    // ===== STEP 2: Brand Design Profile extraction =====
    let designProfile = null;
    if (designRawHtml.length > 500) {
      try {
        const designSignals = extractDesignSignals(designRawHtml);
        console.log(`Design signals extracted: ${designSignals.length} chars`);

        const designResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                content: `You are a visual design system extraction engine. Analyze raw HTML/CSS signals from a website to extract design tokens. Extract ONLY what is evidenced in the HTML/CSS. For colors, extract actual hex codes from CSS variables, inline styles, and class definitions. Ignore pure black (#000000), pure white (#FFFFFF), and neutral grays unless they are clearly the brand's primary design color. For fonts, extract from @font-face declarations, CSS font-family, and Google Fonts link tags. Return ONLY valid JSON, no markdown fences.`,
              },
              {
                role: "user",
                content: `Extract a Brand Design Profile from this website's HTML/CSS for "${websiteUrl}".

Return this exact JSON structure:
{"logo":{"logo_url":"","logo_light":"","logo_dark":"","logo_vector":""},"colors":{"primary":"","secondary":"","accent":"","background":"","text_primary":""},"fonts":{"heading":"","body":""},"gradients":{"hero_gradient":"","accent_gradient":""},"icon_style":"line_icons","visual_style":"product_ui","design_density":"minimal","cta_style":{"radius":"","fill":""},"chart_palette":{"primary":"","secondary":"","neutral":""}}

Instructions:
- logo: Extract from schema.org Organization.logo, og:image meta, header img/svg, favicon link tags. Prioritize schema.org > header nav > og:image > footer > favicon.
- colors: Extract hex codes from CSS variables (:root), button backgrounds, link colors, header backgrounds. Primary = most dominant brand color, secondary = supporting, accent = CTA/highlight.
- fonts: Extract from @font-face, font-family CSS, Google Fonts links. heading = display/heading font, body = body text font.
- gradients: Extract from linear-gradient() or radial-gradient() in CSS. Describe as color direction (e.g. "purple-pink", "blue-teal").
- icon_style: Analyze SVG icons — "line_icons" (stroke-based), "filled_icons" (solid fill), "duotone_icons" (two-tone), "minimal_outline".
- visual_style: Based on page imagery — "product_ui", "illustrations", "photography", "abstract_gradients", "minimal_graphics".
- design_density: Based on spacing/layout — "minimal" (lots of whitespace), "editorial" (magazine-like), "corporate" (dense grids), "playful" (loose/fun).
- cta_style: Extract button border-radius and fill style from CSS.
- chart_palette: Derive from primary, secondary, and a neutral gray from the brand colors.

If an element cannot be determined, use empty string or sensible defaults (icon_style: "minimal_outline", design_density: "minimal", visual_style: "minimal_graphics").

Raw HTML/CSS signals:
${designSignals}`,
              },
            ],
            temperature: 0.2,
            max_tokens: 2000,
          }),
        });

        if (designResponse.ok) {
          const designData = await designResponse.json();
          const designContent = designData.choices?.[0]?.message?.content;
          if (designContent) {
            let dStr = designContent.trim();
            const dMatch = dStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (dMatch) dStr = dMatch[1].trim();
            const dFirst = dStr.indexOf("{");
            const dLast = dStr.lastIndexOf("}");
            if (dFirst !== -1 && dLast !== -1) dStr = dStr.slice(dFirst, dLast + 1);
            try {
              designProfile = JSON.parse(dStr);
              console.log("Design profile extracted successfully");
            } catch {
              console.error("Design profile JSON parse failed");
            }
          }
        } else {
          console.error("Design extraction AI error:", designResponse.status);
        }
      } catch (designErr) {
        console.error("Design extraction failed (non-blocking):", designErr);
      }
    }

    // Attach design profile to brand JSON
    if (designProfile) {
      parsed.brand_design_profile = designProfile;
    }

    return new Response(JSON.stringify({ success: true, data: parsed, brand_design_profile: designProfile }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Brand profile error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
