import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronUp, ChevronDown, Rocket, Zap, TrendingUp,
  AlertTriangle, Sparkles, Target, Shield, BarChart3,
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

  const result: OpportunityEngineOutput = useMemo(() => {
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

  const activeSourceTypes = Object.entries(result.opportunitySources).filter(([, count]) => count > 0);

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
            {result.campaigns.length} Campaigns
          </Badge>
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

            {/* Campaign Table (Section D format) */}
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
                  {result.campaigns.map((campaign, i) => {
                    const sourceInfo = SOURCE_LABELS[campaign._meta.sourceType];
                    return (
                      <TableRow key={i} className="hover:bg-muted/10">
                        <TableCell className="font-medium text-foreground max-w-[200px]">
                          {campaign.campaignName}
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

            {/* Exclusion Log */}
            {result.exclusionLog.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setShowExclusionLog(!showExclusionLog)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  {showExclusionLog ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {result.exclusionLog.length} campaigns excluded by Exclusion Engine
                </button>
                <AnimatePresence>
                  {showExclusionLog && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-2 space-y-1"
                    >
                      {result.exclusionLog.map((log, i) => (
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
