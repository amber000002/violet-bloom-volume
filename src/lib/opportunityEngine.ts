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

// ===== EVENT CONTEXT HELPER =====
// Extracts categorized event names from schema for use in campaign personalization

interface EventContext {
  /** All event names lowercased */
  allEvents: string[];
  /** Events by lifecycle stage */
  byStage: Record<string, string[]>;
  /** Intent/start events (e.g. cart_add, search, signup_start) */
  intentEvents: string[];
  /** Conversion/success events (e.g. purchase, order_complete) */
  conversionEvents: string[];
  /** Engagement events (e.g. view, click, browse) */
  engagementEvents: string[];
  /** Monetization events */
  monetizationEvents: string[];
  /** Retention events */
  retentionEvents: string[];
}

function buildEventContext(events: EventSchemaRow[] | null): EventContext {
  const empty: EventContext = {
    allEvents: [], byStage: {}, intentEvents: [], conversionEvents: [],
    engagementEvents: [], monetizationEvents: [], retentionEvents: [],
  };
  if (!events || events.length === 0) return empty;

  const ctx: EventContext = { ...empty, allEvents: events.map(e => e.eventName) };

  const intentPatterns = /start|begin|initiate|add_to_cart|cart_add|search|click|tap|view_item|browse/;
  const conversionPatterns = /purchase|order|checkout_complete|payment|subscribe|complete|success|confirm|book|deposit|transaction/;
  const engagementPatterns = /open|view|click|search|browse|create|upload|watch|listen|use_feature|interaction|share/;
  const monetizationPatterns = /purchase|payment|checkout|subscribe|plan_upgrade|transaction|billing|deposit|booking|order|revenue/;
  const retentionPatterns = /renew|reactivate|return|reopen|streak|loyalty|repeat|login/;

  for (const ev of events) {
    const n = ev.eventName.toLowerCase();
    const stage = classifyEventToStage(ev.eventName);
    if (!ctx.byStage[stage]) ctx.byStage[stage] = [];
    ctx.byStage[stage].push(ev.eventName);

    if (intentPatterns.test(n)) ctx.intentEvents.push(ev.eventName);
    if (conversionPatterns.test(n)) ctx.conversionEvents.push(ev.eventName);
    if (engagementPatterns.test(n)) ctx.engagementEvents.push(ev.eventName);
    if (monetizationPatterns.test(n)) ctx.monetizationEvents.push(ev.eventName);
    if (retentionPatterns.test(n)) ctx.retentionEvents.push(ev.eventName);
  }

  return ctx;
}

/** Format event names for display in campaign fields, or return blank */
function eventList(events: string[], max = 3): string {
  if (events.length === 0) return "";
  return events.slice(0, max).join(", ");
}

/** Build a trigger string from actual events, or return fallback */
function eventTrigger(events: string[], fallback: string): string {
  if (events.length === 0) return fallback;
  if (events.length === 1) return `Event: ${events[0]}`;
  return `Events: ${events.slice(0, 3).join(", ")}`;
}

/** Build success metric with conversion event info appended */
function metricWithConversion(baseMetric: string, conversionEvents: string[]): string {
  if (conversionEvents.length === 0) return baseMetric;
  const evStr = conversionEvents.slice(0, 2).join(", ");
  return `${baseMetric} (track via ${evStr})`;
}

// ===== SECTION B — OPPORTUNITY DISCOVERY =====

