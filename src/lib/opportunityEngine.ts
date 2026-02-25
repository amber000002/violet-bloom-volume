// ============= INTELLIGENT OPPORTUNITY & STRATEGIC REFRESH ENGINE =============
// Detects non-obvious revenue opportunities, excludes active campaigns,
// and generates 6-10 diversified campaign recommendations.

import { CampaignRow } from "./csvAnalyzer";
import { EventSchemaRow, UserPropertyRow, classifyEventToStage } from "./schemaAnalyzer";
import { SendMixEntry } from "./strategicInsightsExtendedEngine";
import { CoreBrandJSON } from "@/types/brandProfile";

// ===== TYPES =====

export type OpportunitySourceType =
  | "drop_off"
  | "underutilized_event"
  | "content_program"
  | "predictive_segment"
  | "revenue_expansion"
  | "lifecycle_gap"
  | "frequency_optimization"
  | "loyalty_program"
  | "referral_growth";

export type RevenueImpactLevel = "High" | "Medium" | "Low";

export type ReadinessStatus =
  | "Ready"
  | "Requires Event"
  | "Requires Property"
  | "Requires Predictive Layer";

export interface OpportunityCampaign {
  campaignName: string;
  channel: string;
  targetSegment: string;
  trigger: string;
  messageTheme: string;
  successMetric: string;
  // Internal metadata (Section E)
  _meta: {
    sourceType: OpportunitySourceType;
    implementedAlready: false;
    revenueImpactLevel: RevenueImpactLevel;
    readinessStatus: ReadinessStatus;
  };
}

export interface ActiveUseCaseInfo {
  name: string;
  stage: string;
  status: "active" | "missing" | "review-needed";
}

export interface OpportunityEngineInput {
  campaignData: CampaignRow[];
  activeCoverage: ActiveUseCaseInfo[];
  sendMix: SendMixEntry[];
  eventSchemaData: EventSchemaRow[] | null;
  userPropertyData: UserPropertyRow[] | null;
  brandProfile: CoreBrandJSON | null;
  websiteUrl: string;
}

export interface OpportunityEngineOutput {
  campaigns: OpportunityCampaign[];
  exclusionLog: string[];
  opportunitySources: Record<OpportunitySourceType, number>;
}

// ===== SECTION A — EXCLUSION ENGINE =====

interface ExclusionContext {
  activeUseCaseNames: Set<string>;
  activeThemeKeywords: Set<string>;
  existingCampaignThemes: Set<string>;
}

function buildExclusionContext(
  activeCoverage: ActiveUseCaseInfo[],
  campaignData: CampaignRow[],
): ExclusionContext {
  const activeUseCaseNames = new Set<string>();
  const activeThemeKeywords = new Set<string>();

  // 1) Remove active use cases
  for (const uc of activeCoverage) {
    if (uc.status === "active") {
      activeUseCaseNames.add(uc.name.toLowerCase());
      // Extract theme keywords
      for (const word of uc.name.toLowerCase().split(/[\s\-_/]+/)) {
        if (word.length > 3) activeThemeKeywords.add(word);
      }
    }
  }

  // 2) Cluster campaign names for theme dedup
  const themeWords = ["deposit", "upgrade", "renew", "reminder", "offer", "welcome",
    "onboard", "payment", "refer", "feedback", "survey", "kyc", "verify",
    "statement", "transaction", "newsletter", "reward", "cashback"];
  const existingCampaignThemes = new Set<string>();
  for (const c of campaignData) {
    const name = c.campaignName.toLowerCase();
    for (const tw of themeWords) {
      if (name.includes(tw)) existingCampaignThemes.add(tw);
    }
  }

  return { activeUseCaseNames, activeThemeKeywords, existingCampaignThemes };
}

function isExcluded(campaignName: string, ctx: ExclusionContext): boolean {
  const lower = campaignName.toLowerCase();
  for (const name of ctx.activeUseCaseNames) {
    if (lower.includes(name) || name.includes(lower)) return true;
  }
  // Check if >2 theme keywords overlap
  const words = lower.split(/[\s\-_/]+/).filter(w => w.length > 3);
  let overlap = 0;
  for (const w of words) {
    if (ctx.activeThemeKeywords.has(w)) overlap++;
  }
  return overlap >= 2;
}

// ===== BRAND CONTEXT HELPER =====

interface BrandContext {
  name: string;
  products: string[];
  tiers: string[];
  positioning: string;
  tone: string;
  industry: string;
  tagline: string;
}

