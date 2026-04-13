// ============= PER-TABLE INSIGHT ENGINE =============
// Generates severity-classified, source-attributed insights for each Inbox Diagnostics section.
// All thresholds grounded in CleverTap email best practices documentation.
// Max 4 insights per section. Order: Critical → Warning → Info → Positive.

import { CampaignRow, PostmasterRow, AnalysisReport } from "./csvAnalyzer";
import { ExtendedInsightsData } from "./strategicInsightsExtendedEngine";

// ============= TYPES =============

export type InsightSeverity = "critical" | "warning" | "info" | "positive";

export interface TableInsight {
  severity: InsightSeverity;
  text: string;
  source: string;
}

export interface SectionInsights {
  campaignOverview: TableInsight[];
  monthlyOverview: TableInsight[];
  emailMetricsTrend: TableInsight[];
  infrastructureReputation: TableInsight[];
  reputationTrends: TableInsight[];
  bestPerformingCTR: TableInsight[];
  underperformingCTR: TableInsight[];
  sendMixCoverage: TableInsight[];
  lifecycleCoverage: TableInsight[];
  keyLearnings: TableInsight[];
}

// ============= HELPERS =============

const fmt = (n: number, d = 2) => n.toFixed(d);
const fmtK = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toFixed(0);
const MIN_VOLUME = 1000;

const SEVERITY_ORDER: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2, positive: 3 };

function sortAndCap(insights: TableInsight[], max = 4): TableInsight[] {
  return insights
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .slice(0, max);
}

function parseDateDDMM(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length < 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  let year = parseInt(parts[2], 10);
  if (year < 100) year += 2000;
  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? null : d;
}

// ============= MAIN GENERATOR =============

export function generateSectionInsights(
  campaignData: CampaignRow[],
  analysisReport: AnalysisReport,
  postmasterData: PostmasterRow[] | null,
  extendedData: ExtendedInsightsData | null,
  lifecycleCoverageStats?: { strongCount: number; partialCount: number; weakCount: number; totalStages: number } | null,
): SectionInsights {
  const sig = campaignData.filter(c => c.totalSentUsers >= MIN_VOLUME);
  const totalSent = sig.reduce((s, c) => s + c.totalSentUsers, 0);
  const totalBounce = sig.reduce((s, c) => s + c.hardBounces + c.softBounces, 0);
  const totalHardBounce = sig.reduce((s, c) => s + c.hardBounces, 0);
  const totalUnsub = sig.reduce((s, c) => s + c.totalUnsubscribes, 0);
  const totalClicked = sig.reduce((s, c) => s + c.uniqueClickedWithinConversion, 0);
  const totalViewed = sig.reduce((s, c) => s + c.uniqueViewedWithinConversion, 0);
  const bounceRate = totalSent > 0 ? (totalBounce / totalSent) * 100 : 0;
  const hardBounceRate = totalSent > 0 ? (totalHardBounce / totalSent) * 100 : 0;
  const unsubRate = totalSent > 0 ? (totalUnsub / totalSent) * 100 : 0;
  const avgCTR = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
  const avgOpen = totalSent > 0 ? (totalViewed / totalSent) * 100 : 0;

  return {
    campaignOverview: generateCampaignOverviewInsights(analysisReport, bounceRate, hardBounceRate, unsubRate),
    monthlyOverview: generateMonthlyOverviewInsights(analysisReport, sig),
    emailMetricsTrend: generateEmailMetricsTrendInsights(sig, bounceRate, avgCTR),
    infrastructureReputation: generateInfrastructureInsights(postmasterData),
    reputationTrends: generateReputationTrendsInsights(postmasterData),
    bestPerformingCTR: generateBestCTRInsights(sig),
    underperformingCTR: generateUnderperformingCTRInsights(sig),
    sendMixCoverage: generateSendMixInsights(extendedData),
    lifecycleCoverage: generateLifecycleCoverageInsights(lifecycleCoverageStats),
    keyLearnings: generateKeyLearningsInsights(avgCTR, avgOpen, bounceRate, hardBounceRate, unsubRate, postmasterData, lifecycleCoverageStats),
  };
}

// ============= CAMPAIGN OVERVIEW (by Provider) =============

