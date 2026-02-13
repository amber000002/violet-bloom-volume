import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CampaignRow } from "@/lib/csvAnalyzer";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface EmailMetricsTrendChartProps {
  campaignData: CampaignRow[];
  grandTotalAverages?: {
    openRate: number;
    clickRate: number;
    bounceRate: number;
    unsubRate: number;
  };
}

type TimeGranularity = "daily" | "weekly" | "monthly";

interface TrendDataPoint {
  date: string;
  dateObj: Date;
  totalSent: number;
  totalDelivered: number;
  uniqueViewed: number;
  uniqueClicked: number;
  hardBounces: number;
  softBounces: number;
  unsubscribes: number;
}

interface AggregatedDataPoint {
  label: string;
  sortKey: string;
  totalSent: number;
  totalDelivered: number;
  uniqueViewed: number;
  uniqueClicked: number;
  hardBounces: number;
  softBounces: number;
  unsubscribes: number;
}

// Parse DD/MM/YY or DD/MM/YYYY date strictly
const parseCampaignDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

  const match = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  let year = parseInt(match[3], 10);

  if (year < 100) {
    year = year < 50 ? 2000 + year : 1900 + year;
  }

  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) return null;

  return date;
};

const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
};

const getWeekKey = (date: Date): string => {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - startOfYear.getTime();
  const weekNum = Math.ceil((diff / (1000 * 60 * 60 * 24) + 1) / 7);
  return `W${weekNum.toString().padStart(2, "0")} ${date.getFullYear()}`;
};

const getMonthKey = (date: Date): string => {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
};

// No Blocks in toggle selection per PRD
const METRIC_CONFIG = {
  totalSent: { label: "Sent", color: "hsl(var(--primary))", defaultVisible: true },
  totalDelivered: { label: "Delivered", color: "#06b6d4", defaultVisible: false },
  uniqueViewed: { label: "Unique Opens", color: "hsl(var(--secondary))", defaultVisible: true },
  uniqueClicked: { label: "Unique Clicks", color: "#22c55e", defaultVisible: true },
  hardBounces: { label: "Bounces", color: "#ef4444", defaultVisible: false },
  unsubscribes: { label: "Unsubscribes", color: "#8b5cf6", defaultVisible: false },
};

