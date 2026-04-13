// ============= PER-TABLE INSIGHT ENGINE =============
// Generates severity-classified, source-attributed insights for each Inbox Diagnostics section.
// All thresholds grounded in CleverTap email best practices documentation.
// Max 4 insights per section. Order: Critical -> Warning -> Info -> Positive.
// No em-dashes. No cross-table inference. No invented benchmarks.

import { CampaignRow, PostmasterRow, AnalysisReport, ProviderAggregate, MonthlyOverview } from "./csvAnalyzer";
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
  campaignOverviewByProvider: TableInsight[];
  monthlyOverview: TableInsight[];
  monthlyOverviewByProvider: Record<string, TableInsight[]>;
  emailMetricsTrend: TableInsight[];
  infrastructureReputation: TableInsight[];
  reputationTrends: TableInsight[];
  reputationTrendsByDomain: Record<string, TableInsight[]>;
  bestPerformingOpenRate: TableInsight[];
  bestPerformingCTR: TableInsight[];
  underperformingOpenRate: TableInsight[];
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
  const totalHardBounce = sig.reduce((s, c) => s + c.hardBounces, 0);
  const totalSoftBounce = sig.reduce((s, c) => s + c.softBounces, 0);
  const totalUnsub = sig.reduce((s, c) => s + c.totalUnsubscribes, 0);
  const totalClicked = sig.reduce((s, c) => s + c.uniqueClickedWithinConversion, 0);
  const totalViewed = sig.reduce((s, c) => s + c.uniqueViewedWithinConversion, 0);
  const totalDelivered = sig.reduce((s, c) => s + c.totalDeliveredUsers, 0);

  const hardBounceRate = totalSent > 0 ? (totalHardBounce / totalSent) * 100 : 0;
  const softBounceRate = totalSent > 0 ? (totalSoftBounce / totalSent) * 100 : 0;
  const unsubRate = totalSent > 0 ? (totalUnsub / totalSent) * 100 : 0;
  const avgCTR = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
  const avgOpen = totalSent > 0 ? (totalViewed / totalSent) * 100 : 0;

  // Per-provider monthly insights
  const monthlyByProvider: Record<string, TableInsight[]> = {};
  const byProviderData = analysisReport.monthlyOverviewByProvider;
  const uniqueProviders = [...new Set(byProviderData.map(m => m.provider))];
  if (uniqueProviders.length > 1) {
    for (const provider of uniqueProviders) {
      const providerMonths = byProviderData.filter(m => m.provider === provider);
      monthlyByProvider[provider] = generateMonthlyOverviewMoMInsights(providerMonths);
    }
  }

  return {
    campaignOverview: generateCampaignOverviewInsights(totalSent, totalDelivered, totalViewed, totalHardBounce, totalSoftBounce, totalUnsub, hardBounceRate, softBounceRate, unsubRate, avgOpen),
    campaignOverviewByProvider: generateProviderInsights(analysisReport.providerAggregates),
    monthlyOverview: generateMonthlyOverviewMoMInsights(analysisReport.monthlyOverview),
    monthlyOverviewByProvider: monthlyByProvider,
    emailMetricsTrend: generateEmailMetricsTrendInsights(sig),
    infrastructureReputation: generateInfrastructureInsights(postmasterData),
    reputationTrends: generateReputationTrendsInsights(postmasterData),
    reputationTrendsByDomain: generateReputationTrendsByDomain(postmasterData),
    bestPerformingOpenRate: generateBestOpenRateInsights(sig),
    bestPerformingCTR: generateBestCTRInsights(sig),
    underperformingOpenRate: generateUnderperformingOpenRateInsights(sig),
    underperformingCTR: generateUnderperformingCTRInsights(sig),
    sendMixCoverage: generateSendMixInsights(extendedData),
    lifecycleCoverage: generateLifecycleCoverageInsights(lifecycleCoverageStats),
    keyLearnings: generateKeyLearningsInsights(avgCTR, avgOpen, hardBounceRate, softBounceRate, unsubRate, postmasterData, lifecycleCoverageStats),
  };
}

// ============= TABLE 1: CAMPAIGN OVERVIEW (Grand Total) =============

