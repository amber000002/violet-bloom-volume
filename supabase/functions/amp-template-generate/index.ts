// AMP Template Generation
// Takes a use case template (HTML), a brand profile JSON, and optional brand reference HTML
// and produces a brand-styled AMP for Email HTML using Lovable AI (Gemini 2.5 Pro).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestBody {
  templateHtml: string;
  templateLabel?: string;
  brandProfile: any;
  brandDesignProfile?: any;
  referenceHtml?: string;
  // Optional brand website to ground absolute URLs
  websiteUrl?: string;
  model?: string;
}

function extractBrandSummary(brandProfile: any, brandDesignProfile: any) {
  const identity = brandProfile?.brand_identity ?? {};
  const colorsFromCore = brandProfile?.brand_colors ?? {};
  const designColors = brandDesignProfile?.colors ?? {};
  const colors = {
    primary: designColors.primary || colorsFromCore.primary || "#111111",
    secondary: designColors.secondary || colorsFromCore.secondary || "#444444",
    accent: designColors.accent || colorsFromCore.accent || "#0F62FE",
    background: designColors.background || colorsFromCore.background || "#FFFFFF",
    text_primary: designColors.text_primary || colorsFromCore.text_primary || "#111111",
  };
  const logoUrl = brandDesignProfile?.logo?.logo_url || brandProfile?.brand_design_profile?.logo?.logo_url || "";
  const fonts = brandDesignProfile?.fonts || {};
  return {
    brand_name: identity.brand_name || "",
    website: identity.website || "",
    industry: identity.industry || "",
    tagline: identity.tagline || "",
    positioning: identity.positioning || "",
    tone_of_voice: identity.tone_of_voice || "",
    value_propositions: brandProfile?.value_propositions || [],
    colors,
    logo_url: logoUrl,
    fonts,
  };
}

const SYSTEM_PROMPT = `You are an expert AMP for Email engineer. You re-style email templates to match a brand's identity while preserving the original layout structure and outputting strictly valid AMP for Email.

Hard rules (the output MUST follow these):
1. Keep the document a valid AMP for Email document. The opening tag MUST be <!doctype html><html ⚡4email>. Include the AMP boilerplate <style amp4email-boilerplate>body{visibility:hidden}</style> in <head>.
2. Include <script async src="https://cdn.ampproject.org/v0.js"></script>.
3. Replace any <img> with <amp-img> (with explicit width, height, and layout="responsive" or layout="fixed").
4. NEVER use inline style="" attributes. All styles go in a single <style amp-custom> block in <head>.
5. NEVER use !important.
6. All href / src must be absolute (https://, mailto:, tel:, data:, or # anchors). No relative paths.
7. Do not add <script> tags except the AMP runtime import.
8. Keep CSS under 75 KB.
9. Preserve the structural blocks of the input template (header / hero / sections / cta / footer ordering) but restyle them.

Brand application:
- Apply the brand's primary color to primary CTAs, links, and accents.
- Apply secondary / accent colors to supporting elements.
- Apply the brand's text/background colors to body and surfaces.
- If a logo URL is provided, use it in the header in place of any existing logo / brand mark.
- Apply the brand fonts via @import or font-family stacks; fall back to system fonts if not webfont-safe in email.
- Rewrite copy to match the brand's tone_of_voice and positioning. Replace generic placeholder copy and value props with the brand's value props where relevant. Keep CTA verbs short and on-brand.
- If a brand reference HTML is provided, mimic its visual rhythm (spacing, padding, button radius, header layout) but do NOT copy its copy verbatim.

Output:
- Return ONLY the final HTML document. No markdown fences. No commentary. No JSON wrapper.`;

function buildUserPrompt(params: {
  templateHtml: string;
  templateLabel?: string;
  brandSummary: ReturnType<typeof extractBrandSummary>;
  referenceHtml?: string;
}) {
  const { templateHtml, templateLabel, brandSummary, referenceHtml } = params;
  const refBlock = referenceHtml
    ? `\n\n=== BRAND REFERENCE EMAIL HTML (style cues only — do not copy text) ===\n${referenceHtml.slice(0, 40000)}`
    : "";
  return `Re-style the following use case template to match the brand below. Return ONLY the final AMP for Email HTML.

=== BRAND ===
${JSON.stringify(brandSummary, null, 2)}

=== USE CASE TEMPLATE${templateLabel ? ` (${templateLabel})` : ""} ===
${templateHtml.slice(0, 80000)}${refBlock}`;
}

function stripCodeFences(s: string): string {
  let out = s.trim();
  if (out.startsWith("```")) {
    out = out.replace(/^```(?:[a-zA-Z]+)?\n/, "");
    out = out.replace(/\n```\s*$/, "");
  }
  return out.trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as RequestBody;
    if (!body?.templateHtml || typeof body.templateHtml !== "string") {
      return new Response(JSON.stringify({ error: "templateHtml is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!body.brandProfile || typeof body.brandProfile !== "object") {
      return new Response(JSON.stringify({ error: "brandProfile is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brandSummary = extractBrandSummary(body.brandProfile, body.brandDesignProfile);

    const model = body.model || "google/gemini-2.5-pro";

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: buildUserPrompt({
              templateHtml: body.templateHtml,
              templateLabel: body.templateLabel,
              brandSummary,
              referenceHtml: body.referenceHtml,
            }),
          },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const txt = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, txt);
      return new Response(JSON.stringify({ error: "AI gateway error", details: txt }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    const html = stripCodeFences(raw);

    if (!html || !/<html/i.test(html)) {
      return new Response(
        JSON.stringify({ error: "Model returned empty or non-HTML response", raw: raw.slice(0, 500) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        html,
        brandSummary,
        model,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("amp-template-generate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