export const EmailMetricsTrendChart: React.FC<EmailMetricsTrendChartProps> = ({
  campaignData,
  grandTotalAverages,
}) => {
  const [granularity, setGranularity] = useState<TimeGranularity>("daily");
  const [visibleMetrics, setVisibleMetrics] = useState({
    totalSent: true,
    totalDelivered: false,
    uniqueViewed: true,
    uniqueClicked: true,
    hardBounces: false,
    unsubscribes: false,
  });

  // Compute Grand Total averages from campaign data if not provided
  const avgRates = useMemo(() => {
    if (grandTotalAverages) return grandTotalAverages;
    // Calculate from raw campaign data
    const totalSent = campaignData.reduce((s, c) => s + c.totalSentUsers, 0);
    const totalViewed = campaignData.reduce((s, c) => s + c.uniqueViewedWithinConversion, 0);
    const totalClicked = campaignData.reduce((s, c) => s + c.uniqueClickedWithinConversion, 0);
    const totalBounces = campaignData.reduce((s, c) => s + c.hardBounces + c.softBounces, 0);
    const totalUnsubs = campaignData.reduce((s, c) => s + c.totalUnsubscribes, 0);
    return {
      openRate: totalSent > 0 ? (totalViewed / totalSent) * 100 : 0,
      clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
      bounceRate: totalSent > 0 ? (totalBounces / totalSent) * 100 : 0,
      unsubRate: totalSent > 0 ? (totalUnsubs / totalSent) * 100 : 0,
    };
  }, [campaignData, grandTotalAverages]);

  // Parse and aggregate data
  const chartData = useMemo(() => {
    const dataPoints: TrendDataPoint[] = campaignData
      .map((row) => {
        const dateObj = parseCampaignDate(row.startDate);
        if (!dateObj) return null;

        return {
          date: row.startDate,
          dateObj,
          totalSent: row.totalSentUsers,
          totalDelivered: row.totalDeliveredUsers,
          uniqueViewed: row.uniqueViewedWithinConversion,
          uniqueClicked: row.uniqueClickedWithinConversion,
          hardBounces: row.hardBounces,
          softBounces: row.softBounces,
          unsubscribes: row.totalUnsubscribes,
        };
      })
      .filter((p): p is TrendDataPoint => p !== null)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    if (dataPoints.length === 0) return [];

    const aggregated = new Map<string, AggregatedDataPoint>();

    dataPoints.forEach((point) => {
      let key: string;
      let label: string;

      switch (granularity) {
        case "daily":
          key = formatDate(point.dateObj);
          label = key;
          break;
        case "weekly":
          key = getWeekKey(point.dateObj);
          label = key;
          break;
        case "monthly":
          key = getMonthKey(point.dateObj);
          label = key;
          break;
      }

      const existing = aggregated.get(key) || {
        label,
        sortKey: point.dateObj.toISOString(),
        totalSent: 0,
        totalDelivered: 0,
        uniqueViewed: 0,
        uniqueClicked: 0,
        hardBounces: 0,
        softBounces: 0,
        unsubscribes: 0,
      };

      existing.totalSent += point.totalSent;
      existing.totalDelivered += point.totalDelivered;
      existing.uniqueViewed += point.uniqueViewed;
      existing.uniqueClicked += point.uniqueClicked;
      existing.hardBounces += point.hardBounces;
      existing.softBounces += point.softBounces;
      existing.unsubscribes += point.unsubscribes;

      aggregated.set(key, existing);
    });

    return Array.from(aggregated.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [campaignData, granularity]);

  const toggleMetric = (metric: keyof typeof visibleMetrics) => {
    setVisibleMetrics((prev) => ({ ...prev, [metric]: !prev[metric] }));
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>No valid campaign data to display</p>
      </div>
    );
  }

  // Calculate rate for a data point
  const calcRate = (metric: number, denominator: number): number => {
    if (denominator === 0) return 0;
    return (metric / denominator) * 100;
  };

  // Calculate trend vs Grand Total Average
  const calcTrendVsAvg = (
    currentRate: number,
    avgRate: number,
    sent: number
  ): { diff: number; direction: "above" | "below" | "equal"; suppressed: boolean } => {
    if (sent === 0 || avgRate === 0) return { diff: 0, direction: "equal", suppressed: true };
    const diff = currentRate - avgRate;
    return {
      diff,
      direction: diff > 0.01 ? "above" : diff < -0.01 ? "below" : "equal",
      suppressed: false,
    };
  };

  // Custom tooltip with Grand Total Average comparison
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const point = chartData.find((d) => d.label === label);
    if (!point) return null;

    const openRate = calcRate(point.uniqueViewed, point.totalSent);
    const clickRate = calcRate(point.uniqueClicked, point.totalSent);
    const openTrend = calcTrendVsAvg(openRate, avgRates.openRate, point.totalSent);
    const clickTrend = calcTrendVsAvg(clickRate, avgRates.clickRate, point.totalSent);
    const bounceRate = calcRate(point.hardBounces + point.softBounces, point.totalSent);
    const unsubRate = calcRate(point.unsubscribes, point.totalSent);

    const TrendIndicator = ({ trend }: { trend: ReturnType<typeof calcTrendVsAvg> }) => {
      if (trend.suppressed) return null;
      const isAbove = trend.direction === "above";
      const isBelow = trend.direction === "below";
      return (
        <span className={`text-xs font-medium ${isAbove ? "text-green-600" : isBelow ? "text-red-600" : "text-muted-foreground"}`}>
          {isAbove ? "↑" : isBelow ? "↓" : "→"} {trend.diff > 0 ? "+" : ""}{trend.diff.toFixed(1)}% vs avg
        </span>
      );
    };

    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3 text-xs max-w-sm">
        <p className="font-medium mb-2 border-b border-border pb-1">{label}</p>

        {/* Sent */}
        <div className="flex items-center justify-between gap-4 py-1 border-b border-border/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: METRIC_CONFIG.totalSent.color }} />
            <span className="text-muted-foreground">Sent</span>
          </div>
          <span className="font-medium">{point.totalSent.toLocaleString()}</span>
        </div>

        {/* Delivered (only if > 0) */}
        {point.totalDelivered > 0 && (
          <div className="flex items-center justify-between gap-4 py-1 border-b border-border/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: METRIC_CONFIG.totalDelivered.color }} />
              <span className="text-muted-foreground">Delivered</span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-medium">{point.totalDelivered.toLocaleString()}</span>
              <span className="text-muted-foreground text-xs">({calcRate(point.totalDelivered, point.totalSent).toFixed(1)}%)</span>
            </div>
          </div>
        )}

        {/* Unique Opens with trend vs avg */}
        <div className="flex items-center justify-between gap-4 py-1 border-b border-border/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: METRIC_CONFIG.uniqueViewed.color }} />
            <span className="text-muted-foreground">Unique Opens</span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-medium">{point.uniqueViewed.toLocaleString()} ({openRate.toFixed(1)}%)</span>
            <TrendIndicator trend={openTrend} />
          </div>
        </div>

        {/* Unique Clicks with trend vs avg */}
        <div className="flex items-center justify-between gap-4 py-1 border-b border-border/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: METRIC_CONFIG.uniqueClicked.color }} />
            <span className="text-muted-foreground">Unique Clicks</span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-medium">{point.uniqueClicked.toLocaleString()} ({clickRate.toFixed(1)}%)</span>
            <TrendIndicator trend={clickTrend} />
          </div>
        </div>

        {/* Bounce */}
        {(point.hardBounces + point.softBounces) > 0 && (
          <div className="flex items-center justify-between gap-4 py-1 border-b border-border/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: METRIC_CONFIG.hardBounces.color }} />
              <span className="text-muted-foreground">Bounce</span>
            </div>
            <span className="font-medium">
              {(point.hardBounces + point.softBounces).toLocaleString()} ({bounceRate.toFixed(2)}%)
            </span>
          </div>
        )}

        {/* Unsub */}
        {point.unsubscribes > 0 && (
          <div className="flex items-center justify-between gap-4 py-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: METRIC_CONFIG.unsubscribes.color }} />
              <span className="text-muted-foreground">Unsub</span>
            </div>
            <span className="font-medium">
              {point.unsubscribes.toLocaleString()} ({unsubRate.toFixed(2)}%)
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Metric Toggles - No Blocks */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(METRIC_CONFIG).map(([key, config]) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={`email-${key}`}
                checked={visibleMetrics[key as keyof typeof visibleMetrics]}
                onCheckedChange={() => toggleMetric(key as keyof typeof visibleMetrics)}
              />
              <Label htmlFor={`email-${key}`} className="text-sm cursor-pointer flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: config.color }} />
                {config.label}
              </Label>
            </div>
          ))}
        </div>

        {/* Granularity Toggle */}
        <ToggleGroup
          type="single"
          value={granularity}
          onValueChange={(value) => value && setGranularity(value as TimeGranularity)}
          className="border border-border rounded-lg"
        >
          <ToggleGroupItem value="daily" className="text-xs px-3">Daily</ToggleGroupItem>
          <ToggleGroupItem value="weekly" className="text-xs px-3">Weekly</ToggleGroupItem>
          <ToggleGroupItem value="monthly" className="text-xs px-3">Monthly</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Grand Total Average Reference */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground bg-muted/30 rounded-lg px-4 py-2">
        <span>Grand Total Avg:</span>
        <span>Open Rate: <strong className="text-foreground">{avgRates.openRate.toFixed(1)}%</strong></span>
        <span>Click Rate: <strong className="text-foreground">{avgRates.clickRate.toFixed(1)}%</strong></span>
        <span>Bounce Rate: <strong className="text-foreground">{avgRates.bounceRate.toFixed(2)}%</strong></span>
        <span>Unsub Rate: <strong className="text-foreground">{avgRates.unsubRate.toFixed(2)}%</strong></span>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              angle={granularity === "daily" && chartData.length > 15 ? -45 : 0}
              textAnchor={granularity === "daily" && chartData.length > 15 ? "end" : "middle"}
              height={granularity === "daily" && chartData.length > 15 ? 60 : 30}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              tickFormatter={(value) =>
                value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value
              }
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />

            {visibleMetrics.totalSent && (
              <Line type="monotone" dataKey="totalSent" name="Sent" stroke={METRIC_CONFIG.totalSent.color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            )}
            {visibleMetrics.totalDelivered && (
              <Line type="monotone" dataKey="totalDelivered" name="Delivered" stroke={METRIC_CONFIG.totalDelivered.color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            )}
            {visibleMetrics.uniqueViewed && (
              <Line type="monotone" dataKey="uniqueViewed" name="Unique Opens" stroke={METRIC_CONFIG.uniqueViewed.color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            )}
            {visibleMetrics.uniqueClicked && (
              <Line type="monotone" dataKey="uniqueClicked" name="Unique Clicks" stroke={METRIC_CONFIG.uniqueClicked.color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            )}
            {visibleMetrics.hardBounces && (
              <Line type="monotone" dataKey="hardBounces" name="Bounces" stroke={METRIC_CONFIG.hardBounces.color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            )}
            {visibleMetrics.unsubscribes && (
              <Line type="monotone" dataKey="unsubscribes" name="Unsubscribes" stroke={METRIC_CONFIG.unsubscribes.color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend/Info */}
      <div className="text-xs text-muted-foreground text-center">
        Showing {chartData.length} data points ({granularity} aggregation) • Engagement metrics show: Absolute (Rate %) Trend vs Grand Total Average
      </div>
    </motion.div>
  );
};
