import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronUp,
  ChevronDown,
  Info,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Database,
  BarChart3,
} from "lucide-react";
import { CampaignRow } from "@/lib/csvAnalyzer";
import { useResourceLibrary } from "@/contexts/ResourceLibraryContext";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LifecycleCoverageMatrixProps {
  campaignData: CampaignRow[];
  industry: string;
  isOpen: boolean;
  onToggle: () => void;
}

// Coverage status type
type CoverageStatus = "strong" | "partial" | "weak";

// Stage coverage data structure
interface StageCoverage {
  stage: string;
  activeUseCases: number;
  totalUseCases: number;
  campaignCount: number;
  coveragePercent: number;
  status: CoverageStatus;
  activeUseCaseNames: Array<{ name: string; campaignCount: number }>;
  missingUseCaseNames: Array<{ name: string; objective: string }>;
}

// Insight structure
interface CoverageInsight {
  type: "concentration" | "gap" | "balance";
  text: string;
  stage?: string;
}

// Clean subject line for matching
const cleanSubjectLine = (subject: string): string => {
  if (!subject) return "";
  let cleaned = subject.replace(/^\{Subject:\s*/i, "").replace(/\}$/, "").trim();
  cleaned = cleaned.split("|")[0].trim();
  cleaned = cleaned.split(",Preheader:")[0].trim();
  return cleaned.toLowerCase();
};

// Lovable-inferred patterns for fallback matching
const INFERRED_PATTERNS: Array<{
  pattern: RegExp;
  stage: string;
  useCaseName: string;
}> = [
  // Acquisition/Onboarding
  { pattern: /welcome|onboard|getting started|new user/i, stage: "acquisition", useCaseName: "Welcome Series" },
  { pattern: /kyc|verify|verification|document/i, stage: "acquisition", useCaseName: "KYC/Verification" },
  { pattern: /complete.*profile|profile.*complete/i, stage: "acquisition", useCaseName: "Profile Completion" },
  
  // Engagement
  { pattern: /news|update|newsletter|weekly|monthly digest/i, stage: "engagement", useCaseName: "Newsletter/Updates" },
  { pattern: /trending|popular|recommended for you/i, stage: "engagement", useCaseName: "Trending Content" },
  { pattern: /feature|new launch|product update/i, stage: "engagement", useCaseName: "Feature Announcements" },
  
  // Monetization
  { pattern: /loan|disburse|sanction|credit.*line/i, stage: "monetization", useCaseName: "Loan Notifications" },
  { pattern: /offer|discount|sale|promo|deal|cashback|reward/i, stage: "monetization", useCaseName: "Promotional Offers" },
  { pattern: /flash sale|limited time|hurry|last chance/i, stage: "monetization", useCaseName: "Flash Sale Alerts" },
  { pattern: /upsell|cross-sell|upgrade/i, stage: "monetization", useCaseName: "Upsell/Cross-sell" },
  
  // Retention
  { pattern: /payment|emi|due|repay|instalment|pay.*now/i, stage: "retention", useCaseName: "Payment Reminders" },
  { pattern: /statement|account.*summary|balance/i, stage: "retention", useCaseName: "Account Statements" },
  { pattern: /transaction|txn|transfer|credited|debited/i, stage: "retention", useCaseName: "Transaction Alerts" },
  { pattern: /renew|expir|subscription/i, stage: "retention", useCaseName: "Renewal Reminders" },
  { pattern: /password|security|login|otp|2fa/i, stage: "retention", useCaseName: "Security Alerts" },
  
  // Winback/Churn
  { pattern: /miss you|come back|we.*miss|inactive/i, stage: "winback", useCaseName: "Win-back Campaign" },
  { pattern: /recover|collection|settle|outstanding/i, stage: "winback", useCaseName: "Recovery/Collections" },
  { pattern: /reactivat|re-engage/i, stage: "winback", useCaseName: "Reactivation Campaign" },
  
  // Advocacy
  { pattern: /refer|invite friend|referral/i, stage: "advocacy", useCaseName: "Referral Program" },
  { pattern: /feedback|survey|rate us|nps|how was your/i, stage: "advocacy", useCaseName: "NPS/Feedback Survey" },
  { pattern: /review|testimonial/i, stage: "advocacy", useCaseName: "Review Request" },
];

