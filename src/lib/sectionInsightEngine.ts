// ============= SECTION-WISE INSIGHT GENERATION ENGINE =============
// Generates concise, data-backed 1-2 line insights for each Inbox Diagnostics section.
// Prioritizes CTR-driven observations. No generic statements.

import { CampaignRow, PostmasterRow, AnalysisReport } from "./csvAnalyzer";
import { ExtendedInsightsData } from "./strategicInsightsExtendedEngine";

export interface SectionInsights {
  campaignOverview: string | null;
  monthlyOverview: string | null;
  emailMetricsTrend: string | null;
  infrastructureReputation: string | null;
  reputationTrends: string | null;
  rootCauseSummary: string | null;
  bestPerformingCTR: string | null;
  underperformingCTR: string | null;
  sendMixCoverage: string | null;
  lifecycleCoverage: string | null;
  keyLearnings: string | null;
}

const fmt = (n: number, d = 2) => n.toFixed(d);
const fmtK = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toFixed(0);

const MIN_VOLUME = 1000;

export function generateSectionInsights(
  campaignData: CampaignRow[],
  analysisReport: AnalysisReport,
  postmasterData: PostmasterRow[] | null,
  extendedData: ExtendedInsightsData | null,
  lifecycleCoverageStats?: { strongCount: number; partialCount: number; weakCount: number; totalStages: number } | null,
): SectionInsights {
  const sig = campaignData.filter(c => c.totalSentUsers >= MIN_VOLUME);
  const totalSent = sig.reduce((s, c) => s + c.totalSentUsers, 0);
  const totalClicked = sig.reduce((s, c) => s + c.uniqueClickedWithinConversion, 0);
  const totalViewed = sig.reduce((s, c) => s + c.uniqueViewedWithinConversion, 0);
  const avgCTR = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
  const avgOpen = totalSent > 0 ? (totalViewed / totalSent) * 100 : 0;

  return {
    campaignOverview: generateCampaignOverviewInsight(analysisReport, avgCTR),
    monthlyOverview: generateMonthlyOverviewInsight(analysisReport),
    emailMetricsTrend: generateEmailMetricsTrendInsight(sig, avgCTR),
    infrastructureReputation: generateInfrastructureInsight(postmasterData, avgCTR),
    reputationTrends: generateReputationTrendsInsight(postmasterData),
    rootCauseSummary: generateRootCauseInsight(sig, postmasterData),
    bestPerformingCTR: generateBestCTRInsight(analysisReport, sig),
    underperformingCTR: generateUnderperformingCTRInsight(analysisReport, sig),
    sendMixCoverage: generateSendMixInsight(extendedData),
    lifecycleCoverage: generateLifecycleCoverageInsight(lifecycleCoverageStats),
    keyLearnings: generateKeyLearningsInsight(avgCTR, avgOpen, postmasterData, lifecycleCoverageStats),
  };
}

// === Campaign Overview (by Provider) ===
function generateCampaignOverviewInsight(report: AnalysisReport, avgCTR: number): string | null {
  const providers = report.providerAggregates;
  if (providers.length === 0) return null;

  // Find provider with highest volume
  const topByVolume = [...providers].sort((a, b) => b.totalSentUsers - a.totalSentUsers)[0];
  const topByClick = [...providers].sort((a, b) => b.clickPercent - a.clickPercent)[0];

  if (topByVolume && topByClick && topByVolume.serviceProvider !== topByClick.serviceProvider) {
    return `${topByVolume.serviceProvider} dominates volume (${fmtK(topByVolume.totalSentUsers)} sent) but ${topByClick.serviceProvider} leads CTR at ${fmt(topByClick.clickPercent)}%, indicating a volume-engagement imbalance across providers.`;
  }

  if (topByVolume && topByVolume.clickPercent < avgCTR * 0.8) {
    return `${topByVolume.serviceProvider} accounts for the highest send volume but its CTR (${fmt(topByVolume.clickPercent)}%) trails the program average (${fmt(avgCTR)}%), dragging overall engagement.`;
  }

  if (providers.length === 1) {
    return `All volume concentrated through ${topByVolume.serviceProvider} with a ${fmt(topByVolume.clickPercent)}% CTR — single-provider dependency limits benchmarking against alternatives.`;
  }

  return `${providers.length} providers active with a blended CTR of ${fmt(avgCTR)}%. ${topByVolume.serviceProvider} carries the most volume at ${fmtK(topByVolume.totalSentUsers)} sent.`;
}

