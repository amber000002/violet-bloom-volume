// Strategic Insights Engine - Client-side growth intelligence generator
// Generates leadership-grade strategic analysis from website signals, campaign data, and segmentation

import { CoreBrandJSON } from "@/types/brandProfile";
import { CampaignRow } from "@/lib/csvAnalyzer";
import { industryConfigs, getInferredBusinessModel, getBusinessModelLabel } from "@/data/industryConfig";

// ============= TYPES =============

export type IntelligenceMode = "website-only" | "website-csv" | "website-csv-segmentation";
export type ConfidenceLevel = "High" | "Medium";
export type EffortLevel = "Low" | "Moderate" | "High";
export type SophisticationTier = "Foundational" | "Structured" | "Advanced" | "Orchestrated";
export type CoverageStrength = "Strong" | "Partial" | "Weak" | "Missing";

export interface StrategicInsightsInput {
  industry: string;
  brandProfile: CoreBrandJSON | null;
  websiteUrl: string;
  campaignData: CampaignRow[] | null;
  strategicContext: string;
}

export interface ExecutiveSnapshot {
  strengths: string[];
  underMonetizedAreas: string[];
  competitiveGaps: string[];
  cleverTapLeverageOpportunities: string[];
  strategicFocus: string;
}

export interface LifecycleStageAssessment {
  stage: string;
  coverage: CoverageStrength;
  campaignCount: number;
  volumeShare: number; // percentage
  assessment: string;
}

export interface LifecycleArchitectureAssessment {
  stages: LifecycleStageAssessment[];
  overConcentrated: string[];
  underInvested: string[];
  summary: string;
}

export interface EngagementSophistication {
  tier: SophisticationTier;
  batchVsTriggerRatio: string;
  channelDiversification: string;
  cadenceIntensity: string;
  subjectLineVariation: string;
  automationPresence: string;
  details: string[];
}

export interface SegmentationIntelligence {
  behavioralVsBroad: string;
  lifecycleClarity: string;
  highValueActivation: string;
  inactiveRecovery: string;
  segmentReuse: string;
  assessment: string;
}

export interface CompetitorView {
  name: string;
  messagingSophistication: string;
  lifecycleCues: string;
  urgencyMechanics: string;
}

export interface CompetitiveAcceleration {
  competitors: CompetitorView[];
  whereLeadersAdvance: string[];
  strategicImplications: string[];
  cleverTapAlignment: string[];
}

export interface StrategicInitiative {
  title: string;
  lifecycleStage: string;
  businessRationale: string;
  primaryKpiImpact: string;
  confidence: ConfidenceLevel;
  effort: EffortLevel;
  cleverTapCapabilities: string[];
  competitiveJustification: string;
}

export interface RiskItem {
  risk: string;
  evidence: string;
  severity: "High" | "Medium" | "Low";
}

export interface StructuralRiskMapping {
  risks: RiskItem[];
  summary: string;
}

export interface BlueprintAction {
  action: string;
  cleverTapModule: string;
}

export interface NinetyDayBlueprint {
  phase1: BlueprintAction[]; // 0-30 days
  phase2: BlueprintAction[]; // 30-60 days
  phase3: BlueprintAction[]; // 60-90 days
}

export interface StrategicInsightsOutput {
  mode: IntelligenceMode;
  executiveSnapshot: ExecutiveSnapshot;
  lifecycleAssessment: LifecycleArchitectureAssessment;
  engagementSophistication: EngagementSophistication | null;
  segmentationIntelligence: SegmentationIntelligence | null;
  competitiveAcceleration: CompetitiveAcceleration;
  initiatives: StrategicInitiative[];
  riskMapping: StructuralRiskMapping;
  blueprint: NinetyDayBlueprint;
}

// ============= COMPETITOR INTELLIGENCE =============

