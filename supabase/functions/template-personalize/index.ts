import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { brandProfile, industry, stage, templateType, customTemplate, footerImageBase64 } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const brandName = brandProfile?.brand_identity?.brand_name || "Brand";
    const tone = brandProfile?.brand_identity?.tone_of_voice || "Professional";
    const tagline = brandProfile?.brand_identity?.tagline || "";
    const positioning = brandProfile?.brand_identity?.positioning || "";
    const valueProps = brandProfile?.value_framework?.value_propositions?.slice(0, 3) || [];
    const differentiators = brandProfile?.value_framework?.differentiators?.slice(0, 3) || [];
    const industryVocab = brandProfile?.industry_signal_layer?.industry_vocabulary?.slice(0, 10) || [];
    const coreProducts = brandProfile?.product_ecosystem?.core_products?.slice(0, 3) || [];
    const primarySegments = brandProfile?.audience_intelligence?.primary_segments?.slice(0, 3) || [];

    const brandColors = brandProfile?.brand_colors || brandProfile?.brand_design_profile?.colors || {};
    const logo = brandProfile?.brand_design_profile?.logo?.logo_url || "";

    // Extract visual assets
    const visualAssets = brandProfile?.brand_visual_assets || {};
    const heroImages = (visualAssets?.hero_images || []).filter((u: string) => u?.startsWith("http")).slice(0, 3);
    const productImages = (visualAssets?.product_imagery || []).filter((u: string) => u?.startsWith("http")).slice(0, 3);
    const allBrandImages = [...heroImages, ...productImages].slice(0, 5);

    const brandContext = `Brand: ${brandName}
Industry: ${industry}
Lifecycle Stage: ${stage}
${tagline ? `Tagline: ${tagline}` : ""}
${positioning ? `Positioning: ${positioning}` : ""}
${valueProps.length ? `Value Propositions: ${valueProps.join(", ")}` : ""}
${differentiators.length ? `Differentiators: ${differentiators.join(", ")}` : ""}
${industryVocab.length ? `Industry Vocabulary: ${industryVocab.join(", ")}` : ""}
${coreProducts.length ? `Core Products: ${coreProducts.join(", ")}` : ""}
${primarySegments.length ? `Target Segments: ${primarySegments.join(", ")}` : ""}`;

    // Extract footer HTML from uploaded image if provided
    let footerHtml = "";
    if (footerImageBase64) {
      footerHtml = await extractFooterFromImage(footerImageBase64, brandName, brandColors, logo, LOVABLE_API_KEY);
    }

    // If a custom template is provided, use AI to rewrite its content in-place
    if (customTemplate) {
      return await handleCustomTemplate(customTemplate, brandContext, brandName, tone, brandColors, logo, heroImages, productImages, footerHtml, LOVABLE_API_KEY);
    }

    // Standard flow: generate content tokens for built-in templates
    return await handleBuiltInTemplate(brandContext, brandName, tone, brandColors, logo, allBrandImages, footerHtml, LOVABLE_API_KEY);
  } catch (e) {
    console.error("template-personalize error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function extractFooterFromImage(
  imageBase64: string,
  brandName: string,
  brandColors: Record<string, string>,
  logo: string,
  apiKey: string,
): Promise<string> {
  try {
    const imageUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`;

    const systemPrompt = `You are an expert email HTML developer specializing in footer replication.

You will receive a screenshot of an email creative. Your job is to:
1. Identify the FOOTER section (the bottom portion of the email)
2. Extract every element you see: logo, social media icons/links, unsubscribe text, privacy/terms links, company address, app download badges, copyright text, and any other footer elements
3. Recreate the footer as TABLE-BASED HTML with INLINE CSS that is email-client compatible

CRITICAL RULES:
- Replicate the footer structure, alignment, element order, and spacing as closely as possible to the original
- Use TABLE-based layout (not divs) for email client compatibility
- ALL styles must be inline CSS
- If you see social media icons, use Unicode/text representations or simple styled links: [FB] [IG] [TW] [LI] [YT]
- If you detect a logo in the footer, use this URL: ${logo || "{{logo_url}}"}
- Apply brand colors: Primary=${brandColors.primary || "#333"}, Secondary=${brandColors.secondary || "#666"}, Background for footer=${brandColors.primary || "#333"}, Text=#ffffff
- For any links that aren't clearly readable, use placeholders like "#" for href and descriptive text
- Do NOT hallucinate elements that aren't visible in the image
- Do NOT simplify — preserve the original complexity and structure
- Include ALL visible text (legal disclaimers, addresses, copyright notices)
- Return ONLY the HTML for the footer section — no explanation, no markdown fences

Brand name: ${brandName}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: imageUrl } },
              { type: "text", text: "Extract and replicate the footer exactly as seen in this email creative. Return only the footer HTML." },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Footer extraction AI error:", response.status);
      return "";
    }

    const result = await response.json();
    const rawContent = result.choices?.[0]?.message?.content || "";

    // Strip markdown fences if present
    return rawContent
      .replace(/^```html?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();
  } catch (e) {
    console.error("Footer extraction failed:", e);
    return "";
  }
}

async function handleCustomTemplate(
  customTemplate: string,
  brandContext: string,
  brandName: string,
  tone: string,
  brandColors: Record<string, string>,
  logo: string,
  heroImages: string[],
  productImages: string[],
  footerHtml: string,
  apiKey: string,
) {
  const systemPrompt = `You are an expert email marketing copywriter and HTML email developer.

You will receive an HTML email template and brand context. Your job is to REWRITE the text content inside the HTML to be personalized for this brand, while PRESERVING the exact HTML structure, CSS styles, layout, and all markup.

CRITICAL RULES:
1. Keep ALL HTML tags, attributes, styles, classes, and structure EXACTLY as they are
2. Only replace text content (headlines, body copy, button text, alt text, footer text)
3. Write in the brand's tone of voice: "${tone}"
4. Make content specific to the brand's industry, products, and value propositions
5. Subject line must be under 60 characters
6. Keep the same general content structure (if there's a headline, write a headline; if there's a list, keep it a list)
7. CRITICAL — IMAGE REPLACEMENT RULES:
   a) Categorized brand images are provided below (hero vs product). Match them to the correct template sections.
   b) HERO/BANNER images: Use ONLY for large full-width banner/hero sections at the top of the email. These must be set to width:100% and display:block to fill the container edge-to-edge. Do NOT use product images in hero sections.
   c) PRODUCT images: Use ONLY for product showcase/grid/card sections. These should PRESERVE the original template's image sizing, alignment (centered), and layout style. If the template shows products in a grid or centered cards, keep that exact layout — just swap the src URL.
   d) If the template has more image slots than available brand images, you may reuse images or keep the original placeholder.
   e) NEVER insert images that break the template layout. If an image slot is small (icon-sized), do NOT replace it with a large product photo.
   f) Update alt text on all replaced images to describe the brand content accurately.