function generateCampaignOverviewInsights(
  totalSent: number,
  totalDelivered: number,
  totalViewed: number,
  totalHardBounce: number,
  totalSoftBounce: number,
  totalUnsub: number,
  hardBounceRate: number,
  softBounceRate: number,
  unsubRate: number,
  openRate: number,
): TableInsight[] {
  if (totalSent === 0) return [];
  const insights: TableInsight[] = [];

  // Soft bounce rate signals list degradation
  if (softBounceRate > 20) {
    insights.push({
      severity: "critical",
      text: `Soft bounce rate of ${fmt(softBounceRate)}% signals severe list degradation; high bounce rates combined with low delivered-per-sent indicate data collection issues or spam blocks on the domain/IP.`,
      source: "Sender Reputation",
    });
  } else if (softBounceRate > 5) {
    insights.push({
      severity: "warning",
      text: `Soft bounce rate of ${fmt(softBounceRate)}% is elevated; sustained soft bounces indicate temporary delivery failures that can become permanent if not addressed.`,
      source: "Sender Reputation",
    });
  }

  // Hard bounce threshold
  if (hardBounceRate > 2) {
    insights.push({
      severity: "critical",
      text: `Hard bounce rate of ${fmt(hardBounceRate)}% exceeds safe threshold; hard bounces permanently mark users as unsubscribed and damage IP/domain reputation.`,
      source: "Sender Reputation",
    });
  } else if (hardBounceRate > 0.3) {
    insights.push({
      severity: "warning",
      text: `Hard bounce rate of ${fmt(hardBounceRate)}% is approaching risk threshold; hard bounces permanently mark users as unsubscribed and damage IP/domain reputation.`,
      source: "Sender Reputation",
    });
  }

  // Low open rate indicates inbox placement issues
  if (openRate < 10 && openRate > 0) {
    insights.push({
      severity: "warning",
      text: `Open rate of ${fmt(openRate)}% indicates inbox placement issues; consistently low opens cause ISPs to divert emails to spam folders over time.`,
      source: "Sender Reputation",
    });
  } else if (openRate >= 30) {
    insights.push({
      severity: "positive",
      text: `Open rate of ${fmt(openRate)}% reflects strong inbox placement and subject line relevance; high opens are a direct positive ISP reputation signal.`,
      source: "Sender Reputation",
    });
  }

  // Unsubscribe rate
  if (unsubRate > 0.5) {
    insights.push({
      severity: "warning",
      text: `Unsubscribe rate of ${fmt(unsubRate)}% is elevated; rising unsub rates are a direct negative ISP signal. Review content relevance and send frequency.`,
      source: "Sender Reputation",
    });
  } else if (unsubRate <= 0.1) {
    insights.push({
      severity: "info",
      text: `Unsubscribe rate of ${fmt(unsubRate)}% is within range; monitor for any increases, as rising unsub rates are a direct negative ISP signal.`,
      source: "Sender Reputation",
    });
  }

  return sortAndCap(insights);
}

// ============= TABLE 2: CAMPAIGN OVERVIEW BY PROVIDER =============

function generateProviderInsights(providers: ProviderAggregate[]): TableInsight[] {
  if (!providers || providers.length === 0) return [];
  const insights: TableInsight[] = [];

  // Sort providers by volume descending
  const sorted = [...providers].sort((a, b) => b.totalSentUsers - a.totalSentUsers);

  // Check each provider for critical soft bounce
  for (const p of sorted) {
    if (p.softBouncePercent > 100) {
      insights.push({
        severity: "critical",
        text: `${p.providerName} soft bounce rate of ${fmt(p.softBouncePercent)}% (of delivered) indicates a severely degraded list; CleverTap must be notified of all bounces to suppress further delivery attempts to bad addresses.`,
        source: "Sender Reputation",
      });
      break;
    } else if (p.softBouncePercent > 20) {
      insights.push({
        severity: "warning",
        text: `${p.providerName} soft bounce rate of ${fmt(p.softBouncePercent)}% indicates list quality issues for this provider segment.`,
        source: "Sender Reputation",
      });
      break;
    }
  }

  // Compare hard bounce rates across providers
  if (sorted.length >= 2) {
    const hardBounces = sorted.map(p => ({ name: p.providerName, rate: p.hardBouncePercent }));
    const maxHB = hardBounces.reduce((a, b) => a.rate > b.rate ? a : b);
    const minHB = hardBounces.reduce((a, b) => a.rate < b.rate ? a : b);
    if (maxHB.rate > 1 && maxHB.rate > minHB.rate * 3 && minHB.rate > 0) {
      insights.push({
        severity: "warning",
        text: `${maxHB.name} hard bounce rate of ${fmt(maxHB.rate)}% vs ${minHB.name}'s ${fmt(minHB.rate)}% shows ${maxHB.name} is sending to a significantly lower-quality list segment.`,
        source: "Sender Reputation",
      });
    }
  }

  // Positive: provider with strong open rate
  const bestOpen = sorted.filter(p => p.viewPercent > 30).sort((a, b) => b.viewPercent - a.viewPercent)[0];
  if (bestOpen && sorted.length >= 2) {
    insights.push({
      severity: "positive",
      text: `${bestOpen.providerName} open rate of ${fmt(bestOpen.viewPercent)}% is a strong positive ISP signal; apply ${bestOpen.providerName}'s list hygiene approach as the baseline for other provider sends.`,
      source: "Sender Reputation",
    });
  }

  // Info: audience quality recommendation
  if (sorted.length >= 1) {
    insights.push({
      severity: "info",
      text: `Prioritise users who have explicitly opted in and engaged within the last 6 months across ${sorted.length > 1 ? 'all providers' : 'this provider'}.`,
      source: "Email Best Practices",
    });
  }

  return sortAndCap(insights);
}

// ============= TABLE 3: MONTHLY OVERVIEW (MoM Comparison) =============