const industryCompetitors: Record<string, string[]> = {
  banking: ["HDFC Bank", "ICICI Bank", "SBI", "Kotak Mahindra", "Axis Bank"],
  nbfcs: ["Bajaj Finserv", "Muthoot Finance", "L&T Finance", "Mahindra Finance", "Manappuram"],
  amcs: ["SBI MF", "HDFC AMC", "ICICI Prudential", "Nippon India", "Axis AMC"],
  insurance: ["LIC", "HDFC Life", "ICICI Prudential Life", "SBI Life", "Max Life"],
  fintech: ["PhonePe", "Paytm", "CRED", "Groww", "Zerodha"],
  "travel-hospitality": ["MakeMyTrip", "OYO", "Cleartrip", "Yatra", "ixigo"],
  aviation: ["IndiGo", "Air India", "SpiceJet", "Vistara", "AirAsia India"],
  "cab-aggregators": ["Ola", "Uber", "Rapido", "BluSmart", "Namma Yatri"],
  "food-tech": ["Zomato", "Swiggy", "EatSure", "Box8", "Rebel Foods"],
  "quick-commerce": ["Blinkit", "Zepto", "Swiggy Instamart", "BigBasket", "JioMart"],
  retail: ["Amazon India", "Flipkart", "Myntra", "Nykaa", "Tata CLiQ"],
  "apparel-fashion": ["Myntra", "Ajio", "Nykaa Fashion", "H&M India", "Zara India"],
  beauty: ["Nykaa", "Purplle", "Sugar Cosmetics", "Mamaearth", "mCaffeine"],
  healthcare: ["Practo", "1mg", "PharmEasy", "Netmeds", "Apollo 247"],
  "fitness-wellness": ["Cult.fit", "HealthifyMe", "GOQii", "Nike Training", "Fittr"],
  edtech: ["Byju's", "Unacademy", "Vedantu", "upGrad", "Simplilearn"],
  ott: ["Netflix", "Disney+ Hotstar", "Amazon Prime", "JioCinema", "SonyLIV"],
  gaming: ["MPL", "Dream11", "WinZO", "Games24x7", "Ludo King"],
  "job-portals": ["Naukri", "LinkedIn", "Indeed", "Instahyre", "Apna"],
  "real-estate": ["99acres", "MagicBricks", "Housing.com", "NoBroker", "Square Yards"],
  "ticket-booking": ["BookMyShow", "Paytm Insider", "District", "Skillbox", "MeraEvents"],
  crypto: ["WazirX", "CoinDCX", "CoinSwitch", "ZebPay", "Giottus"],
  broking: ["Zerodha", "Groww", "Upstox", "Angel One", "5paisa"],
  "d2c-brands": ["boAt", "Mamaearth", "Lenskart", "Sugar", "Bewakoof"],
  saas: ["Freshworks", "Zoho", "CleverTap", "WebEngage", "MoEngage"],
  logistics: ["Delhivery", "BlueDart", "Shiprocket", "Shadowfax", "Ecom Express"],
  "super-apps": ["Paytm", "PhonePe", "Tata Neu", "JioMart", "Amazon"],
};

// ============= ENGINE =============

function determineMode(input: StrategicInsightsInput): IntelligenceMode {
  const hasCSV = input.campaignData && input.campaignData.length > 0;
  if (!hasCSV) return "website-only";
  
  // Check if CSV has segmentation data (whoQuery field)
  const hasSegmentation = input.campaignData!.some(c => c.whoQuery && c.whoQuery.trim().length > 0);
  return hasSegmentation ? "website-csv-segmentation" : "website-csv";
}

function generateExecutiveSnapshot(
  input: StrategicInsightsInput,
  config: typeof industryConfigs[string],
  mode: IntelligenceMode,
  lifecycleAssessment: LifecycleArchitectureAssessment,
): ExecutiveSnapshot {
  const brand = input.brandProfile;
  const businessModel = getBusinessModelLabel(getInferredBusinessModel(input.industry));
  const industryName = config.name;

  const strengths: string[] = [];
  const underMonetized: string[] = [];
  const competitiveGaps: string[] = [];
  const leverage: string[] = [];

  // Derive strengths from brand profile
  if (brand) {
    if (brand.tech_scale_layer.supported_channels.length >= 3) {
      strengths.push(`Multi-channel infrastructure across ${brand.tech_scale_layer.supported_channels.join(", ")}`);
    }
    if (brand.product_ecosystem.core_products.length >= 3) {
      strengths.push(`Diversified product portfolio with ${brand.product_ecosystem.core_products.length} core products enabling cross-sell pathways`);
    }
    if (brand.engagement_architecture.engagement_drivers.length > 0) {
      strengths.push(`Active engagement mechanics: ${brand.engagement_architecture.engagement_drivers.slice(0, 3).join(", ")}`);
    }
    if (brand.tech_scale_layer.supports_real_time_triggers) {
      strengths.push("Real-time trigger infrastructure supports behavioral automation");
    }
  }
  if (strengths.length === 0) {
    strengths.push(`Established ${businessModel} presence in the ${industryName} category`);
  }

  // Under-monetized from lifecycle gaps
  lifecycleAssessment.underInvested.forEach(stage => {
    underMonetized.push(`${stage} lifecycle stage shows minimal activation — revenue capture opportunity`);
  });
  if (underMonetized.length === 0) {
    underMonetized.push("Cross-sell pathways between product lines remain under-leveraged");
  }

  // Competitive gaps
  competitiveGaps.push(`Industry leaders in ${industryName} are deploying predictive lifecycle orchestration — gap detected`);
  if (brand && !brand.tech_scale_layer.has_cdp) {
    competitiveGaps.push("Unified customer data layer not detected — limits personalization depth");
  }
  competitiveGaps.push("AI-driven send-time optimization and dynamic content personalization represent advancement areas");

  // CleverTap leverage
  leverage.push("Journeys for behavioral lifecycle automation across detected stages");
  leverage.push("Clever.AI for predictive churn and next-best-action modeling");
  if (brand && brand.tech_scale_layer.has_mobile_app) {
    leverage.push("In-app messaging and push orchestration to complement email lifecycle");
  }
  leverage.push("RFM segmentation for high-value cohort identification and monetization");

  const contextBias = input.strategicContext.trim()
    ? `Aligned with stated priority: ${input.strategicContext.trim().split(/[.!]/)[0]}.`
    : "Primary focus: revenue expansion through lifecycle depth and behavioral automation.";

  return {
    strengths,
    underMonetizedAreas: underMonetized,
    competitiveGaps,
    cleverTapLeverageOpportunities: leverage,
    strategicFocus: contextBias,
  };
}

