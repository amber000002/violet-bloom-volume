// ============= STRATEGIC INSIGHTS EXTENDED ANALYSIS ENGINE =============
// Generates data for Sections A-K appended after existing Strategic Insights

import { CampaignRow } from "./csvAnalyzer";
import { 
  EventSchemaRow, UserPropertyRow, 
  analyzeEventSchemaHealth, analyzeUserPropertyReadiness,
  EventSchemaHealth, UserPropertyReadiness,
  classifyEventToStage, LifecycleStage,
} from "./schemaAnalyzer";

// ===== TYPES =====

export interface QuarterlyMetrics {
  quarter: string;
  totalSends: number;
  totalDelivered: number;
  openRate: number;
  ctr: number;
  conversionRate: number;
}

export interface RevenuePerformanceSnapshot {
  quarters: QuarterlyMetrics[];
  qoqChanges: {
    metric: string;
    previous: string;
    current: string;
    qoqPercent: string;
    revenueImpactSignal: string;
  }[];
}

export interface SendMixEntry {
  deliveryType: string;
  count: number;
  percentShare: number;
  maturityInterpretation: string;
}

export interface UseCaseRevenueLens {
  useCaseName: string;
  coverageStatus: string;
  campaignCount: number;
  revenueCritical: boolean;
  priority: "P0" | "P1" | "Monitor";
}

export interface ExperimentIdea {
  testName: string;
  evidenceSource: string;
  hypothesis: string;
  revenueMetric: string;
  priority: "High" | "Medium" | "Low";
}

export interface RevenueJourney {
  journeyName: string;
  internalUseCaseId: string;
  coverageStatus: string;
  aiAugmented: boolean;
  brandContextApplied: boolean;
  triggerEvent: string;
  goalEvent: string;
  channels: string[];
  personalizationVariables: string[];
  revenueMetricTarget: string;
  readinessStatus: string;
}

export interface RevenueCampaignIdea {
  campaignName: string;
  channel: string;
  targetSegment: string;
  trigger: string;
  revenueMetric: string;
  revenueImpact: string;
}

export interface RevenueSegment {
  segmentName: string;
  eventLogic: string;
  propertyDependencies: string;
  revenuePurpose: string;
  ready: boolean;
}

export interface StrategicPriority {
  title: string;
  campaignEvidence: string;
  coverageEvidence: string;
  eventEvidence: string;
  revenueImpactLevel: "High" | "Medium" | "Low";
  readinessStatus: "Ready" | "Requires Instrumentation";
}

export interface RoadmapItem {
  phase: string;
  initiative: string;
  revenueObjective: string;
  dependency: string;
  effort: "Low" | "Moderate" | "High";
  expectedUpliftType: string;
}

export interface ExtendedInsightsData {
  revenuePerformance: RevenuePerformanceSnapshot | null;
  sendMix: SendMixEntry[];
  useCaseRevenueLens: UseCaseRevenueLens[];
  eventSchemaHealth: EventSchemaHealth | null;
  userPropertyReadiness: UserPropertyReadiness | null;
  strategicPriorities: StrategicPriority[];
  revenueSegments: RevenueSegment[];
  revenueJourneys: RevenueJourney[];
  revenueCampaigns: RevenueCampaignIdea[];
  experiments: ExperimentIdea[];
  roadmap: RoadmapItem[];
}

// ===== SECTION A: Revenue Performance Snapshot =====

function parseDateToQuarter(dateStr: string): string | null {
  if (!dateStr) return null;
  // DD/MM/YY or DD/MM/YYYY
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const month = parseInt(parts[1], 10);
  let year = parseInt(parts[2], 10);
  if (year < 100) year += 2000;
  if (isNaN(month) || isNaN(year)) return null;
  const q = Math.ceil(month / 3);
  return `Q${q} ${year}`;
}

