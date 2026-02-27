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
    const { imageBase64, additionalContext, industry } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "Image is required for analysis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contextInstruction = additionalContext
      ? `\n\nAdditional context from the user: "${additionalContext}"\nUse this context to adjust severity of findings and add relevant implications. Rules:\n- If context mentions "Clipping" → flag email length, HTML weight\n- If context mentions "Low CTR" → emphasize CTA placement and hierarchy\n- If context mentions "Deliverability" → reduce image dependency, link density\n- If context mentions "AMP email" → consider interactive element placement + fallback quality\nDo NOT repeat the context verbatim; interpret and apply it to your findings.`
      : "";

    const industryNote = industry ? `\nIndustry context: ${industry}. Tailor observations to this vertical's standards.` : "";

    const systemPrompt = `You are an expert email creative analyst. You analyze email creative screenshots and provide structured audit findings.

Your analysis MUST be based primarily on the uploaded image. Be specific about what you see.${industryNote}${contextInstruction}

You must respond using the suggest_creative_analysis tool with your findings structured into three sections:

1. effectivePractices: What the email does well. Cover these areas where applicable: Branding, Layout, Visuals, Content, Accessibility, Compliance. One practice per row, neutral professional language, no commentary.

2. riskAreas: Design & content risk areas. Cover these areas where applicable: Header, CTA, Visual Hierarchy, Content Structure, Images & GIFs, Footer, Mobile Optimization, Load Time. Max 8 rows. Each has an observation (what's wrong) and impact (what it affects: scannability, CTR, accessibility, deliverability).

3. improvements: 5-7 concise, action-oriented, implementation-ready bullet points. No repetition from risk areas.`;

    const userContent = [
      {
        type: "image_url",
        image_url: {
          url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`,
        },
      },
      {
        type: "text",
        text: "Analyze this email creative image. Provide your complete analysis using the tool.",
      },
    ];

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "suggest_creative_analysis",
                description: "Return structured creative analysis findings.",
                parameters: {
                  type: "object",
                  properties: {
                    effectivePractices: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          area: { type: "string", description: "Area: Branding, Layout, Visuals, Content, Accessibility, or Compliance" },
                          practice: { type: "string", description: "One-line description of the effective practice" },
                        },
                        required: ["area", "practice"],
                        additionalProperties: false,
                      },
                    },
                    riskAreas: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          area: { type: "string", description: "Area: Header, CTA, Visual Hierarchy, Content Structure, Images & GIFs, Footer, Mobile Optimization, or Load Time" },
                          observation: { type: "string", description: "What is wrong" },
                          impact: { type: "string", description: "What it affects (scannability, CTR, accessibility, deliverability)" },
                        },
                        required: ["area", "observation", "impact"],
                        additionalProperties: false,
                      },
                    },
                    improvements: {
                      type: "array",
                      items: { type: "string" },
                      description: "5-7 concise, action-oriented improvement recommendations",
                    },
                  },
                  required: ["effectivePractices", "riskAreas", "improvements"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "suggest_creative_analysis" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      // Fallback: try to parse from content
      const content = aiResponse.choices?.[0]?.message?.content;
      if (content) {
        try {
          const parsed = JSON.parse(content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
          return new Response(
            JSON.stringify({ success: true, data: parsed }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch {
          throw new Error("Failed to parse AI response");
        }
      }
      throw new Error("No tool call response from AI");
    }

    const analysisData = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ success: true, data: analysisData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Creative analysis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