// Canonical lifecycle stages in order
const LIFECYCLE_STAGES = [
  "acquisition",
  "onboarding", 
  "engagement",
  "monetization",
  "retention",
  "winback",
  "advocacy",
];

// Stage display names
const STAGE_DISPLAY_NAMES: Record<string, string> = {
  acquisition: "Acquisition",
  onboarding: "Onboarding",
  engagement: "Engagement",
  monetization: "Monetization",
  retention: "Retention",
  winback: "Churn / Win-back",
  advocacy: "Advocacy",
};

export const LifecycleCoverageMatrix: React.FC<LifecycleCoverageMatrixProps> = ({
  campaignData,
  industry,
  isOpen,
  onToggle,
}) => {
  const { resources, findMatchingResources } = useResourceLibrary();
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  // Get internal use cases from resource library
  const internalUseCases = useMemo(() => {
    const matches = findMatchingResources("inbox-diagnostics", industry);
    const useCaseStudioMatches = findMatchingResources("use-case-studio", industry);
    const allMatches = [...matches, ...useCaseStudioMatches];
    
    const useCases: Array<{
      id: string;
      name: string;
      stage: string;
      description: string;
      keywords: string[];
    }> = [];
    const seenIds = new Set<string>();

    for (const match of allMatches) {
      const resource = match.resource;
      
      for (const journey of resource.journeys || []) {
        if (journey.id && !seenIds.has(journey.id)) {
          seenIds.add(journey.id);
          useCases.push({
            id: journey.id,
            name: journey.name,
            stage: normalizeStage(journey.stage || "unassigned"),
            description: journey.description || "",
            keywords: [
              journey.name.toLowerCase(),
              ...(journey.events || []).map(e => e.toLowerCase()),
              ...(journey.segments || []).map(s => s.toLowerCase()),
            ],
          });
        }
      }

      for (const campaign of resource.campaigns || []) {
        if (campaign.id && !seenIds.has(campaign.id)) {
          seenIds.add(campaign.id);
          useCases.push({
            id: campaign.id,
            name: campaign.name,
            stage: normalizeStage(campaign.stage || "unassigned"),
            description: campaign.purpose || "",
            keywords: [campaign.name.toLowerCase()],
          });
        }
      }
    }

    return useCases;
  }, [resources, industry, findMatchingResources]);

  // Normalize stage names to canonical stages
  function normalizeStage(stage: string): string {
    const stageLower = stage.toLowerCase().trim();
    
    // Direct matches
    if (LIFECYCLE_STAGES.includes(stageLower)) return stageLower;
    
    // Aliases
    if (stageLower.includes("onboard") || stageLower.includes("welcome")) return "acquisition";
    if (stageLower.includes("engage") || stageLower.includes("active")) return "engagement";
    if (stageLower.includes("monetiz") || stageLower.includes("convert") || stageLower.includes("revenue")) return "monetization";
    if (stageLower.includes("retain") || stageLower.includes("loyalty")) return "retention";
    if (stageLower.includes("win") || stageLower.includes("churn") || stageLower.includes("lapsed")) return "winback";
    if (stageLower.includes("advocate") || stageLower.includes("referral") || stageLower.includes("nps")) return "advocacy";
    
    return stageLower;
  }

  // Map campaigns to stages (internal matches only for coverage calculation)
  const campaignMappings = useMemo(() => {
    const mappings: Array<{
      campaign: CampaignRow;
      stage: string | null;
      useCaseName: string | null;
      source: "internal" | "inferred";
    }> = [];

    for (const campaign of campaignData) {
      const subjectLower = cleanSubjectLine(campaign.title || campaign.subjectLine);
      const campaignNameLower = campaign.campaignName.toLowerCase();
      const combinedText = `${subjectLower} ${campaignNameLower}`;

      // Try internal match first
      let matched = false;
      for (const useCase of internalUseCases) {
        const matchesKeyword = useCase.keywords.some(keyword => 
          combinedText.includes(keyword) || keyword.includes(subjectLower.slice(0, 20))
        );
        const matchesName = combinedText.includes(useCase.name.toLowerCase()) ||
          useCase.name.toLowerCase().split(" ").some(word => 
            word.length > 3 && combinedText.includes(word)
          );

        if (matchesKeyword || matchesName) {
          mappings.push({
            campaign,
            stage: useCase.stage,
            useCaseName: useCase.name,
            source: "internal",
          });
          matched = true;
          break;
        }
      }

      // Fallback to inferred (excluded from coverage calculation per PRD)
      if (!matched) {
        for (const pattern of INFERRED_PATTERNS) {
          if (pattern.pattern.test(combinedText)) {
            mappings.push({
              campaign,
              stage: pattern.stage,
              useCaseName: pattern.useCaseName,
              source: "inferred",
            });
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        mappings.push({
          campaign,
          stage: null,
          useCaseName: null,
          source: "inferred",
        });
      }
    }

    return mappings;
  }, [campaignData, internalUseCases]);

  // Build lifecycle coverage matrix
  const lifecycleCoverage = useMemo((): StageCoverage[] => {
    const stageData: Record<string, {
      activeUseCases: Set<string>;
      definedUseCases: Array<{ name: string; objective: string }>;
      campaignCount: number;
      useCaseCampaignCounts: Map<string, number>;
    }> = {};

    // Initialize all lifecycle stages
    for (const stage of LIFECYCLE_STAGES) {
      stageData[stage] = {
        activeUseCases: new Set(),
        definedUseCases: [],
        campaignCount: 0,
        useCaseCampaignCounts: new Map(),
      };
    }

    // Populate defined use cases from internal resources
    for (const uc of internalUseCases) {
      const stage = uc.stage;
      if (stageData[stage]) {
        stageData[stage].definedUseCases.push({
          name: uc.name,
          objective: uc.description,
        });
      }
    }

    // Count campaigns per stage (INTERNAL MATCHES ONLY for coverage calculation)
    for (const mapping of campaignMappings) {
      if (mapping.stage && stageData[mapping.stage]) {
        stageData[mapping.stage].campaignCount++;
        
        // Only count internal matches toward active use cases
        if (mapping.source === "internal" && mapping.useCaseName) {
          stageData[mapping.stage].activeUseCases.add(mapping.useCaseName);
          const currentCount = stageData[mapping.stage].useCaseCampaignCounts.get(mapping.useCaseName) || 0;
          stageData[mapping.stage].useCaseCampaignCounts.set(mapping.useCaseName, currentCount + 1);
        }
      }
    }

    // Build coverage array
    return LIFECYCLE_STAGES.map(stage => {
      const data = stageData[stage];
      const activeCount = data.activeUseCases.size;
      const totalCount = data.definedUseCases.length;
      const coveragePercent = totalCount > 0 ? (activeCount / totalCount) * 100 : 0;

      // Determine status per PRD rules
      let status: CoverageStatus;
      if (coveragePercent >= 75) {
        status = "strong";
      } else if (coveragePercent >= 25) {
        status = "partial";
      } else {
        status = "weak";
      }

      // Build active use case names with campaign counts
      const activeUseCaseNames = Array.from(data.activeUseCases).map(name => ({
        name,
        campaignCount: data.useCaseCampaignCounts.get(name) || 0,
      }));

      // Build missing use case names
      const missingUseCaseNames = data.definedUseCases
        .filter(uc => !data.activeUseCases.has(uc.name))
        .map(uc => ({ name: uc.name, objective: uc.objective }));

      return {
        stage,
        activeUseCases: activeCount,
        totalUseCases: totalCount,
        campaignCount: data.campaignCount,
        coveragePercent,
        status,
        activeUseCaseNames,
        missingUseCaseNames,
      };
    }).filter(stage => stage.totalUseCases > 0 || stage.campaignCount > 0);
  }, [internalUseCases, campaignMappings]);

  // Generate insights based on coverage patterns
  const insights = useMemo((): CoverageInsight[] => {
    const generated: CoverageInsight[] = [];
    
    // Find stages with high concentration
    const totalCampaigns = campaignMappings.length;
    const stagesWithHighConcentration = lifecycleCoverage.filter(
      s => s.campaignCount / totalCampaigns > 0.3 && s.totalUseCases > 0
    );
    
    for (const stage of stagesWithHighConcentration) {
      generated.push({
        type: "concentration",
        text: `${STAGE_DISPLAY_NAMES[stage.stage] || stage.stage} shows significant campaign concentration (${Math.round((stage.campaignCount / totalCampaigns) * 100)}% of sends), indicating active focus on this lifecycle stage.`,
        stage: stage.stage,
      });
    }

    // Find weak stages with internal resources defined
    const weakStages = lifecycleCoverage.filter(
      s => s.status === "weak" && s.totalUseCases > 0
    );
    
    for (const stage of weakStages.slice(0, 2)) {
      generated.push({
        type: "gap",
        text: `${STAGE_DISPLAY_NAMES[stage.stage] || stage.stage} has limited active use cases (${stage.activeUseCases}/${stage.totalUseCases}), suggesting opportunity for expanded communication at this stage.`,
        stage: stage.stage,
      });
    }

    // Balance observation
    const strongCount = lifecycleCoverage.filter(s => s.status === "strong").length;
    const partialCount = lifecycleCoverage.filter(s => s.status === "partial").length;
    const weakCount = lifecycleCoverage.filter(s => s.status === "weak").length;

    if (strongCount >= 3) {
      generated.push({
        type: "balance",
        text: `Lifecycle coverage is well-distributed across ${strongCount} stages with strong use case activation.`,
      });
    } else if (weakCount > strongCount) {
      generated.push({
        type: "balance",
        text: `Coverage distribution shows ${weakCount} stages with limited use case activation compared to ${strongCount} with strong coverage.`,
      });
    }

    return generated.slice(0, 3); // Max 3 insights per PRD
  }, [lifecycleCoverage, campaignMappings]);

  // Coverage bar component
  const CoverageBar: React.FC<{ percent: number; status: CoverageStatus }> = ({ percent, status }) => {
    const barColor = status === "strong" 
      ? "bg-green-500" 
      : status === "partial" 
        ? "bg-amber-500" 
        : "bg-red-400";

    return (
      <div className="w-24 h-3 bg-muted/50 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, percent)}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`h-full rounded-full ${barColor}`}
        />
      </div>
    );
  };

  // Status badge component
  const StatusBadge: React.FC<{ status: CoverageStatus }> = ({ status }) => {
    const config = {
      strong: { 
        className: "bg-green-500/20 text-green-700 border-green-500/30", 
        label: "Strong",
        icon: CheckCircle2,
      },
      partial: { 
        className: "bg-amber-500/20 text-amber-700 border-amber-500/30", 
        label: "Partial",
        icon: AlertTriangle,
      },
      weak: { 
        className: "bg-red-500/20 text-red-700 border-red-500/30", 
        label: "Weak",
        icon: TrendingUp,
      },
    };
    
    const { className, label, icon: Icon } = config[status];
    return (
      <Badge className={`${className} gap-1`}>
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  return (
    <motion.div className="magic-card rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 hover:bg-muted/20 transition-colors"
      >
        <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Lifecycle Coverage Visualization
        </h3>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 pb-6 space-y-6"
          >
            {/* Coverage Matrix Table */}
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left font-medium py-3 px-4">Lifecycle Stage</th>
                    <th className="text-center font-medium py-3 px-4">Coverage Bar</th>
                    <th className="text-center font-medium py-3 px-4">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center gap-1 justify-center">
                            Active / Total
                            <Info className="w-3 h-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs text-xs">
                              These counts reflect use cases from internal resources only. 
                              Lovable-inferred use cases are excluded from coverage calculations.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </th>
                    <th className="text-center font-medium py-3 px-4">Campaign Count</th>
                    <th className="text-center font-medium py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lifecycleCoverage.length > 0 ? (
                    lifecycleCoverage.map((stage, idx) => (
                      <React.Fragment key={stage.stage}>
                        <tr 
                          className={`border-b cursor-pointer hover:bg-muted/20 transition-colors ${
                            expandedStage === stage.stage ? "bg-muted/30" : ""
                          }`}
                          onClick={() => setExpandedStage(
                            expandedStage === stage.stage ? null : stage.stage
                          )}
                        >
                          <td className="py-3 px-4 font-medium">
                            <div className="flex items-center gap-2">
                              {expandedStage === stage.stage ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              )}
                              {STAGE_DISPLAY_NAMES[stage.stage] || stage.stage}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-center">
                              <CoverageBar 
                                percent={stage.coveragePercent} 
                                status={stage.status} 
                              />
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            {stage.activeUseCases} / {stage.totalUseCases}
                          </td>
                          <td className="py-3 px-4 text-center font-medium">
                            {stage.campaignCount}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-center">
                              <StatusBadge status={stage.status} />
                            </div>
                          </td>
                        </tr>
                        
                        {/* Expanded Detail Row */}
                        <AnimatePresence>
                          {expandedStage === stage.stage && (
                            <tr>
                              <td colSpan={5} className="bg-muted/10 px-4 py-0">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="py-4 space-y-4"
                                >
                                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                    <Target className="w-4 h-4 text-primary" />
                                    {STAGE_DISPLAY_NAMES[stage.stage]} Detail
                                    <span className="text-muted-foreground font-normal">
                                      — Coverage: {stage.activeUseCases} of {stage.totalUseCases} use cases active
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Active Use Cases */}
                                    <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                                      <h5 className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Active Use Cases
                                      </h5>
                                      {stage.activeUseCaseNames.length > 0 ? (
                                        <ul className="space-y-1">
                                          {stage.activeUseCaseNames.map(uc => (
                                            <li key={uc.name} className="text-xs flex justify-between">
                                              <span>{uc.name}</span>
                                              <span className="text-muted-foreground">
                                                {uc.campaignCount} campaigns
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p className="text-xs text-muted-foreground italic">
                                          No active use cases mapped
                                        </p>
                                      )}
                                    </div>

                                    {/* Missing Use Cases */}
                                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                                      <h5 className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        Missing Use Cases
                                      </h5>
                                      {stage.missingUseCaseNames.length > 0 ? (
                                        <ul className="space-y-2">
                                          {stage.missingUseCaseNames.map(uc => (
                                            <li key={uc.name} className="text-xs">
                                              <span className="font-medium">{uc.name}</span>
                                              {uc.objective && (
                                                <p className="text-muted-foreground mt-0.5">
                                                  {uc.objective}
                                                </p>
                                              )}
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p className="text-xs text-muted-foreground italic">
                                          All defined use cases are active
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Opportunity Note */}
                                  {stage.missingUseCaseNames.length > 0 && (
                                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                                      <p className="text-xs text-blue-700 italic">
                                        <strong>Opportunity:</strong>{" "}
                                        {stage.status === "weak" 
                                          ? "Limited proactive communication detected in this stage, increasing the risk of preventable drop-off."
                                          : "Expanding coverage in this stage could strengthen lifecycle continuity."}
                                      </p>
                                    </div>
                                  )}
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No internal resources defined for {industry}</p>
                        <p className="text-xs mt-1">
                          Add use cases to your Resource Library to enable lifecycle coverage analysis.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Insights Section */}
            {insights.length > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  Coverage Insights
                </h4>
                <ul className="space-y-2">
                  {insights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-muted-foreground">{insight.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Data Integrity Note */}
            <p className="text-xs text-muted-foreground italic border-t border-border pt-3">
              * Coverage metrics are calculated using internal resource definitions only. 
              Lovable-inferred classifications are excluded from Active/Total counts to maintain data integrity.
              Coverage status: Strong (≥75%), Partial (25-74%), Weak (&lt;25%).
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