function generateMonthlyOverviewMoMInsights(months: MonthlyOverview[]): TableInsight[] {
  const valid = months.filter(m => m.month !== "Unknown Date");
  if (valid.length < 1) return [];
  const insights: TableInsight[] = [];

  if (valid.length >= 2) {
    for (let i = 1; i < valid.length; i++) {
      const prev = valid[i - 1];
      const curr = valid[i];

      if (curr.viewPercent > prev.viewPercent && curr.viewPercent - prev.viewPercent > 1) {
        insights.push({ severity: "positive", text: `Open rate improved MoM from ${prev.month} to ${curr.month}, rising engagement signals healthier inbox placement and strengthens sender reputation over time.`, source: "Sender Reputation" });
      }
      if (curr.clickPercent > prev.clickPercent && curr.clickPercent - prev.clickPercent > 0.5) {
        insights.push({ severity: "positive", text: `Click rate improved MoM from ${prev.month} to ${curr.month}, indicating content and CTAs are resonating better with the audience.`, source: "Sender Reputation" });
      }
      if (prev.totalSentUsers > 0 && curr.totalSentUsers > prev.totalSentUsers * 2) {
        const ratio = Math.round(curr.totalSentUsers / prev.totalSentUsers);
        insights.push({ severity: "critical", text: `${curr.month} volume spiked ${ratio}x from ${prev.month} (${fmtK(prev.totalSentUsers)} to ${fmtK(curr.totalSentUsers)}); any send exceeding twice the prior 30-day high is defined as a reputation-damaging spike by ISPs.`, source: "Sender Reputation" });
      }
      if (curr.hardBouncePercent > prev.hardBouncePercent && curr.hardBouncePercent - prev.hardBouncePercent > 0.5) {
        insights.push({ severity: curr.hardBouncePercent > 2 ? "critical" : "warning", text: `Hard bounce rate increased MoM from ${prev.month} to ${curr.month}, a growing share of invalid addresses in the send list needs suppression before the next campaign.`, source: "Sender Reputation" });
      }
      if (curr.softBouncePercent > prev.softBouncePercent && curr.softBouncePercent - prev.softBouncePercent > 5) {
        insights.push({ severity: curr.softBouncePercent > 20 ? "critical" : "warning", text: `Soft bounce rate increased MoM from ${prev.month} to ${curr.month}, indicating worsening list quality or temporary delivery failures becoming persistent.`, source: "Sender Reputation" });
      }
      if (curr.unsubscribePercent > prev.unsubscribePercent && curr.unsubscribePercent - prev.unsubscribePercent > 0.05) {
        insights.push({ severity: curr.unsubscribePercent > 0.5 ? "warning" : "info", text: `Unsubscribe rate increased MoM from ${prev.month} to ${curr.month}; rising unsub rates are a direct negative ISP signal.`, source: "Sender Reputation" });
      }
      if (prev.viewPercent > curr.viewPercent && prev.viewPercent - curr.viewPercent > 3) {
        insights.push({ severity: curr.viewPercent < 10 ? "critical" : "warning", text: `Open rate declined MoM from ${prev.month} to ${curr.month}; consistently falling opens cause ISPs to divert emails to spam folders over time.`, source: "Sender Reputation" });
      }
    }
  }

  if (valid.length === 1) {
    const m = valid[0];
    if (m.hardBouncePercent > 2) {
      insights.push({ severity: "critical", text: `Hard bounce rate of ${fmt(m.hardBouncePercent)}% exceeds safe threshold; hard bounces permanently damage IP/domain reputation.`, source: "Sender Reputation" });
    }
    if (m.viewPercent > 25) {
      insights.push({ severity: "positive", text: `Open rate of ${fmt(m.viewPercent)}% reflects strong inbox placement and subject line relevance for this period.`, source: "Sender Reputation" });
    }
  }

  return sortAndCap(insights);
}

// ============= TABLE 4: EMAIL METRICS TREND =============