function generateLifecycleAssessment(
  input: StrategicInsightsInput,
  config: typeof industryConfigs[string],
  mode: IntelligenceMode,
): LifecycleArchitectureAssessment {
  const stages = config.lifecycleStages;
  const campaignData = input.campaignData || [];
  const totalVolume = campaignData.reduce((s, c) => s + c.totalSentUsers, 0);

  const stageAssessments: LifecycleStageAssessment[] = stages.map(stage => {
    if (mode === "website-only") {
      // Infer from business model
      const hasJourneys = (config.journeys[stage.id]?.length || 0) > 0;
      const hasCampaigns = (config.campaigns[stage.id]?.length || 0) > 0;
      return {
        stage: stage.label,
        coverage: hasJourneys && hasCampaigns ? "Partial" as CoverageStrength : "Weak" as CoverageStrength,
        campaignCount: 0,
        volumeShare: 0,
        assessment: hasJourneys
          ? `${stage.label} has defined journey patterns; empirical coverage requires campaign data verification.`
          : `${stage.label} lacks structured journey architecture — structural gap.`,
      };
    }

    // CSV-based: match campaigns to stages using name patterns
    const stagePatterns = getStagePatterns(stage.id);
    const matchedCampaigns = campaignData.filter(c =>
      stagePatterns.some(p => c.campaignName.toLowerCase().includes(p) || c.title.toLowerCase().includes(p))
    );
    const stageVolume = matchedCampaigns.reduce((s, c) => s + c.totalSentUsers, 0);
    const volumeShare = totalVolume > 0 ? (stageVolume / totalVolume) * 100 : 0;

    let coverage: CoverageStrength;
    if (matchedCampaigns.length >= 5 && volumeShare >= 15) coverage = "Strong";
    else if (matchedCampaigns.length >= 2 || volumeShare >= 5) coverage = "Partial";
    else if (matchedCampaigns.length > 0) coverage = "Weak";
    else coverage = "Missing";

    return {
      stage: stage.label,
      coverage,
      campaignCount: matchedCampaigns.length,
      volumeShare,
      assessment: coverage === "Strong"
        ? `${stage.label} is well-represented with ${matchedCampaigns.length} campaigns (${volumeShare.toFixed(1)}% volume share).`
        : coverage === "Missing"
          ? `${stage.label} has zero dedicated campaigns — significant lifecycle blind spot.`
          : `${stage.label} has limited representation (${matchedCampaigns.length} campaigns, ${volumeShare.toFixed(1)}% share) — expansion opportunity.`,
    };
  });

  const overConcentrated = stageAssessments
    .filter(s => s.volumeShare > 40)
    .map(s => s.stage);
  const underInvested = stageAssessments
    .filter(s => s.coverage === "Missing" || s.coverage === "Weak")
    .map(s => s.stage);

  return {
    stages: stageAssessments,
    overConcentrated,
    underInvested,
    summary: overConcentrated.length > 0
      ? `Lifecycle architecture shows over-concentration in ${overConcentrated.join(", ")} with structural gaps in ${underInvested.join(", ") || "none detected"}.`
      : underInvested.length > 0
        ? `Lifecycle coverage has gaps in ${underInvested.join(", ")} — these represent immediate monetization and retention opportunities.`
        : "Lifecycle architecture demonstrates reasonable coverage across all stages.",
  };
}

