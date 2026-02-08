import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { PostmasterRow, CampaignRow } from "@/lib/csvAnalyzer";

interface SignalHealthTableProps {
  postmasterData: PostmasterRow[] | null;
  campaignData: CampaignRow[];
}

export interface SignalHealth {
  signal: string;
  latestValue: string | number;
  latestDate: string;
  threshold: string;
  status: "healthy" | "warning" | "risk" | "breached" | "critical";
  trend: "improving" | "stable" | "worsening";
  trendChange: string;
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

// Thresholds per PRD
const THRESHOLDS = {
  spamRatio: { value: 0.001, label: "< 0.1%" },
  errorRatio: { value: 0, label: "= 0%" },
  ipReputation: { value: "Medium", label: "≥ Medium" },
  domainReputation: { value: "Medium", label: "≥ Medium" },
  openRate: { value: 15, label: "> 15%" },
  bounceRate: { value: 1, label: "< 1%" },
  unsubscribeRate: { value: 0.2, label: "< 0.2%" },
};

// Case-insensitive reputation mapping with no silent fallback
const reputationToNumber = (rep: string): number | null => {
  if (!rep) return null;
  const map: Record<string, number> = { "high": 4, "medium": 3, "low": 2, "bad": 1 };
  const result = map[rep.trim().toLowerCase()];
  return result !== undefined ? result : null;
};

// Derive status directly from the original CSV enum (case-insensitive)
const reputationToStatus = (rep: string): "healthy" | "warning" | "risk" | "critical" | null => {
  if (!rep) return null;
  const map: Record<string, "healthy" | "warning" | "risk" | "critical"> = {
    "high": "healthy",
    "medium": "warning",
    "low": "risk",
    "bad": "critical",
  };
  return map[rep.trim().toLowerCase()] || null;
};

export const calculateSignalHealth = (
  postmasterData: PostmasterRow[] | null,
  campaignData: CampaignRow[]
): SignalHealth[] => {
  const signals: SignalHealth[] = [];
  
  // Sort postmaster data chronologically
  const sortedPM = postmasterData
    ? [...postmasterData]
        .map((p) => ({ ...p, dateObj: parseDate(p.date) }))
        .filter((p) => p.dateObj !== null)
        .sort((a, b) => (a.dateObj?.getTime() || 0) - (b.dateObj?.getTime() || 0))
    : [];
  
  // Sort campaign data chronologically
  const sortedCampaigns = [...campaignData]
    .map((c) => ({ ...c, dateObj: parseDate(c.startDate) }))
    .filter((c) => c.dateObj !== null)
    .sort((a, b) => (a.dateObj?.getTime() || 0) - (b.dateObj?.getTime() || 0));
  
  // Helper to calculate trend
  const calcTrend = (
    values: number[],
    isHigherBetter: boolean
  ): { trend: "improving" | "stable" | "worsening"; change: string } => {
    if (values.length < 2) return { trend: "stable", change: "N/A" };
    
    const halfPoint = Math.floor(values.length / 2);
    const firstHalfAvg = values.slice(0, halfPoint).reduce((a, b) => a + b, 0) / halfPoint;
    const secondHalfAvg = values.slice(halfPoint).reduce((a, b) => a + b, 0) / (values.length - halfPoint);
    
    const change = secondHalfAvg - firstHalfAvg;
    const changePercent = firstHalfAvg !== 0 ? (change / firstHalfAvg) * 100 : 0;
    
    let trend: "improving" | "stable" | "worsening" = "stable";
    if (Math.abs(changePercent) > 5) {
      if (isHigherBetter) {
        trend = change > 0 ? "improving" : "worsening";
      } else {
        trend = change < 0 ? "improving" : "worsening";
      }
    }
    
    const changeStr = changePercent > 0 ? `+${changePercent.toFixed(1)}%` : `${changePercent.toFixed(1)}%`;
    return { trend, change: changeStr };
  };
  
  // Postmaster-based signals
  if (sortedPM.length > 0) {
    const latest = sortedPM[sortedPM.length - 1];
    const latestPMDate = latest.date || "N/A";
    
    // Spam Ratio
    const spamValues = sortedPM.map((p) => p.spamRatio || 0);
    const latestSpam = latest.spamRatio || 0;
    const spamTrend = calcTrend(spamValues, false);
    signals.push({
      signal: "Spam Ratio",
      latestValue: `${(latestSpam * 100).toFixed(2)}%`,
      latestDate: latestPMDate,
      threshold: THRESHOLDS.spamRatio.label,
      status: latestSpam > 0.003 ? "breached" : latestSpam > 0.001 ? "warning" : "healthy",
      trend: spamTrend.trend,
      trendChange: spamTrend.change,
    });
    
    // Error Ratio
    const errorValues = sortedPM.map((p) => p.errorRatio || 0);
    const latestError = latest.errorRatio || 0;
    const errorTrend = calcTrend(errorValues, false);
    signals.push({
      signal: "Error Ratio",
      latestValue: `${(latestError * 100).toFixed(2)}%`,
      latestDate: latestPMDate,
      threshold: THRESHOLDS.errorRatio.label,
      status: latestError > 0.01 ? "breached" : latestError > 0 ? "warning" : "healthy",
      trend: errorTrend.trend,
      trendChange: errorTrend.change,
    });
    
    // IP Reputation
    const ipValues = sortedPM
      .map((p) => reputationToNumber(p.ipReputation))
      .filter((v): v is number => v !== null);
    const ipTrend = calcTrend(ipValues, true);
    const latestIPStatus = reputationToStatus(latest.ipReputation);
    if (latestIPStatus !== null) {
      signals.push({
        signal: "IP Reputation",
        latestValue: latest.ipReputation?.trim() || "Unknown",
        latestDate: latestPMDate,
        threshold: THRESHOLDS.ipReputation.label,
        status: latestIPStatus === "healthy" ? "healthy" : latestIPStatus === "warning" ? "warning" : latestIPStatus === "risk" ? "risk" : "critical",
        trend: ipTrend.trend,
        trendChange: ipTrend.change,
      });
    }
    
    // Domain Reputation
    const domainValues = sortedPM
      .map((p) => reputationToNumber(p.domainReputation))
      .filter((v): v is number => v !== null);
    const domainTrend = calcTrend(domainValues, true);
    const latestDomainStatus = reputationToStatus(latest.domainReputation);
    if (latestDomainStatus !== null) {
      signals.push({
        signal: "Domain Reputation",
        latestValue: latest.domainReputation?.trim() || "Unknown",
        latestDate: latestPMDate,
        threshold: THRESHOLDS.domainReputation.label,
        status: latestDomainStatus === "healthy" ? "healthy" : latestDomainStatus === "warning" ? "warning" : latestDomainStatus === "risk" ? "risk" : "critical",
        trend: domainTrend.trend,
        trendChange: domainTrend.change,
      });
    }
  }
  
  // Campaign-based signals
  if (sortedCampaigns.length > 0) {
    const latestCampaignDate = sortedCampaigns[sortedCampaigns.length - 1].startDate || "N/A";
    
    // Open Rate
    const openValues = sortedCampaigns.map((c) => c.openRate);
    const latestOpen = sortedCampaigns[sortedCampaigns.length - 1].openRate;
    const avgOpen = openValues.reduce((a, b) => a + b, 0) / openValues.length;
    const openTrend = calcTrend(openValues, true);
    signals.push({
      signal: "Open Rate",
      latestValue: `${latestOpen.toFixed(2)}%`,
      latestDate: latestCampaignDate,
      threshold: THRESHOLDS.openRate.label,
      status: avgOpen < 10 ? "breached" : avgOpen < 15 ? "warning" : "healthy",
      trend: openTrend.trend,
      trendChange: openTrend.change,
    });
    
    // Bounce Rate (Hard + Soft)
    const bounceValues = sortedCampaigns.map((c) => c.hardBounceRate + c.softBounceRate);
    const avgBounce = bounceValues.reduce((a, b) => a + b, 0) / bounceValues.length;
    const bounceTrend = calcTrend(bounceValues, false);
    signals.push({
      signal: "Bounce Rate",
      latestValue: `${avgBounce.toFixed(2)}%`,
      latestDate: latestCampaignDate,
      threshold: THRESHOLDS.bounceRate.label,
      status: avgBounce > 3 ? "breached" : avgBounce > 1 ? "warning" : "healthy",
      trend: bounceTrend.trend,
      trendChange: bounceTrend.change,
    });
    
    // Unsubscribe Rate
    const unsubValues = sortedCampaigns.map((c) => c.unsubscribeRate);
    const avgUnsub = unsubValues.reduce((a, b) => a + b, 0) / unsubValues.length;
    const unsubTrend = calcTrend(unsubValues, false);
    signals.push({
      signal: "Unsubscribe Rate",
      latestValue: `${avgUnsub.toFixed(2)}%`,
      latestDate: latestCampaignDate,
      threshold: THRESHOLDS.unsubscribeRate.label,
      status: avgUnsub > 0.7 ? "breached" : avgUnsub > 0.2 ? "warning" : "healthy",
      trend: unsubTrend.trend,
      trendChange: unsubTrend.change,
    });
  }
  
  return signals;
};

const StatusIcon: React.FC<{ status: SignalHealth["status"] }> = ({ status }) => {
  switch (status) {
    case "healthy":
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "warning":
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case "risk":
      return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    case "breached":
    case "critical":
      return <XCircle className="w-4 h-4 text-red-500" />;
  }
};

const TrendIcon: React.FC<{ trend: SignalHealth["trend"] }> = ({ trend }) => {
  switch (trend) {
    case "improving":
      return <TrendingDown className="w-4 h-4 text-green-500" />;
    case "worsening":
      return <TrendingUp className="w-4 h-4 text-red-500" />;
    case "stable":
      return <Minus className="w-4 h-4 text-muted-foreground" />;
  }
};

export const SignalHealthTable: React.FC<SignalHealthTableProps> = ({
  postmasterData,
  campaignData,
}) => {
  const signals = React.useMemo(
    () => calculateSignalHealth(postmasterData, campaignData),
    [postmasterData, campaignData]
  );
  
  if (signals.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No signals available. Upload campaign or Postmaster data.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-x-auto"
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Signal</th>
            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Latest Value</th>
            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Latest Date</th>
            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Threshold</th>
            <th className="text-center py-3 px-4 font-medium text-muted-foreground">Status</th>
            <th className="text-center py-3 px-4 font-medium text-muted-foreground">Trend</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((signal, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
              <td className="py-3 px-4 font-medium">{signal.signal}</td>
              <td className="text-right py-3 px-4 font-mono">{signal.latestValue}</td>
              <td className="text-right py-3 px-4 text-muted-foreground text-xs">{signal.latestDate}</td>
              <td className="text-right py-3 px-4 text-muted-foreground">{signal.threshold}</td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-center gap-2">
                  <StatusIcon status={signal.status} />
                  <span
                    className={`text-xs font-medium ${
                      signal.status === "healthy"
                        ? "text-green-600"
                        : signal.status === "warning"
                        ? "text-amber-600"
                        : signal.status === "risk"
                        ? "text-orange-600"
                        : "text-red-600"
                    }`}
                  >
                    {signal.status === "healthy" ? "✓ OK" : signal.status === "warning" ? "⚠ Watch" : signal.status === "risk" ? "⚠ Risk" : "🚨 Critical"}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-center gap-2">
                  <TrendIcon trend={signal.trend} />
                  <span
                    className={`text-xs ${
                      signal.trend === "improving"
                        ? "text-green-600"
                        : signal.trend === "worsening"
                        ? "text-red-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {signal.trend === "improving" ? "↓" : signal.trend === "worsening" ? "↑" : "→"} {signal.trendChange}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
};
