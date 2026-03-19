// Built-in Email Templates for AMP Email Studio
// These serve as production-ready bases for brand personalization

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  type: "html" | "amp";
  category: "onboarding" | "engagement" | "retention" | "revenue" | "activation" | "general";
  html: string;
}

export const builtInTemplates: EmailTemplate[] = [
  {
    id: "welcome-onboarding",
    name: "Welcome & Onboarding",
    description: "Clean onboarding email with hero, value props, and CTA",
    type: "html",
    category: "onboarding",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{subject}}</title>
<meta name="description" content="{{preheader}}">
</head>
<body style="margin:0;padding:0;background-color:{{background_color}};font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:{{background_color}};">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,{{primary_color}},{{secondary_color}});padding:32px 40px;text-align:center;">
<img src="{{logo_url}}" alt="{{brand_name}}" width="120" style="max-width:120px;margin-bottom:16px;" />
<h1 style="color:#ffffff;font-size:28px;margin:0;font-weight:700;">{{headline}}</h1>
<p style="color:rgba(255,255,255,0.85);font-size:15px;margin:8px 0 0;">{{subheadline}}</p>
</td></tr>

<!-- Body -->
<tr><td style="padding:40px;">
<p style="color:{{text_color}};font-size:16px;line-height:1.6;margin:0 0 24px;">{{body_text}}</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr><td align="center">
<a href="{{cta_url}}" style="display:inline-block;background:{{primary_color}};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">{{cta_text}}</a>
</td></tr>
</table>
<p style="color:#6b7280;font-size:13px;text-align:center;margin:24px 0 0;">{{supporting_text}}</p>
</td></tr>

<!-- Footer -->
<tr><td style="padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
<p style="color:#9ca3af;font-size:12px;margin:0;">{{footer_note}}</p>
<p style="color:#9ca3af;font-size:11px;margin:8px 0 0;">
<a href="#" style="color:#9ca3af;">Unsubscribe</a> &middot; <a href="#" style="color:#9ca3af;">Preferences</a>
</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`,
  },
  {
    id: "engagement-feature",
    name: "Feature Highlight",
    description: "Showcase a key feature or product with visual emphasis",
    type: "html",
    category: "engagement",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{subject}}</title>
<meta name="description" content="{{preheader}}">
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">

<!-- Logo Bar -->
<tr><td style="padding:24px 40px;border-bottom:1px solid #f0f0f0;">
<img src="{{logo_url}}" alt="{{brand_name}}" width="100" style="max-width:100px;" />
</td></tr>

<!-- Hero -->
<tr><td style="padding:40px 40px 24px;">
<div style="background:linear-gradient(135deg,{{primary_color}}15,{{secondary_color}}15);border-radius:12px;padding:32px;text-align:center;border:1px solid {{primary_color}}20;">
<h1 style="color:{{text_color}};font-size:26px;margin:0 0 8px;font-weight:700;">{{headline}}</h1>
<p style="color:#6b7280;font-size:15px;margin:0;">{{subheadline}}</p>
</div>
</td></tr>

<!-- Content -->
<tr><td style="padding:0 40px 32px;">
<p style="color:{{text_color}};font-size:15px;line-height:1.7;margin:0 0 28px;">{{body_text}}</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr><td align="center">
<a href="{{cta_url}}" style="display:inline-block;background:{{primary_color}};color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;">{{cta_text}}</a>
</td></tr>
</table>
<p style="color:#9ca3af;font-size:13px;text-align:center;margin:20px 0 0;">{{supporting_text}}</p>
</td></tr>

<!-- Footer -->
<tr><td style="padding:20px 40px;background-color:#f9fafb;text-align:center;">
<p style="color:#9ca3af;font-size:12px;margin:0;">{{footer_note}}</p>
<p style="color:#9ca3af;font-size:11px;margin:8px 0 0;">
<a href="#" style="color:#9ca3af;">Unsubscribe</a> &middot; <a href="#" style="color:#9ca3af;">Preferences</a>
</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`,
  },
  {
    id: "retention-winback",
    name: "Win-Back & Re-engagement",
    description: "Re-engage inactive users with urgency and value reminder",
    type: "html",
    category: "retention",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{subject}}</title>
<meta name="description" content="{{preheader}}">
</head>
<body style="margin:0;padding:0;background-color:#fafafa;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

<!-- Header with accent -->
<tr><td style="padding:0;">
<div style="height:6px;background:linear-gradient(90deg,{{primary_color}},{{accent_color}},{{secondary_color}});"></div>
</td></tr>