function getStagePatterns(stageId: string): string[] {
  const patterns: Record<string, string[]> = {
    activation: ["welcome", "onboard", "signup", "register", "verify", "kyc", "first", "intro", "getting started"],
    usage: ["feature", "tip", "guide", "how to", "discover", "explore", "tutorial", "digest"],
    retention: ["re-engage", "comeback", "miss you", "inactive", "win-back", "lapsed", "dormant", "remind"],
    "cross-sell": ["recommend", "also like", "upgrade", "premium", "cross-sell", "upsell", "bundle", "suggest"],
    monetization: ["offer", "discount", "sale", "deal", "promo", "price", "buy", "purchase", "checkout", "cart"],
    referral: ["refer", "invite", "share", "friend", "reward", "ambassador", "advocate"],
    repayment: ["emi", "payment", "due", "repay", "installment", "overdue"],
    "re-lending": ["top-up", "pre-approved", "new loan", "additional"],
    investing: ["sip", "invest", "portfolio", "mutual fund", "market", "stock", "trade"],
  };
  return patterns[stageId] || [stageId.replace(/-/g, " ")];
}

function generateEngagementSophistication(
  campaignData: CampaignRow[],
): EngagementSophistication {
  const total = campaignData.length;
  if (total === 0) {
    return {
      tier: "Foundational",
      batchVsTriggerRatio: "No data",
      channelDiversification: "No data",
      cadenceIntensity: "No data",
      subjectLineVariation: "No data",
      automationPresence: "No data",
      details: [],
    };
  }

  // Batch vs Trigger inference from campaign names
  const triggerKeywords = ["triggered", "journey", "automation", "auto", "event", "behavior", "real-time", "drip"];
  const triggerCampaigns = campaignData.filter(c =>
    triggerKeywords.some(kw => c.campaignName.toLowerCase().includes(kw))
  );
  const triggerRatio = triggerCampaigns.length / total;
  const batchVsTrigger = `${Math.round((1 - triggerRatio) * 100)}% batch / ${Math.round(triggerRatio * 100)}% trigger`;

  // Channel diversification
  const channels = new Set(campaignData.map(c => c.channel));
  const channelDiv = channels.size >= 3 ? "Diversified" : channels.size === 2 ? "Moderate" : "Single-channel";

  // Subject line variation
  const subjects = campaignData.map(c => c.title || c.subjectLine || "");
  const uniqueSubjects = new Set(subjects.filter(Boolean));
  const variation = uniqueSubjects.size / Math.max(subjects.filter(Boolean).length, 1);
  const subjectVar = variation > 0.8 ? "High variation" : variation > 0.5 ? "Moderate variation" : "Low variation (template reuse)";

  // Cadence
  const dates = [...new Set(campaignData.map(c => c.startDate))].sort();
  const cadence = dates.length > 20 ? "High intensity" : dates.length > 10 ? "Moderate" : "Light cadence";

  // Automation presence
  const automationPresence = triggerRatio > 0.3 ? "Strong automation signals" : triggerRatio > 0.1 ? "Emerging automation" : "Minimal automation detected";

  // Determine tier
  let tier: SophisticationTier;
  const score = (triggerRatio > 0.3 ? 2 : triggerRatio > 0.1 ? 1 : 0) +
    (channels.size >= 3 ? 2 : channels.size === 2 ? 1 : 0) +
    (variation > 0.7 ? 1 : 0);

  if (score >= 4) tier = "Orchestrated";
  else if (score >= 3) tier = "Advanced";
  else if (score >= 2) tier = "Structured";
  else tier = "Foundational";

  const details: string[] = [];
  if (triggerRatio < 0.2) details.push("Trigger-based campaigns represent less than 20% of mix — batch-heavy architecture limits personalization");
  if (channels.size < 2) details.push("Single-channel dependency increases deliverability and engagement risk");
  if (variation < 0.5) details.push("Low subject line variation suggests template reuse — fatigue risk");

  return {
    tier,
    batchVsTriggerRatio: batchVsTrigger,
    channelDiversification: channelDiv,
    cadenceIntensity: cadence,
    subjectLineVariation: subjectVar,
    automationPresence,
    details,
  };
}

