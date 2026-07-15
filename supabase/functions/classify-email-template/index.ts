import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const CATEGORIES = [
  "Welcome",
  "Onboarding",
  "Cart Abandonment",
  "Browse Abandonment",
  "Gamification",
  "Promotional",
  "Newsletter",
  "Transactional",
  "Re-engagement",
  "Product Announcement",
  "Feedback / Survey",
  "Loyalty / Rewards",
  "Event / Webinar",
  "Other",
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { html = "", label = "", customer = "", templateType = "" } = await req.json();
    // Strip tags for cheaper classification
    const text = String(html)
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000);

    const system = `You classify marketing/lifecycle emails into exactly one of these categories: ${CATEGORIES.join(", ")}. Respond as strict JSON: {"category": "<one of the categories>", "confidence": <0-1 number>}. No prose.`;
    const user = `Label: ${label}\nCustomer: ${customer}\nType: ${templateType}\n\nEmail content (text only):\n${text}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: `AI gateway ${res.status}: ${t}` }), {
        status: res.status === 402 || res.status === 429 ? res.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { category?: string; confidence?: number } = {};
    try { parsed = JSON.parse(content); } catch { /* noop */ }

    const category = CATEGORIES.includes(parsed.category || "") ? parsed.category! : "Other";
    const confidence = typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5;

    return new Response(JSON.stringify({ category, confidence }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
