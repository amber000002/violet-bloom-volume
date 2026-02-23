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
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
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

function extractTextBlocks(pageContents: Record<string, string>): Record<string, any> {
  const allText = Object.values(pageContents).join(" ");
  
  // Extract hero text from homepage (first ~500 chars of meaningful content)
  const homepageText = pageContents["homepage"] || "";
  const heroText = homepageText.slice(0, 500).trim();

  // Extract headline candidates (short impactful phrases)
  const headlineCandidates: string[] = [];
  const sentences = allText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10 && s.length < 120);
  for (const s of sentences.slice(0, 30)) {
    if (/\b(leading|best|powerful|simple|fast|secure|trusted|#1|grow|transform|automate|unlock|boost)\b/i.test(s)) {
      headlineCandidates.push(s);
    }
  }

  // Extract CTA phrases
  const ctaPhrases: string[] = [];
  const ctaPatterns = /\b(get started|sign up|try free|start free|book a demo|request demo|contact us|learn more|see how|join now|start now|free trial|schedule|talk to|request a|explore)\b[^.!?]{0,60}/gi;
  let ctaMatch;
  while ((ctaMatch = ctaPatterns.exec(allText)) !== null) {
    ctaPhrases.push(ctaMatch[0].trim());
    if (ctaPhrases.length >= 10) break;
  }

  // Extract product intro sections from /products, /features pages
  const productText = pageContents["/products"] || pageContents["/features"] || "";
  const productIntroSections = productText
    ? productText.split(/\s{3,}/).filter(s => s.length > 30).slice(0, 5)
    : [];

  // Extract differentiator sections from /about, homepage
  const aboutText = pageContents["/about"] || "";
  const diffText = aboutText || homepageText;
  const differentiatorSections: string[] = [];
  const diffSentences = diffText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
  for (const s of diffSentences) {
    if (/\b(only|unique|unlike|different|first|exclusive|proprietary|patent|innovative)\b/i.test(s)) {
      differentiatorSections.push(s);
    }
    if (differentiatorSections.length >= 5) break;
  }

  // Extract value proposition blocks
  const valuePropositionBlocks: string[] = [];
  for (const s of sentences) {
    if (/\b(help|enable|empower|save|reduce|increase|improve|deliver|provide|ensure)\b/i.test(s)) {
      valuePropositionBlocks.push(s);
    }
    if (valuePropositionBlocks.length >= 8) break;
  }

  return {
    hero_text: heroText,
    product_intro_sections: productIntroSections,
    differentiator_sections: differentiatorSections,
    value_proposition_blocks: valuePropositionBlocks,
    headline_candidates: headlineCandidates.slice(0, 8),
    cta_phrases: [...new Set(ctaPhrases)].slice(0, 8),
  };
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

    // Fetch homepage + high-signal pages
    const origin = new URL(baseUrl).origin;
    const pagePaths = ["", "/pricing", "/products", "/features", "/about", "/solutions", "/security", "/privacy", "/apps"];
    const urls = pagePaths.map(p => `${origin}${p}`);
    console.log(`Fetching ${urls.length} pages for ${origin}`);

    const results = await Promise.allSettled(urls.map(u => fetchPageText(u)));
    const pageContents: Record<string, string> = {};
    
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled" && r.value.length > 150) {
        const path = pagePaths[i] || "homepage";
        crawledContent += `\n[PAGE: ${urls[i]}]\n${r.value}\n`;
        crawledPages.push(urls[i]);
        pageContents[path] = r.value;
      }
    }

    if (crawledPages.length === 0 && !hasText) {
      return new Response(JSON.stringify({
        error: "Could not access website. Please paste your website text in the 'Website Text' field.",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (crawledPages.length === 0) sourceMode = "text_only";

    // Extract structured text blocks from crawled pages
    const websiteTextBlocks = extractTextBlocks(pageContents);

    let combinedText = hasText ? websiteText : "";
    if (crawledContent) combinedText += (combinedText ? "\n\n" : "") + crawledContent;

    const contextParts = additionalContext ? Object.entries(additionalContext)
      .filter(([_, v]) => v && String(v).trim())
      .map(([k, v]) => `${k}: ${v}`) : [];
    if (contextParts.length) combinedText += `\n\nAdditional context: ${contextParts.join("; ")}`;

    // Trim to safe size
    combinedText = combinedText.slice(0, 15000);

    // Build grounding instructions from text blocks
    const groundingHints = [];
    if (websiteTextBlocks.hero_text) groundingHints.push(`Hero text from homepage: "${websiteTextBlocks.hero_text.slice(0, 300)}"`);
    if (websiteTextBlocks.headline_candidates.length) groundingHints.push(`Key headlines found: ${websiteTextBlocks.headline_candidates.slice(0, 4).map((h: string) => `"${h}"`).join(", ")}`);
    if (websiteTextBlocks.differentiator_sections.length) groundingHints.push(`Differentiator language: ${websiteTextBlocks.differentiator_sections.slice(0, 3).map((d: string) => `"${d}"`).join(", ")}`);
    if (websiteTextBlocks.cta_phrases.length) groundingHints.push(`CTA phrases: ${websiteTextBlocks.cta_phrases.slice(0, 4).map((c: string) => `"${c}"`).join(", ")}`);

    const groundingBlock = groundingHints.length > 0
      ? `\n\nGROUNDING INSTRUCTIONS — Use these extracted text signals to derive fields accurately:\n${groundingHints.join("\n")}\n\nRules:\n- tagline MUST closely reflect the homepage hero text or headline. Do NOT invent a new tagline.\n- positioning MUST use language found on the website. Do NOT rewrite into generic marketing language.\n- tone_of_voice MUST be derived from actual sentence structure, adjective frequency, formality level, and CTA verb style on the website.\n- core_products names MUST match the exact product naming used on the website.\n- differentiators MUST reflect claims actually made on the website. Do NOT extrapolate.\n- If evidence is insufficient for a field, leave it partially populated and set confidence to "low" for that section.`
      : "";

    console.log(`Content length: ${combinedText.length}, pages: ${crawledPages.length}, mode: ${sourceMode}, textBlocks: ${Object.keys(websiteTextBlocks).length}`);

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
            content: `You are a brand intelligence extraction engine. Analyze website content to produce a structured Brand JSON. Extract ONLY what is evidenced in the provided text. Use empty arrays for missing data. Preserve the brand's authentic language — do not rewrite into generic marketing copy. Industry context: ${industry}. Return ONLY valid compact JSON on a single line, no markdown fences, no pretty-printing, no newlines inside the JSON. Keep string values concise (under 150 chars each). For pricing_tiers use simple string names like "Free", "Pro", not full objects.`,
          },
          {
            role: "user",
            content: `Extract a Brand JSON from this content for industry "${industry}", website "${websiteUrl}".
${groundingBlock}

CRITICAL: Output MUST be compact single-line JSON. Keep all string values SHORT (under 150 chars). Use simple strings for pricing_tiers (e.g. ["Free","Pro","Enterprise"]), not objects. Use simple strings for segments (not objects). This ensures the output fits within token limits.

Return this exact JSON structure:
{"brand_identity":{"brand_name":"","website":"","industry":"","geography_focus":"","tagline":"","positioning":"","tone_of_voice":""},"business_model":{"business_model_description":"","monetization_model":"","pricing_tiers":[]},"product_ecosystem":{"core_products":[],"product_modules":[],"feature_modules":[],"feature_clusters":[],"platforms":[],"primary_platforms":[],"has_mobile_app":false,"has_web_platform":false},"audience_intelligence":{"primary_segments":[],"secondary_segments":[],"experience_levels":[],"risk_profiles":[],"personas_detected":[]},"value_framework":{"value_propositions":[],"differentiators":[]},"engagement_architecture":{"engagement_drivers":[],"seasonal_triggers":[],"event_based_triggers":[],"urgency_patterns":[]},"lifecycle_signal_map":{"key_user_actions":[],"key_user_events":[],"activation_events":[],"monetization_events":[],"churn_signals":[],"inactivity_markers":[],"lifecycle_markers":[]},"risk_compliance_layer":{"regulatory_environment":[],"regulatory_flags":[],"compliance_intensity":"Low","risk_signals":[],"high_risk_behaviors":[]},"industry_signal_layer":{"industry_kpis":[],"industry_vocabulary":[],"industry_signal_vocabulary":[]},"kpi_framework":{"primary_kpis":[],"secondary_kpis":[],"risk_kpis":[]},"tech_scale_layer":{"has_cdp":false,"has_crm":false,"supports_real_time_triggers":false,"has_mobile_app":false,"supports_primary_channels":false,"supported_channels":[],"volume_indicators_found":[],"monthly_active_users_band":""},"extraction_metadata":{"source_mode":"${sourceMode}","pages_crawled":${JSON.stringify(crawledPages)},"confidence_by_section":{},"evidence_snippets":[],"missing_sections":[],"warnings":${JSON.stringify(crawlWarnings)}}}

Content:
${combinedText}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 8000,
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
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    } catch (firstErr) {
      // Clean common LLM JSON issues: trailing commas, control chars
      try {
        const cleaned = jsonStr
          .replace(/,\s*}/g, "}")
          .replace(/,\s*]/g, "]")
          .replace(/[\x00-\x1F\x7F]/g, (ch) => ch === '\n' || ch === '\r' || ch === '\t' ? ' ' : '')
          .replace(/\s+/g, " ");
        parsed = JSON.parse(cleaned);
        console.log("JSON parsed after cleaning");
      } catch {
        console.error("JSON parse failed even after cleaning, first 500 chars:", jsonStr.substring(0, 500));
        throw new Error("Failed to parse brand profile JSON");
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: parsed,
      website_text_blocks: websiteTextBlocks,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Brand profile error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