function generateSegmentationIntelligence(
  campaignData: CampaignRow[],
): SegmentationIntelligence {
  const withSegments = campaignData.filter(c => c.whoQuery && c.whoQuery.trim().length > 0);
  if (withSegments.length === 0) {
    return {
      behavioralVsBroad: "No segmentation data available",
      lifecycleClarity: "Cannot assess",
      highValueActivation: "Cannot assess",
      inactiveRecovery: "Cannot assess",
      segmentReuse: "Cannot assess",
      assessment: "Segmentation analysis requires campaign targeting data.",
    };
  }

  const segments = withSegments.map(c => c.whoQuery.trim());
  const uniqueSegments = new Set(segments);
  const segmentReuse = segments.length / uniqueSegments.size;

  // Behavioral vs broad detection
  const behavioralKeywords = ["event", "action", "clicked", "viewed", "purchased", "added", "searched", "behavior", "property", "last_"];
  const behavioralCount = segments.filter(s => behavioralKeywords.some(kw => s.toLowerCase().includes(kw))).length;
  const behavioralRatio = behavioralCount / segments.length;

  const behavioralVsBroad = behavioralRatio > 0.5
    ? "Predominantly behavioral targeting — sophisticated"
    : behavioralRatio > 0.2
      ? "Mixed behavioral and broad targeting"
      : "Predominantly broad/demographic targeting — advancement opportunity";

  // Lifecycle segmentation
  const lifecycleKeywords = ["new", "active", "dormant", "churned", "lapsed", "reactivat", "onboard", "loyal"];
  const lifecycleCount = segments.filter(s => lifecycleKeywords.some(kw => s.toLowerCase().includes(kw))).length;
  const lifecycleClarity = lifecycleCount > segments.length * 0.3
    ? "Clear lifecycle segmentation in use"
    : lifecycleCount > 0
      ? "Partial lifecycle awareness — room for structural improvement"
      : "No lifecycle segmentation detected — foundational gap";

  // High-value detection
  const hvKeywords = ["premium", "high value", "vip", "top", "whale", "power user", "paid", "subscriber"];
  const hasHV = segments.some(s => hvKeywords.some(kw => s.toLowerCase().includes(kw)));
  const highValueActivation = hasHV
    ? "High-value cohort targeting detected"
    : "No explicit high-value cohort segmentation — monetization opportunity";

  // Inactive recovery
  const inactiveKeywords = ["inactive", "dormant", "lapsed", "churned", "not opened", "no activity"];
  const hasInactive = segments.some(s => inactiveKeywords.some(kw => s.toLowerCase().includes(kw)));
  const inactiveRecovery = hasInactive
    ? "Inactive cohort targeting in place"
    : "No dedicated inactive recovery segmentation — retention risk";

  const segmentReuseAssessment = segmentReuse > 5
    ? `High segment reuse (${segmentReuse.toFixed(1)}x) — risk of audience fatigue`
    : segmentReuse > 2
      ? `Moderate segment reuse (${segmentReuse.toFixed(1)}x)`
      : "Healthy segment diversification";

  return {
    behavioralVsBroad,
    lifecycleClarity,
    highValueActivation,
    inactiveRecovery,
    segmentReuse: segmentReuseAssessment,
    assessment: `Segmentation maturity shows ${behavioralVsBroad.toLowerCase()}. ${lifecycleClarity}. ${highValueActivation}.`,
  };
}

function generateCompetitiveAcceleration(
  input: StrategicInsightsInput,
  config: typeof industryConfigs[string],
): CompetitiveAcceleration {
  const industryName = config.name;
  const competitors = (industryCompetitors[input.industry] || ["Industry Leader A", "Industry Leader B", "Industry Leader C"]).slice(0, 5);

  const competitorViews: CompetitorView[] = competitors.map(name => ({
    name,
    messagingSophistication: "Personalized lifecycle-driven messaging with dynamic content blocks",
    lifecycleCues: "Multi-stage journey orchestration with behavioral triggers",
    urgencyMechanics: "Time-bound offers, scarcity signals, and social proof elements",
  }));

  return {
    competitors: competitorViews,
    whereLeadersAdvance: [
      `Leading ${industryName} brands are deploying AI-powered send-time optimization, increasing open rates by 15-25% over static scheduling`,
      "Multi-journey orchestration with real-time behavioral triggers replaces batch-and-blast approaches",
      "Predictive churn models enable preemptive retention actions 14-21 days before disengagement",
      "Dynamic content personalization based on browsing/purchase history drives 2-3x click improvements",
      "Cross-channel journey orchestration (email + push + in-app) creates cohesive lifecycle experiences",
    ],
    strategicImplications: [
      "Delay in lifecycle automation adoption widens the engagement gap with digitally mature competitors",
      "Batch-heavy campaign architecture limits responsiveness to behavioral signals",
      "Absence of predictive modeling means reactive rather than proactive retention strategy",
    ],
    cleverTapAlignment: [
      "Clever.AI for predictive segmentation and next-best-action recommendations",
      "Journeys for multi-step behavioral lifecycle automation",
      "Optimal Send Time to maximize inbox attention without competitive clutter",
      "Product Experiences for in-app messaging orchestration alongside email",
      "RFM Analysis for automated high-value cohort identification",
    ],
  };
}