function generateCampaignOverviewInsights(
  report: AnalysisReport,
  bounceRate: number,
  hardBounceRate: number,
  unsubRate: number,
): TableInsight[] {
  const insights: TableInsight[] = [];
  const providers = report.providerAggregates;

  // Hard bounce > 2% is critical — indicates unverified lists (IP Warmup doc: verify lists)
  if (hardBounceRate > 2) {
    insights.push({
      severity: "critical",
      text: `Hard bounce rate at ${fmt(hardBounceRate)}% — exceeds safe threshold. Verify and clean email lists before sending to protect sender reputation.`,
      source: "IP Warmup",
    });
  } else if (bounceRate > 5) {
    insights.push({
      severity: "warning",
      text: `Total bounce rate at ${fmt(bounceRate)}% — elevated levels suggest list hygiene issues. Regular list cleaning is recommended.`,
      source: "Email Best Practices",
    });
  }

  // Unsubscribe rate > 0.5% is a warning signal
  if (unsubRate > 0.5) {
    insights.push({
      severity: "warning",
      text: `Unsubscribe rate at ${fmt(unsubRate)}% — indicates potential content-audience mismatch or over-frequency. Review audience selection and engagement windows.`,
      source: "Email Best Practices — Audience Selection",
    });
  }

  // Volume concentration: single provider > 90%
  if (providers.length > 1) {
    const total = providers.reduce((s, p) => s + p.totalSentUsers, 0);
    const top = [...providers].sort((a, b) => b.totalSentUsers - a.totalSentUsers)[0];
    if (top && total > 0 && (top.totalSentUsers / total) * 100 > 90) {
      insights.push({
        severity: "info",
        text: `${top.serviceProvider} carries ${fmt((top.totalSentUsers / total) * 100, 0)}% of send volume — consider separating promotional and transactional sends across dedicated subdomains.`,
        source: "IP Warmup",
      });
    }
  }

  // Positive: low bounce + low unsub
  if (hardBounceRate < 1 && unsubRate < 0.2) {
    insights.push({
      severity: "positive",
      text: `Bounce rate (${fmt(hardBounceRate)}%) and unsubscribe rate (${fmt(unsubRate)}%) are within healthy thresholds — list quality is strong.`,
      source: "Email Best Practices",
    });
  }

  return sortAndCap(insights);
}

// ============= MONTHLY OVERVIEW =============

