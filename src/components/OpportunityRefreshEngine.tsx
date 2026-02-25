import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronUp, ChevronDown, Rocket, Zap, TrendingUp,
  AlertTriangle, Sparkles, Target, Shield, BarChart3,
  Loader2, BrainCircuit,
} from "lucide-react";
import {
  generateOpportunities,
  OpportunityEngineInput,
  OpportunityEngineOutput,
  OpportunityCampaign,
  OpportunitySourceType,
  ActiveUseCaseInfo,
} from "@/lib/opportunityEngine";
import { CampaignRow } from "@/lib/csvAnalyzer";
import { EventSchemaRow, UserPropertyRow } from "@/lib/schemaAnalyzer";
import { SendMixEntry } from "@/lib/strategicInsightsExtendedEngine";
import { CoreBrandJSON } from "@/types/brandProfile";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OpportunityRefreshEngineProps {
  campaignData: CampaignRow[];
  activeCoverage: ActiveUseCaseInfo[];
  sendMix: SendMixEntry[];
  eventSchemaData: EventSchemaRow[] | null;
  userPropertyData: UserPropertyRow[] | null;
  brandProfile: CoreBrandJSON | null;
  websiteUrl: string;
}

const SOURCE_LABELS: Record<OpportunitySourceType, { label: string; icon: React.ReactNode; color: string }> = {
  drop_off: { label: "Drop-Off Recovery", icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "bg-red-100 text-red-700 border-red-200" },
  underutilized_event: { label: "Event Monetization", icon: <Zap className="w-3.5 h-3.5" />, color: "bg-amber-100 text-amber-700 border-amber-200" },
  content_program: { label: "Content Program", icon: <BarChart3 className="w-3.5 h-3.5" />, color: "bg-blue-100 text-blue-700 border-blue-200" },
  predictive_segment: { label: "AI / Predictive", icon: <Sparkles className="w-3.5 h-3.5" />, color: "bg-purple-100 text-purple-700 border-purple-200" },
  revenue_expansion: { label: "Revenue Expansion", icon: <TrendingUp className="w-3.5 h-3.5" />, color: "bg-green-100 text-green-700 border-green-200" },
  lifecycle_gap: { label: "Lifecycle Gap", icon: <Target className="w-3.5 h-3.5" />, color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  frequency_optimization: { label: "Frequency Optimization", icon: <Shield className="w-3.5 h-3.5" />, color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  loyalty_program: { label: "Loyalty Program", icon: <Rocket className="w-3.5 h-3.5" />, color: "bg-pink-100 text-pink-700 border-pink-200" },
  referral_growth: { label: "Referral Growth", icon: <Rocket className="w-3.5 h-3.5" />, color: "bg-orange-100 text-orange-700 border-orange-200" },
};

const ImpactBadge: React.FC<{ level: string }> = ({ level }) => {
  const colors: Record<string, string> = {
    High: "bg-red-100 text-red-700",
    Medium: "bg-amber-100 text-amber-700",
    Low: "bg-green-100 text-green-700",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[level] || "bg-muted text-muted-foreground"}`}>{level}</span>;
};

const ReadinessBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    Ready: "bg-green-100 text-green-700",
    "Requires Event": "bg-amber-100 text-amber-700",
    "Requires Property": "bg-amber-100 text-amber-700",
    "Requires Predictive Layer": "bg-purple-100 text-purple-700",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || "bg-muted text-muted-foreground"}`}>{status}</span>;
};

// Convert AI response to OpportunityCampaign format
function aiResponseToCampaign(raw: any): OpportunityCampaign & { _aiGenerated: boolean } {
  const validSources: OpportunitySourceType[] = [
    "drop_off", "underutilized_event", "content_program", "predictive_segment",
    "revenue_expansion", "lifecycle_gap", "frequency_optimization", "loyalty_program", "referral_growth",
  ];
  const sourceType = validSources.includes(raw.sourceType) ? raw.sourceType : "revenue_expansion";
  return {
    campaignName: raw.campaignName || "AI Campaign Suggestion",
    channel: raw.channel || "Email",
    targetSegment: raw.targetSegment || "High-value users",
    trigger: raw.trigger || "Behavioral signal",
    messageTheme: raw.messageTheme || "Personalized engagement",
    successMetric: raw.successMetric || "Conversion Rate",
    _meta: {
      sourceType,
      implementedAlready: false,
      revenueImpactLevel: (["High", "Medium", "Low"].includes(raw.revenueImpactLevel) ? raw.revenueImpactLevel : "Medium") as any,
      readinessStatus: (["Ready", "Requires Event", "Requires Property", "Requires Predictive Layer"].includes(raw.readinessStatus) ? raw.readinessStatus : "Ready") as any,
    },
    _aiGenerated: true,
  };
}

export const OpportunityRefreshEngine: React.FC<OpportunityRefreshEngineProps> = ({
  campaignData,
  activeCoverage,
  sendMix,
  eventSchemaData,
  userPropertyData,
  brandProfile,
  websiteUrl,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [showExclusionLog, setShowExclusionLog] = useState(false);
  const [aiCampaigns, setAiCampaigns] = useState<(OpportunityCampaign & { _aiGenerated: boolean })[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFetched, setAiFetched] = useState(false);

  // Deterministic engine result
  const deterministicResult: OpportunityEngineOutput = useMemo(() => {
    return generateOpportunities({
      campaignData,
      activeCoverage,
      sendMix,
      eventSchemaData,
      userPropertyData,
      brandProfile,
      websiteUrl,
    });
  }, [campaignData, activeCoverage, sendMix, eventSchemaData, userPropertyData, brandProfile, websiteUrl]);

  // Fetch AI suggestions once
  useEffect(() => {
    if (aiFetched) return;
    if (!brandProfile && campaignData.length === 0) return;

    const fetchAI = async () => {
      setAiLoading(true);
      try {
        // Build concise summaries
        const activeCoverageSnippet = activeCoverage
          .filter(u => u.status === "active")
          .map(u => `${u.stage}: ${u.name}`)
          .slice(0, 15)
          .join("; ");

        const totalSent = campaignData.reduce((s, c) => s + c.totalSentUsers, 0);
        const totalClicked = campaignData.reduce((s, c) => s + c.uniqueClickedWithinConversion, 0);
        const avgCTR = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(2) : "N/A";
        const campaignSummary = `${campaignData.length} campaigns, ${totalSent.toLocaleString()} total sent, avg CTR ${avgCTR}%`;

        const eventSnippet = eventSchemaData
          ? eventSchemaData.slice(0, 10).map(e => e.eventName).join(", ")
          : null;

        const existingCampaignNames = deterministicResult.campaigns.map(c => c.campaignName);

        const { data, error } = await supabase.functions.invoke("opportunity-ai", {
          body: {
            brandProfile,
            websiteUrl,
            activeCoverageSnippet,
            campaignSummary,
            eventSnippet,
            existingCampaignNames,
          },
        });

        if (error) {
          console.warn("AI opportunity fetch failed:", error);
        } else if (data?.campaigns && Array.isArray(data.campaigns)) {
          setAiCampaigns(data.campaigns.map(aiResponseToCampaign));
        }
      } catch (e) {
        console.warn("AI opportunity fetch error:", e);
      } finally {
        setAiLoading(false);
        setAiFetched(true);
      }
    };

    fetchAI();
  }, [brandProfile, campaignData, activeCoverage, eventSchemaData, deterministicResult.campaigns, aiFetched]);

  // Use only AI campaigns (all 7)
  const mergedCampaigns = useMemo(() => {
    return aiCampaigns.slice(0, 7);
  }, [aiCampaigns]);

  // Compute source distribution from merged
  const opportunitySources = useMemo(() => {
    const sources: Record<OpportunitySourceType, number> = {
      drop_off: 0, underutilized_event: 0, content_program: 0,
      predictive_segment: 0, revenue_expansion: 0, lifecycle_gap: 0,
      frequency_optimization: 0, loyalty_program: 0, referral_growth: 0,
    };
    for (const c of mergedCampaigns) {
      sources[c._meta.sourceType]++;
    }
    return sources;
  }, [mergedCampaigns]);

  const activeSourceTypes = Object.entries(opportunitySources).filter(([, count]) => count > 0);

  return (
    <motion.div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.04)",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 hover:bg-muted/10 transition-colors"
      >
        <h3 className="font-display text-lg font-bold text-gradient-magic flex items-center gap-2">
          <Rocket className="w-5 h-5" />
          Strategic Opportunity Engine
          <Badge variant="outline" className="ml-2 text-xs font-normal">
            {mergedCampaigns.length} Campaigns
          </Badge>
          {aiLoading && (
            <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground ml-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              AI generating…
            </span>
          )}
        </h3>
        {isOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 pb-6"
          >
            {/* Source Distribution Tags */}
            <div className="flex flex-wrap gap-2 mb-5">
              {activeSourceTypes.map(([type, count]) => {
                const info = SOURCE_LABELS[type as OpportunitySourceType];
                return (
                  <Badge key={type} variant="outline" className={`gap-1 ${info.color}`}>
                    {info.icon}
                    {info.label} ({count})
                  </Badge>
                );
              })}
            </div>

            {/* Campaign Table */}
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Campaign Name</TableHead>
                    <TableHead className="font-semibold">Channel</TableHead>
                    <TableHead className="font-semibold">Target Segment</TableHead>
                    <TableHead className="font-semibold">Trigger</TableHead>
                    <TableHead className="font-semibold">Message Theme</TableHead>
                    <TableHead className="font-semibold">Success Metric</TableHead>
                    <TableHead className="font-semibold text-center">Source</TableHead>
                    <TableHead className="font-semibold text-center">Impact</TableHead>
                    <TableHead className="font-semibold text-center">Readiness</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mergedCampaigns.map((campaign, i) => {
                    const sourceInfo = SOURCE_LABELS[campaign._meta.sourceType];
                    const isAI = (campaign as any)._aiGenerated === true;
                    return (
                      <TableRow key={i} className={`hover:bg-muted/10 ${isAI ? "bg-purple-50/40" : ""}`}>
                        <TableCell className="font-medium text-foreground max-w-[200px]">
                          <span className="flex items-center gap-1.5">
                            {isAI && <BrainCircuit className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                            {campaign.campaignName}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{campaign.channel}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[180px]">
                          {campaign.targetSegment}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                          {campaign.trigger}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px]">
                          {campaign.messageTheme}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {campaign.successMetric}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`text-xs gap-1 ${sourceInfo.color}`}>
                            {sourceInfo.icon}
                            <span className="hidden lg:inline">{sourceInfo.label}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <ImpactBadge level={campaign._meta.revenueImpactLevel} />
                        </TableCell>
                        <TableCell className="text-center">
                          <ReadinessBadge status={campaign._meta.readinessStatus} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* AI legend */}
            {aiCampaigns.length > 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <BrainCircuit className="w-3.5 h-3.5 text-purple-500" />
                <span>AI-generated suggestions are shown first with a purple accent</span>
              </div>
            )}

            {/* Exclusion Log */}
            {deterministicResult.exclusionLog.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setShowExclusionLog(!showExclusionLog)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  {showExclusionLog ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {deterministicResult.exclusionLog.length} campaigns excluded by Exclusion Engine
                </button>
                <AnimatePresence>
                  {showExclusionLog && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-2 space-y-1"
                    >
                      {deterministicResult.exclusionLog.map((log, i) => (
                        <p key={i} className="text-xs text-muted-foreground font-mono bg-muted/30 px-3 py-1.5 rounded">
                          {log}
                        </p>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