function generateStrategicInitiatives(
  input: StrategicInsightsInput,
  config: typeof industryConfigs[string],
  mode: IntelligenceMode,
  lifecycleAssessment: LifecycleArchitectureAssessment,
  engagement: EngagementSophistication | null,
): StrategicInitiative[] {
  const brand = input.brandProfile;
  const industryName = config.name;
  const initiatives: StrategicInitiative[] = [];

  // Initiative 1: Always — Lifecycle gap closure
  const gapStages = lifecycleAssessment.underInvested;
  if (gapStages.length > 0) {
    initiatives.push({
      title: `Deploy ${gapStages[0]} Lifecycle Automation for ${industryName}`,
      lifecycleStage: gapStages[0],
      businessRationale: `${gapStages[0]} stage has zero or minimal coverage, representing unaddressed revenue and retention opportunity across the customer base.`,
      primaryKpiImpact: "Lifecycle stage conversion rate, Customer lifetime value",
      confidence: "High",
      effort: "Moderate",
      cleverTapCapabilities: ["Journeys", "Segments", "Events"],
      competitiveJustification: `Industry leaders have structured ${gapStages[0].toLowerCase()} automation — competitive parity requires this investment.`,
    });
  }

  // Initiative 2: Behavioral trigger expansion
  if (!engagement || engagement.tier === "Foundational" || engagement.tier === "Structured") {
    initiatives.push({
      title: "Accelerate Behavioral Trigger Architecture",
      lifecycleStage: "Cross-lifecycle",
      businessRationale: "Shifting 30% of batch volume to behavior-triggered journeys improves engagement ratios and reduces deliverability risk.",
      primaryKpiImpact: "Open rate, Click-to-open rate, Unsubscribe rate",
      confidence: "High",
      effort: "Moderate",
      cleverTapCapabilities: ["Journeys", "Events", "Real-time Triggers", "Clever.AI"],
      competitiveJustification: "Behavioral automation is table-stakes for digitally mature competitors in this category.",
    });
  }

  // Initiative 3: Predictive churn prevention
  initiatives.push({
    title: `Implement Predictive Retention Engine for ${industryName}`,
    lifecycleStage: config.lifecycleStages.find(s => s.id.includes("retention"))?.label || "Retention",
    businessRationale: "Proactive churn intervention 14-21 days before disengagement captures at-risk revenue before traditional win-back campaigns.",
    primaryKpiImpact: "Churn rate, Retention rate, Revenue per user",
    confidence: "High",
    effort: "Moderate",
    cleverTapCapabilities: ["Clever.AI", "Predictions", "Journeys", "Segments"],
    competitiveJustification: "Predictive retention is a competitive differentiator — early movers capture disproportionate retention lift.",
  });

  // Initiative 4: High-value cohort monetization
  initiatives.push({
    title: `Launch High-Value Cohort Monetization Program`,
    lifecycleStage: config.lifecycleStages.find(s => s.id.includes("cross-sell") || s.id.includes("revenue") || s.id.includes("monetization"))?.label || "Monetization",
    businessRationale: "Top 10% of users typically drive 40-60% of revenue. Dedicated high-value journeys can increase ARPU by 15-30%.",
    primaryKpiImpact: "ARPU, Cross-sell conversion, Customer lifetime value",
    confidence: "Medium",
    effort: "Moderate",
    cleverTapCapabilities: ["RFM Analysis", "Segments", "Journeys", "Product Experiences"],
    competitiveJustification: "Competitors with RFM-based targeting report measurable revenue uplift from cohort-specific messaging.",
  });

  // Initiative 5: Cross-channel orchestration
  if (brand && brand.tech_scale_layer.has_mobile_app) {
    initiatives.push({
      title: "Orchestrate Cross-Channel Lifecycle Experience",
      lifecycleStage: "Cross-lifecycle",
      businessRationale: "Coordinated email + push + in-app messaging creates 40-60% higher engagement than single-channel approaches.",
      primaryKpiImpact: "Multi-touch attribution, Channel engagement rate, Conversion rate",
      confidence: "Medium",
      effort: "High",
      cleverTapCapabilities: ["Journeys", "Push Notifications", "In-App Messages", "Product Experiences"],
      competitiveJustification: "Cross-channel orchestration is the primary differentiator for leading engagement platforms in this category.",
    });
  }

  // Initiative 6: AI-powered personalization
  initiatives.push({
    title: `Deploy AI-Powered Dynamic Content Personalization`,
    lifecycleStage: "Cross-lifecycle",
    businessRationale: "Dynamic content personalization based on user behavior and preferences drives 2-3x improvement in click-through rates.",
    primaryKpiImpact: "Click-through rate, Conversion rate, Revenue per email",
    confidence: "Medium",
    effort: "Moderate",
    cleverTapCapabilities: ["Clever.AI", "Dynamic Content", "Catalog", "Recommendations"],
    competitiveJustification: "AI-driven personalization is rapidly becoming baseline expectation across digitally mature organizations.",
  });

  // Initiative 7: Context-driven
  if (input.strategicContext.trim()) {
    const contextFirst = input.strategicContext.trim().split(/[.,!]/)[0];
    initiatives.push({
      title: `Address Strategic Priority: ${contextFirst.length > 60 ? contextFirst.substring(0, 57) + "..." : contextFirst}`,
      lifecycleStage: "Strategic",
      businessRationale: `Directly aligned with stated organizational priority to ensure lifecycle and engagement strategy supports broader business objectives.`,
      primaryKpiImpact: "Strategic KPI alignment, Executive stakeholder confidence",
      confidence: "Medium",
      effort: "Moderate",
      cleverTapCapabilities: ["Journeys", "Segments", "Analytics", "Clever.AI"],
      competitiveJustification: "Strategic alignment ensures marketing technology investment supports board-level mandates.",
    });
  }

  return initiatives.slice(0, 7);
}

