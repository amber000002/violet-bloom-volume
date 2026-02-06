import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Calendar, Mail, XCircle, HelpCircle } from "lucide-react";
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
}

interface CampaignOnDate {
  campaignId: string;
  campaignName: string;
  sent: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubRate: number;
}

interface NegativeSignal {
  type: string;
  value: string;
  severity: "high" | "medium" | "low";
}

// Parse reputation date strictly as "MMM D, YYYY" (e.g., "Jan 9, 2026")
const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const match = dateStr.trim().match(/^([A-Z][a-z]{2})\s+(\d{1,2}),\s*(\d{4})$/);
  if (!match) return null;

  const monthIndex = MONTH_MAP[match[1]];
  if (monthIndex === undefined) return null;

  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  const date = new Date(year, monthIndex, day);
  return isNaN(date.getTime()) ? null : date;
};

// Format date to "MMM D, YYYY" for comparison
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const formatDate = (date: Date): string => {
  const month = MONTH_NAMES[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
};

// Get account baseline averages
const getBaselines = (campaigns: CampaignRow[]) => {
  if (campaigns.length === 0) return { openRate: 0, clickRate: 0, bounceRate: 0, unsubRate: 0 };
  
  const avgOpen = campaigns.reduce((s, c) => s + c.openRate, 0) / campaigns.length;
  const avgClick = campaigns.reduce((s, c) => s + c.clickRate, 0) / campaigns.length;
  const avgBounce = campaigns.reduce((s, c) => s + c.hardBounceRate + c.softBounceRate, 0) / campaigns.length;
  const avgUnsub = campaigns.reduce((s, c) => s + c.unsubscribeRate, 0) / campaigns.length;
  
  return { openRate: avgOpen, clickRate: avgClick, bounceRate: avgBounce, unsubRate: avgUnsub };
};

export const analyzeRootCauses = (
  postmasterData: PostmasterRow[] | null,
  campaignData: CampaignRow[],
  breaches: ThresholdBreach[]
): RootCauseEntry[] => {
  if (breaches.length === 0) return [];
  
  const baselines = getBaselines(campaignData);
  
  // Group breaches by date
  const breachesByDate = new Map<string, ThresholdBreach[]>();
  breaches.forEach((b) => {
    const existing = breachesByDate.get(b.date) || [];
    existing.push(b);
    breachesByDate.set(b.date, existing);
  });
  
  // Prepare campaign lookup by date
  const campaignsByDate = new Map<string, CampaignRow[]>();
  campaignData.forEach((c) => {
    const dateObj = parseDate(c.startDate);
    if (dateObj) {
      const dateKey = formatDate(dateObj);
      const existing = campaignsByDate.get(dateKey) || [];
      existing.push(c);
      campaignsByDate.set(dateKey, existing);
      
      // Also check original format
      const existing2 = campaignsByDate.get(c.startDate) || [];
      if (existing2.length === 0) {
        campaignsByDate.set(c.startDate, [c]);
      } else {
        existing2.push(c);
      }
    }
  });
  
  const results: RootCauseEntry[] = [];
  
  breachesByDate.forEach((dateBreaches, date) => {
    const dateObj = parseDate(date);
    
    // Find campaigns on this date (try multiple date formats)
    const formattedDate = dateObj ? formatDate(dateObj) : date;
    const campaignsOnDate = campaignsByDate.get(date) || campaignsByDate.get(formattedDate) || [];
    
    // Analyze negative signals from campaigns
    const negativeSignals: NegativeSignal[] = [];
    const campaignsSent: CampaignOnDate[] = [];
    
    campaignsOnDate.forEach((c) => {
      const bounceRate = c.hardBounceRate + c.softBounceRate;
      
      campaignsSent.push({
        campaignId: c.campaignId,
        campaignName: c.campaignName,
        sent: c.totalSentUsers,
        openRate: c.openRate,
        clickRate: c.clickRate,
        bounceRate,
        unsubRate: c.unsubscribeRate,
      });
      
      // Check for elevated unsubscribes (>2x baseline or >0.5%)
      if (c.unsubscribeRate > baselines.unsubRate * 2 || c.unsubscribeRate > 0.5) {
        negativeSignals.push({
          type: "Elevated Unsubscribe Rate",
          value: `${c.unsubscribeRate.toFixed(2)}% (baseline: ${baselines.unsubRate.toFixed(2)}%)`,
          severity: c.unsubscribeRate > 1 ? "high" : "medium",
        });
      }
      
      // Check for bounce spikes (>2x baseline or >2%)
      if (bounceRate > baselines.bounceRate * 2 || bounceRate > 2) {
        negativeSignals.push({
          type: "Bounce Spike",
          value: `${bounceRate.toFixed(2)}% (baseline: ${baselines.bounceRate.toFixed(2)}%)`,
          severity: bounceRate > 3 ? "high" : "medium",
        });
      }
      
      // Check for open rate significantly below baseline (>30% drop)
      if (baselines.openRate > 0 && c.openRate < baselines.openRate * 0.7) {
        negativeSignals.push({
          type: "Open Rate Drop",
          value: `${c.openRate.toFixed(2)}% (baseline: ${baselines.openRate.toFixed(2)}%)`,
          severity: c.openRate < baselines.openRate * 0.5 ? "high" : "medium",
        });
      }
      
      // Check for click rate significantly below baseline
      if (baselines.clickRate > 0 && c.clickRate < baselines.clickRate * 0.5) {
        negativeSignals.push({
          type: "Click Rate Drop",
          value: `${c.clickRate.toFixed(2)}% (baseline: ${baselines.clickRate.toFixed(2)}%)`,
          severity: "low",
        });
      }
    });
    
    // Determine likely cause
    let likelyCause = "No campaign-level correlation detected";
    let confidence: RootCauseEntry["confidence"] = "none";
    
    if (campaignsSent.length > 0 && negativeSignals.length > 0) {
      // Prioritize by severity
      const highSeverity = negativeSignals.filter((s) => s.severity === "high");
      const mediumSeverity = negativeSignals.filter((s) => s.severity === "medium");
      
      if (highSeverity.length > 0) {
        const primary = highSeverity[0];
        if (primary.type === "Bounce Spike") {
          likelyCause = "High bounce rate degraded sender reputation. Clean list and verify addresses.";
        } else if (primary.type === "Elevated Unsubscribe Rate") {
          likelyCause = "High unsubscribe rate signals poor content relevance or frequency fatigue.";
        } else if (primary.type === "Open Rate Drop") {
          likelyCause = "Significant engagement drop suggests inbox placement issues or poor targeting.";
        }
        confidence = "high";
      } else if (mediumSeverity.length > 0) {
        likelyCause = `Multiple engagement signals deviated from baseline: ${mediumSeverity.map((s) => s.type).join(", ")}.`;
        confidence = "medium";
      } else {
        likelyCause = "Minor engagement deviations detected. Monitor but not immediately actionable.";
        confidence = "low";
      }
    } else if (campaignsSent.length === 0) {
      likelyCause = "No campaigns sent on breach date. External factor or delayed reputation impact.";
      confidence = "none";
    } else {
      likelyCause = "Campaigns sent but no negative signals detected. May be volume-related or external.";
      confidence = "low";
    }
    
    results.push({
      date,
      signalBreached: dateBreaches.map((b) => b.metric).join(", "),
      breachValue: dateBreaches.map((b) => `${b.metric}: ${b.value}`).join("; "),
      campaignsSent,
      negativeSignals,
      likelyCause,
      confidence,
    });
  });
  
  // Sort by date (most recent first)
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
  const rootCauses = React.useMemo(
    () => analyzeRootCauses(postmasterData, campaignData, breaches),
    [postmasterData, campaignData, breaches]
  );
  
  if (breaches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
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
      
      {/* Root Cause Summary Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Signal Breached</th>
              <th className="text-center py-3 px-4 font-medium text-muted-foreground">Campaigns Sent</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Negative Signals</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Likely Cause</th>
            </tr>
          </thead>
          <tbody>
            {rootCauses.map((cause, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-muted/20 align-top">
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {cause.date}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="text-red-600 font-medium">{cause.signalBreached}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  {cause.campaignsSent.length > 0 ? (
                    <div className="flex items-center justify-center gap-1">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{cause.campaignsSent.length}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {cause.negativeSignals.length > 0 ? (
                    <ul className="space-y-1">
                      {cause.negativeSignals.slice(0, 3).map((signal, j) => (
                        <li key={j} className="flex items-center gap-1 text-xs">
                          <XCircle
                            className={`w-3 h-3 shrink-0 ${
                              signal.severity === "high"
                                ? "text-red-500"
                                : signal.severity === "medium"
                                ? "text-amber-500"
                                : "text-blue-500"
                            }`}
                          />
                          <span>{signal.type}</span>
                        </li>
                      ))}
                      {cause.negativeSignals.length > 3 && (
                        <li className="text-xs text-muted-foreground">
                          +{cause.negativeSignals.length - 3} more
                        </li>
                      )}
                    </ul>
                  ) : (
                    <span className="text-muted-foreground text-xs">None detected</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="space-y-2">
                    <ConfidenceBadge confidence={cause.confidence} />
                    <p className="text-xs text-muted-foreground">{cause.likelyCause}</p>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

// Fix missing import
const CheckCircle = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
