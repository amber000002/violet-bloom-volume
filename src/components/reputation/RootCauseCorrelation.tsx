import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Calendar, Mail, XCircle, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { PostmasterRow, CampaignRow } from "@/lib/csvAnalyzer";
import { ThresholdBreach } from "./ReputationTrendChart";

interface RootCauseCorrelationProps {
  postmasterData: PostmasterRow[] | null;
  campaignData: CampaignRow[];
  breaches: ThresholdBreach[];
}

export interface RootCauseEntry {
  date: string;
  signalBreached: string;
  breachValue: string | number;
  campaignsSent: CampaignOnDate[];
  negativeSignals: NegativeSignal[];
  likelyCause: string;
  confidence: "high" | "medium" | "low" | "none";
  segmentPatterns: SegmentPattern[];
}

interface CampaignOnDate {
  campaignId: string;
  campaignName: string;
  sent: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubRate: number;
  whoQuery: string;
}

interface NegativeSignal {
  type: string;
  value: string;
  severity: "high" | "medium" | "low";
}

interface SegmentPattern {
  pattern: string;
  observation: string;
  frequency: number;
}

// Unified date parsing
const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

  const mmmMatch = trimmed.match(/^([A-Z][a-z]{2})\s+(\d{1,2}),\s*(\d{4})$/);
  if (mmmMatch) {
    const monthIndex = MONTH_MAP[mmmMatch[1]];
    if (monthIndex === undefined) return null;
    const date = new Date(parseInt(mmmMatch[3], 10), monthIndex, parseInt(mmmMatch[2], 10));
    return isNaN(date.getTime()) ? null : date;
  }

  const csvMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (csvMatch) {
    let year = parseInt(csvMatch[3], 10);
    if (year < 100) year += 2000;
    const date = new Date(year, parseInt(csvMatch[2], 10) - 1, parseInt(csvMatch[1], 10));
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
};

