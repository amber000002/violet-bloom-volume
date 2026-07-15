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
    const rawHtml = String(html);
    // Collect AMP/interactive component tag names as signal
    const tagMatches = Array.from(rawHtml.matchAll(/<(amp-[a-z0-9-]+|button|form)\b/gi)).map((m) => m[1].toLowerCase());
    const uniqueTags = Array.from(new Set(tagMatches)).slice(0, 30).join(", ");
    // Strip tags for cheaper classification
    const text = rawHtml
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000);

    const system = `You classify marketing/lifecycle emails into EXACTLY ONE of these categories: ${CATEGORIES.join(", ")}.

Category cues (use these to disambiguate — do NOT default to "Promotional" when a more specific category fits):
- Gamification: interactive game mechanics inside the email — spin-the-wheel, scratch card, scratch-to-reveal, quiz, trivia, poll with reward, tap-to-reveal, mystery box, streaks, points/leaderboard, "play now", "reveal your prize", "unlock reward", or AMP components used as game surfaces (amp-carousel/amp-selector/amp-bind driving reveal-a-prize flows, amp-form submitting quiz answers). Presence of ANY of these outranks a generic promo framing.
- Cart Abandonment: references items left in cart/bag, "complete your purchase", "still thinking?".
- Browse Abandonment: viewed products without add-to-cart, "picking up where you left off".
- Welcome: first email after sign-up, "welcome to", account activation.
- Onboarding: multi-step setup, "get started", "next step", feature tours.
- Re-engagement: "we miss you", "it's been a while", win-back.
- Loyalty / Rewards: tier updates, points balance, member perks (without a game mechanic).
- Promotional: pure discount/sale/offer with no game mechanic and no lifecycle trigger.
- Transactional: order confirmation, receipt, shipping, OTP, password reset.
- Newsletter: editorial digest, roundup.
- Product Announcement: new feature/product launch.
- Feedback / Survey: NPS, review request.
- Event / Webinar: invite/reminder for an event.

Respond as STRICT JSON: {"category": "<one of the categories>", "confidence": <0-1>}. No prose.`;
    const user = `Label: ${label}\nCustomer: ${customer}\nType: ${templateType}\nInteractive tags detected: ${uniqueTags || "none"}\n\nEmail content (text only):\n${text}`;

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