function generateEmailMetricsTrendInsights(sig: CampaignRow[]): TableInsight[] {
  if (sig.length < 3) return [];
  const insights: TableInsight[] = [];

  const withDates = sig.map(c => ({ ...c, date: parseDateDDMM(c.startDate) })).filter(c => c.date !== null);
  const dailyMap: Record<string, { total: number; viewed: number; clicked: number; bounces: number; dateLabel: string; dateObj: Date }> = {};
  for (const c of withDates) {
    const key = c.date!.toISOString().split('T')[0];
    if (!dailyMap[key]) dailyMap[key] = { total: 0, viewed: 0, clicked: 0, bounces: 0, dateLabel: c.startDate, dateObj: c.date! };
    dailyMap[key].total += c.totalSentUsers;
    dailyMap[key].viewed += c.uniqueViewedWithinConversion;
    dailyMap[key].clicked += c.uniqueClickedWithinConversion;
    dailyMap[key].bounces += c.hardBounces + c.softBounces;
  }

  const dailyEntries = Object.values(dailyMap).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  if (dailyEntries.length === 0) return [];

  // 1. Send pattern consistency (7-day rolling average)
  let isConsistent = true;
  for (let i = 0; i < dailyEntries.length; i++) {
    const windowSlice = dailyEntries.slice(Math.max(0, i - 7), i);
    if (windowSlice.length >= 3) {
      const rollingAvg = windowSlice.reduce((s, d) => s + d.total, 0) / windowSlice.length;
      if (rollingAvg > 0 && dailyEntries[i].total > rollingAvg * 2) { isConsistent = false; break; }
    }
  }

  if (isConsistent && dailyEntries.length >= 7) {
    let hasLongGap = false;
    for (let i = 1; i < dailyEntries.length; i++) {
      if ((dailyEntries[i].dateObj.getTime() - dailyEntries[i - 1].dateObj.getTime()) / (1000 * 60 * 60 * 24) > 7) { hasLongGap = true; break; }
    }
    if (!hasLongGap) {
      insights.push({ severity: "positive", text: `Send volume is consistent across the date range with no single day exceeding twice the 7-day rolling average; ISPs reward predictable sending patterns.`, source: "Sender Reputation" });
    }
  }

  // 2. Volume spike detection (7-day rolling average)
  let worstSpike: { ratio: number; label: string; volume: number } | null = null;
  let spikeHasRampUp = false;
  for (let i = 1; i < dailyEntries.length; i++) {
    const windowSlice = dailyEntries.slice(Math.max(0, i - 7), i);
    if (windowSlice.length < 2) continue;
    const rollingAvg = windowSlice.reduce((s, d) => s + d.total, 0) / windowSlice.length;
    if (rollingAvg > 0 && dailyEntries[i].total > rollingAvg * 2) {
      const ratio = dailyEntries[i].total / rollingAvg;
      if (!worstSpike || ratio > worstSpike.ratio) {
        worstSpike = { ratio, label: dailyEntries[i].dateLabel, volume: dailyEntries[i].total };
        if (i >= 3) {
          const rampWindow = dailyEntries.slice(Math.max(0, i - 3), i);
          spikeHasRampUp = rampWindow.every((d, j) => j === 0 || d.total >= rampWindow[j - 1].total * 0.8);
        }
      }
    }
  }
  if (worstSpike) {
    insights.push(spikeHasRampUp
      ? { severity: "info", text: `Volume ramp detected leading to ${worstSpike.label} send of ${fmtK(worstSpike.volume)}; if aligned with the IP warmup schedule, this gradual increase is expected.`, source: "IP Warmup" }
      : { severity: "critical", text: `${worstSpike.label} send of ${fmtK(worstSpike.volume)} exceeded twice the prior 7-day average; abrupt volume jumps without a ramp-up are treated as a reputation risk by ISPs.`, source: "IP Warmup" }
    );
  }

  // 3. Inconsistent cadence
  if (!isConsistent) {
    let maxGapDays = 0;
    for (let i = 1; i < dailyEntries.length; i++) {
      const gap = (dailyEntries[i].dateObj.getTime() - dailyEntries[i - 1].dateObj.getTime()) / (1000 * 60 * 60 * 24);
      if (gap > maxGapDays) maxGapDays = gap;
    }
    if (maxGapDays > 7) {
      insights.push({ severity: "warning", text: `Inconsistent sending cadence with gaps exceeding ${Math.round(maxGapDays)} days; erratic send patterns are a negative ISP signal that can affect inbox placement.`, source: "Sender Reputation" });
    }
  }

  // 4. Engagement trend
  if (dailyEntries.length >= 5) {
    const mid = Math.floor(dailyEntries.length / 2);
    const firstHalfOR = dailyEntries.slice(0, mid).reduce((s, d) => s + (d.total > 0 ? (d.viewed / d.total) * 100 : 0), 0) / mid;
    const secondHalfOR = dailyEntries.slice(mid).reduce((s, d) => s + (d.total > 0 ? (d.viewed / d.total) * 100 : 0), 0) / (dailyEntries.length - mid);
    if (secondHalfOR > firstHalfOR + 2) {
      insights.push({ severity: "positive", text: `Daily open rates are trending upward across the chart period, indicating improving inbox placement and audience engagement.`, source: "Sender Reputation" });
    }
  }

  // 5. Near-zero click rates
  const avgClickRate = dailyEntries.reduce((s, d) => s + (d.total > 0 ? (d.clicked / d.total) * 100 : 0), 0) / dailyEntries.length;
  if (avgClickRate < 0.5) {
    insights.push({ severity: "info", text: `Daily click rates remain near zero throughout; behaviour-triggered, personalised content is needed to drive meaningful click engagement.`, source: "Email Best Practices" });
  }

  // 6. Bounce volumes proportional (list not cleaned)
  const bounceRates = dailyEntries.map(d => d.total > 0 ? (d.bounces / d.total) * 100 : 0);
  const avgBR = bounceRates.reduce((s, v) => s + v, 0) / bounceRates.length;
  if (bounceRates.filter(r => r > avgBR * 0.8).length > bounceRates.length * 0.7 && avgBR > 2) {
    insights.push({ severity: "warning", text: `Bounce volumes tracked proportionally with sent volumes throughout the period, indicating the list is not being cleaned between campaigns.`, source: "Sender Reputation" });
  }

  return sortAndCap(insights);
}

// ============= TABLE 5: INFRASTRUCTURE DETAILS =============