function generateMonthlyOverviewInsights(report: AnalysisReport, sig: CampaignRow[]): TableInsight[] {
  const insights: TableInsight[] = [];
  const months = report.monthlyOverview.filter(m => m.month !== "Unknown Date");
  if (months.length < 1) return [];

  // Detect 30+ day send gaps (Email Best Practices — Sending Volume)
  const dates = sig.map(c => parseDateDDMM(c.startDate)).filter(Boolean) as Date[];
  dates.sort((a, b) => a.getTime() - b.getTime());
  let maxGapDays = 0;
  let gapStart = "";
  let gapEnd = "";
  for (let i = 1; i < dates.length; i++) {
    const gap = (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
    if (gap > maxGapDays) {
      maxGapDays = gap;
      gapStart = dates[i - 1].toLocaleDateString("en-US", { month: "short", year: "numeric" });
      gapEnd = dates[i].toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
  }

  if (maxGapDays > 30) {
    insights.push({
      severity: maxGapDays > 60 ? "critical" : "warning",
      text: `Send gap of ${Math.round(maxGapDays)} days detected between ${gapStart} and ${gapEnd} — ISPs re-evaluate sender reputation after 30 days of inactivity. Resume sending gradually.`,
      source: "Email Best Practices — Sending Volume",
    });
  }

  // Volume surge detection (IP Warmup violation)
  if (months.length >= 2) {
    for (let i = 1; i < months.length; i++) {
      const prev = months[i - 1].totalSentUsers;
      const curr = months[i].totalSentUsers;
      if (prev > 0 && curr > prev * 3) {
        insights.push({
          severity: "warning",
          text: `Volume surged ${fmt((curr / prev), 1)}x from ${months[i - 1].month} to ${months[i].month} (${fmtK(prev)}→${fmtK(curr)}) — rapid increases risk reputation drops. Follow a gradual warmup schedule.`,
          source: "IP Warmup",
        });
        break;
      }
    }
  }

  // CTR trend (first vs last month)
  if (months.length >= 2) {
    const first = months[0];
    const last = months[months.length - 1];
    const ctrDelta = last.clickPercent - first.clickPercent;
    if (ctrDelta < -1) {
      insights.push({
        severity: "warning",
        text: `CTR declined ${fmt(Math.abs(ctrDelta))}pp from ${first.month} to ${last.month} — review content relevance and audience engagement windows.`,
        source: "Email Best Practices — Campaign Results",
      });
    } else if (ctrDelta > 1) {
      insights.push({
        severity: "positive",
        text: `CTR improved by ${fmt(ctrDelta)}pp from ${first.month} to ${last.month} — engagement strategy is trending positively.`,
        source: "Email Best Practices — Campaign Results",
      });
    }
  }

  // Positive: no gaps
  if (maxGapDays <= 30 && months.length >= 3) {
    insights.push({
      severity: "positive",
      text: `Consistent sending cadence maintained across ${months.length} months with no gaps exceeding 30 days — supports stable sender reputation.`,
      source: "Email Best Practices — Sending Volume",
    });
  }

  return sortAndCap(insights);
}

// ============= EMAIL METRICS TREND =============

function generateEmailMetricsTrendInsights(sig: CampaignRow[], bounceRate: number, avgCTR: number): TableInsight[] {
  if (sig.length < 3) return [];
  const insights: TableInsight[] = [];

  // CTR volatility
  const ctrs = sig.map(c => c.totalSentUsers > 0 ? (c.uniqueClickedWithinConversion / c.totalSentUsers) * 100 : 0);
  const mean = ctrs.reduce((s, v) => s + v, 0) / ctrs.length;
  const variance = ctrs.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / ctrs.length;
  const cv = mean > 0 ? (Math.sqrt(variance) / mean) * 100 : 0;

  if (cv > 80) {
    insights.push({
      severity: "warning",
      text: `High CTR volatility (CV ${fmt(cv, 0)}%) — inconsistent engagement suggests uneven audience targeting or content quality across campaigns.`,
      source: "Email Best Practices — Campaign Results",
    });
  }

  // Bounce spike detection
  const bouncePer = sig.map(c => c.totalSentUsers > 0 ? ((c.hardBounces + c.softBounces) / c.totalSentUsers) * 100 : 0);
  const maxBounce = Math.max(...bouncePer);
  if (maxBounce > 5) {
    insights.push({
      severity: "critical",
      text: `Bounce rate spike at ${fmt(maxBounce)}% detected in individual campaigns — clean invalid addresses and verify lists before next send.`,
      source: "IP Warmup",
    });
  }

  // Consistent decline pattern (last 3)
  if (ctrs.length >= 3) {
    const last3 = ctrs.slice(-3);
    if (last3[0] > last3[1] && last3[1] > last3[2] && last3[0] - last3[2] > 0.5) {
      insights.push({
        severity: "warning",
        text: `CTR shows a declining trend over the last 3 campaigns — review campaign metrics within 12-24 hours of send and adjust content strategy.`,
        source: "Email Best Practices — Campaign Results",
      });
    }
  }

  // Positive: stable and decent
  if (cv < 30 && avgCTR > 2) {
    insights.push({
      severity: "positive",
      text: `Engagement consistency is strong (CV ${fmt(cv, 0)}%) with ${fmt(avgCTR)}% average CTR — audience targeting and content are well-aligned.`,
      source: "Email Best Practices",
    });
  }

  return sortAndCap(insights);
}

// ============= INFRASTRUCTURE & REPUTATION SCORECARD =============

function generateInfrastructureInsights(postmasterData: PostmasterRow[] | null): TableInsight[] {
  if (!postmasterData || postmasterData.length === 0) return [];
  const insights: TableInsight[] = [];

  const domains = new Set(postmasterData.map(p => p.domain).filter(Boolean));
  const repValues = postmasterData.map(p => p.domainReputation?.toLowerCase()).filter(Boolean);
  const lowRepDays = repValues.filter(r => r === "low" || r === "bad").length;
  const highRepDays = repValues.filter(r => r === "high").length;

  if (lowRepDays > repValues.length * 0.3) {
    insights.push({
      severity: "critical",
      text: `Domain reputation flagged LOW/BAD on ${lowRepDays} of ${repValues.length} observed days — this actively suppresses inbox placement. Reduce volume and focus on engaged audiences.`,
      source: "Sender Reputation",
    });
  }

  // Mixed signals across domains
  if (domains.size > 1 && lowRepDays > 0 && highRepDays > 0) {
    insights.push({
      severity: "warning",
      text: `Mixed reputation signals across ${domains.size} domains — consider separating promotional and transactional traffic onto dedicated subdomains.`,
      source: "IP Warmup",
    });
  }

  // IP reputation
  const ipRepValues = postmasterData.map(p => p.ipReputation?.toLowerCase()).filter(r => r && r !== "" && r !== "n/a");
  const lowIpDays = ipRepValues.filter(r => r === "low" || r === "bad").length;
  if (lowIpDays > ipRepValues.length * 0.2 && ipRepValues.length > 0) {
    insights.push({
      severity: "warning",
      text: `IP reputation dropped to LOW/BAD on ${lowIpDays} of ${ipRepValues.length} days — indicates potential blocklisting risk. Verify sending IPs and warm up gradually.`,
      source: "IP Warmup",
    });
  }

  // Positive
  if (highRepDays > repValues.length * 0.8 && repValues.length > 0) {
    insights.push({
      severity: "positive",
      text: `Domain reputation maintained HIGH on ${highRepDays} of ${repValues.length} days — infrastructure is healthy and supports strong inbox placement.`,
      source: "Sender Reputation",
    });
  }

  return sortAndCap(insights);
}

// ============= REPUTATION TRENDS =============

function generateReputationTrendsInsights(postmasterData: PostmasterRow[] | null): TableInsight[] {
  if (!postmasterData || postmasterData.length < 3) return [];
  const insights: TableInsight[] = [];

  const total = postmasterData.length;
  const spamDays = postmasterData.filter(p => (p.spamRatio || 0) > 0.001).length;
  const highSpamDays = postmasterData.filter(p => (p.spamRatio || 0) > 0.003).length;
  const errorDays = postmasterData.filter(p => (p.errorRatio || 0) > 0).length;
  const repValues = postmasterData.map(p => p.domainReputation?.toLowerCase()).filter(Boolean);
  const repChanges = repValues.filter((v, i) => i > 0 && v !== repValues[i - 1]).length;

  // Spam ratio > 0.3% is critical per CleverTap
  if (highSpamDays > 0) {
    insights.push({
      severity: "critical",
      text: `Spam ratio exceeded 0.3% on ${highSpamDays} day(s) — this directly damages sender reputation. Review list sources and add preference centers.`,
      source: "Sender Reputation",
    });
  } else if (spamDays > total * 0.2) {
    insights.push({
      severity: "warning",
      text: `Spam signals detected on ${spamDays} of ${total} days — persistent low-level spam complaints risk gradual reputation erosion.`,
      source: "Sender Reputation",
    });
  }

  // Reputation instability
  if (repChanges > repValues.length * 0.3 && repValues.length > 5) {
    insights.push({
      severity: "warning",
      text: `Domain reputation fluctuated ${repChanges} times across ${total} days — instability indicates inconsistent sending practices. Maintain steady volume and audience quality.`,
      source: "Email Best Practices — Sending Volume",
    });
  }

  // Error ratio persistence
  if (errorDays > total * 0.3) {
    insights.push({
      severity: "info",
      text: `Delivery errors present on ${errorDays} of ${total} days — monitor error patterns and investigate DNS/authentication issues.`,
      source: "Email Best Practices",
    });
  }

  // Positive
  if (spamDays === 0 && repChanges <= 1) {
    insights.push({
      severity: "positive",
      text: `Zero spam signals and stable reputation across ${total} days — deliverability posture is strong and consistent.`,
      source: "Sender Reputation",
    });
  }

  return sortAndCap(insights);
}

// ============= BEST PERFORMING CAMPAIGNS (CTR) =============

function generateBestCTRInsights(sig: CampaignRow[]): TableInsight[] {
  const sorted = sig
    .filter(c => c.uniqueViewedWithinConversion > 0)
    .map(c => ({
      ...c,
      ctr: (c.uniqueClickedWithinConversion / c.uniqueViewedWithinConversion) * 100,
      bounceRate: c.totalSentUsers > 0 ? ((c.hardBounces + c.softBounces) / c.totalSentUsers) * 100 : 0,
    }))
    .sort((a, b) => b.ctr - a.ctr);

  if (sorted.length < 2) return [];
  const insights: TableInsight[] = [];

  const top5 = sorted.slice(0, 5);
  const avgTopCTR = top5.reduce((s, c) => s + c.ctr, 0) / top5.length;
  const avgTopBounce = top5.reduce((s, c) => s + c.bounceRate, 0) / top5.length;

  // Top performers with low bounce = well-targeted engaged audience
  if (avgTopBounce < 1) {
    insights.push({
      severity: "positive",
      text: `Top performers maintain ${fmt(avgTopBounce)}% avg bounce rate alongside ${fmt(avgTopCTR)}% CTR — strong list quality correlates with high engagement.`,
      source: "Email Best Practices — Audience Selection",
    });
  }

  // High CTR = content-audience fit
  if (avgTopCTR > 5) {
    insights.push({
      severity: "positive",
      text: `Top campaigns achieve ${fmt(avgTopCTR)}% unique CTR — content and CTA placement are driving strong click engagement. Replicate subject line and CTA patterns.`,
      source: "Email Best Practices — Campaign Content",
    });
  }

  // Info: analyze patterns
  insights.push({
    severity: "info",
    text: `Review subject lines, send timing, and audience segments of top performers to identify replicable engagement patterns across the program.`,
    source: "Email Best Practices — Campaign Results",
  });

  return sortAndCap(insights);
}

// ============= UNDERPERFORMING CAMPAIGNS (CTR) =============

function generateUnderperformingCTRInsights(sig: CampaignRow[]): TableInsight[] {
  const sorted = sig
    .filter(c => c.uniqueViewedWithinConversion > 0 && c.campaignName?.trim())
    .map(c => ({
      ...c,
      ctr: (c.uniqueClickedWithinConversion / c.uniqueViewedWithinConversion) * 100,
      bounceRate: c.totalSentUsers > 0 ? ((c.hardBounces + c.softBounces) / c.totalSentUsers) * 100 : 0,
    }))
    .sort((a, b) => a.ctr - b.ctr);

  if (sorted.length < 2) return [];
  const insights: TableInsight[] = [];

  const bottom5 = sorted.slice(0, 5);
  const avgBottomCTR = bottom5.reduce((s, c) => s + c.ctr, 0) / bottom5.length;
  const avgBottomBounce = bottom5.reduce((s, c) => s + c.bounceRate, 0) / bottom5.length;

  if (avgBottomCTR < 0.5) {
    insights.push({
      severity: "critical",
      text: `Bottom campaigns average ${fmt(avgBottomCTR)}% unique CTR — near-zero click engagement suggests weak CTAs, irrelevant content, or inactive audience segments.`,
      source: "Email Best Practices — Campaign Content",
    });
  } else if (avgBottomCTR < 1.5) {
    insights.push({
      severity: "warning",
      text: `Underperformers average ${fmt(avgBottomCTR)}% unique CTR — review CTA placement (should be in top 20% of email) and content relevance.`,
      source: "Email Best Practices — Campaign Content",
    });
  }

  if (avgBottomBounce > 3) {
    insights.push({
      severity: "warning",
      text: `Underperforming campaigns show ${fmt(avgBottomBounce)}% avg bounce rate — these may be targeting stale or unverified segments. Apply sunsetting for users inactive > 6 months.`,
      source: "Email Sunsetting",
    });
  }

  // Sunsetting recommendation
  insights.push({
    severity: "info",
    text: `Consider a re-engagement journey for users who haven't interacted with underperforming campaigns before permanently excluding them.`,
    source: "Email Sunsetting",
  });

  return sortAndCap(insights);
}

// ============= SEND MIX & USE CASE COVERAGE =============

function generateSendMixInsights(extendedData: ExtendedInsightsData | null): TableInsight[] {
  if (!extendedData || extendedData.sendMix.length === 0) return [];
  const insights: TableInsight[] = [];

  const total = extendedData.sendMix.reduce((s, e) => s + e.count, 0);
  const top = extendedData.sendMix[0];
  const topPct = total > 0 ? (top.count / total) * 100 : 0;

  // Heavy concentration on single type
  if (topPct > 70) {
    insights.push({
      severity: "warning",
      text: `"${top.deliveryType}" accounts for ${fmt(topPct, 0)}% of volume — heavy concentration limits lifecycle coverage. Diversify with triggered and transactional sends.`,
      source: "Email Best Practices — Sending Volume",
    });
  }

  // Check for trigger/automation presence
  const triggered = extendedData.sendMix.filter(e =>
    e.deliveryType.toLowerCase().includes("action") ||
    e.deliveryType.toLowerCase().includes("trigger")
  );
  const triggerPct = triggered.reduce((s, e) => s + e.percentShare, 0);

  if (triggerPct < 10 && extendedData.sendMix.length > 1) {
    insights.push({
      severity: "info",
      text: `Trigger-based sends represent only ${fmt(triggerPct, 0)}% of the mix — behavioral triggers improve timeliness and relevance, boosting engagement.`,
      source: "Email Best Practices",
    });
  }

  // Subdomain separation signal
  if (extendedData.sendMix.length >= 2) {
    insights.push({
      severity: "info",
      text: `With ${extendedData.sendMix.length} delivery types active, ensure promotional and transactional emails are sent from separate subdomains to isolate reputation.`,
      source: "IP Warmup",
    });
  }

  // Positive: good mix
  if (triggerPct > 30 && extendedData.sendMix.length >= 3) {
    insights.push({
      severity: "positive",
      text: `Strong automation maturity with ${fmt(triggerPct, 0)}% trigger-based sends across ${extendedData.sendMix.length} delivery types — supports diverse lifecycle engagement.`,
      source: "Email Best Practices",
    });
  }

  return sortAndCap(insights);
}

// ============= LIFECYCLE COVERAGE =============

function generateLifecycleCoverageInsights(
  stats?: { strongCount: number; partialCount: number; weakCount: number; totalStages: number } | null,
): TableInsight[] {
  if (!stats || stats.totalStages === 0) return [];
  const insights: TableInsight[] = [];
  const { strongCount, partialCount, weakCount, totalStages } = stats;

  if (weakCount > totalStages * 0.5) {
    insights.push({
      severity: "warning",
      text: `${weakCount} of ${totalStages} lifecycle stages have weak coverage — users in these stages are not receiving engagement, increasing churn risk and sunsetting pressure.`,
      source: "Email Sunsetting",
    });
  }

  if (weakCount > 0) {
    insights.push({
      severity: "info",
      text: `Weak lifecycle stages represent gaps where re-engagement journeys should be deployed before users become permanently inactive.`,
      source: "Email Sunsetting",
    });
  }

  if (strongCount === totalStages) {
    insights.push({
      severity: "positive",
      text: `All ${totalStages} lifecycle stages have strong coverage — focus on optimizing CTR within each stage through content personalization and CTA testing.`,
      source: "Email Best Practices — Campaign Content",
    });
  } else if (strongCount > totalStages * 0.6) {
    insights.push({
      severity: "positive",
      text: `${strongCount} of ${totalStages} stages have strong coverage — solid foundation with targeted expansion opportunities in ${weakCount + partialCount} remaining stages.`,
      source: "Email Best Practices",
    });
  }

  return sortAndCap(insights);
}

// ============= KEY LEARNINGS =============

function generateKeyLearningsInsights(
  avgCTR: number,
  avgOpen: number,
  bounceRate: number,
  hardBounceRate: number,
  unsubRate: number,
  postmasterData: PostmasterRow[] | null,
  lifecycleStats?: { strongCount: number; partialCount: number; weakCount: number; totalStages: number } | null,
): TableInsight[] {
  const insights: TableInsight[] = [];

  if (hardBounceRate > 2) {
    insights.push({
      severity: "critical",
      text: `Hard bounce rate (${fmt(hardBounceRate)}%) is the top-priority fix — clean lists and verify addresses before sending. Reputation cannot recover while bounces persist.`,
      source: "IP Warmup",
    });
  }

  if (postmasterData && postmasterData.length > 0) {
    const lowRep = postmasterData.filter(p => ["low", "bad"].includes(p.domainReputation?.toLowerCase() || "")).length;
    if (lowRep > postmasterData.length * 0.2) {
      insights.push({
        severity: "critical",
        text: `Domain reputation instability detected — reduce send volume, focus on 0-3 month engaged users, and avoid sending to inactive segments until reputation stabilizes.`,
        source: "Email Best Practices — Audience Selection",
      });
    }
  }

  if (avgCTR < 1.5) {
    insights.push({
      severity: "warning",
      text: `Program CTR at ${fmt(avgCTR)}% — review CTA placement, ensure CTAs are in the top 20% of email content, and A/B test subject lines to improve click-through.`,
      source: "Email Best Practices — Campaign Content",
    });
  }

  if (lifecycleStats && lifecycleStats.weakCount > lifecycleStats.totalStages * 0.3) {
    insights.push({
      severity: "info",
      text: `Lifecycle gaps in ${lifecycleStats.weakCount} stages — deploy re-engagement journeys for at-risk users before applying sunsetting policies.`,
      source: "Email Sunsetting",
    });
  }

  // Positive composite
  if (hardBounceRate < 1 && unsubRate < 0.2 && avgCTR > 2) {
    insights.push({
      severity: "positive",
      text: `Program fundamentals are healthy — low bounces, low unsubscribes, and solid CTR indicate good audience-content alignment. Focus on incremental optimization.`,
      source: "Email Best Practices",
    });
  }

  return sortAndCap(insights);
}