function extractBrandContext(brandProfile: CoreBrandJSON | null): BrandContext {
  return {
    name: brandProfile?.brand_identity?.brand_name || "",
    products: brandProfile?.product_ecosystem?.core_products || [],
    tiers: brandProfile?.business_model?.pricing_tiers || [],
    positioning: brandProfile?.brand_identity?.positioning || "",
    tone: brandProfile?.brand_identity?.tone_of_voice || "",
    industry: brandProfile?.brand_identity?.industry || "",
    tagline: brandProfile?.brand_identity?.tagline || "",
  };
}

/** Build a credible campaign name using brand vocabulary */
function brandedName(template: string, ctx: BrandContext): string {
  let name = template;
  name = name.replace(/\{brand\}/g, ctx.name || "Your");
  name = name.replace(/\{product1\}/g, ctx.products[0] || "Core Product");
  name = name.replace(/\{product2\}/g, ctx.products[1] || "Add-On");
  name = name.replace(/\{topTier\}/g, ctx.tiers[ctx.tiers.length - 1] || "Premium");
  name = name.replace(/\{industry\}/g, ctx.industry || "Industry");
  return name;
}

// ===== SECTION B — OPPORTUNITY DISCOVERY =====

// B1: Drop-Off Recovery
function detectDropOffs(events: EventSchemaRow[] | null, brandProfile: CoreBrandJSON | null): OpportunityCampaign[] {
  if (!events || events.length === 0) return [];
  const campaigns: OpportunityCampaign[] = [];
  const ctx = extractBrandContext(brandProfile);

  const eventNames = events.map(e => e.eventName.toLowerCase());
  const dropOffPatterns: Array<{ start: RegExp; success: RegExp; label: string; nameTemplate: string }> = [
    { start: /pageload|page_load|page_view/, success: /success|complete|submit/, label: "Page View", nameTemplate: "Resume {brand} Exploration — Convert Browsers to Buyers" },
    { start: /start|begin|initiate/, success: /complete|success|done|finish/, label: "Flow Start", nameTemplate: "{brand} Application Recovery — Complete Your Submission" },
    { start: /click|tap/, success: /submit|confirm|complete/, label: "Click Intent", nameTemplate: "Abandoned Intent Rescue — Re-Engage High-Signal Users" },
    { start: /add_to_cart|cart_add/, success: /purchase|checkout_complete|order/, label: "Cart", nameTemplate: "{brand} Cart Recovery — Secure Your Selection" },
    { start: /search/, success: /purchase|book|apply|select/, label: "Search", nameTemplate: "Search-to-{industry} Conversion — Turn Discovery Into Action" },
  ];

  for (const pattern of dropOffPatterns) {
    const startEvents = eventNames.filter(e => pattern.start.test(e));
    const successEvents = eventNames.filter(e => pattern.success.test(e));

    if (startEvents.length > 0 && successEvents.length === 0) {
      const startSample = startEvents[0].replace(/_/g, " ");
      campaigns.push({
        campaignName: brandedName(pattern.nameTemplate, ctx),
        channel: "Push",
        targetSegment: `Users with ${startSample} but no completion`,
        trigger: `${startEvents[0]} without corresponding success event`,
        messageTheme: "Resume where you left off — complete securely",
        successMetric: "Completion Rate",
        _meta: {
          sourceType: "drop_off",
          implementedAlready: false,
          revenueImpactLevel: "High",
          readinessStatus: "Ready",
        },
      });
      break;
    }
  }

  return campaigns;
}