// === Monthly Overview ===
function generateMonthlyOverviewInsight(report: AnalysisReport): string | null {
  const months = report.monthlyOverview.filter(m => m.month !== "Unknown Date");
  if (months.length < 2) return months.length === 1 ? `Single-month data (${months[0].month}): ${fmt(months[0].clickPercent)}% CTR across ${fmtK(months[0].totalSentUsers)} sends.` : null;

  const first = months[0];
  const last = months[months.length - 1];
  const ctrDelta = last.clickPercent - first.clickPercent;
  const volDelta = last.totalSentUsers - first.totalSentUsers;

  if (Math.abs(ctrDelta) < 0.3 && Math.abs(volDelta) < first.totalSentUsers * 0.1) {
    return `CTR remained stable at ~${fmt(last.clickPercent)}% across ${months.length} months with consistent volume, suggesting program maturity but limited optimization experimentation.`;
  }

  if (ctrDelta > 0.5 && volDelta > 0) {
    return `CTR improved from ${fmt(first.clickPercent)}% to ${fmt(last.clickPercent)}% while volume grew ${fmtK(first.totalSentUsers)}→${fmtK(last.totalSentUsers)}, indicating scalable engagement growth.`;
  }

  if (ctrDelta < -0.5 && volDelta > 0) {
    return `Volume increased from ${fmtK(first.totalSentUsers)} to ${fmtK(last.totalSentUsers)} but CTR declined ${fmt(first.clickPercent)}%→${fmt(last.clickPercent)}%, suggesting content relevance degradation at scale.`;
  }

  if (ctrDelta < -0.5) {
    return `CTR declined from ${fmt(first.clickPercent)}% (${first.month}) to ${fmt(last.clickPercent)}% (${last.month}), a ${fmt(Math.abs(ctrDelta))}pp drop indicating deteriorating content engagement.`;
  }

  return `CTR shifted ${ctrDelta > 0 ? '+' : ''}${fmt(ctrDelta)}pp from ${first.month} to ${last.month} (${fmt(first.clickPercent)}%→${fmt(last.clickPercent)}%) across ${fmtK(last.totalSentUsers)} sends.`;
}

// === Email Metrics Trend ===
function generateEmailMetricsTrendInsight(sig: CampaignRow[], avgCTR: number): string | null {
  if (sig.length < 3) return null;

  // Calculate CTR per campaign and check volatility
  const ctrs = sig.map(c => c.totalSentUsers > 0 ? (c.uniqueClickedWithinConversion / c.totalSentUsers) * 100 : 0);
  const mean = ctrs.reduce((s, v) => s + v, 0) / ctrs.length;
  const variance = ctrs.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / ctrs.length;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? (stdDev / mean) * 100 : 0;

  // Find spikes and drops
  const highOutliers = ctrs.filter(v => v > mean + 2 * stdDev).length;
  const lowOutliers = ctrs.filter(v => v < mean - stdDev && v < mean * 0.5).length;

  if (cv > 80) {
    return `CTR is highly volatile (CV ${fmt(cv, 0)}%) with ${highOutliers} spike(s) and ${lowOutliers} drop(s), indicating inconsistent content quality and targeting across campaigns.`;
  }

  if (cv > 40) {
    return `Moderate CTR volatility (CV ${fmt(cv, 0)}%) suggests inconsistent engagement — campaigns range from ${fmt(Math.min(...ctrs))}% to ${fmt(Math.max(...ctrs))}%, pointing to uneven content-audience alignment.`;
  }

  return `CTR shows consistent performance (CV ${fmt(cv, 0)}%) averaging ${fmt(avgCTR)}%, indicating stable but potentially unoptimized engagement patterns.`;
}

