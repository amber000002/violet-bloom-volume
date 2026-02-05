 import React, { useMemo } from "react";
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
 } from "recharts";
 import { CampaignRow, PostmasterRow } from "@/lib/csvAnalyzer";
 import { AlertTriangle, TrendingDown, TrendingUp, Minus } from "lucide-react";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 
 interface ReputationSmallMultiplesProps {
   postmasterData: PostmasterRow[] | null;
   campaignData: CampaignRow[];
 }
 
 interface ChartDataPoint {
   date: string;
   dateObj: Date;
   value: number;
   valueRaw?: string;
   hasBreach: boolean;
 }
 
 interface Observation {
   date: string;
   message: string;
   severity: "info" | "warning" | "critical";
 }
 
 // Convert reputation strings to numeric values for charting
 const reputationToNumber = (rep: string): number => {
   const map: Record<string, number> = {
     "High": 4,
     "Medium": 3,
     "Low": 2,
     "Bad": 1,
   };
   return map[rep] || 0;
 };
 
 const numberToReputation = (num: number): string => {
   const map: Record<number, string> = {
     4: "High",
     3: "Medium",
     2: "Low",
     1: "Bad",
   };
   return map[num] || "Unknown";
 };
 
 // Parse DD/MM/YY date strictly
 const parsePostmasterDate = (dateStr: string): Date | null => {
   if (!dateStr) return null;
   const trimmed = dateStr.trim();
   
   const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
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
 
 // Threshold config from PRD
 const THRESHOLDS = {
   spamRatio: 0.001, // 0.1%
   errorRatio: 0,
   ipReputation: 3, // Below Medium
   domainReputation: 3, // Below Medium
 };
 
 // Color coding thresholds for engagement metrics
 const ENGAGEMENT_THRESHOLDS = {
   openRate: { good: 25, warning: 10 },
   clickRate: { good: 3, warning: 1.5 },
   bounceRate: { good: 1, warning: 3 },
   unsubRate: { good: 0.3, warning: 0.7 },
 };
 
 // Get campaigns on a specific date
 const getCampaignsOnDate = (campaigns: CampaignRow[], dateStr: string): CampaignRow[] => {
   return campaigns.filter(c => c.startDate === dateStr);
 };
 
 // Calculate baseline metrics (average over recent period)
 const calculateBaseline = (campaigns: CampaignRow[]) => {
   if (campaigns.length === 0) return { avgSent: 0, avgBounceRate: 0, avgOpenRate: 0, avgUnsubRate: 0 };
   
   const totalSent = campaigns.reduce((sum, c) => sum + c.totalSentUsers, 0);
   const avgBounceRate = campaigns.reduce((sum, c) => sum + c.hardBounceRate + c.softBounceRate, 0) / campaigns.length;
   const avgOpenRate = campaigns.reduce((sum, c) => sum + c.openRate, 0) / campaigns.length;
   const avgUnsubRate = campaigns.reduce((sum, c) => sum + c.unsubscribeRate, 0) / campaigns.length;
   
   return {
     avgSent: totalSent / campaigns.length,
     avgBounceRate,
     avgOpenRate,
     avgUnsubRate,
   };
 };
 
 // Generate observation for reputation dip
 const generateReputationObservation = (
   metricName: string,
   date: string,
   prevValue: number,
   currentValue: number,
   campaignsOnDate: CampaignRow[],
   baseline: ReturnType<typeof calculateBaseline>
 ): Observation | null => {
   if (prevValue <= currentValue) return null;
   
   const prevRep = numberToReputation(prevValue);
   const currRep = numberToReputation(currentValue);
   
   // Find correlated campaign signals
   const signals: string[] = [];
   
   if (campaignsOnDate.length > 0) {
     const dayBounceRate = campaignsOnDate.reduce((sum, c) => sum + c.hardBounceRate + c.softBounceRate, 0) / campaignsOnDate.length;
     const dayOpenRate = campaignsOnDate.reduce((sum, c) => sum + c.openRate, 0) / campaignsOnDate.length;
     const dayVolume = campaignsOnDate.reduce((sum, c) => sum + c.totalSentUsers, 0);
     
     if (baseline.avgBounceRate > 0 && dayBounceRate > baseline.avgBounceRate * 1.2) {
       const increase = ((dayBounceRate - baseline.avgBounceRate) / baseline.avgBounceRate * 100).toFixed(0);
       signals.push(`${increase}% increase in bounce rate`);
     }
     if (baseline.avgOpenRate > 0 && dayOpenRate < baseline.avgOpenRate * 0.8) {
       signals.push("lower engagement compared to the previous week");
     }
     if (baseline.avgSent > 0 && dayVolume > baseline.avgSent * 1.5) {
       signals.push("volume spike vs recent baseline");
     }
   }
   
   let message = `On ${date}, ${metricName} declined from ${prevRep} to ${currRep}.`;
   if (signals.length > 0) {
     message += ` Campaigns sent on this date showed ${signals.join(" and ")}.`;
   } else if (campaignsOnDate.length === 0) {
     message += " No campaign-level correlation detected.";
   }
   
   return {
     date,
     message,
     severity: currentValue === 1 ? "critical" : "warning",
   };
 };
 
 // Generate observation for ratio spike
 const generateRatioObservation = (
   metricName: string,
   date: string,
   value: number,
   threshold: number,
   campaignsOnDate: CampaignRow[],
   baseline: ReturnType<typeof calculateBaseline>
 ): Observation | null => {
   if (value <= threshold) return null;
   
   const valuePercent = (value * 100).toFixed(2);
   const signals: string[] = [];
   
   if (campaignsOnDate.length > 0) {
     const dayOpenRate = campaignsOnDate.reduce((sum, c) => sum + c.openRate, 0) / campaignsOnDate.length;
     const dayUnsubRate = campaignsOnDate.reduce((sum, c) => sum + c.unsubscribeRate, 0) / campaignsOnDate.length;
     const dayBounceRate = campaignsOnDate.reduce((sum, c) => sum + c.hardBounceRate, 0) / campaignsOnDate.length;
     const dayVolume = campaignsOnDate.reduce((sum, c) => sum + c.totalSentUsers, 0);
     
     if (metricName === "Spam Ratio") {
       if (dayOpenRate < ENGAGEMENT_THRESHOLDS.openRate.warning) {
         signals.push("lower open rates");
       }
       if (dayUnsubRate > ENGAGEMENT_THRESHOLDS.unsubRate.warning) {
         signals.push("higher unsubscribe activity");
       }
     } else if (metricName === "Delivery Error Ratio") {
       if (dayBounceRate > ENGAGEMENT_THRESHOLDS.bounceRate.warning) {
         signals.push("increased hard bounces");
       }
       if (baseline.avgSent > 0 && dayVolume > baseline.avgSent * 1.5) {
         signals.push("higher send volume");
       }
     }
   }
   
   let message = `On ${date}, ${metricName.toLowerCase()} increased to ${valuePercent}%.`;
   if (signals.length > 0) {
     message += ` Campaigns sent on this date had ${signals.join(" and ")}, indicating reduced recipient engagement.`;
   } else if (campaignsOnDate.length === 0) {
     message += " No campaign-level correlation detected.";
   }
   
   return {
     date,
     message,
     severity: value > threshold * 3 ? "critical" : "warning",
   };
 };
 
 // Mini chart component
 const MiniChart: React.FC<{
   title: string;
   data: ChartDataPoint[];
   isReputation: boolean;
   threshold?: number;
   observations: Observation[];
   color: string;
 }> = ({ title, data, isReputation, threshold, observations, color }) => {
   if (data.length === 0) {
     return (
       <Card className="h-full">
         <CardHeader className="pb-2">
           <CardTitle className="text-sm font-medium flex items-center gap-2">
             {title}
           </CardTitle>
         </CardHeader>
         <CardContent className="flex items-center justify-center h-32 text-muted-foreground text-sm">
           No data available
         </CardContent>
       </Card>
     );
   }
 
   const hasBreaches = observations.length > 0;
   const latestValue = data[data.length - 1]?.value || 0;
   const firstValue = data[0]?.value || 0;
   const trend = latestValue > firstValue ? "up" : latestValue < firstValue ? "down" : "stable";
 
   return (
     <Card className={`h-full ${hasBreaches ? "border-red-500/30" : ""}`}>
       <CardHeader className="pb-2">
         <CardTitle className="text-sm font-medium flex items-center justify-between">
           <span className="flex items-center gap-2">
             {hasBreaches && <AlertTriangle className="w-4 h-4 text-red-500" />}
             {title}
           </span>
           <span className={`flex items-center text-xs ${
             trend === "down" && isReputation ? "text-red-500" :
             trend === "up" && !isReputation ? "text-red-500" :
             trend === "up" && isReputation ? "text-green-500" :
             trend === "down" && !isReputation ? "text-green-500" :
             "text-muted-foreground"
           }`}>
             {trend === "up" && <TrendingUp className="w-3 h-3 mr-1" />}
             {trend === "down" && <TrendingDown className="w-3 h-3 mr-1" />}
             {trend === "stable" && <Minus className="w-3 h-3 mr-1" />}
             {isReputation ? numberToReputation(latestValue) : `${(latestValue * 100).toFixed(2)}%`}
           </span>
         </CardTitle>
       </CardHeader>
       <CardContent className="space-y-2">
         <div className="h-32">
           <ResponsiveContainer width="100%" height="100%">
             <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
               <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
               <XAxis 
                 dataKey="date" 
                 tick={{ fontSize: 9 }} 
                 className="fill-muted-foreground"
                 interval="preserveStartEnd"
               />
               <YAxis
                 domain={isReputation ? [0, 5] : [0, "auto"]}
                 ticks={isReputation ? [1, 2, 3, 4] : undefined}
                 tickFormatter={(v) => isReputation ? numberToReputation(v).charAt(0) : `${(v * 100).toFixed(1)}%`}
                 tick={{ fontSize: 9 }}
                 className="fill-muted-foreground"
                 width={25}
               />
               <Tooltip
                 content={({ active, payload }) => {
                   if (!active || !payload?.length) return null;
                   const point = payload[0].payload as ChartDataPoint;
                   return (
                     <div className="bg-background border border-border rounded p-2 text-xs shadow-lg">
                       <p className="font-medium">{point.date}</p>
                       <p className="text-muted-foreground">
                         {isReputation 
                           ? `Reputation: ${point.valueRaw}`
                           : `Value: ${(point.value * 100).toFixed(2)}%`}
                       </p>
                       {point.hasBreach && (
                         <p className="text-red-500 mt-1">⚠ Threshold breach</p>
                       )}
                     </div>
                   );
                 }}
               />
               {/* Threshold reference line */}
               {threshold !== undefined && (
                 <ReferenceLine
                   y={threshold}
                   stroke="hsl(var(--destructive))"
                   strokeDasharray="5 5"
                   strokeWidth={1}
                 />
               )}
               <Line
                 type={isReputation ? "stepAfter" : "monotone"}
                 dataKey="value"
                 stroke={color}
                 strokeWidth={2}
                 dot={(props: any) => {
                   const point = props.payload as ChartDataPoint;
                   return (
                     <circle
                       cx={props.cx}
                       cy={props.cy}
                       r={point.hasBreach ? 5 : 3}
                       fill={point.hasBreach ? "#ef4444" : color}
                       stroke={point.hasBreach ? "#ef4444" : color}
                     />
                   );
                 }}
               />
             </LineChart>
           </ResponsiveContainer>
         </div>
         
         {/* Observations */}
         {observations.length > 0 && (
           <div className="space-y-1.5 max-h-24 overflow-y-auto">
             {observations.slice(0, 3).map((obs, i) => (
               <div 
                 key={i} 
                 className={`text-xs p-2 rounded ${
                   obs.severity === "critical" 
                     ? "bg-red-500/10 text-red-600 border border-red-500/20" 
                     : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                 }`}
               >
                 {obs.message}
               </div>
             ))}
             {observations.length > 3 && (
               <p className="text-xs text-muted-foreground text-center">
                 +{observations.length - 3} more observations
               </p>
             )}
           </div>
         )}
       </CardContent>
     </Card>
   );
 };
 
 export const ReputationSmallMultiples: React.FC<ReputationSmallMultiplesProps> = ({
   postmasterData,
   campaignData,
 }) => {
   // Process data for all 4 charts
   const { ipRepChart, domainRepChart, spamChart, errorChart } = useMemo(() => {
     if (!postmasterData || postmasterData.length === 0) {
       return {
         ipRepChart: { data: [], observations: [] },
         domainRepChart: { data: [], observations: [] },
         spamChart: { data: [], observations: [] },
         errorChart: { data: [], observations: [] },
       };
     }
 
     // Sort postmaster data chronologically
     const sorted = [...postmasterData]
       .map((row) => {
         const dateObj = parsePostmasterDate(row.date);
         return dateObj ? { ...row, dateObj } : null;
       })
       .filter((r): r is PostmasterRow & { dateObj: Date } => r !== null)
       .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
 
     if (sorted.length === 0) {
       return {
         ipRepChart: { data: [], observations: [] },
         domainRepChart: { data: [], observations: [] },
         spamChart: { data: [], observations: [] },
         errorChart: { data: [], observations: [] },
       };
     }
 
     // Calculate baseline from campaign data
     const baseline = calculateBaseline(campaignData);
 
     // Process IP Reputation
     const ipRepData: ChartDataPoint[] = [];
     const ipRepObs: Observation[] = [];
     
     // Process Domain Reputation
     const domainRepData: ChartDataPoint[] = [];
     const domainRepObs: Observation[] = [];
     
     // Process Spam Ratio
     const spamData: ChartDataPoint[] = [];
     const spamObs: Observation[] = [];
     
     // Process Error Ratio
     const errorData: ChartDataPoint[] = [];
     const errorObs: Observation[] = [];
 
     sorted.forEach((row, i) => {
       const campaignsOnDate = getCampaignsOnDate(campaignData, row.date);
       
       // IP Reputation
       const ipRepValue = reputationToNumber(row.ipReputation);
       const ipRepBreach = ipRepValue > 0 && ipRepValue < THRESHOLDS.ipReputation;
       ipRepData.push({
         date: row.date,
         dateObj: row.dateObj,
         value: ipRepValue,
         valueRaw: row.ipReputation,
         hasBreach: ipRepBreach,
       });
       
       if (i > 0 && ipRepValue > 0) {
         const prevIpRep = reputationToNumber(sorted[i - 1].ipReputation);
         const obs = generateReputationObservation("IP reputation", row.date, prevIpRep, ipRepValue, campaignsOnDate, baseline);
         if (obs) ipRepObs.push(obs);
       }
 
       // Domain Reputation
       const domainRepValue = reputationToNumber(row.domainReputation);
       const domainRepBreach = domainRepValue > 0 && domainRepValue < THRESHOLDS.domainReputation;
       domainRepData.push({
         date: row.date,
         dateObj: row.dateObj,
         value: domainRepValue,
         valueRaw: row.domainReputation,
         hasBreach: domainRepBreach,
       });
       
       if (i > 0 && domainRepValue > 0) {
         const prevDomainRep = reputationToNumber(sorted[i - 1].domainReputation);
         const obs = generateReputationObservation("Domain reputation", row.date, prevDomainRep, domainRepValue, campaignsOnDate, baseline);
         if (obs) domainRepObs.push(obs);
       }
 
       // Spam Ratio
       const spamValue = row.spamRatio || 0;
       const spamBreach = spamValue > THRESHOLDS.spamRatio;
       spamData.push({
         date: row.date,
         dateObj: row.dateObj,
         value: spamValue,
         hasBreach: spamBreach,
       });
       
       const spamObservation = generateRatioObservation("Spam Ratio", row.date, spamValue, THRESHOLDS.spamRatio, campaignsOnDate, baseline);
       if (spamObservation) spamObs.push(spamObservation);
 
       // Error Ratio
       const errorValue = row.errorRatio || 0;
       const errorBreach = errorValue > THRESHOLDS.errorRatio;
       errorData.push({
         date: row.date,
         dateObj: row.dateObj,
         value: errorValue,
         hasBreach: errorBreach,
       });
       
       const errorObservation = generateRatioObservation("Delivery Error Ratio", row.date, errorValue, THRESHOLDS.errorRatio, campaignsOnDate, baseline);
       if (errorObservation) errorObs.push(errorObservation);
     });
 
     return {
       ipRepChart: { data: ipRepData, observations: ipRepObs },
       domainRepChart: { data: domainRepData, observations: domainRepObs },
       spamChart: { data: spamData, observations: spamObs },
       errorChart: { data: errorData, observations: errorObs },
     };
   }, [postmasterData, campaignData]);
 
   if (!postmasterData || postmasterData.length === 0) {
     return (
       <div className="flex items-center justify-center h-48 text-muted-foreground border rounded-lg bg-muted/20">
         <p>Upload Postmaster CSV to view reputation trends</p>
       </div>
     );
   }
 
   return (
     <motion.div
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       className="space-y-4"
     >
       {/* 2x2 Grid of Small Multiples */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <MiniChart
           title="IP Reputation"
           data={ipRepChart.data}
           isReputation={true}
           threshold={THRESHOLDS.ipReputation}
           observations={ipRepChart.observations}
           color="hsl(var(--primary))"
         />
         <MiniChart
           title="Domain Reputation"
           data={domainRepChart.data}
           isReputation={true}
           threshold={THRESHOLDS.domainReputation}
           observations={domainRepChart.observations}
           color="hsl(var(--secondary))"
         />
         <MiniChart
           title="Spam Ratio"
           data={spamChart.data}
           isReputation={false}
           threshold={THRESHOLDS.spamRatio}
           observations={spamChart.observations}
           color="#f59e0b"
         />
         <MiniChart
           title="Delivery Error Ratio"
           data={errorChart.data}
           isReputation={false}
           threshold={THRESHOLDS.errorRatio}
           observations={errorChart.observations}
           color="#ef4444"
         />
       </div>
 
       {/* Observation Rules Notice */}
       <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
         <p className="font-medium mb-1">Observation Guidelines:</p>
         <ul className="list-disc list-inside space-y-0.5">
           <li>Observations are date-specific and correlation-based</li>
           <li>Reputation dips are correlated with campaign bounce/engagement signals</li>
           <li>Threshold breaches: Spam Ratio {">"} 0.1%, Error Ratio {">"} 0%, Reputation {"<"} Medium</li>
         </ul>
       </div>
     </motion.div>
   );
 };