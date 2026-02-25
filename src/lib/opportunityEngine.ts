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

// ===== SECTION B — OPPORTUNITY DISCOVERY =====

// B1: Drop-Off Recovery
function detectDropOffs(events: EventSchemaRow[] | null): OpportunityCampaign[] {
  if (!events || events.length === 0) return [];
  const campaigns: OpportunityCampaign[] = [];

  const eventNames = events.map(e => e.eventName.toLowerCase());
  const dropOffPatterns: Array<{ start: RegExp; success: RegExp; label: string }> = [
    { start: /pageload|page_load|page_view/, success: /success|complete|submit/, label: "Page View" },
    { start: /start|begin|initiate/, success: /complete|success|done|finish/, label: "Flow Start" },
    { start: /click|tap/, success: /submit|confirm|complete/, label: "Click Intent" },
    { start: /add_to_cart|cart_add/, success: /purchase|checkout_complete|order/, label: "Cart" },
    { start: /search/, success: /purchase|book|apply|select/, label: "Search" },
  ];

  for (const pattern of dropOffPatterns) {
    const startEvents = eventNames.filter(e => pattern.start.test(e));
    const successEvents = eventNames.filter(e => pattern.success.test(e));

    if (startEvents.length > 0 && successEvents.length === 0) {
      const startSample = startEvents[0].replace(/_/g, " ");
      campaigns.push({
        campaignName: `Complete Your ${capitalize(pattern.label)} Journey`,
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
      break; // One drop-off campaign
    }
  }

  return campaigns;
}

// B2: Underutilized Event Monetization
function detectUnderutilizedEvents(
  events: EventSchemaRow[] | null,
  activeCoverage: ActiveUseCaseInfo[],
): OpportunityCampaign[] {
  if (!events || events.length === 0) return [];
  const campaigns: OpportunityCampaign[] = [];

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
        campaigns.push({
          campaignName: `Monetize "${ev.eventName.replace(/_/g, " ")}" Activity`,
          channel: "Email",
          targetSegment: `Users performing ${ev.eventName} frequently`,
          trigger: `${ev.eventName} count > threshold`,
          messageTheme: "Turn engagement into value — personalized upgrade path",
          successMetric: "Conversion Rate",
          _meta: {
            sourceType: "underutilized_event",
            implementedAlready: false,
            revenueImpactLevel: "Medium",
            readinessStatus: "Ready",
          },
        });
        break; // One underutilized event campaign
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
    campaigns.push({
      campaignName: `${brandName} Weekly Insights & Tips`,
      channel: "Email",
      targetSegment: "Active Digital Users",
      trigger: "Weekly recurring schedule",
      messageTheme: "Curated insights, product tips, and market updates",
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
    campaigns.push({
      campaignName: "Pre-Qualified Opportunity Alert",
      channel: "Push",
      targetSegment: "Likely to Convert (Predictive Score > Threshold)",
      trigger: "Predictive model score crosses activation threshold",
      messageTheme: "Personalized offer based on behavioral prediction",
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
      campaignName: `${tierText} Invitation — Unlock Exclusive Benefits`,
      channel: "In-App",
      targetSegment: "High-Value Users with consistent engagement",
      trigger: "Transaction frequency or engagement score threshold",
      messageTheme: `Exclusive ${brandName} benefits — upgrade your experience`,
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
    campaigns.push({
      campaignName: `Cross-Product Discovery: ${products[0]} + ${products[1]}`,
      channel: "Email",
      targetSegment: `Users active on ${products[0]} but not ${products[1]}`,
      trigger: "Segment-based: Single-product active users",
      messageTheme: "Discover how these products work better together",
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
): OpportunityCampaign[] {
  const campaigns: OpportunityCampaign[] = [];

  const totalSent = campaignData.reduce((s, c) => s + c.totalSentUsers, 0);
  const totalClicked = campaignData.reduce((s, c) => s + c.uniqueClickedWithinConversion, 0);
  const avgCTR = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
  const highVolume = totalSent > 500000;
  const lowCTR = avgCTR < 1.5;

  // Check if batch-heavy
  const batchHeavy = sendMix.some(s =>
    s.deliveryType.toLowerCase().includes("one time") && s.percentShare > 60
  );

  if ((highVolume && lowCTR) || batchHeavy) {
    campaigns.push({
      campaignName: "Smart Frequency & Send-Time Optimization",
      channel: "Push",
      targetSegment: "High Message Exposure Users (≥5 messages/week)",
      trigger: "Engagement-based frequency cap breach",
      messageTheme: "Personalized alert control — right message, right time",
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

  const gapStageTemplates: Record<string, Omit<OpportunityCampaign, "_meta">> = {
    onboarding: {
      campaignName: "First 7-Day Activation Sprint",
      channel: "Email",
      targetSegment: "New signups within 7 days",
      trigger: "Account created + no key action completed",
      messageTheme: "Guided setup to unlock core value",
      successMetric: "Activation Rate",
    },
    referral: {
      campaignName: "Refer & Earn Program Launch",
      channel: "Push",
      targetSegment: "High Engagement Users",
      trigger: "Referral layer activation — engaged user segment",
      messageTheme: "Invite friends, earn rewards together",
      successMetric: "Referral Conversion Rate",
    },
    winback: {
      campaignName: "We Miss You — Personalized Return Offer",
      channel: "Email",
      targetSegment: "Dormant users (30+ days inactive)",
      trigger: "Inactivity threshold crossed",
      messageTheme: "Personalized win-back with exclusive incentive",
      successMetric: "Reactivation Rate",
    },
    retention: {
      campaignName: "Loyalty Milestone & Streak Reward",
      channel: "In-App",
      targetSegment: "Users approaching loyalty milestones",
      trigger: "Usage streak or transaction milestone",
      messageTheme: "Celebrate your progress — unlock next tier",
      successMetric: "Retention Rate & NPS Improvement",
    },
    advocacy: {
      campaignName: "NPS & Product Feedback Loop",
      channel: "Email",
      targetSegment: "Post-transaction satisfied users",
      trigger: "Transaction completion + positive signal",
      messageTheme: "Share your experience — help us improve",
      successMetric: "NPS Score & Response Rate",
    },
  };

  for (const stage of lifecycleStages) {
    if (!coveredStages.has(stage) && gapStageTemplates[stage]) {
      const template = gapStageTemplates[stage];
      const brandName = brandProfile?.brand_identity?.brand_name || "";
      campaigns.push({
        ...template,
        campaignName: brandName
          ? template.campaignName.replace(/^/, `${brandName} `)
          : template.campaignName,
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
    ...detectDropOffs(input.eventSchemaData),
    ...detectUnderutilizedEvents(input.eventSchemaData, input.activeCoverage),
    ...detectContentPrograms(input.websiteUrl, input.brandProfile),
    ...detectPredictiveOpportunities(input.brandProfile, input.eventSchemaData),
    ...detectRevenueExpansion(input.brandProfile, input.activeCoverage),
    ...detectFrequencyOptimization(input.campaignData, input.sendMix),
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

  const fallbacks: Record<string, OpportunityCampaign> = {
    drop_off: {
      campaignName: "Incomplete Journey Recovery",
      channel: "Push",
      targetSegment: "Users who started but didn't complete key actions",
      trigger: "Intent event without success event within 24h",
      messageTheme: "Pick up where you left off — one step away",
      successMetric: "Completion Rate",
      _meta: { sourceType: "drop_off", implementedAlready: false, revenueImpactLevel: "High", readinessStatus: "Requires Event" },
    },
    underutilized_event: {
      campaignName: "Engagement-to-Revenue Accelerator",
      channel: "Email",
      targetSegment: "High-engagement users not yet converted",
      trigger: "Engagement score above threshold, no revenue event",
      messageTheme: "Your activity unlocks exclusive opportunities",
      successMetric: "First Conversion Rate",
      _meta: { sourceType: "underutilized_event", implementedAlready: false, revenueImpactLevel: "Medium", readinessStatus: "Requires Event" },
    },
    content_program: {
      campaignName: `${brandName} Monthly Product Deep Dive`,
      channel: "Email",
      targetSegment: "All active users",
      trigger: "Monthly recurring schedule",
      messageTheme: "Expert insights and product mastery tips",
      successMetric: "Engagement Rate",
      _meta: { sourceType: "content_program", implementedAlready: false, revenueImpactLevel: "Low", readinessStatus: "Ready" },
    },
    predictive_segment: {
      campaignName: "Churn Risk Intervention",
      channel: "Email",
      targetSegment: "Likely to Churn (Predictive)",
      trigger: "Churn prediction model score > threshold",
      messageTheme: "Personalized re-engagement with exclusive value",
      successMetric: "Retention Save Rate",
      _meta: { sourceType: "predictive_segment", implementedAlready: false, revenueImpactLevel: "High", readinessStatus: "Requires Predictive Layer" },
    },
    revenue_expansion: {
      campaignName: `${brandName} Premium Tier Invitation`,
      channel: "In-App",
      targetSegment: "High transaction frequency users",
      trigger: "Revenue threshold or usage milestone",
      messageTheme: "Exclusive benefits await — upgrade your experience",
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