// === Infrastructure + Reputation Scorecard (Combined) ===
function generateInfrastructureInsight(postmasterData: PostmasterRow[] | null, avgCTR: number): string | null {
  if (!postmasterData || postmasterData.length === 0) {
    return `No Postmaster data available — infrastructure reputation cannot be assessed. CTR baseline at ${fmt(avgCTR)}% relies solely on campaign metrics.`;
  }

  const domains = new Set(postmasterData.map(p => p.domain).filter(Boolean));
  const latestByDomain = new Map<string, PostmasterRow>();
  postmasterData.forEach(p => {
    if (p.domain) {
      const existing = latestByDomain.get(p.domain);
      if (!existing) latestByDomain.set(p.domain, p);
    }
  });

  const repValues = postmasterData.map(p => p.domainReputation?.toLowerCase()).filter(Boolean);
  const lowRepDays = repValues.filter(r => r === "low" || r === "bad").length;
  const highRepDays = repValues.filter(r => r === "high").length;

  if (lowRepDays > repValues.length * 0.3) {
    return `Domain reputation flagged as LOW/BAD on ${lowRepDays} of ${repValues.length} days across ${domains.size} domain(s), likely suppressing inbox placement and constraining CTR at ${fmt(avgCTR)}%.`;
  }

  if (highRepDays > repValues.length * 0.7) {
    return `Domain reputation maintained HIGH on ${highRepDays} of ${repValues.length} days — infrastructure is healthy. CTR at ${fmt(avgCTR)}% reflects content/targeting factors, not deliverability.`;
  }

  return `Mixed domain reputation across ${domains.size} domain(s) with ${highRepDays} HIGH vs ${lowRepDays} LOW/BAD days, creating inconsistent inbox placement that may contribute to CTR variability.`;
}

// === Reputation Trends ===
function generateReputationTrendsInsight(postmasterData: PostmasterRow[] | null): string | null {
  if (!postmasterData || postmasterData.length < 3) return null;

  const spamDays = postmasterData.filter(p => (p.spamRatio || 0) > 0.001).length;
  const errorDays = postmasterData.filter(p => (p.errorRatio || 0) > 0).length;
  const total = postmasterData.length;

  const repValues = postmasterData.map(p => p.domainReputation?.toLowerCase()).filter(Boolean);
  const changes = repValues.filter((v, i) => i > 0 && v !== repValues[i - 1]).length;

  if (changes === 0 && spamDays === 0) {
    return `Reputation metrics stable across ${total} days with zero spam signals — deliverability posture is strong and consistent.`;
  }

  if (changes > repValues.length * 0.3) {
    return `Domain reputation fluctuated ${changes} times across ${total} days, indicating instability. Spam signals detected on ${spamDays} days — inconsistent practices are impacting deliverability.`;
  }

  if (spamDays > total * 0.2) {
    return `Spam ratio exceeded threshold on ${spamDays} of ${total} days. Persistent spam signals risk long-term reputation degradation and reduced inbox placement.`;
  }

  return `Reputation largely stable with ${changes} shift(s) over ${total} days. Error signals on ${errorDays} days — monitoring recommended to prevent escalation.`;
}