function generateRiskMapping(
  input: StrategicInsightsInput,
  mode: IntelligenceMode,
  engagement: EngagementSophistication | null,
  segmentation: SegmentationIntelligence | null,
): StructuralRiskMapping {
  const risks: RiskItem[] = [];

  if (mode !== "website-only" && input.campaignData) {
    const data = input.campaignData;
    const totalSent = data.reduce((s, c) => s + c.totalSentUsers, 0);

    // Fatigue clusters
    const dates = data.map(c => c.startDate);
    const dateCounts = new Map<string, number>();
    dates.forEach(d => dateCounts.set(d, (dateCounts.get(d) || 0) + 1));
    const highDensityDays = [...dateCounts.entries()].filter(([_, c]) => c > 5);
    if (highDensityDays.length > 3) {
      risks.push({
        risk: "Campaign Fatigue Clusters",
        evidence: `${highDensityDays.length} days with 5+ campaigns detected — subscriber fatigue likely`,
        severity: "High",
      });
    }

    // Channel dependency
    const channels = new Map<string, number>();
    data.forEach(c => channels.set(c.channel, (channels.get(c.channel) || 0) + 1));
    const dominantChannel = [...channels.entries()].sort((a, b) => b[1] - a[1])[0];
    if (dominantChannel && dominantChannel[1] / data.length > 0.8) {
      risks.push({
        risk: "Single-Channel Dependency",
        evidence: `${dominantChannel[0]} accounts for ${Math.round(dominantChannel[1] / data.length * 100)}% of campaigns — platform risk`,
        severity: "Medium",
      });
    }

    // Engagement volatility
    const openRates = data.filter(c => c.totalSentUsers >= 1000).map(c => (c.uniqueViewedWithinConversion / c.totalSentUsers) * 100);
    if (openRates.length > 0) {
      const avg = openRates.reduce((s, r) => s + r, 0) / openRates.length;
      const stdDev = Math.sqrt(openRates.reduce((s, r) => s + Math.pow(r - avg, 2), 0) / openRates.length);
      if (stdDev > avg * 0.5) {
        risks.push({
          risk: "Engagement Volatility",
          evidence: `Open rate standard deviation (${stdDev.toFixed(1)}%) exceeds 50% of mean (${avg.toFixed(1)}%) — inconsistent audience targeting`,
          severity: "Medium",
        });
      }
    }

    // Segment over-concentration
    if (segmentation && segmentation.segmentReuse.includes("High")) {
      risks.push({
        risk: "Segment Over-Concentration",
        evidence: segmentation.segmentReuse,
        severity: "High",
      });
    }
  } else {
    // Category-level blind spots for website-only mode
    const config = industryConfigs[input.industry];
    if (config) {
      const stageCount = config.lifecycleStages.length;
      risks.push({
        risk: "Lifecycle Coverage Uncertainty",
        evidence: `${stageCount} lifecycle stages defined for industry but no campaign data to verify coverage`,
        severity: "Medium",
      });
    }
    risks.push({
      risk: "Engagement Architecture Unknown",
      evidence: "Without campaign data, batch vs. trigger ratio and automation maturity cannot be assessed",
      severity: "Medium",
    });
    if (!input.brandProfile?.tech_scale_layer.has_cdp) {
      risks.push({
        risk: "Data Unification Gap",
        evidence: "No CDP detected — customer data fragmentation limits personalization and orchestration capabilities",
        severity: "High",
      });
    }
  }

  // Lifecycle neglect (always applicable)
  risks.push({
    risk: "Lifecycle Stage Neglect",
    evidence: "Under-invested lifecycle stages represent revenue leakage and competitive vulnerability",
    severity: "Medium",
  });

  return {
    risks,
    summary: risks.filter(r => r.severity === "High").length > 0
      ? `${risks.filter(r => r.severity === "High").length} high-severity structural risks require immediate strategic attention to prevent competitive erosion.`
      : "Structural risk profile is manageable — proactive investment in identified areas will strengthen competitive position.",
  };
}