<!-- Logo -->
<tr><td style="padding:32px 40px 16px;text-align:center;">
<img src="{{logo_url}}" alt="{{brand_name}}" width="100" style="max-width:100px;" />
</td></tr>

<!-- Content -->
<tr><td style="padding:0 40px 40px;text-align:center;">
<h1 style="color:{{text_color}};font-size:24px;margin:0 0 12px;font-weight:700;">{{headline}}</h1>
<p style="color:#6b7280;font-size:15px;margin:0 0 8px;">{{subheadline}}</p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
<p style="color:{{text_color}};font-size:15px;line-height:1.7;margin:0 0 28px;text-align:left;">{{body_text}}</p>
<a href="{{cta_url}}" style="display:inline-block;background:linear-gradient(135deg,{{primary_color}},{{secondary_color}});color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:600;">{{cta_text}}</a>
<p style="color:#9ca3af;font-size:13px;margin:20px 0 0;">{{supporting_text}}</p>
</td></tr>

<!-- Footer -->
<tr><td style="padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
<p style="color:#9ca3af;font-size:12px;margin:0;">{{footer_note}}</p>
<p style="color:#9ca3af;font-size:11px;margin:8px 0 0;">
<a href="#" style="color:#9ca3af;">Unsubscribe</a> &middot; <a href="#" style="color:#9ca3af;">Preferences</a>
</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`,
  },
  {
    id: "revenue-promo",
    name: "Promotional / Revenue",
    description: "Drive conversions with offer-centric layout",
    type: "html",
    category: "revenue",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{subject}}</title>
<meta name="description" content="{{preheader}}">
</head>
<body style="margin:0;padding:0;background-color:#111827;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#111827;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#1f2937;border-radius:16px;overflow:hidden;">

<!-- Header -->
<tr><td style="padding:40px 40px 24px;text-align:center;">
<img src="{{logo_url}}" alt="{{brand_name}}" width="100" style="max-width:100px;margin-bottom:20px;" />
<h1 style="color:#ffffff;font-size:30px;margin:0;font-weight:800;letter-spacing:-0.5px;">{{headline}}</h1>
<p style="color:{{accent_color}};font-size:16px;margin:8px 0 0;font-weight:600;">{{subheadline}}</p>
</td></tr>

<!-- Body -->
<tr><td style="padding:0 40px 32px;">
<div style="background:linear-gradient(135deg,{{primary_color}}20,{{secondary_color}}20);border-radius:12px;padding:24px;border:1px solid {{primary_color}}30;">
<p style="color:#d1d5db;font-size:15px;line-height:1.7;margin:0;">{{body_text}}</p>
</div>
</td></tr>

<!-- CTA -->
<tr><td style="padding:0 40px 40px;text-align:center;">
<a href="{{cta_url}}" style="display:inline-block;background:{{accent_color}};color:#111827;text-decoration:none;padding:16px 40px;border-radius:8px;font-size:16px;font-weight:700;">{{cta_text}}</a>
<p style="color:#6b7280;font-size:13px;margin:16px 0 0;">{{supporting_text}}</p>
</td></tr>

<!-- Footer -->
<tr><td style="padding:20px 40px;border-top:1px solid #374151;text-align:center;">
<p style="color:#6b7280;font-size:12px;margin:0;">{{footer_note}}</p>
<p style="color:#6b7280;font-size:11px;margin:8px 0 0;">
<a href="#" style="color:#6b7280;">Unsubscribe</a> &middot; <a href="#" style="color:#6b7280;">Preferences</a>
</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`,
  },
  {
    id: "activation-nudge",
    name: "Activation Nudge",
    description: "Encourage users to complete a key action",
    type: "html",
    category: "activation",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{subject}}</title>
<meta name="description" content="{{preheader}}">
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06);">

<!-- Logo -->
<tr><td style="padding:28px 40px;text-align:center;border-bottom:1px solid #f0f0f0;">
<img src="{{logo_url}}" alt="{{brand_name}}" width="100" style="max-width:100px;" />
</td></tr>

<!-- Progress indicator -->
<tr><td style="padding:32px 40px 0;">
<div style="background:#f3f4f6;border-radius:8px;height:8px;overflow:hidden;">
<div style="background:linear-gradient(90deg,{{primary_color}},{{secondary_color}});width:40%;height:100%;border-radius:8px;"></div>
</div>
<p style="color:#9ca3af;font-size:12px;margin:8px 0 0;text-align:right;">Step 2 of 5</p>
</td></tr>