// B1: Drop-Off Recovery
function detectDropOffs(events: EventSchemaRow[] | null, brandProfile: CoreBrandJSON | null, evCtx: EventContext): OpportunityCampaign[] {
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
      // Use actual event names from schema
      const matchedStartOriginal = events.filter(e => pattern.start.test(e.eventName.toLowerCase())).map(e => e.eventName);
      campaigns.push({
        campaignName: brandedName(pattern.nameTemplate, ctx),
        channel: "Push",
        targetSegment: matchedStartOriginal.length > 0
          ? `Users who triggered ${eventList(matchedStartOriginal)} but no conversion event`
          : `Users with intent signal but no completion`,
        trigger: eventTrigger(matchedStartOriginal, "Intent event without success event"),
        messageTheme: "Resume where you left off — complete securely",
        successMetric: metricWithConversion("Completion Rate", evCtx.conversionEvents),
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
  evCtx: EventContext,
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
          trigger: `Event: ${ev.eventName} count > threshold`,
          messageTheme: `Turn ${readableEvent.toLowerCase()} engagement into ${ctx.products[0] || "product"} value`,
          successMetric: metricWithConversion("Conversion Rate", evCtx.conversionEvents),
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
  evCtx: EventContext,
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
    // Use engagement events for segment/trigger if available
    const engagementEvStr = eventList(evCtx.engagementEvents);
    campaigns.push({
      campaignName: `${brandName} ${topicFlavor}${capitalize(contentType)} Digest`,
      channel: "Email",
      targetSegment: engagementEvStr ? `Users active on ${engagementEvStr}` : "Active Digital Users",
      trigger: engagementEvStr ? `Event: ${evCtx.engagementEvents[0]} within last 7 days` : "Weekly recurring schedule",
      messageTheme: `Curated ${topicFlavor.toLowerCase()}${contentType}, product tips & expert perspectives`,
      successMetric: metricWithConversion("Engagement Rate & Click-to-Read Rate", evCtx.conversionEvents),
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
  evCtx: EventContext,
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
    
    // Use intent + engagement events for segment if available
    const segmentEvents = [...evCtx.intentEvents, ...evCtx.engagementEvents];
    const triggerEvents = evCtx.monetizationEvents.length > 0 ? evCtx.monetizationEvents : evCtx.conversionEvents;
    
    campaigns.push({
      campaignName: `${actionVerb} ${noun}Opportunity Alert`,
      channel: "Push",
      targetSegment: segmentEvents.length > 0
        ? `Users with high activity on ${eventList(segmentEvents)} (Predictive Score > Threshold)`
        : "Likely to Convert (Predictive Score > Threshold)",
      trigger: triggerEvents.length > 0
        ? `Predictive model score + signals from ${eventList(triggerEvents, 2)}`
        : "Predictive model score crosses activation threshold",
      messageTheme: `Personalized ${noun.toLowerCase()}offer based on behavioral prediction`,
      successMetric: metricWithConversion("Application / Conversion Rate", evCtx.conversionEvents),
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
  evCtx: EventContext,
): OpportunityCampaign[] {
  const campaigns: OpportunityCampaign[] = [];

  const hasUpsellActive = activeCoverage.some(uc =>
    uc.status === "active" && /upgrade|upsell|premium/i.test(uc.name)
  );

  if (!hasUpsellActive) {
    const brandName = brandProfile?.brand_identity?.brand_name || "Premium";
    const tiers = brandProfile?.business_model?.pricing_tiers || [];
    const tierText = tiers.length > 0 ? tiers[tiers.length - 1] : "Premium Tier";

    const monEvents = evCtx.monetizationEvents;
    const engEvents = evCtx.engagementEvents;
    
    campaigns.push({
      campaignName: `${brandName} ${tierText} Upgrade — Unlock Exclusive Benefits`,
      channel: "In-App",
      targetSegment: engEvents.length > 0
        ? `High-Value Users active on ${eventList(engEvents)}`
        : "High-Value Users with consistent engagement",
      trigger: monEvents.length > 0
        ? `Event: ${monEvents[0]} frequency or engagement score threshold`
        : "Transaction frequency or engagement score threshold",
      messageTheme: `Exclusive ${brandName} ${tierText} benefits — elevate your experience`,
      successMetric: metricWithConversion("Upgrade Rate / ARPU Lift", evCtx.conversionEvents),
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
      successMetric: metricWithConversion("Cross-Product Adoption Rate", evCtx.conversionEvents),
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
  evCtx: EventContext,
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
    const engEvents = evCtx.engagementEvents;
    campaigns.push({
      campaignName: `${prefix}Intelligent Send-Time & Frequency Calibration`,
      channel: "Push",
      targetSegment: engEvents.length > 0
        ? `Users with high exposure + activity on ${eventList(engEvents)}`
        : "High Message Exposure Users (≥5 messages/week)",
      trigger: engEvents.length > 0
        ? `Engagement-based cap breach + signals from ${eventList(engEvents, 2)}`
        : "Engagement-based frequency cap breach",
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
  evCtx: EventContext,
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

  // Map lifecycle stages to event context categories
  const stageEventMap: Record<string, string[]> = {
    onboarding: evCtx.byStage["Activation"] || [],
    activation: evCtx.byStage["Activation"] || [],
    engagement: evCtx.engagementEvents,
    monetization: evCtx.monetizationEvents,
    retention: evCtx.retentionEvents,
    winback: evCtx.retentionEvents,
    referral: evCtx.byStage["Referral"] || [],
    advocacy: evCtx.conversionEvents,
  };

  const gapStageTemplates: Record<string, Omit<OpportunityCampaign, "_meta">> = {
    onboarding: {
      campaignName: `${prefix}First 7-Day ${topProduct || "Product"} Activation Sprint`,
      channel: "Email",
      targetSegment: stageEventMap.onboarding.length > 0
        ? `New signups — track via ${eventList(stageEventMap.onboarding)}`
        : "New signups within 7 days",
      trigger: stageEventMap.onboarding.length > 0
        ? `Event: ${stageEventMap.onboarding[0]} not fired within 7 days of signup`
        : "Account created + no key action completed",
      messageTheme: `Get started with ${topProduct || brandName || "your account"} — guided setup`,
      successMetric: metricWithConversion("Activation Rate", stageEventMap.onboarding),
    },
    referral: {
      campaignName: `${prefix}Refer & Earn — Grow the ${brandName || "Community"} Network`,
      channel: "Push",
      targetSegment: stageEventMap.referral.length > 0
        ? `Users active on ${eventList(stageEventMap.engagement)} with referral potential`
        : "High Engagement Users",
      trigger: stageEventMap.referral.length > 0
        ? `Event: ${stageEventMap.referral[0]} eligible segment`
        : "Referral layer activation — engaged user segment",
      messageTheme: `Invite peers to ${brandName || "the platform"}, earn rewards together`,
      successMetric: metricWithConversion("Referral Conversion Rate", stageEventMap.referral),
    },
    winback: {
      campaignName: `${prefix}Return to ${topProduct || brandName || "Your Account"} — Exclusive Offer`,
      channel: "Email",
      targetSegment: stageEventMap.winback.length > 0
        ? `Dormant users (no ${eventList(stageEventMap.winback)} in 30+ days)`
        : "Dormant users (30+ days inactive)",
      trigger: stageEventMap.winback.length > 0
        ? `No ${stageEventMap.winback[0]} event for 30 days`
        : "Inactivity threshold crossed",
      messageTheme: `We've missed you — here's what's new in ${brandName || "your account"}`,
      successMetric: metricWithConversion("Reactivation Rate", evCtx.conversionEvents),
    },
    retention: {
      campaignName: `${prefix}Loyalty Milestone Celebration & Reward`,
      channel: "In-App",
      targetSegment: stageEventMap.retention.length > 0
        ? `Users approaching milestones on ${eventList(stageEventMap.retention)}`
        : "Users approaching loyalty milestones",
      trigger: stageEventMap.retention.length > 0
        ? `Event: ${stageEventMap.retention[0]} streak or count milestone`
        : "Usage streak or transaction milestone",
      messageTheme: `Celebrate your ${brandName || "journey"} milestones — unlock next tier`,
      successMetric: metricWithConversion("Retention Rate & NPS Improvement", stageEventMap.retention),
    },
    advocacy: {
      campaignName: `${prefix}Product Experience Feedback Loop`,
      channel: "Email",
      targetSegment: stageEventMap.advocacy.length > 0
        ? `Post-transaction users (completed ${eventList(stageEventMap.advocacy)})`
        : "Post-transaction satisfied users",
      trigger: stageEventMap.advocacy.length > 0
        ? `Event: ${stageEventMap.advocacy[0]} + positive signal`
        : "Transaction completion + positive signal",
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
  const evCtx = buildEventContext(input.eventSchemaData);

  // Collect all opportunity candidates
  const allCandidates: OpportunityCampaign[] = [
    ...detectDropOffs(input.eventSchemaData, input.brandProfile, evCtx),
    ...detectUnderutilizedEvents(input.eventSchemaData, input.activeCoverage, input.brandProfile, evCtx),
    ...detectContentPrograms(input.websiteUrl, input.brandProfile, evCtx),
    ...detectPredictiveOpportunities(input.brandProfile, input.eventSchemaData, evCtx),
    ...detectRevenueExpansion(input.brandProfile, input.activeCoverage, evCtx),
    ...detectFrequencyOptimization(input.campaignData, input.sendMix, input.brandProfile, evCtx),
    ...detectLifecycleGaps(input.activeCoverage, input.brandProfile, evCtx),
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