function generateInfrastructureInsights(postmasterData: PostmasterRow[] | null): TableInsight[] {
  if (!postmasterData || postmasterData.length === 0) return [];
  const insights: TableInsight[] = [];

  const domainReps = postmasterData
    .map(p => p.domainReputation?.toLowerCase())
    .filter(r => r && r !== "" && r !== "n/a");
  const ipReps = postmasterData
    .map(p => p.ipReputation?.toLowerCase())
    .filter(r => r && r !== "" && r !== "n/a");

  const latestDomainRep = domainReps.length > 0 ? domainReps[domainReps.length - 1] : null;
  const latestIpRep = ipReps.length > 0 ? ipReps[ipReps.length - 1] : null;

  // Both at medium or lower
  if (latestDomainRep && latestIpRep &&
      ["medium", "low", "bad"].includes(latestDomainRep) &&
      ["medium", "low", "bad"].includes(latestIpRep)) {
    const severity = (latestDomainRep === "low" || latestDomainRep === "bad" || latestIpRep === "low" || latestIpRep === "bad") ? "critical" : "warning";
    insights.push({
      severity,
      text: `Both domain and IP at ${latestDomainRep.charAt(0).toUpperCase() + latestDomainRep.slice(1)}/${latestIpRep.charAt(0).toUpperCase() + latestIpRep.slice(1)} reputation; sustained high bounce rates over the 30-day rolling window are directly contributing.`,
      source: "Sender Reputation",
    });
  } else if (latestDomainRep && ["low", "bad"].includes(latestDomainRep)) {
    insights.push({
      severity: "critical",
      text: `Domain reputation at ${latestDomainRep.charAt(0).toUpperCase() + latestDomainRep.slice(1)}; this actively suppresses inbox placement. Reduce volume and focus on engaged audiences.`,
      source: "Sender Reputation",
    });
  }

  // Block list monitoring recommendation
  insights.push({
    severity: "info",
    text: `Verify domain and IP are not on block lists using MXToolbox or Google Postmaster Tools; block list monitoring should be ongoing, not reactive.`,
    source: "Sender Reputation",
  });

  // Subdomain separation
  insights.push({
    severity: "info",
    text: `Consider a dedicated subdomain for promotional sends to isolate reputation damage from transactional email and enable domain-specific monitoring.`,
    source: "Troubleshooting & FAQs",
  });

  // Positive
  if (latestDomainRep === "high" && latestIpRep === "high") {
    insights.push({
      severity: "positive",
      text: `Both domain and IP reputation at High; infrastructure is healthy and supports strong inbox placement.`,
      source: "Sender Reputation",
    });
  }

  return sortAndCap(insights);
}

// ============= TABLE 6: REPUTATION TRENDS =============

function generateReputationTrendsInsights(postmasterData: PostmasterRow[] | null): TableInsight[] {
  if (!postmasterData || postmasterData.length < 3) return [];
  const insights: TableInsight[] = [];

  // Find spam ratio spikes
  const spamEntries = postmasterData
    .map(p => ({ ratio: p.spamRatio || 0, date: p.date || "" }))
    .filter(e => e.ratio > 0);

  const maxSpam = spamEntries.length > 0 ? spamEntries.reduce((a, b) => a.ratio > b.ratio ? a : b) : null;
  if (maxSpam && maxSpam.ratio > 0.003) {
    insights.push({
      severity: "critical",
      text: `Spam ratio spiked to ${(maxSpam.ratio * 100).toFixed(1)}% on ${maxSpam.date}; sustained complaint rates cause ISPs to route all future messages to spam.`,
      source: "Sender Reputation",
    });
  } else if (maxSpam && maxSpam.ratio > 0.001) {
    insights.push({
      severity: "warning",
      text: `Spam ratio elevated at ${(maxSpam.ratio * 100).toFixed(2)}% on ${maxSpam.date}; monitor closely as sustained complaints erode sender reputation.`,
      source: "Sender Reputation",
    });
  }

  // Domain reputation decline detection
  const domainReps = postmasterData
    .map(p => ({ rep: p.domainReputation?.toLowerCase(), date: p.date || "" }))
    .filter(e => e.rep && e.rep !== "" && e.rep !== "n/a");

  const repOrder: Record<string, number> = { high: 4, medium: 3, low: 2, bad: 1 };
  if (domainReps.length >= 2) {
    for (let i = 1; i < domainReps.length; i++) {
      const prev = repOrder[domainReps[i - 1].rep!] || 0;
      const curr = repOrder[domainReps[i].rep!] || 0;
      if (curr < prev && curr <= 3) {
        insights.push({
          severity: "warning",
          text: `Domain reputation declined on ${domainReps[i].date}, tied to volume spikes and poor list quality over the 30-day rolling assessment window.`,
          source: "Sender Reputation",
        });
        break;
      }
    }
  }

  // IP reputation held steady
  const ipReps = postmasterData
    .map(p => p.ipReputation?.toLowerCase())
    .filter(r => r && r !== "" && r !== "n/a");
  const ipRepSet = new Set(ipReps);
  if (ipRepSet.size === 1 && ipReps.length > 0) {
    const val = ipReps[0].charAt(0).toUpperCase() + ipReps[0].slice(1);
    if (ipReps[0] !== "high") {
      insights.push({
        severity: "info",
        text: `IP reputation held at ${val} throughout; if volume needs to scale again, restart a fresh IP warmup beginning with the 7-day clicker segment.`,
        source: "IP Warmup",
      });
    }
  }

  // Error ratio check
  const errorDays = postmasterData.filter(p => (p.errorRatio || 0) > 0).length;
  if (errorDays === 0) {
    insights.push({
      severity: "positive",
      text: `Error ratio at 0% throughout the period; email provider integration is technically healthy.`,
      source: "Email Campaign Stats",
    });
  } else if (errorDays > postmasterData.length * 0.3) {
    insights.push({
      severity: "warning",
      text: `Delivery errors present on ${errorDays} of ${postmasterData.length} days; investigate DNS/authentication issues and monitor error patterns.`,
      source: "Sender Reputation",
    });
  }

  return sortAndCap(insights);
}