function generateRevenuePerformance(campaigns: CampaignRow[]): RevenuePerformanceSnapshot | null {
  const significant = campaigns.filter(c => c.totalSentUsers >= 1000);
  if (significant.length === 0) return null;

  const quarterMap = new Map<string, { sends: number; delivered: number; viewed: number; clicked: number; converted: number }>();
  
  significant.forEach(c => {
    const q = parseDateToQuarter(c.startDate);
    if (!q) return;
    const existing = quarterMap.get(q) || { sends: 0, delivered: 0, viewed: 0, clicked: 0, converted: 0 };
    existing.sends += c.totalSentUsers;
    existing.delivered += c.totalDeliveredUsers;
    existing.viewed += c.uniqueViewedWithinConversion;
    existing.clicked += c.uniqueClickedWithinConversion;
    existing.converted += c.clickThroughConversions;
    quarterMap.set(q, existing);
  });

  const quarters = [...quarterMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([quarter, d]) => ({
      quarter,
      totalSends: d.sends,
      totalDelivered: d.delivered,
      openRate: d.delivered > 0 ? (d.viewed / d.delivered) * 100 : 0,
      ctr: d.delivered > 0 ? (d.clicked / d.delivered) * 100 : 0,
      conversionRate: d.sends > 0 ? (d.converted / d.sends) * 100 : 0,
    }));

  if (quarters.length < 2) {
    // Still show what we have
    return { quarters, qoqChanges: [] };
  }

  const prev = quarters[quarters.length - 2];
  const curr = quarters[quarters.length - 1];

  const qoq = (metric: string, prevVal: number, currVal: number): { metric: string; previous: string; current: string; qoqPercent: string; revenueImpactSignal: string } => {
    const change = prevVal > 0 ? ((currVal - prevVal) / prevVal) * 100 : 0;
    let signal = "";
    if (metric === "Conversion Rate") {
      if (currVal < prevVal) signal = "Revenue Efficiency Risk";
      else signal = "Revenue Efficiency Improving";
    } else if (metric === "Total Sends") {
      if (currVal > prevVal * 1.1 && curr.conversionRate <= prev.conversionRate) signal = "Volume Scaling Without Revenue Lift";
      else signal = currVal > prevVal ? "Growth" : "Volume Decline";
    } else {
      signal = change > 0 ? "Improving" : change < 0 ? "Declining" : "Stable";
    }
    const fmt = metric.includes("Rate") ? `${currVal.toFixed(2)}%` : currVal.toLocaleString();
    const fmtP = metric.includes("Rate") ? `${prevVal.toFixed(2)}%` : prevVal.toLocaleString();
    return { metric, previous: fmtP, current: fmt, qoqPercent: `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`, revenueImpactSignal: signal };
  };

  return {
    quarters,
    qoqChanges: [
      qoq("Total Sends", prev.totalSends, curr.totalSends),
      qoq("Open/View Rate", prev.openRate, curr.openRate),
      qoq("CTR", prev.ctr, curr.ctr),
      qoq("Conversion Rate", prev.conversionRate, curr.conversionRate),
    ],
  };
}

// ===== SECTION B: Send Mix Maturity =====

function generateSendMix(campaigns: CampaignRow[]): SendMixEntry[] {
  const significant = campaigns.filter(c => c.totalSentUsers >= 1000);
  const deliveryMap = new Map<string, number>();
  
  significant.forEach(c => {
    const dt = (c as any).deliveryType || "Unknown";
    deliveryMap.set(dt, (deliveryMap.get(dt) || 0) + 1);
  });

  const total = significant.length;
  const entries: SendMixEntry[] = [...deliveryMap.entries()].map(([type, count]) => {
    const pct = total > 0 ? (count / total) * 100 : 0;
    let interpretation = "";
    
    if (type.toLowerCase().includes("one time") && pct >= 70) interpretation = "Batch Heavy — over-reliance on one-time sends";
    else if ((type.toLowerCase().includes("action") || type.toLowerCase().includes("trigger") || type.toLowerCase().includes("external trigger")) && pct >= 30) interpretation = "Automation Mature — strong trigger-based engagement";
    else if ((type.toLowerCase().includes("action") || type.toLowerCase().includes("trigger") || type.toLowerCase().includes("external trigger")) && pct < 10) interpretation = "Automation Gap — minimal behavioral triggers";
    else if (type.toLowerCase().includes("recurring")) interpretation = pct > 30 ? "Cadence Driven" : "Supplementary recurring";
    else interpretation = pct > 40 ? "Significant share" : "Minor share";

    return { deliveryType: type, count, percentShare: pct, maturityInterpretation: interpretation };
  });

  return entries.sort((a, b) => b.count - a.count);
}