<!-- Content -->
<tr><td style="padding:24px 40px 40px;">
<h1 style="color:{{text_color}};font-size:24px;margin:0 0 8px;font-weight:700;">{{headline}}</h1>
<p style="color:#6b7280;font-size:14px;margin:0 0 24px;">{{subheadline}}</p>
<p style="color:{{text_color}};font-size:15px;line-height:1.7;margin:0 0 28px;">{{body_text}}</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr><td align="center">
<a href="{{cta_url}}" style="display:inline-block;background:{{primary_color}};color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;">{{cta_text}}</a>
</td></tr>
</table>
<p style="color:#9ca3af;font-size:13px;text-align:center;margin:20px 0 0;">{{supporting_text}}</p>
</td></tr>

<!-- Footer -->
<tr><td style="padding:20px 40px;background-color:#f9fafb;text-align:center;">
<p style="color:#9ca3af;font-size:12px;margin:0;">{{footer_note}}</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`,
  },
];

// AMP versions of templates
export const builtInAmpTemplates: EmailTemplate[] = [
  {
    id: "amp-welcome-onboarding",
    name: "AMP Welcome & Onboarding",
    description: "Interactive onboarding with accordion and real-time content",
    type: "amp",
    category: "onboarding",
    html: `<!doctype html>
<html ⚡4email>
<head>
<meta charset="utf-8">
<script async src="https://cdn.ampproject.org/v0.js"></script>
<script async custom-element="amp-accordion" src="https://cdn.ampproject.org/v0/amp-accordion-0.1.js"></script>
<style amp4email-boilerplate>body{visibility:hidden}</style>
<style amp-custom>
body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: {{background_color}}; }
.container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; }
.header { background: linear-gradient(135deg, {{primary_color}}, {{secondary_color}}); padding: 32px; text-align: center; }
.header h1 { color: #ffffff; font-size: 24px; margin: 0; }
.header p { color: rgba(255,255,255,0.85); font-size: 14px; margin: 8px 0 0; }
.body { padding: 32px; }
.body p { color: {{text_color}}; font-size: 15px; line-height: 1.6; }
.cta { display: inline-block; background: {{primary_color}}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; }
amp-accordion section { border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 8px; overflow: hidden; }
amp-accordion h3 { background: #f9fafb; padding: 12px 16px; margin: 0; font-size: 14px; cursor: pointer; }
amp-accordion div { padding: 12px 16px; font-size: 13px; color: #6b7280; }
.footer { padding: 20px 32px; border-top: 1px solid #e5e7eb; text-align: center; }
.footer p { color: #9ca3af; font-size: 12px; margin: 0; }
</style>
</head>
<body>
<div class="container">
<div class="header">
<h1>{{headline}}</h1>
<p>{{subheadline}}</p>
</div>
<div class="body">
<p>{{body_text}}</p>
<amp-accordion>
<section>
<h3>Getting Started</h3>
<div>Complete your profile setup to unlock all features.</div>
</section>
<section>
<h3>Key Features</h3>
<div>Explore what makes {{brand_name}} different.</div>
</section>
<section>
<h3>Need Help?</h3>
<div>Our support team is here for you 24/7.</div>
</section>
</amp-accordion>
<br>
<center><a href="{{cta_url}}" class="cta">{{cta_text}}</a></center>
<p style="text-align:center;color:#9ca3af;font-size:13px;margin-top:16px;">{{supporting_text}}</p>
</div>
<div class="footer">
<p>{{footer_note}}</p>
</div>
</div>
</body>
</html>`,
  },
  {
    id: "amp-engagement-feature",
    name: "AMP Feature Highlight",
    description: "Interactive feature showcase with expandable sections",
    type: "amp",
    category: "engagement",
    html: `<!doctype html>
<html ⚡4email>
<head>
<meta charset="utf-8">
<script async src="https://cdn.ampproject.org/v0.js"></script>
<script async custom-element="amp-accordion" src="https://cdn.ampproject.org/v0/amp-accordion-0.1.js"></script>
<style amp4email-boilerplate>body{visibility:hidden}</style>
<style amp-custom>
body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
.container { max-width: 600px; margin: 0 auto; background: #ffffff; }
.logo-bar { padding: 20px 32px; border-bottom: 1px solid #f0f0f0; }
.hero { margin: 32px; background: linear-gradient(135deg, {{primary_color}}15, {{secondary_color}}15); border-radius: 12px; padding: 28px; text-align: center; border: 1px solid {{primary_color}}20; }
.hero h1 { color: {{text_color}}; font-size: 22px; margin: 0 0 8px; }
.hero p { color: #6b7280; font-size: 14px; margin: 0; }
.content { padding: 0 32px 32px; }
.content p { color: {{text_color}}; font-size: 14px; line-height: 1.7; }
.cta { display: inline-block; background: {{primary_color}}; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; }
amp-accordion section { border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 8px; }
amp-accordion h3 { padding: 12px; margin: 0; font-size: 14px; background: #fafafa; }
amp-accordion div { padding: 12px; font-size: 13px; color: #6b7280; }
.footer { padding: 20px 32px; background: #f9fafb; text-align: center; }
.footer p { color: #9ca3af; font-size: 12px; margin: 0; }
</style>
</head>
<body>
<div class="container">
<div class="logo-bar"><strong>{{brand_name}}</strong></div>
<div class="hero">
<h1>{{headline}}</h1>
<p>{{subheadline}}</p>
</div>
<div class="content">
<p>{{body_text}}</p>
<amp-accordion>
<section>
<h3>Why This Matters</h3>
<div>This feature directly impacts your daily workflow.</div>
</section>
<section>
<h3>How It Works</h3>
<div>Simple setup, powerful results — get started in minutes.</div>
</section>
</amp-accordion>
<br>
<center><a href="{{cta_url}}" class="cta">{{cta_text}}</a></center>
<p style="text-align:center;color:#9ca3af;font-size:13px;margin-top:16px;">{{supporting_text}}</p>
</div>
<div class="footer"><p>{{footer_note}}</p></div>
</div>
</body>
</html>`,
  },
];

// Get best matching template for a lifecycle stage
export function getTemplateForStage(stage: string, type: "html" | "amp"): EmailTemplate {
  const templates = type === "amp" ? builtInAmpTemplates : builtInTemplates;
  const stageL = stage.toLowerCase();
  
  // Try exact category match
  const categoryMap: Record<string, string> = {
    onboarding: "onboarding",
    activation: "activation",
    engagement: "engagement",
    retention: "retention",
    revenue: "revenue",
    "win-back": "retention",
    monetization: "revenue",
    referral: "engagement",
    acquisition: "onboarding",
  };

  const category = categoryMap[stageL] || "general";
  const match = templates.find(t => t.category === category);
  return match || templates[0];
}

// Get all lifecycle stages for an industry
export function getLifecycleStagesForIndustry(industry: string): string[] {
  const stageMap: Record<string, string[]> = {
    banking: ["Onboarding", "KYC Completion", "Card Activation", "Cross-sell", "Retention", "Win-back"],
    fintech: ["Onboarding", "Activation", "First Transaction", "Engagement", "Revenue", "Retention"],
    "quick-commerce": ["Onboarding", "First Order", "Repeat Purchase", "Engagement", "Revenue", "Retention"],
    "food-tech": ["Onboarding", "First Order", "Repeat Purchase", "Loyalty", "Revenue", "Win-back"],
    "travel-hospitality": ["Onboarding", "Inspiration", "Booking", "Pre-trip", "Post-trip", "Loyalty"],
    "apparel-fashion": ["Onboarding", "Browse", "Cart Abandonment", "Purchase", "Repeat", "Loyalty"],
    ott: ["Onboarding", "Activation", "Content Discovery", "Engagement", "Upgrade", "Retention"],
    edtech: ["Onboarding", "Course Start", "Engagement", "Completion", "Upsell", "Retention"],
    healthcare: ["Onboarding", "Appointment", "Follow-up", "Engagement", "Retention", "Wellness"],
    gaming: ["Onboarding", "Activation", "Engagement", "Monetization", "Retention", "Win-back"],
    beauty: ["Onboarding", "First Purchase", "Routine Building", "Replenishment", "Loyalty", "Win-back"],
    retail: ["Onboarding", "Browse", "Cart", "Purchase", "Repeat", "Loyalty"],
    insurance: ["Onboarding", "Quote", "Policy Activation", "Renewal", "Cross-sell", "Retention"],
    nbfcs: ["Onboarding", "Application", "Disbursement", "Repayment", "Cross-sell", "Retention"],
    amcs: ["Onboarding", "First Investment", "SIP Setup", "Portfolio Growth", "Retention", "Win-back"],
    telecom: ["Onboarding", "Activation", "Recharge", "Upgrade", "Engagement", "Retention"],
  };

  return stageMap[industry] || ["Onboarding", "Activation", "Engagement", "Retention", "Revenue", "Win-back"];
}