// ============= TABLE 6b: REPUTATION TRENDS BY DOMAIN =============

function generateReputationTrendsByDomain(postmasterData: PostmasterRow[] | null): Record<string, TableInsight[]> {
  if (!postmasterData || postmasterData.length === 0) return {};

  const domainMap = new Map<string, PostmasterRow[]>();
  postmasterData.forEach((row) => {
    const d = row.domain?.trim();
    if (!d) return;
    if (!domainMap.has(d)) domainMap.set(d, []);
    domainMap.get(d)!.push(row);
  });

  const result: Record<string, TableInsight[]> = {};
  domainMap.forEach((rows, domain) => {
    result[domain] = generateReputationTrendsInsights(rows);
  });

  return result;
}

// ============= TABLE 7: BEST PERFORMING CAMPAIGNS BY OPEN RATE =============

function generateBestOpenRateInsights(sig: CampaignRow[]): TableInsight[] {
  const sorted = sig
    .filter(c => c.totalSentUsers >= MIN_VOLUME)
    .map(c => ({
      ...c,
      openRate: c.totalSentUsers > 0 ? (c.uniqueViewedWithinConversion / c.totalSentUsers) * 100 : 0,
      softBounceRate: c.totalSentUsers > 0 ? (c.softBounces / c.totalSentUsers) * 100 : 0,
      hardBounceRate: c.totalSentUsers > 0 ? (c.hardBounces / c.totalSentUsers) * 100 : 0,
    }))
    .sort((a, b) => b.openRate - a.openRate);

  if (sorted.length < 2) return [];
  const insights: TableInsight[] = [];
  const top5 = sorted.slice(0, 5);
  const avgTopOpen = top5.reduce((s, c) => s + c.openRate, 0) / top5.length;
  const avgTopSoft = top5.reduce((s, c) => s + c.softBounceRate, 0) / top5.length;

  // High opens = positive ISP signal
  if (avgTopOpen > 30) {
    insights.push({
      severity: "positive",
      text: `Open rates of ${fmt(Math.min(...top5.map(c => c.openRate)))}%-${fmt(Math.max(...top5.map(c => c.openRate)))}% on top campaigns reflect strong subject line relevance and audience fit; high opens are a direct positive ISP reputation signal.`,
      source: "Sender Reputation",
    });
  }

  // Despite high opens, soft bounce rates reveal issues
  if (avgTopSoft > 20) {
    insights.push({
      severity: "warning",
      text: `Despite high opens, soft bounce rates of ${fmt(Math.min(...top5.map(c => c.softBounceRate)))}%-${fmt(Math.max(...top5.map(c => c.softBounceRate)))}% reveal significant invalid addresses in the underlying list segment.`,
      source: "Sender Reputation",
    });
  }

  // Warmup content recommendation
  insights.push({
    severity: "info",
    text: `Use these campaigns as warmup content; CleverTap recommends selecting highest open-rate content from the past 6 months for warmup periods.`,
    source: "IP Warmup",
  });

  // Small-batch pattern
  const avgSent = top5.reduce((s, c) => s + c.totalSentUsers, 0) / top5.length;
  if (avgSent < 10000) {
    insights.push({
      severity: "info",
      text: `Replicate this small-batch, segment-specific send pattern for new or re-engagement audiences.`,
      source: "Email Best Practices",
    });
  }

  return sortAndCap(insights);
}

// ============= TABLE 8: BEST PERFORMING CAMPAIGNS BY CTR =============

function generateBestCTRInsights(sig: CampaignRow[]): TableInsight[] {
  const sorted = sig
    .filter(c => c.uniqueViewedWithinConversion > 0 && c.totalSentUsers >= MIN_VOLUME)
    .map(c => ({
      ...c,
      ctr: (c.uniqueClickedWithinConversion / c.uniqueViewedWithinConversion) * 100,
      softBounceRate: c.totalSentUsers > 0 ? (c.softBounces / c.totalSentUsers) * 100 : 0,
    }))
    .sort((a, b) => b.ctr - a.ctr);

  if (sorted.length < 2) return [];
  const insights: TableInsight[] = [];
  const top5 = sorted.slice(0, 5);
  const avgTopCTR = top5.reduce((s, c) => s + c.ctr, 0) / top5.length;
  const avgTopSoft = top5.reduce((s, c) => s + c.softBounceRate, 0) / top5.length;

  // High CTR = content-audience alignment
  if (avgTopCTR > 2) {
    insights.push({
      severity: "positive",
      text: `CTR of ${fmt(Math.min(...top5.map(c => c.ctr)))}%-${fmt(Math.max(...top5.map(c => c.ctr)))}% significantly outperforms the program average; content and CTA are well-aligned with this specific audience segment.`,
      source: "Sender Reputation",
    });
  }

  // High-CTR campaigns with degraded list
  if (avgTopSoft > 20) {
    insights.push({
      severity: "warning",
      text: `High-CTR campaigns carry soft bounce rates of ${fmt(Math.min(...top5.map(c => c.softBounceRate)))}%-${fmt(Math.max(...top5.map(c => c.softBounceRate)))}%, indicating the underlying list is degraded even on the best-performing sends.`,
      source: "Sender Reputation",
    });
  }

  // Analyse and replicate
  insights.push({
    severity: "info",
    text: `Analyse subject line format, content structure, and CTA placement from these campaigns to build a repeatable template for broader use.`,
    source: "Email Best Practices",
  });

  return sortAndCap(insights);
}