// ===== SECTION C: Use Case Revenue Lens =====
// NOTE: This receives pre-computed coverage data from UseCaseCoverageAnalysis

export interface CoverageDataForRevenue {
  useCaseName: string;
  stage: string;
  status: "active" | "missing" | "review-needed";
  campaignCount: number;
}

function generateUseCaseRevenueLens(coverageData: CoverageDataForRevenue[]): UseCaseRevenueLens[] {
  const revenueStages = ["monetization", "retention", "churn prevention", "churn", "renewal", "upsell", "cross-sell", "win-back"];
  
  return coverageData.map(uc => {
    const isRevenueCritical = revenueStages.some(s => uc.stage.toLowerCase().includes(s));
    let priority: "P0" | "P1" | "Monitor" = "Monitor";
    
    if (uc.status === "missing" && isRevenueCritical) priority = "P0";
    else if (uc.status === "missing") priority = "P1";
    
    return {
      useCaseName: uc.useCaseName,
      coverageStatus: uc.status === "active" ? "Active" : uc.status === "missing" ? "Missing" : "Under Review",
      campaignCount: uc.campaignCount,
      revenueCritical: isRevenueCritical,
      priority,
    };
  });
}

// ===== SECTION F: Strategic Revenue Priorities =====

function generateStrategicPriorities(
  campaigns: CampaignRow[],
  coverageData: CoverageDataForRevenue[],
  eventHealth: EventSchemaHealth | null,
): StrategicPriority[] {
  const priorities: StrategicPriority[] = [];
  const significant = campaigns.filter(c => c.totalSentUsers >= 1000);
  const totalSent = significant.reduce((s, c) => s + c.totalSentUsers, 0);
  const totalViewed = significant.reduce((s, c) => s + c.uniqueViewedWithinConversion, 0);
  const totalClicked = significant.reduce((s, c) => s + c.uniqueClickedWithinConversion, 0);
  const totalConverted = significant.reduce((s, c) => s + c.clickThroughConversions, 0);
  
  const overallConvRate = totalSent > 0 ? (totalConverted / totalSent * 100) : 0;
  const overallCTR = totalSent > 0 ? (totalClicked / totalSent * 100) : 0;

  // Missing monetization use cases
  const missingRevUCs = coverageData.filter(uc => 
    uc.status === "missing" && 
    ["monetization", "retention", "churn"].some(s => uc.stage.toLowerCase().includes(s))
  );

  if (missingRevUCs.length > 0) {
    const missingNames = missingRevUCs.slice(0, 3).map(u => u.useCaseName).join(", ");
    priorities.push({
      title: "Revenue Lifecycle Automation",
      campaignEvidence: `Conversion Rate = ${overallConvRate.toFixed(2)}%`,
      coverageEvidence: `${missingRevUCs.length} revenue-critical use case(s) missing: ${missingNames}`,
      eventEvidence: eventHealth && eventHealth.stageDistribution.Monetization === 0 
        ? "No monetization events detected" 
        : eventHealth ? `${eventHealth.stageDistribution.Monetization} monetization events available` : "Event schema not uploaded",
      revenueImpactLevel: "High",
      readinessStatus: eventHealth && eventHealth.stageDistribution.Monetization > 0 ? "Ready" : "Requires Instrumentation",
    });
  }

  // Low CTR + high opens → CTA problem
  const overallOpenRate = totalSent > 0 ? (totalViewed / totalSent * 100) : 0;
  if (overallOpenRate > 15 && overallCTR < 1.5) {
    priorities.push({
      title: "Content-to-Conversion Optimization",
      campaignEvidence: `Open Rate ${overallOpenRate.toFixed(1)}% but CTR only ${overallCTR.toFixed(2)}% — open-to-click gap`,
      coverageEvidence: "CTA clarity and content-action alignment needs improvement",
      eventEvidence: eventHealth ? `${eventHealth.mappedEvents}/${eventHealth.totalEvents} events mapped` : "Event schema not uploaded",
      revenueImpactLevel: "Medium",
      readinessStatus: "Ready",
    });
  }

  // Retention gap
  const missingRetention = coverageData.filter(uc => uc.status === "missing" && uc.stage.toLowerCase().includes("retention"));
  if (missingRetention.length > 0 || (eventHealth && eventHealth.stageDistribution.Retention === 0)) {
    priorities.push({
      title: "Retention & Reactivation Engine",
      campaignEvidence: `${significant.length} campaigns analyzed`,
      coverageEvidence: missingRetention.length > 0 ? `${missingRetention.length} retention use cases missing` : "Retention coverage present",
      eventEvidence: eventHealth && eventHealth.stageDistribution.Retention === 0 ? "No retention events" : "Retention events available",
      revenueImpactLevel: "High",
      readinessStatus: eventHealth && eventHealth.stageDistribution.Retention > 0 ? "Ready" : "Requires Instrumentation",
    });
  }

  // Referral gap
  if (eventHealth && eventHealth.stageDistribution.Referral === 0) {
    priorities.push({
      title: "Viral Growth Loop",
      campaignEvidence: "No referral campaigns detected",
      coverageEvidence: coverageData.some(uc => uc.stage.toLowerCase().includes("referral") && uc.status === "missing") ? "Referral use case missing" : "Limited referral coverage",
      eventEvidence: "No referral events in schema",
      revenueImpactLevel: "Medium",
      readinessStatus: "Requires Instrumentation",
    });
  }

  // Generic fallback for low conversion
  if (overallConvRate < 1 && priorities.length < 3) {
    priorities.push({
      title: "Conversion Rate Recovery",
      campaignEvidence: `Overall conversion rate at ${overallConvRate.toFixed(2)}%`,
      coverageEvidence: "Review campaign-to-lifecycle alignment",
      eventEvidence: eventHealth ? `${eventHealth.signals.length} health signal(s) detected` : "Event schema not uploaded",
      revenueImpactLevel: "High",
      readinessStatus: "Ready",
    });
  }

  return priorities.slice(0, 5);
}