// B2: Underutilized Event Monetization
function detectUnderutilizedEvents(
  events: EventSchemaRow[] | null,
  activeCoverage: ActiveUseCaseInfo[],
  brandProfile: CoreBrandJSON | null,
): OpportunityCampaign[] {
  if (!events || events.length === 0) return [];
  const campaigns: OpportunityCampaign[] = [];
  const ctx = extractBrandContext(brandProfile);

  const activeEventKeywords = new Set<string>();
  for (const uc of activeCoverage) {
    if (uc.status === "active") {
      for (const w of uc.name.toLowerCase().split(/[\s\-_/]+/)) {
        if (w.length > 3) activeEventKeywords.add(w);
      }
    }
  }

  // Find events in Monetization/Engagement stage not tied to active use cases
  for (const ev of events) {
    const stage = classifyEventToStage(ev.eventName);
    if (stage === "Engagement" || stage === "Monetization") {
      const nameWords = ev.eventName.toLowerCase().split(/[_\-\s]+/);
      const isUsed = nameWords.some(w => w.length > 3 && activeEventKeywords.has(w));
      if (!isUsed) {
        const readableEvent = ev.eventName.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        const prefix = ctx.name ? `${ctx.name} ` : "";
        campaigns.push({
          campaignName: `${prefix}${readableEvent} Monetization Accelerator`,
          channel: "Email",
          targetSegment: `Users performing ${ev.eventName} frequently`,
          trigger: `${ev.eventName} count > threshold`,
          messageTheme: `Turn ${readableEvent.toLowerCase()} engagement into ${ctx.products[0] || "product"} value`,
          successMetric: "Conversion Rate",
          _meta: {
            sourceType: "underutilized_event",
            implementedAlready: false,
            revenueImpactLevel: "Medium",
            readinessStatus: "Ready",
          },
        });
        break;
      }
    }
  }

  return campaigns;
}

// B3: Content Program Detection
function detectContentPrograms(
  websiteUrl: string,
  brandProfile: CoreBrandJSON | null,
): OpportunityCampaign[] {
  const campaigns: OpportunityCampaign[] = [];

  const contentSignals = [
    "blog", "resources", "insights", "newsroom", "knowledge",
    "webinar", "podcast", "learn", "academy", "guides", "tutorials",
  ];

  const brandText = [
    websiteUrl,
    brandProfile?.brand_identity?.tagline || "",
    brandProfile?.brand_identity?.positioning || "",
    ...(brandProfile?.product_ecosystem?.core_products || []),
    ...(brandProfile?.engagement_architecture?.engagement_drivers || []),
  ].join(" ").toLowerCase();

  const hasContentSignal = contentSignals.some(s => brandText.includes(s));

  if (hasContentSignal || websiteUrl) {
    const brandName = brandProfile?.brand_identity?.brand_name || "Brand";
    const industry = brandProfile?.brand_identity?.industry || "";
    const contentType = contentSignals.find(s => brandText.includes(s)) || "insights";
    const topicFlavor = industry ? `${industry} ` : "";
    campaigns.push({
      campaignName: `${brandName} ${topicFlavor}${capitalize(contentType)} Digest`,
      channel: "Email",
      targetSegment: "Active Digital Users",
      trigger: "Weekly recurring schedule",
      messageTheme: `Curated ${topicFlavor.toLowerCase()}${contentType}, product tips & expert perspectives`,
      successMetric: "Engagement Rate & Click-to-Read Rate",
      _meta: {
        sourceType: "content_program",
        implementedAlready: false,
        revenueImpactLevel: "Medium",
        readinessStatus: "Ready",
      },
    });
  }

  return campaigns;
}

// B4: AI / Predictive Layer
function detectPredictiveOpportunities(
  brandProfile: CoreBrandJSON | null,
  events: EventSchemaRow[] | null,
): OpportunityCampaign[] {
  const campaigns: OpportunityCampaign[] = [];

  const hasAISignal = brandProfile && [
    ...(brandProfile.product_ecosystem?.core_products || []),
    ...(brandProfile.product_ecosystem?.feature_modules || []),
    brandProfile.brand_identity?.positioning || "",
  ].join(" ").toLowerCase().match(/ai|machine learning|predict|recommend|smart|intelligent/);

  const hasHighDensity = events && events.length > 30;

  if (hasAISignal || hasHighDensity) {
    const ctx = extractBrandContext(brandProfile);
    const actionVerb = ctx.industry.match(/finance|bank|insurance/i) ? "Pre-Approved" 
      : ctx.industry.match(/ecommerce|retail|shop/i) ? "Personalized Pick"
      : ctx.industry.match(/saas|software|tech/i) ? "Smart Recommendation"
      : "Pre-Qualified";
    const noun = ctx.products[0] ? `${ctx.products[0]} ` : "";
    campaigns.push({
      campaignName: `${actionVerb} ${noun}Opportunity Alert`,
      channel: "Push",
      targetSegment: "Likely to Convert (Predictive Score > Threshold)",
      trigger: "Predictive model score crosses activation threshold",
      messageTheme: `Personalized ${noun.toLowerCase()}offer based on behavioral prediction`,
      successMetric: "Application / Conversion Rate",
      _meta: {
        sourceType: "predictive_segment",
        implementedAlready: false,
        revenueImpactLevel: "High",
        readinessStatus: "Requires Predictive Layer",
      },
    });
  }

  return campaigns;
}

