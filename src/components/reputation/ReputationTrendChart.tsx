import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { PostmasterRow } from "@/lib/csvAnalyzer";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle, TrendingUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReputationTrendChartProps {
  postmasterData: PostmasterRow[];
  onBreachDetected?: (breaches: ThresholdBreach[]) => void;
}

export interface ThresholdBreach {
  date: string;
  metric: string;
  value: number | string;
  threshold: string;
  severity: "warning" | "critical";
}

interface ChartDataPoint {
  date: string;
  dateObj: Date;
  domain: string;
  ipReputation: number;
  domainReputation: number;
  spamRatio: number;
  errorRatio: number;
  ipReputationRaw: string;
  domainReputationRaw: string;
  breaches: ThresholdBreach[];
}

// Convert reputation strings to numeric values for charting (case-insensitive, no silent fallback)
const reputationToNumber = (rep: string): number | null => {
  if (!rep) return null;
  const map: Record<string, number> = {
    "high": 3,
    "medium": 2,
    "low": 1,
    "bad": 0,
  };
  const result = map[rep.trim().toLowerCase()];
  return result !== undefined ? result : null;
};

const numberToReputation = (num: number): string => {
  const map: Record<number, string> = {
    3: "High",
    2: "Medium",
    1: "Low",
    0: "Bad",
  };
  return map[num] || "Unknown";
};

// Threshold detection (deterministic per PRD)
const THRESHOLDS = {
  spamRatio: 0.001, // > 0.1%
  errorRatio: 0, // > 0%
  ipReputation: 2, // Below "Medium" (i.e., < 2)
  domainReputation: 2, // Below "Medium" (i.e., < 2)
};

// Parse reputation date strictly as "MMM D, YYYY" (e.g., "Jan 9, 2026")
const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

const parseReputationDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  const match = trimmed.match(/^([A-Z][a-z]{2})\s+(\d{1,2}),\s*(\d{4})$/);
  if (!match) return null;
  const monthIndex = MONTH_MAP[match[1]];
  if (monthIndex === undefined) return null;
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  const date = new Date(year, monthIndex, day);
  if (isNaN(date.getTime())) return null;
  return date;
};

const detectBreaches = (point: Omit<ChartDataPoint, "breaches">): ThresholdBreach[] => {
  const breaches: ThresholdBreach[] = [];
  
  if (point.spamRatio > THRESHOLDS.spamRatio) {
    breaches.push({
      date: point.date,
      metric: "Spam Ratio",
      value: (point.spamRatio * 100).toFixed(2) + "%",
      threshold: "> 0.1%",
      severity: point.spamRatio > 0.003 ? "critical" : "warning",
    });
  }
  
  if (point.errorRatio > THRESHOLDS.errorRatio) {
    breaches.push({
      date: point.date,
      metric: "Error Ratio",
      value: (point.errorRatio * 100).toFixed(2) + "%",
      threshold: "> 0%",
      severity: point.errorRatio > 0.01 ? "critical" : "warning",
    });
  }
  
  if (point.ipReputation !== null && point.ipReputation < THRESHOLDS.ipReputation) {
    breaches.push({
      date: point.date,
      metric: "IP Reputation",
      value: point.ipReputationRaw,
      threshold: "Below Medium",
      severity: point.ipReputation === 0 ? "critical" : "warning",
    });
  }
  
  if (point.domainReputation !== null && point.domainReputation < THRESHOLDS.domainReputation) {
    breaches.push({
      date: point.date,
      metric: "Domain Reputation",
      value: point.domainReputationRaw,
      threshold: "Below Medium",
      severity: point.domainReputation === 0 ? "critical" : "warning",
    });
  }
  
  return breaches;
};