// ===== SECTION G: Revenue Segments =====

function generateRevenueSegments(
  events: EventSchemaRow[],
  properties: UserPropertyRow[]
): RevenueSegment[] {
  const segments: RevenueSegment[] = [];
  const eventNames = events.map(e => e.eventName);
  const propNames = properties.map(p => p.propertyName);

  // High-value users
  const purchaseEvent = eventNames.find(e => classifyEventToStage(e) === "Monetization");
  const revenueProp = propNames.find(p => ["revenue", "ltv", "total_spend", "lifetime_value"].some(k => p.toLowerCase().includes(k)));
  segments.push({
    segmentName: "High-Value Users",
    eventLogic: purchaseEvent ? `${purchaseEvent} count > 3` : "purchase event required",
    propertyDependencies: revenueProp || "revenue/LTV property required",
    revenuePurpose: "Upsell, loyalty, and premium experiences",
    ready: !!purchaseEvent && !!revenueProp,
  });

  // At-Risk / Churn
  const retentionEvent = eventNames.find(e => classifyEventToStage(e) === "Retention");
  const engagementEvent = eventNames.find(e => classifyEventToStage(e) === "Engagement");
  segments.push({
    segmentName: "At-Risk Users",
    eventLogic: engagementEvent ? `No ${engagementEvent} in last 14 days` : "engagement event required",
    propertyDependencies: "last_active_date or engagement_score",
    revenuePurpose: "Churn prevention and win-back",
    ready: !!engagementEvent,
  });

  // Trial users
  const signupEvent = eventNames.find(e => classifyEventToStage(e) === "Activation");
  const trialProp = propNames.find(p => p.toLowerCase().includes("trial"));
  segments.push({
    segmentName: "Trial Users",
    eventLogic: signupEvent ? `${signupEvent} AND no monetization event` : "signup event required",
    propertyDependencies: trialProp || "trial_status property required",
    revenuePurpose: "Trial-to-paid conversion",
    ready: !!signupEvent,
  });

  // Referral advocates
  const referralEvent = eventNames.find(e => classifyEventToStage(e) === "Referral");
  segments.push({
    segmentName: "Referral Advocates",
    eventLogic: referralEvent ? `${referralEvent} count >= 1` : "referral event required",
    propertyDependencies: "referral_count or referred_users",
    revenuePurpose: "Organic growth and acquisition cost reduction",
    ready: !!referralEvent,
  });

  // Inactive Re-engagement
  segments.push({
    segmentName: "Inactive Re-engagement",
    eventLogic: engagementEvent ? `No ${engagementEvent} in last 30 days` : "engagement event required",
    propertyDependencies: "last_session_date",
    revenuePurpose: "Revenue recovery from dormant users",
    ready: !!engagementEvent,
  });

  return segments;
}