// B5: Revenue Expansion
function detectRevenueExpansion(
  brandProfile: CoreBrandJSON | null,
  activeCoverage: ActiveUseCaseInfo[],
): OpportunityCampaign[] {
  const campaigns: OpportunityCampaign[] = [];

  const hasUpsellActive = activeCoverage.some(uc =>
    uc.status === "active" && /upgrade|upsell|premium/i.test(uc.name)
  );

  if (!hasUpsellActive) {
    const brandName = brandProfile?.brand_identity?.brand_name || "Premium";
    const tiers = brandProfile?.business_model?.pricing_tiers || [];
    const tierText = tiers.length > 0 ? tiers[tiers.length - 1] : "Premium Tier";

    campaigns.push({
      campaignName: `${brandName} ${tierText} Upgrade — Unlock Exclusive Benefits`,
      channel: "In-App",
      targetSegment: "High-Value Users with consistent engagement",
      trigger: "Transaction frequency or engagement score threshold",
      messageTheme: `Exclusive ${brandName} ${tierText} benefits — elevate your experience`,
      successMetric: "Upgrade Rate / ARPU Lift",
      _meta: {
        sourceType: "revenue_expansion",
        implementedAlready: false,
        revenueImpactLevel: "High",
        readinessStatus: "Ready",
      },
    });
  }

  // Cross-product bundling
  const products = brandProfile?.product_ecosystem?.core_products || [];
  if (products.length >= 2) {
    const brandName = brandProfile?.brand_identity?.brand_name || "";
    const prefix = brandName ? `${brandName} ` : "";
    campaigns.push({
      campaignName: `${prefix}${products[0]} × ${products[1]} Bundle Discovery`,
      channel: "Email",
      targetSegment: `Users active on ${products[0]} but not ${products[1]}`,
      trigger: "Segment-based: Single-product active users",
      messageTheme: `See how ${products[0]} and ${products[1]} work better together`,
      successMetric: "Cross-Product Adoption Rate",
      _meta: {
        sourceType: "revenue_expansion",
        implementedAlready: false,
        revenueImpactLevel: "Medium",
        readinessStatus: "Ready",
      },
    });
  }

  return campaigns;
}

// B6: Frequency & Fatigue Optimization
function detectFrequencyOptimization(
  campaignData: CampaignRow[],
  sendMix: SendMixEntry[],
  brandProfile: CoreBrandJSON | null,
): OpportunityCampaign[] {
  const campaigns: OpportunityCampaign[] = [];
  const ctx = extractBrandContext(brandProfile);

  const totalSent = campaignData.reduce((s, c) => s + c.totalSentUsers, 0);
  const totalClicked = campaignData.reduce((s, c) => s + c.uniqueClickedWithinConversion, 0);
  const avgCTR = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
  const highVolume = totalSent > 500000;
  const lowCTR = avgCTR < 1.5;

  const batchHeavy = sendMix.some(s =>
    s.deliveryType.toLowerCase().includes("one time") && s.percentShare > 60
  );

  if ((highVolume && lowCTR) || batchHeavy) {
    const prefix = ctx.name ? `${ctx.name} ` : "";
    campaigns.push({
      campaignName: `${prefix}Intelligent Send-Time & Frequency Calibration`,
      channel: "Push",
      targetSegment: "High Message Exposure Users (≥5 messages/week)",
      trigger: "Engagement-based frequency cap breach",
      messageTheme: "Right message, right moment — personalized cadence",
      successMetric: "CTR Improvement & Unsubscribe Rate Reduction",
      _meta: {
        sourceType: "frequency_optimization",
        implementedAlready: false,
        revenueImpactLevel: "Medium",
        readinessStatus: "Ready",
      },
    });
  }

  return campaigns;
}