function generateBlueprint(
  config: typeof industryConfigs[string],
  lifecycleAssessment: LifecycleArchitectureAssessment,
  engagement: EngagementSophistication | null,
): NinetyDayBlueprint {
  const gapStages = lifecycleAssessment.underInvested;

  return {
    phase1: [
      { action: "Audit current lifecycle coverage and identify top-3 gap stages", cleverTapModule: "Analytics & Segments" },
      { action: "Deploy quick-win behavioral triggers for cart abandonment and browse abandonment", cleverTapModule: "Journeys" },
      { action: "Implement RFM segmentation to identify high-value and at-risk cohorts", cleverTapModule: "RFM Analysis" },
      ...(gapStages.length > 0 ? [{ action: `Build ${gapStages[0]} lifecycle journey with 3-step automation`, cleverTapModule: "Journeys" }] : []),
    ],
    phase2: [
      { action: "Expand lifecycle journey coverage to all identified gap stages", cleverTapModule: "Journeys" },
      { action: "Launch predictive churn model and automated retention interventions", cleverTapModule: "Clever.AI & Predictions" },
      { action: "Implement A/B testing framework for subject lines, content, and send times", cleverTapModule: "A/B Testing & Experiments" },
      { action: "Deploy dynamic content personalization for top-performing campaigns", cleverTapModule: "Dynamic Content" },
    ],
    phase3: [
      { action: "Activate AI-powered send-time optimization across all automated journeys", cleverTapModule: "Clever.AI" },
      { action: "Build cross-channel orchestration connecting email, push, and in-app messaging", cleverTapModule: "Journeys & Product Experiences" },
      { action: "Deploy next-best-action recommendations for high-value segments", cleverTapModule: "Clever.AI & Recommendations" },
      { action: "Establish automated lifecycle reporting dashboard for ongoing optimization", cleverTapModule: "Analytics & Dashboards" },
    ],
  };
}

// ============= MAIN EXPORT =============

export function generateStrategicInsights(input: StrategicInsightsInput): StrategicInsightsOutput {
  const config = industryConfigs[input.industry];
  if (!config) {
    throw new Error(`Unknown industry: ${input.industry}`);
  }

  const mode = determineMode(input);

  const lifecycleAssessment = generateLifecycleAssessment(input, config, mode);

  const engagement = mode !== "website-only" && input.campaignData
    ? generateEngagementSophistication(input.campaignData)
    : null;

  const segmentation = mode === "website-csv-segmentation" && input.campaignData
    ? generateSegmentationIntelligence(input.campaignData)
    : null;

  const executiveSnapshot = generateExecutiveSnapshot(input, config, mode, lifecycleAssessment);
  const competitiveAcceleration = generateCompetitiveAcceleration(input, config);
  const initiatives = generateStrategicInitiatives(input, config, mode, lifecycleAssessment, engagement);
  const riskMapping = generateRiskMapping(input, mode, engagement, segmentation);
  const blueprint = generateBlueprint(config, lifecycleAssessment, engagement);

  return {
    mode,
    executiveSnapshot,
    lifecycleAssessment,
    engagementSophistication: engagement,
    segmentationIntelligence: segmentation,
    competitiveAcceleration,
    initiatives,
    riskMapping,
    blueprint,
  };
}