export const ReputationTrendChart: React.FC<ReputationTrendChartProps> = ({
  postmasterData,
  onBreachDetected,
}) => {
  const [visibleMetrics, setVisibleMetrics] = useState({
    ipReputation: true,
    domainReputation: true,
    spamRatio: true,
    errorRatio: true,
  });
  const [selectedDomain, setSelectedDomain] = useState<string>("all");

  // Extract unique domains
  const uniqueDomains = React.useMemo(() => {
    const domains = new Set<string>();
    postmasterData.forEach((row) => {
      const d = row.domain?.trim();
      if (d) domains.add(d);
    });
    return Array.from(domains).sort();
  }, [postmasterData]);

  // Process and sort data chronologically, filtered by domain
  const chartData: ChartDataPoint[] = React.useMemo(() => {
    const filtered = selectedDomain === "all"
      ? postmasterData
      : postmasterData.filter((row) => row.domain?.trim() === selectedDomain);

    const processed = filtered
      .map((row) => {
        const dateObj = parseReputationDate(row.date);
        if (!dateObj) return null;
        
        const ipRep = reputationToNumber(row.ipReputation);
        const domainRep = reputationToNumber(row.domainReputation);
        
        if (ipRep === null || domainRep === null) return null;
        
        const point = {
          date: row.date,
          dateObj,
          domain: row.domain?.trim() || "",
          ipReputation: ipRep,
          domainReputation: domainRep,
          spamRatio: row.spamRatio || 0,
          errorRatio: row.errorRatio || 0,
          ipReputationRaw: row.ipReputation,
          domainReputationRaw: row.domainReputation,
          breaches: [] as ThresholdBreach[],
        };
        
        point.breaches = detectBreaches(point);
        return point;
      })
      .filter((p): p is ChartDataPoint => p !== null)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    
    const allBreaches = processed.flatMap((p) => p.breaches);
    if (allBreaches.length > 0 && onBreachDetected) {
      onBreachDetected(allBreaches);
    }
    
    return processed;
  }, [postmasterData, onBreachDetected, selectedDomain]);

  const toggleMetric = (metric: keyof typeof visibleMetrics) => {
    setVisibleMetrics((prev) => ({ ...prev, [metric]: !prev[metric] }));
  };

  const hasBreaches = chartData.some((d) => d.breaches.length > 0);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>No valid Postmaster data to display</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const point = chartData.find((d) => d.date === label);
    
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3 text-xs">
        <p className="font-medium mb-2">{label}</p>
        {point?.domain && (
          <p className="text-muted-foreground mb-1 text-[10px]">{point.domain}</p>
        )}
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-2 py-0.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">
              {entry.dataKey === "ipReputation" || entry.dataKey === "domainReputation"
                ? numberToReputation(entry.value)
                : `${(entry.value * 100).toFixed(2)}%`}
            </span>
          </div>
        ))}
        {point?.breaches && point.breaches.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-red-500 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Threshold Breaches:
            </p>
            {point.breaches.map((b, i) => (
              <p key={i} className="text-red-500 text-xs pl-4">
                • {b.metric} ({b.value}) {b.threshold}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Domain Filter + Metric Toggles */}
      <div className="flex flex-wrap items-center gap-4">
        {uniqueDomains.length > 1 && (
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Domain:</Label>
            <Select value={selectedDomain} onValueChange={setSelectedDomain}>
              <SelectTrigger className="w-[200px] h-8 text-sm">
                <SelectValue placeholder="All Domains" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domains</SelectItem>
                {uniqueDomains.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {[
          { key: "ipReputation", label: "IP Reputation", color: "hsl(var(--primary))" },
          { key: "domainReputation", label: "Domain Reputation", color: "hsl(var(--secondary))" },
          { key: "spamRatio", label: "Spam Ratio", color: "#f59e0b" },
          { key: "errorRatio", label: "Error Ratio", color: "#ef4444" },
        ].map((metric) => (
          <div key={metric.key} className="flex items-center gap-2">
            <Checkbox
              id={metric.key}
              checked={visibleMetrics[metric.key as keyof typeof visibleMetrics]}
              onCheckedChange={() => toggleMetric(metric.key as keyof typeof visibleMetrics)}
            />
            <Label
              htmlFor={metric.key}
              className="text-sm cursor-pointer flex items-center gap-1"
            >
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: metric.color }}
              />
              {metric.label}
            </Label>
          </div>
        ))}
      </div>

      {/* Breach Warning Banner */}
      {hasBreaches && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>
            <strong>Threshold breaches detected.</strong> Hover over data points for details.
          </span>
        </div>
      )}

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
            />
            
            <YAxis
              yAxisId="reputation"
              domain={[0, 4]}
              ticks={[0, 1, 2, 3]}
              tickFormatter={(v) => numberToReputation(v)}
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              width={60}
            />
            
            <YAxis
              yAxisId="ratio"
              orientation="right"
              domain={[0, "auto"]}
              tickFormatter={(v) => `${(v * 100).toFixed(1)}%`}
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              width={60}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <ReferenceLine
              yAxisId="reputation"
              y={2}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="5 5"
              label={{ value: "Medium", position: "left", fontSize: 10 }}
            />
            <ReferenceLine
              yAxisId="ratio"
              y={0.001}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              label={{ value: "0.1%", position: "right", fontSize: 10 }}
            />
            
            {visibleMetrics.ipReputation && (
              <Line
                yAxisId="reputation"
                type="monotone"
                dataKey="ipReputation"
                name="IP Reputation"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={(props: any) => {
                  const point = chartData.find((d) => d.date === props.payload?.date);
                  const hasBreach = point?.breaches.some((b) => b.metric === "IP Reputation");
                  return (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={hasBreach ? 6 : 4}
                      fill={hasBreach ? "#ef4444" : "hsl(var(--primary))"}
                      stroke={hasBreach ? "#ef4444" : "hsl(var(--primary))"}
                    />
                  );
                }}
              />
            )}
            
            {visibleMetrics.domainReputation && (
              <Line
                yAxisId="reputation"
                type="monotone"
                dataKey="domainReputation"
                name="Domain Reputation"
                stroke="hsl(var(--secondary))"
                strokeWidth={2}
                dot={(props: any) => {
                  const point = chartData.find((d) => d.date === props.payload?.date);
                  const hasBreach = point?.breaches.some((b) => b.metric === "Domain Reputation");
                  return (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={hasBreach ? 6 : 4}
                      fill={hasBreach ? "#ef4444" : "hsl(var(--secondary))"}
                      stroke={hasBreach ? "#ef4444" : "hsl(var(--secondary))"}
                    />
                  );
                }}
              />
            )}
            
            {visibleMetrics.spamRatio && (
              <Line
                yAxisId="ratio"
                type="monotone"
                dataKey="spamRatio"
                name="Spam Ratio"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={(props: any) => {
                  const point = chartData.find((d) => d.date === props.payload?.date);
                  const hasBreach = point?.breaches.some((b) => b.metric === "Spam Ratio");
                  return (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={hasBreach ? 6 : 4}
                      fill={hasBreach ? "#ef4444" : "#f59e0b"}
                      stroke={hasBreach ? "#ef4444" : "#f59e0b"}
                    />
                  );
                }}
              />
            )}
            
            {visibleMetrics.errorRatio && (
              <Line
                yAxisId="ratio"
                type="monotone"
                dataKey="errorRatio"
                name="Error Ratio"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 4, fill: "#ef4444" }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend */}
      <div className="flex justify-center gap-6 text-xs text-muted-foreground">
        <span>Left axis: Reputation (Bad → High)</span>
        <span>Right axis: Ratio (%)</span>
      </div>
    </motion.div>
  );
};