// B7: Lifecycle Coverage Gaps
function detectLifecycleGaps(
  activeCoverage: ActiveUseCaseInfo[],
  brandProfile: CoreBrandJSON | null,
): OpportunityCampaign[] {
  const campaigns: OpportunityCampaign[] = [];

  const lifecycleStages = [
    "onboarding", "activation", "engagement", "monetization",
    "retention", "winback", "advocacy", "referral",
  ];

  const coveredStages = new Set<string>();
  for (const uc of activeCoverage) {
    if (uc.status === "active" && uc.stage) {
      coveredStages.add(uc.stage.toLowerCase());
    }
  }

  const brandName = brandProfile?.brand_identity?.brand_name || "";
  const products = brandProfile?.product_ecosystem?.core_products || [];
  const topProduct = products[0] || "";
  const prefix = brandName ? `${brandName} ` : "";

  const gapStageTemplates: Record<string, Omit<OpportunityCampaign, "_meta">> = {
    onboarding: {
      campaignName: `${prefix}First 7-Day ${topProduct || "Product"} Activation Sprint`,
      channel: "Email",
      targetSegment: "New signups within 7 days",
      trigger: "Account created + no key action completed",
      messageTheme: `Get started with ${topProduct || brandName || "your account"} — guided setup`,
      successMetric: "Activation Rate",
    },
    referral: {
      campaignName: `${prefix}Refer & Earn — Grow the ${brandName || "Community"} Network`,
      channel: "Push",
      targetSegment: "High Engagement Users",
      trigger: "Referral layer activation — engaged user segment",
      messageTheme: `Invite peers to ${brandName || "the platform"}, earn rewards together`,
      successMetric: "Referral Conversion Rate",
    },
    winback: {
      campaignName: `${prefix}Return to ${topProduct || brandName || "Your Account"} — Exclusive Offer`,
      channel: "Email",
      targetSegment: "Dormant users (30+ days inactive)",
      trigger: "Inactivity threshold crossed",
      messageTheme: `We've missed you — here's what's new in ${brandName || "your account"}`,
      successMetric: "Reactivation Rate",
    },
    retention: {
      campaignName: `${prefix}Loyalty Milestone Celebration & Reward`,
      channel: "In-App",
      targetSegment: "Users approaching loyalty milestones",
      trigger: "Usage streak or transaction milestone",
      messageTheme: `Celebrate your ${brandName || "journey"} milestones — unlock next tier`,
      successMetric: "Retention Rate & NPS Improvement",
    },
    advocacy: {
      campaignName: `${prefix}Product Experience Feedback Loop`,
      channel: "Email",
      targetSegment: "Post-transaction satisfied users",
      trigger: "Transaction completion + positive signal",
      messageTheme: `Help shape the future of ${brandName || "the product"}`,
      successMetric: "NPS Score & Response Rate",
    },
  };

  for (const stage of lifecycleStages) {
    if (!coveredStages.has(stage) && gapStageTemplates[stage]) {
      const template = gapStageTemplates[stage];
      campaigns.push({
        ...template,
        _meta: {
          sourceType: "lifecycle_gap",
          implementedAlready: false,
          revenueImpactLevel: stage === "monetization" || stage === "retention" ? "High" : "Medium",
          readinessStatus: "Ready",
        },
      });
    }
  }

  return campaigns;
}

// ===== MAIN ENGINE =====

export function generateOpportunities(input: OpportunityEngineInput): OpportunityEngineOutput {
  const exclusionCtx = buildExclusionContext(input.activeCoverage, input.campaignData);
  const exclusionLog: string[] = [];

  // Collect all opportunity candidates
  const allCandidates: OpportunityCampaign[] = [
    ...detectDropOffs(input.eventSchemaData, input.brandProfile),
    ...detectUnderutilizedEvents(input.eventSchemaData, input.activeCoverage, input.brandProfile),
    ...detectContentPrograms(input.websiteUrl, input.brandProfile),
    ...detectPredictiveOpportunities(input.brandProfile, input.eventSchemaData),
    ...detectRevenueExpansion(input.brandProfile, input.activeCoverage),
    ...detectFrequencyOptimization(input.campaignData, input.sendMix, input.brandProfile),
    ...detectLifecycleGaps(input.activeCoverage, input.brandProfile),
  ];

  // Apply exclusion engine
  const filtered: OpportunityCampaign[] = [];
  for (const c of allCandidates) {
    if (isExcluded(c.campaignName, exclusionCtx)) {
      exclusionLog.push(`Excluded: "${c.campaignName}" — overlaps with active use case or theme`);
    } else {
      filtered.push(c);
    }
  }

  // Ensure minimum diversity per Section C requirements
  const requiredTypes: OpportunitySourceType[] = [
    "drop_off", "underutilized_event", "content_program",
    "predictive_segment", "revenue_expansion",
  ];
  const presentTypes = new Set(filtered.map(c => c._meta.sourceType));
  
  // If a required type is missing, add a fallback
  for (const rt of requiredTypes) {
    if (!presentTypes.has(rt)) {
      const fallback = generateFallback(rt, input.brandProfile);
      if (fallback && !isExcluded(fallback.campaignName, exclusionCtx)) {
        filtered.push(fallback);
      }
    }
  }

  // Deduplicate by campaign name similarity
  const deduped = deduplicateCampaigns(filtered);

  // Cap at 10 campaigns, minimum 6
  const finalCampaigns = deduped.slice(0, 10);

  // Build source distribution
  const opportunitySources: Record<OpportunitySourceType, number> = {
    drop_off: 0, underutilized_event: 0, content_program: 0,
    predictive_segment: 0, revenue_expansion: 0, lifecycle_gap: 0,
    frequency_optimization: 0, loyalty_program: 0, referral_growth: 0,
  };
  for (const c of finalCampaigns) {
    opportunitySources[c._meta.sourceType]++;
  }

  return { campaigns: finalCampaigns, exclusionLog, opportunitySources };
}