// ===== SECTION H: Revenue Journeys =====

function generateRevenueJourneys(
  coverageData: CoverageDataForRevenue[],
  events: EventSchemaRow[],
  brandName: string,
): RevenueJourney[] {
  const eventNames = events.map(e => e.eventName);
  const missingUseCases = coverageData.filter(uc => uc.status === "missing" || uc.status === "review-needed");
  
  const journeys: RevenueJourney[] = [];
  
  for (const uc of missingUseCases.slice(0, 5)) {
    const stageLC = uc.stage.toLowerCase();
    const triggerEvent = findBestEvent(eventNames, stageLC, "trigger");
    const goalEvent = findBestEvent(eventNames, stageLC, "goal");
    
    journeys.push({
      journeyName: `${brandName ? brandName + " " : ""}${uc.useCaseName} Journey`,
      internalUseCaseId: uc.useCaseName,
      coverageStatus: uc.status === "missing" ? "missing" : "review-needed",
      aiAugmented: true,
      brandContextApplied: !!brandName,
      triggerEvent: triggerEvent || "Event required — not found in schema",
      goalEvent: goalEvent || "Event required — not found in schema",
      channels: ["Email", "Push", "In-App"],
      personalizationVariables: ["{user_name}", "{last_feature_used}", "{days_since_last_action}"],
      revenueMetricTarget: getRevenueMetric(stageLC),
      readinessStatus: triggerEvent && goalEvent ? "Ready" : "Blocked — event instrumentation required",
    });
  }

  return journeys;
}

function findBestEvent(eventNames: string[], stage: string, type: "trigger" | "goal"): string | null {
  const stageKeywords = LIFECYCLE_KEYWORDS_FOR_MATCHING[stage] || [];
  for (const event of eventNames) {
    const norm = event.toLowerCase();
    if (stageKeywords.some(kw => norm.includes(kw))) return event;
  }
  return null;
}

const LIFECYCLE_KEYWORDS_FOR_MATCHING: Record<string, string[]> = {
  "onboarding": ["signup", "register", "onboard", "first_action"],
  "activation": ["activate", "verify", "complete_profile", "first"],
  "engagement": ["view", "click", "search", "open", "browse"],
  "monetization": ["purchase", "payment", "checkout", "subscribe", "order"],
  "retention": ["renew", "return", "reactivate", "repeat"],
  "churn": ["cancel", "unsubscribe", "inactive"],
  "churn prevention": ["cancel", "unsubscribe", "inactive"],
  "referral": ["invite", "refer", "share"],
  "win-back": ["return", "reactivate", "re-engage"],
  "upsell": ["upgrade", "plan_change", "purchase"],
  "cross-sell": ["purchase", "add_to_cart", "browse"],
};

function getRevenueMetric(stage: string): string {
  if (stage.includes("monetization") || stage.includes("upsell")) return "Upgrade rate / ARPU lift";
  if (stage.includes("retention")) return "Renewal retention rate";
  if (stage.includes("churn")) return "Recovery rate";
  if (stage.includes("referral")) return "Referral conversion rate";
  if (stage.includes("activation")) return "Trial conversion rate";
  return "LTV increase";
}