// ============= TABLE 9: UNDERPERFORMING CAMPAIGNS BY OPEN RATE =============

function generateUnderperformingOpenRateInsights(sig: CampaignRow[]): TableInsight[] {
  const sorted = sig
    .filter(c => c.campaignName?.trim() && c.totalSentUsers >= MIN_VOLUME)
    .map(c => ({
      ...c,
      openRate: c.totalSentUsers > 0 ? (c.uniqueViewedWithinConversion / c.totalSentUsers) * 100 : 0,
    }))
    .sort((a, b) => a.openRate - b.openRate);

  if (sorted.length < 2) return [];
  const insights: TableInsight[] = [];
  const bottom5 = sorted.slice(0, 5);
  const avgBottomOpen = bottom5.reduce((s, c) => s + c.openRate, 0) / bottom5.length;
  const maxSent = Math.max(...bottom5.map(c => c.totalSentUsers));

  // Low opens at scale = sustained negative ISP signal
  if (avgBottomOpen < 10 && maxSent > 50000) {
    insights.push({
      severity: "critical",
      text: `Open rates of ${fmt(Math.min(...bottom5.map(c => c.openRate)))}%-${fmt(Math.max(...bottom5.map(c => c.openRate)))}% on sends of ${fmtK(Math.min(...bottom5.map(c => c.totalSentUsers)))}-${fmtK(maxSent)} generate sustained negative ISP signals at scale, risking long-term spam folder routing for the entire domain.`,
      source: "Sender Reputation",
    });
  } else if (avgBottomOpen < 10) {
    insights.push({
      severity: "warning",
      text: `Open rates of ${fmt(Math.min(...bottom5.map(c => c.openRate)))}%-${fmt(Math.max(...bottom5.map(c => c.openRate)))}% indicate inbox placement issues or inactive audience targeting.`,
      source: "Sender Reputation",
    });
  }

  // High volume = likely targeting inactive segments
  if (maxSent > 100000) {
    insights.push({
      severity: "warning",
      text: `High-volume sends at this scale are consistent with targeting inactive or high-risk segments; users inactive for 6+ months must go through a sunset journey first.`,
      source: "Email Sunsetting",
    });
  }

  // Sunsetting recommendation
  insights.push({
    severity: "info",
    text: `Implement email sunsetting for inactive users before any future large-volume campaign; it improves engagement ratios and protects sender reputation.`,
    source: "Email Sunsetting",
  });

  // 80:20 ratio
  insights.push({
    severity: "info",
    text: `Target an 80% engaged to 20% inactive ratio on any given send day.`,
    source: "Email Best Practices",
  });

  return sortAndCap(insights);
}

// ============= TABLE 10: UNDERPERFORMING CAMPAIGNS BY CTR =============