// === Root Cause Summary ===
function generateRootCauseInsight(sig: CampaignRow[], postmasterData: PostmasterRow[] | null): string | null {
  const totalSent = sig.reduce((s, c) => s + c.totalSentUsers, 0);
  const totalBounce = sig.reduce((s, c) => s + c.hardBounces + c.softBounces, 0);
  const totalUnsub = sig.reduce((s, c) => s + c.totalUnsubscribes, 0);
  const bounceRate = totalSent > 0 ? (totalBounce / totalSent) * 100 : 0;
  const unsubRate = totalSent > 0 ? (totalUnsub / totalSent) * 100 : 0;

  const drivers: string[] = [];
  if (bounceRate > 3) drivers.push(`high bounce rate (${fmt(bounceRate)}%)`);
  if (unsubRate > 0.5) drivers.push(`elevated unsubscribes (${fmt(unsubRate)}%)`);
  
  if (postmasterData && postmasterData.length > 0) {
    const spamDays = postmasterData.filter(p => (p.spamRatio || 0) > 0.001).length;
    if (spamDays > postmasterData.length * 0.2) drivers.push(`spam signals on ${spamDays} days`);
  }

  if (drivers.length === 0) return `No critical root cause identified — performance drivers are within acceptable thresholds across bounce, unsubscribe, and spam metrics.`;
  if (drivers.length === 1) return `Primary performance constraint: ${drivers[0]}. Addressing this single factor is the highest-leverage improvement available.`;
  return `Top performance constraints: ${drivers.join(" and ")}. These compound to suppress CTR and overall engagement.`;
}

// === Best Performing Campaigns (CTR) ===
function generateBestCTRInsight(report: AnalysisReport, sig: CampaignRow[]): string | null {
  const sorted = sig
    .filter(c => c.uniqueViewedWithinConversion > 0)
    .map(c => ({
      ...c,
      ctr: (c.uniqueClickedWithinConversion / c.uniqueViewedWithinConversion) * 100,
    }))
    .sort((a, b) => b.ctr - a.ctr);

  if (sorted.length < 2) return null;

  const top5 = sorted.slice(0, 5);
  const avgTopCTR = top5.reduce((s, c) => s + c.ctr, 0) / top5.length;
  const avgProgramCTR = sig.reduce((s, c) => s + c.uniqueClickedWithinConversion, 0) /
    Math.max(sig.reduce((s, c) => s + c.uniqueViewedWithinConversion, 0), 1) * 100;

  const multiplier = avgProgramCTR > 0 ? avgTopCTR / avgProgramCTR : 0;

  if (multiplier > 3) {
    return `Top 5 campaigns by CTR achieve ${fmt(avgTopCTR)}% avg unique CTR — ${fmt(multiplier, 1)}x the program average, suggesting strong content-audience fit in these sends. Replicating their patterns could lift overall engagement.`;
  }

  return `Top 5 campaigns average ${fmt(avgTopCTR)}% unique CTR (${fmt(multiplier, 1)}x program average). Analyzing subject lines, timing, and audience segments of these campaigns can inform optimization.`;
}

// === Underperforming Campaigns (CTR) ===
function generateUnderperformingCTRInsight(report: AnalysisReport, sig: CampaignRow[]): string | null {
  const sorted = sig
    .filter(c => c.uniqueViewedWithinConversion > 0 && c.campaignName?.trim())
    .map(c => ({
      ...c,
      ctr: (c.uniqueClickedWithinConversion / c.uniqueViewedWithinConversion) * 100,
    }))
    .sort((a, b) => a.ctr - b.ctr);

  if (sorted.length < 2) return null;

  const bottom5 = sorted.slice(0, 5);
  const avgBottomCTR = bottom5.reduce((s, c) => s + c.ctr, 0) / bottom5.length;
  const totalBottomSent = bottom5.reduce((s, c) => s + c.totalSentUsers, 0);

  if (avgBottomCTR < 0.5) {
    return `Bottom 5 campaigns average just ${fmt(avgBottomCTR)}% unique CTR across ${fmtK(totalBottomSent)} sends — near-zero click engagement suggests weak CTAs, poor targeting, or content-audience mismatch.`;
  }

  return `Underperformers average ${fmt(avgBottomCTR)}% unique CTR with ${fmtK(totalBottomSent)} total sends. Low click-through despite opens indicates CTA visibility, content relevance, or landing page alignment issues.`;
}

