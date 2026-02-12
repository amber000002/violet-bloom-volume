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
  blocks: number;
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
  blocks: number;
  prevTotalSent?: number;
  prevTotalDelivered?: number;
  prevUniqueViewed?: number;
  prevUniqueClicked?: number;
  prevHardBounces?: number;
  prevSoftBounces?: number;
  prevUnsubscribes?: number;
  prevBlocks?: number;
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

const METRIC_CONFIG = {
  totalSent: { label: "Total Sent (users)", color: "hsl(var(--primary))", defaultVisible: true },
  totalDelivered: { label: "Delivered (users)", color: "#06b6d4", defaultVisible: false },
  uniqueViewed: { label: "Unique Opens", color: "hsl(var(--secondary))", defaultVisible: true },
  uniqueClicked: { label: "Unique Clicks", color: "#22c55e", defaultVisible: true },
  hardBounces: { label: "Hard Bounces", color: "#ef4444", defaultVisible: false },
  softBounces: { label: "Soft Bounces", color: "#f97316", defaultVisible: false },
  unsubscribes: { label: "Unsubscribes", color: "#8b5cf6", defaultVisible: false },
  blocks: { label: "Blocks", color: "#a855f7", defaultVisible: false },
};

export const EmailMetricsTrendChart: React.FC<EmailMetricsTrendChartProps> = ({
  campaignData,
}) => {
  const [granularity, setGranularity] = useState<TimeGranularity>("daily");
  const [visibleMetrics, setVisibleMetrics] = useState({
    totalSent: true,
    totalDelivered: false,
    uniqueViewed: true,
    uniqueClicked: true,
    hardBounces: false,
    softBounces: false,
    unsubscribes: false,
    blocks: false,
  });

  // Parse and aggregate data
  const chartData = useMemo(() => {
    // First, parse all valid dates
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
          blocks: 0, // Will be added if available in future CSV versions
        };
      })
      .filter((p): p is TrendDataPoint => p !== null)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    if (dataPoints.length === 0) return [];

    // Aggregate based on granularity
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
        blocks: 0,
      };

      existing.totalSent += point.totalSent;
      existing.totalDelivered += point.totalDelivered;
      existing.uniqueViewed += point.uniqueViewed;
      existing.uniqueClicked += point.uniqueClicked;
      existing.hardBounces += point.hardBounces;
      existing.softBounces += point.softBounces;
      existing.unsubscribes += point.unsubscribes;
      existing.blocks += point.blocks;

      aggregated.set(key, existing);
    });

    // Convert to array and sort
    const result = Array.from(aggregated.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    // Add previous values for change calculation
    for (let i = 1; i < result.length; i++) {
      result[i].prevTotalSent = result[i - 1].totalSent;
      result[i].prevTotalDelivered = result[i - 1].totalDelivered;
      result[i].prevUniqueViewed = result[i - 1].uniqueViewed;
      result[i].prevUniqueClicked = result[i - 1].uniqueClicked;
      result[i].prevHardBounces = result[i - 1].hardBounces;
      result[i].prevSoftBounces = result[i - 1].softBounces;
      result[i].prevUnsubscribes = result[i - 1].unsubscribes;
      result[i].prevBlocks = result[i - 1].blocks;
    }

    return result;
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

  // Calculate percent change
  const calcChange = (current: number, prev?: number): { percent: number; trend: "up" | "down" | "stable" } => {
    if (prev === undefined || prev === 0) return { percent: 0, trend: "stable" };
    const percent = ((current - prev) / prev) * 100;
    return {
      percent,
      trend: percent > 1 ? "up" : percent < -1 ? "down" : "stable",
    };
  };

  // Calculate engagement rate
  const calcRate = (metric: number, denominator: number): number => {
    if (denominator === 0) return 0;
    return (metric / denominator) * 100;
  };

  // Check if value is a spike (> 25% change from previous)
  const isSpike = (current: number, prev?: number): boolean => {
    if (prev === undefined || prev === 0) return false;
    const percentChange = Math.abs(((current - prev) / prev) * 100);
    return percentChange > 25;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const point = chartData.find((d) => d.label === label);
    if (!point) return null;

    // Format metric value with rate and trend for engagement metrics
    const formatMetricValue = (
      metricKey: string,
      value: number,
      denominator: number,
      prevValue?: number
    ): string => {
      const rate = calcRate(value, denominator);
      const change = calcChange(value, prevValue);

      // Engagement metrics: show format "Absolute Number (Rate %) ± Trend %"
      if ((metricKey === "uniqueViewed" || metricKey === "uniqueClicked") && denominator > 0) {
        const trendStr =
          prevValue === undefined || prevValue === 0
            ? "N/A"
            : `${change.trend === "up" ? "↑" : change.trend === "down" ? "↓" : "→"} ${change.percent > 0 ? "+" : ""}${change.percent.toFixed(1)}%`;
        return `${value.toLocaleString()} (${rate.toFixed(1)}%) ${trendStr}`;
      }

      // Other metrics: show value with trend only
      if (prevValue !== undefined && change.percent !== 0) {
        const trendStr = `${change.trend === "up" ? "↑" : change.trend === "down" ? "↓" : "→"} ${change.percent > 0 ? "+" : ""}${change.percent.toFixed(1)}%`;
        return `${value.toLocaleString()} ${trendStr}`;
      }

      return value.toLocaleString();
    };

    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3 text-xs max-w-sm">
        <p className="font-medium mb-2 border-b border-border pb-1">{label}</p>

        {/* Sent (always show) */}
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

        {/* Unique Opens */}
        <div className="flex items-center justify-between gap-4 py-1 border-b border-border/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: METRIC_CONFIG.uniqueViewed.color }} />
            <span className="text-muted-foreground">Unique Opens</span>
          </div>
          <span className="font-mono text-xs font-medium">
            {formatMetricValue("uniqueViewed", point.uniqueViewed, point.totalSent, point.prevUniqueViewed)}
          </span>
        </div>

        {/* Unique Clicks */}
        <div className="flex items-center justify-between gap-4 py-1 border-b border-border/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: METRIC_CONFIG.uniqueClicked.color }} />
            <span className="text-muted-foreground">Unique Clicks</span>
          </div>
          <span className="font-mono text-xs font-medium">
            {formatMetricValue("uniqueClicked", point.uniqueClicked, point.totalSent, point.prevUniqueClicked)}
          </span>
        </div>

        {/* Hard Bounces */}
        {point.hardBounces > 0 && (
          <div className="flex items-center justify-between gap-4 py-1 border-b border-border/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: METRIC_CONFIG.hardBounces.color }} />
              <span className="text-muted-foreground">Hard Bounces</span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-medium">{point.hardBounces.toLocaleString()}</span>
              <span className="text-muted-foreground text-xs">({calcRate(point.hardBounces, point.totalSent).toFixed(1)}%)</span>
            </div>
          </div>
        )}

        {/* Unsubscribes */}
        {point.unsubscribes > 0 && (
          <div className="flex items-center justify-between gap-4 py-1 border-b border-border/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: METRIC_CONFIG.unsubscribes.color }} />
              <span className="text-muted-foreground">Unsub</span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-medium">{point.unsubscribes.toLocaleString()}</span>
              <span className="text-muted-foreground text-xs">({calcRate(point.unsubscribes, point.totalSent).toFixed(1)}%)</span>
            </div>
          </div>
        )}

        {/* Soft Bounces */}
        {point.softBounces > 0 && (
          <div className="flex items-center justify-between gap-4 py-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: METRIC_CONFIG.softBounces.color }} />
              <span className="text-muted-foreground">Soft Bounces</span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-medium">{point.softBounces.toLocaleString()}</span>
              <span className="text-muted-foreground text-xs">({calcRate(point.softBounces, point.totalSent).toFixed(1)}%)</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Metric Toggles */}
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
          <ToggleGroupItem value="daily" className="text-xs px-3">
            Daily
          </ToggleGroupItem>
          <ToggleGroupItem value="weekly" className="text-xs px-3">
            Weekly
          </ToggleGroupItem>
          <ToggleGroupItem value="monthly" className="text-xs px-3">
            Monthly
          </ToggleGroupItem>
        </ToggleGroup>
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

            {/* Metric Lines */}
            {visibleMetrics.totalSent && (
              <Line
                type="monotone"
                dataKey="totalSent"
                name={METRIC_CONFIG.totalSent.label}
                stroke={METRIC_CONFIG.totalSent.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            )}
            {visibleMetrics.totalDelivered && (
              <Line
                type="monotone"
                dataKey="totalDelivered"
                name={METRIC_CONFIG.totalDelivered.label}
                stroke={METRIC_CONFIG.totalDelivered.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            )}
            {visibleMetrics.uniqueViewed && (
              <Line
                type="monotone"
                dataKey="uniqueViewed"
                name={METRIC_CONFIG.uniqueViewed.label}
                stroke={METRIC_CONFIG.uniqueViewed.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            )}
            {visibleMetrics.uniqueClicked && (
              <Line
                type="monotone"
                dataKey="uniqueClicked"
                name={METRIC_CONFIG.uniqueClicked.label}
                stroke={METRIC_CONFIG.uniqueClicked.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            )}
            {visibleMetrics.hardBounces && (
              <Line
                type="monotone"
                dataKey="hardBounces"
                name={METRIC_CONFIG.hardBounces.label}
                stroke={METRIC_CONFIG.hardBounces.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            )}
            {visibleMetrics.softBounces && (
              <Line
                type="monotone"
                dataKey="softBounces"
                name={METRIC_CONFIG.softBounces.label}
                stroke={METRIC_CONFIG.softBounces.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            )}
            {visibleMetrics.unsubscribes && (
              <Line
                type="monotone"
                dataKey="unsubscribes"
                name={METRIC_CONFIG.unsubscribes.label}
                stroke={METRIC_CONFIG.unsubscribes.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            )}
            {visibleMetrics.blocks && (
              <Line
                type="monotone"
                dataKey="blocks"
                name={METRIC_CONFIG.blocks.label}
                stroke={METRIC_CONFIG.blocks.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend/Info */}
      <div className="text-xs text-muted-foreground text-center">
        Showing {chartData.length} data points ({granularity} aggregation) • Engagement metrics show: Absolute (Rate %) vs Previous
      </div>
    </motion.div>
  );
};
