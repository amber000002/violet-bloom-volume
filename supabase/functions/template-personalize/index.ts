import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { brandProfile, industry, stage, templateType, customTemplate } = await req.json();

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

Brand: ${brandName}
Industry: ${industry}
Lifecycle Stage: ${stage}
Template Type: ${templateType || "html"}
${tagline ? `Tagline: ${tagline}` : ""}
${positioning ? `Positioning: ${positioning}` : ""}
${valueProps.length ? `Value Propositions: ${valueProps.join(", ")}` : ""}
${differentiators.length ? `Differentiators: ${differentiators.join(", ")}` : ""}
${industryVocab.length ? `Industry Vocabulary: ${industryVocab.join(", ")}` : ""}
${coreProducts.length ? `Core Products: ${coreProducts.join(", ")}` : ""}
${primarySegments.length ? `Target Segments: ${primarySegments.join(", ")}` : ""}

The content should be specifically tailored to the "${stage}" lifecycle stage. Make it feel like it was written by the brand's own marketing team.`;

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

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    
    let content;
    if (toolCall?.function?.arguments) {
      content = typeof toolCall.function.arguments === "string" 
        ? JSON.parse(toolCall.function.arguments) 
        : toolCall.function.arguments;
    } else {
      // Fallback: try to parse from message content
      const raw = aiResult.choices?.[0]?.message?.content || "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to extract content from AI response");
      }
    }

    // Build personalized template if custom template provided
    let personalizedHtml = null;
    let personalizedAmp = null;

    if (customTemplate) {
      personalizedHtml = applyTokens(customTemplate, content, brandColors, logo, brandName);
    }

    return new Response(JSON.stringify({
      content,
      brandColors,
      logo,
      personalizedHtml,
      personalizedAmp,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("template-personalize error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function applyTokens(
  template: string,
  content: Record<string, string>,
  colors: Record<string, string>,
  logo: string,
  brandName: string,
): string {
  let result = template;
  
  // Content tokens
  const tokenMap: Record<string, string> = {
    "{{subject}}": content.subject || "",
    "{{preheader}}": content.preheader || "",
    "{{headline}}": content.headline || "",
    "{{subheadline}}": content.subheadline || "",
    "{{body_text}}": content.bodyText || "",
    "{{cta_text}}": content.ctaText || "",
    "{{cta_url}}": content.ctaUrl || "#",
    "{{supporting_text}}": content.supportingText || "",
    "{{footer_note}}": content.footerNote || "",
    "{{brand_name}}": brandName,
    "{{logo_url}}": logo,
    "{{primary_color}}": colors.primary || "#6366f1",
    "{{secondary_color}}": colors.secondary || "#8b5cf6",
    "{{accent_color}}": colors.accent || "#f59e0b",
    "{{background_color}}": colors.background || "#ffffff",
    "{{text_color}}": colors.text_primary || "#1f2937",
  };

  for (const [token, value] of Object.entries(tokenMap)) {
    result = result.replaceAll(token, value);
  }

  return result;
}