// === Send Mix & Use Case Coverage ===
function generateSendMixInsight(extendedData: ExtendedInsightsData | null): string | null {
  if (!extendedData || extendedData.sendMix.length === 0) return null;

  const top = extendedData.sendMix[0];
  const total = extendedData.sendMix.reduce((s, e) => s + e.count, 0);
  const topPct = total > 0 ? (top.count / total) * 100 : 0;

  if (topPct > 70) {
    return `"${top.deliveryType}" accounts for ${fmt(topPct, 0)}% of send volume — heavy concentration on a single delivery type limits lifecycle coverage and engagement diversification.`;
  }

  if (extendedData.sendMix.length <= 2) {
    return `Only ${extendedData.sendMix.length} delivery type(s) detected. Limited send mix diversity indicates untapped automation and trigger-based campaign opportunities.`;
  }

  const triggered = extendedData.sendMix.filter(e =>
    e.deliveryType.toLowerCase().includes("action") ||
    e.deliveryType.toLowerCase().includes("trigger")
  );
  const triggerPct = triggered.reduce((s, e) => s + e.percentShare, 0);

  if (triggerPct < 10) {
    return `Trigger-based sends represent only ${fmt(triggerPct, 0)}% of the mix. Increasing behavioral triggers can improve CTR through higher relevance and timeliness.`;
  }

  return `${extendedData.sendMix.length} delivery types active with "${top.deliveryType}" leading at ${fmt(topPct, 0)}%. ${triggerPct > 30 ? 'Strong automation maturity' : 'Moderate automation adoption'} observed.`;
}

// === Lifecycle Coverage Matrix ===
function generateLifecycleCoverageInsight(stats?: { strongCount: number; partialCount: number; weakCount: number; totalStages: number } | null): string | null {
  if (!stats || stats.totalStages === 0) return null;

  const { strongCount, partialCount, weakCount, totalStages } = stats;

  if (weakCount > totalStages * 0.5) {
    return `${weakCount} of ${totalStages} lifecycle stages have weak coverage — significant engagement gaps exist in the customer journey, limiting CTR potential across under-served stages.`;
  }

  if (strongCount === totalStages) {
    return `All ${totalStages} lifecycle stages have strong coverage. Focus should shift to optimizing CTR within each stage rather than expanding use case breadth.`;
  }

  if (weakCount > 0 && strongCount > 0) {
    return `Coverage is uneven: ${strongCount} stages strong, ${weakCount} weak. Redirecting content investment to weak stages could unlock new CTR growth from under-served audience segments.`;
  }

  return `${strongCount} of ${totalStages} stages covered strongly, ${partialCount} partially. Incremental use case expansion in partial stages offers the best CTR uplift opportunity.`;
}

// === Key Learnings ===
function generateKeyLearningsInsight(
  avgCTR: number,
  avgOpen: number,
  postmasterData: PostmasterRow[] | null,
  lifecycleStats?: { strongCount: number; partialCount: number; weakCount: number; totalStages: number } | null,
): string | null {
  const signals: string[] = [];

  if (avgCTR < 1.5) signals.push(`low CTR (${fmt(avgCTR)}%)`);
  if (avgOpen < 10) signals.push(`weak open rates (${fmt(avgOpen)}%)`);

  if (postmasterData && postmasterData.length > 0) {
    const lowRep = postmasterData.filter(p => ["low", "bad"].includes(p.domainReputation?.toLowerCase() || "")).length;
    if (lowRep > postmasterData.length * 0.2) signals.push("reputation instability");
  }

  if (lifecycleStats && lifecycleStats.weakCount > lifecycleStats.totalStages * 0.3) {
    signals.push("lifecycle coverage gaps");
  }

  if (signals.length === 0) {
    return `Program fundamentals are healthy across engagement, reputation, and coverage dimensions. Prioritize incremental CTR optimization through content personalization and send-time testing.`;
  }

  return `Key improvement areas: ${signals.join(", ")}. Addressing these in sequence — infrastructure first, then content optimization — offers the most efficient path to sustained CTR improvement.`;
}