function generateUnderperformingCTRInsights(sig: CampaignRow[]): TableInsight[] {
  const sorted = sig
    .filter(c => c.uniqueViewedWithinConversion > 0 && c.campaignName?.trim() && c.totalSentUsers >= MIN_VOLUME)
    .map(c => ({
      ...c,
      ctr: (c.uniqueClickedWithinConversion / c.uniqueViewedWithinConversion) * 100,
      hardBounceRate: c.totalSentUsers > 0 ? (c.hardBounces / c.totalSentUsers) * 100 : 0,
    }))
    .sort((a, b) => a.ctr - b.ctr);

  if (sorted.length < 2) return [];
  const insights: TableInsight[] = [];
  const bottom5 = sorted.slice(0, 5);
  const avgBottomCTR = bottom5.reduce((s, c) => s + c.ctr, 0) / bottom5.length;
  const avgBottomHB = bottom5.reduce((s, c) => s + c.hardBounceRate, 0) / bottom5.length;

  // Near-zero CTR
  if (avgBottomCTR < 0.5) {
    insights.push({
      severity: "warning",
      text: `CTR of ${fmt(Math.min(...bottom5.map(c => c.ctr)))}%-${fmt(Math.max(...bottom5.map(c => c.ctr)))}% indicates content and CTAs are not resonating; segment-specific, personalised content is required to drive engagement.`,
      source: "Email Best Practices",
    });
  }

  // High hard bounce on underperformers
  if (avgBottomHB > 1.5) {
    insights.push({
      severity: "warning",
      text: `Hard bounce rates of ${fmt(Math.min(...bottom5.map(c => c.hardBounceRate)))}%-${fmt(Math.max(...bottom5.map(c => c.hardBounceRate)))}% require immediate suppression of all bounced addresses from future sends.`,
      source: "Sender Reputation",
    });
  }

  // Mobile optimisation
  insights.push({
    severity: "info",
    text: `Review mobile optimisation of templates used; over 50% of emails are opened on mobile and poor rendering directly reduces engagement.`,
    source: "Email Best Practices",
  });

  // Dynamic content testing
  insights.push({
    severity: "info",
    text: `Test dynamic content blocks personalised by user behaviour to lift CTR on future sends to this audience.`,
    source: "Email Best Practices",
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

  if (topPct > 70) {
    insights.push({
      severity: "warning",
      text: `"${top.deliveryType}" accounts for ${fmt(topPct, 0)}% of volume; heavy concentration limits lifecycle coverage. Diversify with triggered and transactional sends.`,
      source: "Email Best Practices",
    });
  }

  const triggered = extendedData.sendMix.filter(e =>
    e.deliveryType.toLowerCase().includes("action") ||
    e.deliveryType.toLowerCase().includes("trigger")
  );
  const triggerPct = triggered.reduce((s, e) => s + e.percentShare, 0);

  if (triggerPct < 10 && extendedData.sendMix.length > 1) {
    insights.push({
      severity: "info",
      text: `Trigger-based sends represent only ${fmt(triggerPct, 0)}% of the mix; behavioral triggers improve timeliness and relevance, boosting engagement.`,
      source: "Email Best Practices",
    });
  }

  if (extendedData.sendMix.length >= 2) {
    insights.push({
      severity: "info",
      text: `With ${extendedData.sendMix.length} delivery types active, ensure promotional and transactional emails are sent from separate subdomains to isolate reputation.`,
      source: "IP Warmup",
    });
  }

  if (triggerPct > 30 && extendedData.sendMix.length >= 3) {
    insights.push({
      severity: "positive",
      text: `Strong automation maturity with ${fmt(triggerPct, 0)}% trigger-based sends across ${extendedData.sendMix.length} delivery types; supports diverse lifecycle engagement.`,
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
      text: `${weakCount} of ${totalStages} lifecycle stages have weak coverage; users in these stages are not receiving engagement, increasing churn risk and sunsetting pressure.`,
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
      text: `All ${totalStages} lifecycle stages have strong coverage; focus on optimizing CTR within each stage through content personalization and CTA testing.`,
      source: "Email Best Practices",
    });
  } else if (strongCount > totalStages * 0.6) {
    insights.push({
      severity: "positive",
      text: `${strongCount} of ${totalStages} stages have strong coverage; solid foundation with targeted expansion opportunities in ${weakCount + partialCount} remaining stages.`,
      source: "Email Best Practices",
    });
  }

  return sortAndCap(insights);
}

// ============= KEY LEARNINGS =============

function generateKeyLearningsInsights(
  avgCTR: number,
  avgOpen: number,
  hardBounceRate: number,
  softBounceRate: number,
  unsubRate: number,
  postmasterData: PostmasterRow[] | null,
  lifecycleStats?: { strongCount: number; partialCount: number; weakCount: number; totalStages: number } | null,
): TableInsight[] {
  const insights: TableInsight[] = [];

  if (hardBounceRate > 2) {
    insights.push({
      severity: "critical",
      text: `Hard bounce rate (${fmt(hardBounceRate)}%) is the top-priority fix; clean lists and verify addresses before sending. Reputation cannot recover while bounces persist.`,
      source: "IP Warmup",
    });
  }

  if (postmasterData && postmasterData.length > 0) {
    const lowRep = postmasterData.filter(p => ["low", "bad"].includes(p.domainReputation?.toLowerCase() || "")).length;
    if (lowRep > postmasterData.length * 0.2) {
      insights.push({
        severity: "critical",
        text: `Domain reputation instability detected; reduce send volume, focus on 0-3 month engaged users, and avoid sending to inactive segments until reputation stabilizes.`,
        source: "Email Best Practices",
      });
    }
  }

  if (avgCTR < 1.5) {
    insights.push({
      severity: "warning",
      text: `Program CTR at ${fmt(avgCTR)}%; review CTA placement, ensure CTAs are in the top 20% of email content, and A/B test subject lines to improve click-through.`,
      source: "Email Best Practices",
    });
  }

  if (lifecycleStats && lifecycleStats.weakCount > lifecycleStats.totalStages * 0.3) {
    insights.push({
      severity: "info",
      text: `Lifecycle gaps in ${lifecycleStats.weakCount} stages; deploy re-engagement journeys for at-risk users before applying sunsetting policies.`,
      source: "Email Sunsetting",
    });
  }

  if (hardBounceRate < 1 && unsubRate < 0.2 && avgCTR > 2) {
    insights.push({
      severity: "positive",
      text: `Program fundamentals are healthy; low bounces, low unsubscribes, and solid CTR indicate good audience-content alignment. Focus on incremental optimization.`,
      source: "Email Best Practices",
    });
  }

  return sortAndCap(insights);
}