// ===== SECTION I: Revenue Campaign Ideas =====

function generateRevenueCampaigns(
  coverageData: CoverageDataForRevenue[],
  events: EventSchemaRow[],
  brandName: string,
): RevenueCampaignIdea[] {
  const eventNames = events.map(e => e.eventName);
  const missingUCs = coverageData.filter(uc => uc.status === "missing" || uc.status === "review-needed");
  
  const revenueMetrics = ["Upgrade rate", "Trial conversion rate", "Renewal retention rate", "ARPU lift", "Recovery rate", "LTV increase"];
  const channels = ["Email", "Push", "WhatsApp", "In-App", "SMS", "Email"];
  
  const campaigns: RevenueCampaignIdea[] = [];
  
  for (let i = 0; i < 6; i++) {
    const uc = missingUCs[i % missingUCs.length];
    if (!uc) break;
    
    const triggerEvent = findBestEvent(eventNames, uc.stage.toLowerCase(), "trigger");
    
    campaigns.push({
      campaignName: `${brandName ? brandName + " " : ""}${uc.useCaseName} Campaign`,
      channel: channels[i % channels.length],
      targetSegment: getSegmentForStage(uc.stage),
      trigger: triggerEvent || "Requires event instrumentation",
      revenueMetric: revenueMetrics[i % revenueMetrics.length],
      revenueImpact: uc.stage.toLowerCase().includes("monetization") || uc.stage.toLowerCase().includes("retention") ? "High" : "Medium",
    });
  }

  return campaigns;
}

function getSegmentForStage(stage: string): string {
  const s = stage.toLowerCase();
  if (s.includes("onboarding") || s.includes("activation")) return "New users (0-7 days)";
  if (s.includes("monetization") || s.includes("upsell")) return "Free/trial users";
  if (s.includes("retention")) return "Active paid users";
  if (s.includes("churn")) return "At-risk users (inactive 14+ days)";
  if (s.includes("referral")) return "High-engagement users";
  return "All active users";
}

// ===== SECTION J: Experiments =====