const toISODateKey = (dateStr: string): string | null => {
  const date = parseDate(dateStr);
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const getBaselines = (campaigns: CampaignRow[]) => {
  if (campaigns.length === 0) return { openRate: 0, clickRate: 0, bounceRate: 0, unsubRate: 0 };
  const totalSent = campaigns.reduce((s, c) => s + c.totalSentUsers, 0);
  const totalViewed = campaigns.reduce((s, c) => s + c.uniqueViewedWithinConversion, 0);
  const totalClicked = campaigns.reduce((s, c) => s + c.uniqueClickedWithinConversion, 0);
  const totalBounce = campaigns.reduce((s, c) => s + c.hardBounces + c.softBounces, 0);
  const totalUnsub = campaigns.reduce((s, c) => s + c.totalUnsubscribes, 0);
  return {
    openRate: totalSent > 0 ? (totalViewed / totalSent) * 100 : 0,
    clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
    bounceRate: totalSent > 0 ? (totalBounce / totalSent) * 100 : 0,
    unsubRate: totalSent > 0 ? (totalUnsub / totalSent) * 100 : 0,
  };
};

// Extract segment patterns from Who Query strings
const extractSegmentPatterns = (campaigns: CampaignOnDate[], baselines: ReturnType<typeof getBaselines>): SegmentPattern[] => {
  const patterns: SegmentPattern[] = [];
  const queryGroups = new Map<string, { count: number; avgBounce: number; avgOpen: number; avgUnsub: number; totalSent: number }>();

  campaigns.forEach((c) => {
    if (!c.whoQuery || c.whoQuery.trim() === "") return;
    const query = c.whoQuery.trim();

    const existing = queryGroups.get(query) || { count: 0, avgBounce: 0, avgOpen: 0, avgUnsub: 0, totalSent: 0 };
    existing.count++;
    existing.avgBounce += c.bounceRate;
    existing.avgOpen += c.openRate;
    existing.avgUnsub += c.unsubRate;
    existing.totalSent += c.sent;
    queryGroups.set(query, existing);
  });

  queryGroups.forEach((data, query) => {
    const avgBounce = data.avgBounce / data.count;
    const avgOpen = data.avgOpen / data.count;
    const avgUnsub = data.avgUnsub / data.count;

    const observations: string[] = [];
    if (avgBounce > baselines.bounceRate * 2) {
      observations.push(`${avgBounce.toFixed(1)}% bounce rate (${(avgBounce / baselines.bounceRate).toFixed(1)}x account average)`);
    }
    if (avgOpen < baselines.openRate * 0.7) {
      observations.push(`${avgOpen.toFixed(1)}% open rate (below ${baselines.openRate.toFixed(1)}% average)`);
    }
    if (avgUnsub > baselines.unsubRate * 2) {
      observations.push(`${avgUnsub.toFixed(2)}% unsub rate (elevated)`);
    }

    if (observations.length > 0) {
      const shortQuery = query; // Full query - no truncation
      patterns.push({
        pattern: shortQuery,
        observation: observations.join("; "),
        frequency: data.count,
      });
    }
  });

  return patterns;
};

// Generate conclusion summary
const generateConclusionSummary = (rootCauses: RootCauseEntry[], postmasterData: PostmasterRow[] | null): string => {
  const totalBreachDays = rootCauses.length;
  if (totalBreachDays === 0) return "";

  // Most frequent breach signal
  const signalCounts = new Map<string, number>();
  rootCauses.forEach((rc) => {
    rc.signalBreached.split(", ").forEach((sig) => {
      signalCounts.set(sig, (signalCounts.get(sig) || 0) + 1);
    });
  });
  const mostFrequentSignal = [...signalCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";

  // Most correlated segment pattern
  const allSegments = new Map<string, number>();
  rootCauses.forEach((rc) => {
    rc.segmentPatterns.forEach((sp) => {
      allSegments.set(sp.pattern, (allSegments.get(sp.pattern) || 0) + sp.frequency);
    });
  });
  const topSegment = [...allSegments.entries()].sort((a, b) => b[1] - a[1])[0];

  // Determine issue type
  const highConfidence = rootCauses.filter((r) => r.confidence === "high" || r.confidence === "medium");
  const hasEngagementDrops = rootCauses.some((r) => r.negativeSignals.some((s) => s.type.includes("Open Rate") || s.type.includes("Click Rate")));
  const hasBounceSpikes = rootCauses.some((r) => r.negativeSignals.some((s) => s.type.includes("Bounce")));
  const hasSegmentIssues = allSegments.size > 0;

  let issueType = "volume-related patterns";
  if (hasSegmentIssues && hasEngagementDrops) issueType = "segment-driven risk with engagement decay";
  else if (hasEngagementDrops) issueType = "engagement-related degradation";
  else if (hasBounceSpikes) issueType = "list hygiene and bounce-related stress";
  else if (hasSegmentIssues) issueType = "segment-driven risk";

  // Check for IP/domain degradation from postmaster
  const hasReputationDegradation = postmasterData?.some(
    (p) => p.domainReputation === "LOW" || p.domainReputation === "BAD" || p.ipReputation === "LOW" || p.ipReputation === "BAD"
  );

  let summary = `During the analyzed period, ${totalBreachDays} breach day${totalBreachDays > 1 ? "s were" : " was"} detected. `;
  summary += `The most frequent signal was ${mostFrequentSignal}`;

  if (topSegment) {
    summary += `, primarily correlated with campaigns targeting "${topSegment[0]}". `;
  } else {
    summary += ". ";
  }

  if (highConfidence.length > 0) {
    summary += `${highConfidence.length} breach${highConfidence.length > 1 ? "es" : ""} showed strong campaign-level correlation, indicating ${issueType}. `;
  } else {
    summary += `Campaign-level correlation was weak, suggesting external factors or delayed reputation impact. `;
  }

  if (hasReputationDegradation) {
    summary += "Domain/IP reputation degradation was observed in postmaster data during this period.";
  } else {
    summary += "No systemic IP/domain degradation pattern observed.";
  }

  return summary;
};

export const analyzeRootCauses = (
  postmasterData: PostmasterRow[] | null,
  campaignData: CampaignRow[],
  breaches: ThresholdBreach[]
): RootCauseEntry[] => {
  if (breaches.length === 0) return [];

  const baselines = getBaselines(campaignData);

  // Group breaches by ISO date
  const breachesByISODate = new Map<string, ThresholdBreach[]>();
  breaches.forEach((b) => {
    const isoKey = toISODateKey(b.date) || b.date;
    const existing = breachesByISODate.get(isoKey) || [];
    existing.push(b);
    breachesByISODate.set(isoKey, existing);
  });

  // Campaign lookup by ISO date
  const campaignsByISODate = new Map<string, CampaignRow[]>();
  campaignData.forEach((c) => {
    const isoKey = toISODateKey(c.startDate);
    if (isoKey) {
      const existing = campaignsByISODate.get(isoKey) || [];
      existing.push(c);
      campaignsByISODate.set(isoKey, existing);
    }
  });

  const results: RootCauseEntry[] = [];

  breachesByISODate.forEach((dateBreaches, isoDate) => {
    const campaignsOnDate = campaignsByISODate.get(isoDate) || [];
    const negativeSignals: NegativeSignal[] = [];
    const campaignsSent: CampaignOnDate[] = [];

    campaignsOnDate.forEach((c) => {
      const bounceRate = c.hardBounceRate + c.softBounceRate;
      const openRate = c.totalSentUsers > 0 ? (c.uniqueViewedWithinConversion / c.totalSentUsers) * 100 : 0;
      const clickRate = c.totalSentUsers > 0 ? (c.uniqueClickedWithinConversion / c.totalSentUsers) * 100 : 0;

      campaignsSent.push({
        campaignId: c.campaignId,
        campaignName: c.campaignName,
        sent: c.totalSentUsers,
        openRate,
        clickRate,
        bounceRate,
        unsubRate: c.unsubscribeRate,
        whoQuery: c.whoQuery || "",
      });

      if (c.unsubscribeRate > baselines.unsubRate * 2 || c.unsubscribeRate > 0.5) {
        negativeSignals.push({
          type: "Elevated Unsubscribe Rate",
          value: `${c.unsubscribeRate.toFixed(2)}% (avg: ${baselines.unsubRate.toFixed(2)}%)`,
          severity: c.unsubscribeRate > 1 ? "high" : "medium",
        });
      }

      if (bounceRate > baselines.bounceRate * 2 || bounceRate > 2) {
        negativeSignals.push({
          type: "Bounce Spike",
          value: `${bounceRate.toFixed(2)}% (avg: ${baselines.bounceRate.toFixed(2)}%)`,
          severity: bounceRate > 3 ? "high" : "medium",
        });
      }

      if (baselines.openRate > 0 && openRate < baselines.openRate * 0.7) {
        negativeSignals.push({
          type: "Open Rate Drop",
          value: `${openRate.toFixed(2)}% (avg: ${baselines.openRate.toFixed(2)}%)`,
          severity: openRate < baselines.openRate * 0.5 ? "high" : "medium",
        });
      }

      if (baselines.clickRate > 0 && clickRate < baselines.clickRate * 0.5) {
        negativeSignals.push({
          type: "Click Rate Drop",
          value: `${clickRate.toFixed(2)}% (avg: ${baselines.clickRate.toFixed(2)}%)`,
          severity: "low",
        });
      }

      // Open + Click < 5% combined threshold
      if (openRate < 5 && clickRate < 5 && c.totalSentUsers > 0) {
        negativeSignals.push({
          type: "Extremely Low Engagement",
          value: `Open: ${openRate.toFixed(1)}%, Click: ${clickRate.toFixed(1)}%`,
          severity: "high",
        });
      }
    });

    // Segment pattern analysis
    const segmentPatterns = extractSegmentPatterns(campaignsSent, baselines);

    // Determine likely cause
    let likelyCause = "No campaign-level correlation detected";
    let confidence: RootCauseEntry["confidence"] = "none";

    if (campaignsSent.length > 0 && negativeSignals.length > 0) {
      const highSeverity = negativeSignals.filter((s) => s.severity === "high");
      const mediumSeverity = negativeSignals.filter((s) => s.severity === "medium");

      if (highSeverity.length > 0) {
        const primary = highSeverity[0];
        if (primary.type === "Bounce Spike") {
          likelyCause = "High bounce rate degraded sender reputation. List hygiene issue observed.";
        } else if (primary.type === "Elevated Unsubscribe Rate") {
          likelyCause = "High unsubscribe rate correlated with poor content relevance or frequency fatigue.";
        } else if (primary.type === "Open Rate Drop") {
          likelyCause = "Significant engagement drop observed, coinciding with inbox placement degradation.";
        } else if (primary.type === "Extremely Low Engagement") {
          likelyCause = "Extremely low open and click rates observed, indicating possible spam folder placement.";
        }
        confidence = "high";
      } else if (mediumSeverity.length > 0) {
        likelyCause = `Multiple engagement signals deviated from baseline: ${mediumSeverity.map((s) => s.type).join(", ")}.`;
        confidence = "medium";
      } else {
        likelyCause = "Minor engagement deviations detected. Monitor but not immediately actionable.";
        confidence = "low";
      }

      // Append segment correlation if present
      if (segmentPatterns.length > 0) {
        likelyCause += ` Segment pattern detected: "${segmentPatterns[0].pattern}" showed ${segmentPatterns[0].observation}.`;
      }
    } else if (campaignsSent.length === 0) {
      likelyCause = "No campaigns sent on breach date. External factor or delayed reputation impact.";
      confidence = "none";
    } else {
      likelyCause = "Campaigns sent but no negative signals detected. May be volume-related or external.";
      confidence = "low";
    }

    results.push({
      date: dateBreaches[0].date,
      signalBreached: dateBreaches.map((b) => b.metric).join(", "),
      breachValue: dateBreaches.map((b) => `${b.metric}: ${b.value}`).join("; "),
      campaignsSent,
      negativeSignals,
      likelyCause,
      confidence,
      segmentPatterns,
    });
  });

  return results.sort((a, b) => {
    const dateA = parseDate(a.date);
    const dateB = parseDate(b.date);
    return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
  });
};

const ConfidenceBadge: React.FC<{ confidence: RootCauseEntry["confidence"] }> = ({ confidence }) => {
  const styles = {
    high: "bg-red-500/20 text-red-600",
    medium: "bg-amber-500/20 text-amber-600",
    low: "bg-blue-500/20 text-blue-600",
    none: "bg-muted text-muted-foreground",
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[confidence]}`}>
      {confidence === "none" ? "No Correlation" : `${confidence.charAt(0).toUpperCase() + confidence.slice(1)} Confidence`}
    </span>
  );
};

export const RootCauseCorrelation: React.FC<RootCauseCorrelationProps> = ({
  postmasterData,
  campaignData,
  breaches,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const rootCauses = React.useMemo(
    () => analyzeRootCauses(postmasterData, campaignData, breaches),
    [postmasterData, campaignData, breaches]
  );

  const conclusionSummary = React.useMemo(
    () => generateConclusionSummary(rootCauses, postmasterData),
    [rootCauses, postmasterData]
  );

  if (breaches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircleIcon className="w-8 h-8 mx-auto mb-2 text-green-500" />
        <p>No threshold breaches detected. Reputation signals are within acceptable ranges.</p>
      </div>
    );
  }

  if (rootCauses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <HelpCircle className="w-8 h-8 mx-auto mb-2" />
        <p>Unable to correlate breaches with campaign data.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Conclusion Summary - Always Visible */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
        <h4 className="font-medium text-sm text-amber-700 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Root Cause Conclusion
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed">{conclusionSummary}</p>
      </div>

      {/* Expand/Collapse Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-primary hover:text-primary/80 transition-colors"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-4 h-4" />
            Hide Detailed Diagnostics
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            View Detailed Diagnostics ({rootCauses.length} breach date{rootCauses.length > 1 ? "s" : ""})
          </>
        )}
      </button>

      {/* Collapsible Detailed Diagnostics */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-4 overflow-hidden"
          >
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{rootCauses.length}</p>
                <p className="text-xs text-muted-foreground">Breach Dates</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {rootCauses.filter((r) => r.confidence === "high" || r.confidence === "medium").length}
                </p>
                <p className="text-xs text-muted-foreground">Correlated Causes</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {rootCauses.reduce((s, r) => s + r.negativeSignals.length, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Negative Signals</p>
              </div>
            </div>

            {/* Detailed Breach Cards */}
            {rootCauses.map((cause, i) => (
              <div key={i} className="bg-muted/10 border border-border/50 rounded-xl p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{cause.date}</span>
                  </div>
                  <ConfidenceBadge confidence={cause.confidence} />
                </div>

                {/* Signal Breached */}
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="text-sm text-red-600 font-medium">{cause.signalBreached}</span>
                </div>

                {/* Breach Values */}
                <p className="text-xs text-muted-foreground">{cause.breachValue}</p>

                {/* Campaigns on this date */}
                {cause.campaignsSent.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {cause.campaignsSent.length} campaign{cause.campaignsSent.length > 1 ? "s" : ""} sent
                    </p>
                    <div className="space-y-1">
                      {cause.campaignsSent.map((c, j) => (
                        <div key={j} className="text-xs bg-background/50 rounded px-3 py-2 flex flex-wrap gap-x-4 gap-y-1">
                          <span className="font-medium min-w-[150px]">{c.campaignName}</span>
                          <span>Sent: {c.sent.toLocaleString()}</span>
                          <span>Open: {c.openRate.toFixed(1)}%</span>
                          <span>Click: {c.clickRate.toFixed(1)}%</span>
                          <span>Bounce: {c.bounceRate.toFixed(2)}%</span>
                          <span>Unsub: {c.unsubRate.toFixed(2)}%</span>
                          {c.whoQuery && (
                            <span className="text-muted-foreground italic whitespace-normal break-words block w-full mt-1">Segment: {c.whoQuery}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Negative Signals */}
                {cause.negativeSignals.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Observed Signals:</p>
                    <ul className="space-y-1">
                      {cause.negativeSignals.map((signal, j) => (
                        <li key={j} className="flex items-center gap-1 text-xs">
                          <XCircle
                            className={`w-3 h-3 shrink-0 ${
                              signal.severity === "high" ? "text-red-500" : signal.severity === "medium" ? "text-amber-500" : "text-blue-500"
                            }`}
                          />
                          <span className="font-medium">{signal.type}:</span>
                          <span className="text-muted-foreground">{signal.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Segment Patterns */}
                {cause.segmentPatterns.length > 0 && (
                  <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
                    <p className="text-xs font-medium text-amber-700 mb-1">Segment/Who-Query Pattern Detected:</p>
                    {cause.segmentPatterns.map((sp, j) => (
                      <div key={j} className="text-xs text-muted-foreground mt-1">
                        <span className="font-medium">"{sp.pattern}"</span> — {sp.observation}
                      </div>
                    ))}
                  </div>
                )}

                {/* Likely Cause */}
                <div className="border-t border-border/30 pt-2">
                  <p className="text-xs text-muted-foreground italic">{cause.likelyCause}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">No recommendation. Observation only.</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Inline CheckCircle to avoid import issue
const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