// ===== HELPERS =====

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function generateFallback(
  type: OpportunitySourceType,
  brandProfile: CoreBrandJSON | null,
): OpportunityCampaign | null {
  const brandName = brandProfile?.brand_identity?.brand_name || "Brand";
  const topProduct = brandProfile?.product_ecosystem?.core_products?.[0] || "";
  const prefix = brandName !== "Brand" ? `${brandName} ` : "";

  const fallbacks: Record<string, OpportunityCampaign> = {
    drop_off: {
      campaignName: `${prefix}Incomplete Journey Recovery — Resume & Convert`,
      channel: "Push",
      targetSegment: "Users who started but didn't complete key actions",
      trigger: "Intent event without success event within 24h",
      messageTheme: `Pick up where you left off on ${brandName} — one step away`,
      successMetric: "Completion Rate",
      _meta: { sourceType: "drop_off", implementedAlready: false, revenueImpactLevel: "High", readinessStatus: "Requires Event" },
    },
    underutilized_event: {
      campaignName: `${prefix}Engagement-to-Revenue Accelerator`,
      channel: "Email",
      targetSegment: "High-engagement users not yet converted",
      trigger: "Engagement score above threshold, no revenue event",
      messageTheme: `Your ${brandName} activity unlocks exclusive opportunities`,
      successMetric: "First Conversion Rate",
      _meta: { sourceType: "underutilized_event", implementedAlready: false, revenueImpactLevel: "Medium", readinessStatus: "Requires Event" },
    },
    content_program: {
      campaignName: `${brandName} Monthly ${topProduct || "Product"} Deep Dive`,
      channel: "Email",
      targetSegment: "All active users",
      trigger: "Monthly recurring schedule",
      messageTheme: `Expert ${topProduct || brandName} insights and mastery tips`,
      successMetric: "Engagement Rate",
      _meta: { sourceType: "content_program", implementedAlready: false, revenueImpactLevel: "Low", readinessStatus: "Ready" },
    },
    predictive_segment: {
      campaignName: `${prefix}Churn Risk Intervention — Proactive Save`,
      channel: "Email",
      targetSegment: "Likely to Churn (Predictive)",
      trigger: "Churn prediction model score > threshold",
      messageTheme: `Personalized re-engagement with exclusive ${brandName} value`,
      successMetric: "Retention Save Rate",
      _meta: { sourceType: "predictive_segment", implementedAlready: false, revenueImpactLevel: "High", readinessStatus: "Requires Predictive Layer" },
    },
    revenue_expansion: {
      campaignName: `${brandName} Premium Upgrade — Unlock Next-Level Benefits`,
      channel: "In-App",
      targetSegment: "High transaction frequency users",
      trigger: "Revenue threshold or usage milestone",
      messageTheme: `Exclusive ${brandName} benefits await — elevate your experience`,
      successMetric: "Upgrade Rate",
      _meta: { sourceType: "revenue_expansion", implementedAlready: false, revenueImpactLevel: "High", readinessStatus: "Ready" },
    },
  };

  return fallbacks[type] || null;
}

function deduplicateCampaigns(campaigns: OpportunityCampaign[]): OpportunityCampaign[] {
  const seen = new Set<string>();
  const result: OpportunityCampaign[] = [];

  for (const c of campaigns) {
    const key = c.campaignName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(c);
    }
  }

  return result;
}