function generateExperiments(campaigns: CampaignRow[]): ExperimentIdea[] {
  const significant = campaigns.filter(c => c.totalSentUsers >= 1000);
  if (significant.length === 0) return [];

  const sorted = [...significant].sort((a, b) => b.clickRate - a.clickRate);
  const top5 = sorted.slice(0, 5);
  const worst5 = sorted.slice(-5);

  const experiments: ExperimentIdea[] = [];

  // 1. Subject line pattern analysis
  const topSubjects = top5.map(c => (c.title || c.subjectLine || "").toLowerCase());
  const worstSubjects = worst5.map(c => (c.title || c.subjectLine || "").toLowerCase());
  
  const urgencyWords = ["last", "expire", "ending", "hurry", "limited", "final", "urgent", "deadline"];
  const revealWords = ["discover", "unlock", "reveal", "secret", "inside", "exclusive", "sneak"];
  const discountWords = ["off", "save", "discount", "deal", "free", "offer", "sale", "%"];
  
  const topHasUrgency = topSubjects.some(s => urgencyWords.some(w => s.includes(w)));
  const topHasReveal = topSubjects.some(s => revealWords.some(w => s.includes(w)));
  const worstIsGeneric = worstSubjects.every(s => !urgencyWords.some(w => s.includes(w)) && !revealWords.some(w => s.includes(w)));

  if (topHasReveal && worstIsGeneric) {
    experiments.push({
      testName: "Reveal vs Generic Subject Line",
      evidenceSource: `Top campaigns use reveal/curiosity framing; worst are generic`,
      hypothesis: "Curiosity-driven subject lines will improve CTR by 15-25%",
      revenueMetric: "Conversion Rate",
      priority: "High",
    });
  } else if (topHasUrgency) {
    experiments.push({
      testName: "Urgency vs Value-Led Subject Line",
      evidenceSource: "Top performers use urgency cues",
      hypothesis: "Urgency framing will improve open-to-click ratio",
      revenueMetric: "CTR",
      priority: "High",
    });
  }

  // 2. CTA density
  const highOpenLowClick = significant.filter(c => c.openRate > 20 && c.clickRate < 1);
  if (highOpenLowClick.length >= 3) {
    experiments.push({
      testName: "CTA Clarity & Placement Test",
      evidenceSource: `${highOpenLowClick.length} campaigns with >20% opens but <1% clicks`,
      hypothesis: "Single prominent CTA above fold will improve click rates",
      revenueMetric: "CTR → Conversion Rate",
      priority: "High",
    });
  }

  // 3. Send time clustering
  const timeMap = new Map<string, { clicks: number; delivered: number }>();
  significant.forEach(c => {
    const hour = c.startTime?.split(":")[0] || "unknown";
    const existing = timeMap.get(hour) || { clicks: 0, delivered: 0 };
    existing.clicks += c.uniqueClickedWithinConversion;
    existing.delivered += c.totalDeliveredUsers || c.totalSentUsers;
    timeMap.set(hour, existing);
  });
  
  const hourCTRs = [...timeMap.entries()]
    .filter(([_, d]) => d.delivered > 0)
    .map(([hour, d]) => ({ hour, ctr: (d.clicks / d.delivered) * 100 }));
  
  if (hourCTRs.length >= 3) {
    const maxCTR = Math.max(...hourCTRs.map(h => h.ctr));
    const minCTR = Math.min(...hourCTRs.map(h => h.ctr));
    if (maxCTR > 0 && (maxCTR - minCTR) / maxCTR > 0.2) {
      const bestHour = hourCTRs.find(h => h.ctr === maxCTR)?.hour;
      experiments.push({
        testName: "Send Time Optimization",
        evidenceSource: `CTR variance >20% across time slots. Best: ${bestHour}:00`,
        hypothesis: "Optimizing send time will improve engagement by 10-15%",
        revenueMetric: "Open Rate + CTR",
        priority: "Medium",
      });
    }
  }

  // 4. Volume vs conversion efficiency
  const totalSent = significant.reduce((s, c) => s + c.totalSentUsers, 0);
  const totalConverted = significant.reduce((s, c) => s + c.clickThroughConversions, 0);
  const convRate = totalSent > 0 ? (totalConverted / totalSent) * 100 : 0;
  
  // Check if volume increased but conversion didn't keep pace
  const quarters = new Map<string, { sends: number; conversions: number }>();
  significant.forEach(c => {
    const q = parseDateToQuarter(c.startDate);
    if (!q) return;
    const ex = quarters.get(q) || { sends: 0, conversions: 0 };
    ex.sends += c.totalSentUsers;
    ex.conversions += c.clickThroughConversions;
    quarters.set(q, ex);
  });
  
  const qArr = [...quarters.entries()].sort(([a], [b]) => a.localeCompare(b));
  if (qArr.length >= 2) {
    const prev = qArr[qArr.length - 2][1];
    const curr = qArr[qArr.length - 1][1];
    if (curr.sends > prev.sends * 1.1 && (curr.conversions / curr.sends) <= (prev.conversions / prev.sends)) {
      experiments.push({
        testName: "Volume-to-Revenue Efficiency Test",
        evidenceSource: "Sends increased but conversion rate flat/declining",
        hypothesis: "Reducing volume by 20% and targeting high-intent segments will improve revenue per send",
        revenueMetric: "Revenue per 1000 sends",
        priority: "High",
      });
    }
  }

  // Generic fallback
  if (experiments.length < 2) {
    experiments.push({
      testName: "Personalization Depth Test",
      evidenceSource: "Baseline engagement metrics",
      hypothesis: "Dynamic content blocks will improve CTR by 10-20%",
      revenueMetric: "CTR",
      priority: "Medium",
    });
  }

  return experiments;
}

// ===== SECTION K: Roadmap =====