8. If the template has a logo image, update src to the brand's logo URL if available
9. CRITICAL — BRAND COLORS: Update ALL color values in inline styles throughout the template to match brand colors:
   - Buttons, links, CTA backgrounds → Primary color
   - Section accents, borders, dividers → Secondary or Accent color
   - Page/section backgrounds → Background color  
   - Body text → Text color
   - FOOTER SECTION: MUST use Primary color as the background-color with white (#ffffff) text. This is mandatory — never leave footer with generic/default colors.
   - HEADER SECTION: Should reflect brand colors in background or accent elements
10. Return ONLY the complete rewritten HTML - no explanation, no markdown code blocks

Brand colors available:
- Primary: ${brandColors.primary || "#6366f1"}
- Secondary: ${brandColors.secondary || "#8b5cf6"}
- Accent: ${brandColors.accent || "#f59e0b"}
- Background: ${brandColors.background || "#ffffff"}
- Text: ${brandColors.text_primary || "#1f2937"}
${logo ? `Brand logo URL: ${logo}` : ""}
${heroImages.length ? `\nHERO/BANNER images (use ONLY for full-width hero/banner sections, set width:100%; display:block):\n${heroImages.map((url: string, i: number) => `  ${i + 1}. ${url}`).join("\n")}` : ""}
${productImages.length ? `\nPRODUCT images (use for product cards/grids, preserve original template sizing & centering):\n${productImages.map((url: string, i: number) => `  ${i + 1}. ${url}`).join("\n")}` : ""}`;

  const userPrompt = `Here is the brand context:
${brandContext}

Here is the HTML email template to personalize:
- Replace ALL text content for this brand
- Replace ALL placeholder/stock image URLs with the brand images listed in the system prompt
- Apply brand colors to ALL inline styles (especially buttons, headers, and footer)
- The footer MUST have brand primary color as background
- Keep HTML structure identical

${customTemplate}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    return handleAIError(response);
  }

  const aiResult = await response.json();
  const rawContent = aiResult.choices?.[0]?.message?.content || "";

  // Strip markdown code fences if present
  let personalizedHtml = rawContent
    .replace(/^```html?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  // Extract a summary of what was changed for the content summary panel
  const contentSummary = {
    subject: extractTextContent(personalizedHtml, "title") || `${brandName} — Personalized Email`,
    preheader: extractPreheader(personalizedHtml) || "",
    headline: extractFirstHeading(personalizedHtml) || "",
    subheadline: "",
    bodyText: "Custom template personalized with brand content",
    ctaText: extractCTAText(personalizedHtml) || "",
    ctaUrl: "#",
    supportingText: "",
    footerNote: "",
  };

  return new Response(JSON.stringify({
    content: contentSummary,
    brandColors,
    logo,
    personalizedHtml,
    personalizedAmp: null,
    isCustomTemplate: true,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleBuiltInTemplate(
  brandContext: string,
  brandName: string,
  tone: string,
  brandColors: Record<string, string>,
  logo: string,
  brandImages: string[],
  apiKey: string,
) {
  const systemPrompt = `You are an expert email marketing copywriter. Generate personalized email content for a brand.

CRITICAL RULES:
- Write in the brand's tone of voice: "${tone}"
- Use industry-specific vocabulary naturally
- Content must feel native to the brand, not generic
- Subject lines must be under 60 characters
- Preheader must be under 100 characters
- Headlines should be compelling and stage-appropriate
- Body copy should be 2-3 sentences max
- CTA should be action-oriented and specific

Return a JSON object with this EXACT structure:
{
  "subject": "string",
  "preheader": "string",
  "headline": "string",
  "subheadline": "string",
  "bodyText": "string",
  "ctaText": "string",
  "ctaUrl": "#",
  "supportingText": "string",
  "footerNote": "string"
}`;

  const userPrompt = `Generate personalized email content for:

${brandContext}

The content should be specifically tailored to the lifecycle stage mentioned above. Make it feel like it was written by the brand's own marketing team.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "generate_email_content",
            description: "Generate personalized email content for the brand",
            parameters: {
              type: "object",
              properties: {
                subject: { type: "string", description: "Email subject line (under 60 chars)" },
                preheader: { type: "string", description: "Email preheader text (under 100 chars)" },
                headline: { type: "string", description: "Main headline in the email" },
                subheadline: { type: "string", description: "Supporting subheadline" },
                bodyText: { type: "string", description: "Body copy (2-3 sentences)" },
                ctaText: { type: "string", description: "CTA button text" },
                ctaUrl: { type: "string", description: "CTA URL" },
                supportingText: { type: "string", description: "Text below the CTA" },
                footerNote: { type: "string", description: "Footer note text" },
              },
              required: ["subject", "preheader", "headline", "subheadline", "bodyText", "ctaText", "ctaUrl", "supportingText", "footerNote"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "generate_email_content" } },
    }),
  });

  if (!response.ok) {
    return handleAIError(response);
  }

  const aiResult = await response.json();
  const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

  let content;
  if (toolCall?.function?.arguments) {
    content = typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;
  } else {
    const raw = aiResult.choices?.[0]?.message?.content || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      content = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("Failed to extract content from AI response");
    }
  }

  return new Response(JSON.stringify({
    content,
    brandColors,
    logo,
    personalizedHtml: null,
    personalizedAmp: null,
    isCustomTemplate: false,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleAIError(response: Response) {
  const status = response.status;
  if (status === 429) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (status === 402) {
    return new Response(JSON.stringify({ error: "Usage credits exhausted. Please top up." }), {
      status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const errText = await response.text();
  console.error("AI gateway error:", status, errText);
  throw new Error(`AI gateway returned ${status}`);
}

// Helper functions to extract content from personalized HTML for the summary panel
function extractTextContent(html: string, tag: string): string {
  const match = html.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, "i"));
  return match?.[1]?.trim() || "";
}

function extractPreheader(html: string): string {
  const match = html.match(/preheader[^>]*>([^<]+)</i) ||
    html.match(/display:\s*none[^>]*>([^<]+)</i);
  return match?.[1]?.trim() || "";
}

function extractFirstHeading(html: string): string {
  const match = html.match(/<h[12][^>]*>([^<]+)</i);
  return match?.[1]?.trim() || "";
}

function extractCTAText(html: string): string {
  const match = html.match(/<a[^>]*(?:class|style)[^>]*button[^>]*>([^<]+)</i) ||
    html.match(/<a[^>]*>([^<]{2,30})<\/a>/i);
  return match?.[1]?.trim() || "";
}