function generateRoadmap(
  priorities: StrategicPriority[],
  journeys: RevenueJourney[],
  eventHealth: EventSchemaHealth | null,
): RoadmapItem[] {
  const items: RoadmapItem[] = [];

  // 30 Days — Ready items
  const readyJourneys = journeys.filter(j => j.readinessStatus.includes("Ready"));
  readyJourneys.slice(0, 3).forEach(j => {
    items.push({
      phase: "0-30 Days",
      initiative: j.journeyName,
      revenueObjective: j.revenueMetricTarget,
      dependency: "None — ready to deploy",
      effort: "Low",
      expectedUpliftType: "Conversion rate improvement",
    });
  });

  if (items.length === 0) {
    items.push({
      phase: "0-30 Days",
      initiative: "Audit and fix existing campaign targeting",
      revenueObjective: "Baseline accuracy improvement",
      dependency: "Campaign data access",
      effort: "Low",
      expectedUpliftType: "Engagement rate improvement",
    });
  }

  // 60-90 Days — Instrumentation + 1 automation
  const blockedJourneys = journeys.filter(j => j.readinessStatus.includes("Blocked"));
  if (blockedJourneys.length > 0) {
    items.push({
      phase: "60-90 Days",
      initiative: `Instrument ${Math.min(blockedJourneys.length, 3)} missing events for blocked journeys`,
      revenueObjective: "Enable lifecycle automation",
      dependency: "Engineering resources for event instrumentation",
      effort: "Moderate",
      expectedUpliftType: "Lifecycle coverage expansion",
    });
  }

  const readyPriority = priorities.find(p => p.readinessStatus === "Ready");
  if (readyPriority) {
    items.push({
      phase: "60-90 Days",
      initiative: readyPriority.title + " — full deployment",
      revenueObjective: readyPriority.campaignEvidence,
      dependency: "Campaign infrastructure",
      effort: "Moderate",
      expectedUpliftType: "Revenue efficiency",
    });
  }

  // 90+ Days — Structural
  items.push({
    phase: "90+ Days",
    initiative: "Full lifecycle automation with predictive targeting",
    revenueObjective: "LTV maximization",
    dependency: "Complete event instrumentation + ML models",
    effort: "High",
    expectedUpliftType: "Structural revenue growth",
  });

  if (eventHealth && eventHealth.stageDistribution.Referral === 0) {
    items.push({
      phase: "90+ Days",
      initiative: "Referral engine implementation",
      revenueObjective: "Organic growth acceleration",
      dependency: "Referral event instrumentation",
      effort: "High",
      expectedUpliftType: "CAC reduction + viral coefficient",
    });
  }

  return items;
}

// ===== MAIN GENERATOR =====

export function generateExtendedInsights(
  campaigns: CampaignRow[],
  coverageData: CoverageDataForRevenue[],
  eventSchemaRows: EventSchemaRow[] | null,
  userPropertyRows: UserPropertyRow[] | null,
  brandName: string,
): ExtendedInsightsData {
  const revenuePerformance = generateRevenuePerformance(campaigns);
  const sendMix = generateSendMix(campaigns);
  const useCaseRevenueLens = generateUseCaseRevenueLens(coverageData);
  
  const eventSchemaHealth = eventSchemaRows ? analyzeEventSchemaHealth(eventSchemaRows) : null;
  const userPropertyReadiness = userPropertyRows ? analyzeUserPropertyReadiness(userPropertyRows) : null;
  
  const strategicPriorities = generateStrategicPriorities(campaigns, coverageData, eventSchemaHealth);
  
  const revenueSegments = eventSchemaRows && userPropertyRows 
    ? generateRevenueSegments(eventSchemaRows, userPropertyRows) 
    : [];
  
  const revenueJourneys = eventSchemaRows 
    ? generateRevenueJourneys(coverageData, eventSchemaRows, brandName)
    : [];
  
  const revenueCampaigns = eventSchemaRows 
    ? generateRevenueCampaigns(coverageData, eventSchemaRows, brandName)
    : [];
  
  const experiments = generateExperiments(campaigns);
  const roadmap = generateRoadmap(strategicPriorities, revenueJourneys, eventSchemaHealth);

  return {
    revenuePerformance,
    sendMix,
    useCaseRevenueLens,
    eventSchemaHealth,
    userPropertyReadiness,
    strategicPriorities,
    revenueSegments,
    revenueJourneys,
    revenueCampaigns,
    experiments,
    roadmap,
  };
}
