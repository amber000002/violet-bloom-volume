import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Lightbulb,
  Database,
  Sparkles,
  HelpCircle,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { CampaignRow } from "@/lib/csvAnalyzer";
import { useResourceLibrary } from "@/contexts/ResourceLibraryContext";
import { ResourceJourney, ResourceCampaign, IndustryRelevance } from "@/types/resources";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface UseCaseCoverageAnalysisProps {
  campaignData: CampaignRow[];
  industry: string;
  isOpen: boolean;
  onToggle: () => void;
}

// Attribution types per PRD
type UseCaseSource = "internal" | "lovable-inferred" | "unclassified";

interface MappedCampaign {
  campaign: CampaignRow;
  useCaseName: string | null;
  useCaseId: string | null;
  stage: string | null;
  framework: string | null;
  source: UseCaseSource;
  matchConfidence: "high" | "medium" | "low";
}

interface UseCaseCoverage {
  useCaseId: string;
  useCaseName: string;
  framework: string;
  stage: string;
  objective: string;
  triggerType?: string;
  campaignsMapped: number;
  source: UseCaseSource;
  status: "active" | "missing" | "review-needed";
}

// Clean subject line by removing "{Subject:" prefix and preheader text
const cleanSubjectLine = (subject: string): string => {
  if (!subject) return '';
  let cleaned = subject.replace(/^\{Subject:\s*/i, '').replace(/\}$/, '').trim();
  cleaned = cleaned.split('|')[0].trim();
  cleaned = cleaned.split(',Preheader:')[0].trim();
  return cleaned.toLowerCase();
};

// Lovable-inferred use case patterns with stage assignments
const INFERRED_USE_CASE_PATTERNS: Array<{
  pattern: RegExp;
  useCaseName: string;
  stage: string;
  framework: string;
  confidence: "high" | "medium" | "low";
}> = [
  // Onboarding/Acquisition
  { pattern: /welcome|onboard|getting started|new user/i, useCaseName: "Welcome Series", stage: "onboarding", framework: "lifecycle", confidence: "high" },
  { pattern: /kyc|verify|verification|document/i, useCaseName: "KYC/Verification", stage: "onboarding", framework: "lifecycle", confidence: "high" },
  { pattern: /complete.*profile|profile.*complete/i, useCaseName: "Profile Completion", stage: "onboarding", framework: "lifecycle", confidence: "medium" },
  
  // Engagement
  { pattern: /news|update|newsletter|weekly|monthly digest/i, useCaseName: "Newsletter/Updates", stage: "engagement", framework: "lifecycle", confidence: "medium" },
  { pattern: /trending|popular|recommended for you/i, useCaseName: "Trending Content Highlights", stage: "engagement", framework: "lifecycle", confidence: "medium" },
  { pattern: /feature|new launch|product update/i, useCaseName: "Feature Announcements", stage: "engagement", framework: "lifecycle", confidence: "medium" },
  
  // Transactional - Payments
  { pattern: /payment|emi|due|repay|instalment|pay.*now/i, useCaseName: "Payment/Collection Reminders", stage: "retention", framework: "lifecycle", confidence: "high" },
  { pattern: /nach|auto.*debit|mandate|autopay/i, useCaseName: "Auto-Debit/NACH Setup", stage: "retention", framework: "lifecycle", confidence: "high" },
  { pattern: /overdue|missed payment|past due/i, useCaseName: "Overdue Payment Alerts", stage: "retention", framework: "lifecycle", confidence: "high" },
  
  // Transactional - Financial
  { pattern: /loan|disburse|sanction|credit.*line/i, useCaseName: "Loan/Disbursal Notifications", stage: "monetization", framework: "lifecycle", confidence: "high" },
  { pattern: /statement|account.*summary|balance/i, useCaseName: "Account Statements", stage: "retention", framework: "lifecycle", confidence: "high" },
  { pattern: /transaction|txn|transfer|credited|debited/i, useCaseName: "Transaction Alerts", stage: "retention", framework: "lifecycle", confidence: "high" },
  
  // Win-back/Recovery
  { pattern: /miss you|come back|we.*miss|inactive/i, useCaseName: "Win-back Campaign", stage: "winback", framework: "lifecycle", confidence: "high" },
  { pattern: /recover|collection|settle|outstanding/i, useCaseName: "Recovery/Collections", stage: "winback", framework: "lifecycle", confidence: "high" },
  { pattern: /reactivat|re-engage/i, useCaseName: "Reactivation Campaign", stage: "winback", framework: "lifecycle", confidence: "medium" },
  
  // Promotional
  { pattern: /offer|discount|sale|promo|deal|cashback|reward/i, useCaseName: "Promotional Offers", stage: "monetization", framework: "lifecycle", confidence: "medium" },
  { pattern: /flash sale|limited time|hurry|last chance/i, useCaseName: "Flash Sale Alerts", stage: "monetization", framework: "lifecycle", confidence: "medium" },
  { pattern: /refer|invite friend|referral/i, useCaseName: "Referral Program", stage: "advocacy", framework: "lifecycle", confidence: "high" },
  
  // Feedback/NPS
  { pattern: /feedback|survey|rate us|nps|how was your/i, useCaseName: "NPS/Feedback Survey", stage: "advocacy", framework: "lifecycle", confidence: "high" },
  { pattern: /review|testimonial/i, useCaseName: "Review Request", stage: "advocacy", framework: "lifecycle", confidence: "medium" },
  
  // Account Management
  { pattern: /password|security|login|otp|2fa/i, useCaseName: "Security Alerts", stage: "retention", framework: "lifecycle", confidence: "high" },
  { pattern: /renew|expir|subscription/i, useCaseName: "Renewal Reminders", stage: "retention", framework: "lifecycle", confidence: "high" },
];

export const UseCaseCoverageAnalysis: React.FC<UseCaseCoverageAnalysisProps> = ({
  campaignData,
  industry,
  isOpen,
  onToggle,
}) => {
  const { resources, findMatchingResources } = useResourceLibrary();

  // Get internal use cases for the selected industry
  const internalUseCases = useMemo(() => {
    const matches = findMatchingResources("inbox-diagnostics", industry);
    const useCases: Array<{
      id: string;
      name: string;
      type: "journey" | "campaign";
      stage: string;
      framework: string;
      description: string;
      triggerType?: string;
      keywords: string[];
    }> = [];

    // Also check use-case-studio tab for comprehensive coverage
    const useCaseStudioMatches = findMatchingResources("use-case-studio", industry);
    const allMatches = [...matches, ...useCaseStudioMatches];
    const seenIds = new Set<string>();

    for (const match of allMatches) {
      const resource = match.resource;
      
      // Extract journeys
      for (const journey of resource.journeys || []) {
        if (journey.id && !seenIds.has(journey.id)) {
          seenIds.add(journey.id);
          useCases.push({
            id: journey.id,
            name: journey.name,
            type: "journey",
            stage: journey.stage || "unassigned",
            framework: journey.framework || "lifecycle",
            description: journey.description || "",
            triggerType: journey.triggerType,
            keywords: [
              journey.name.toLowerCase(),
              ...(journey.events || []).map(e => e.toLowerCase()),
              ...(journey.segments || []).map(s => s.toLowerCase()),
            ],
          });
        }
      }

      // Extract campaigns
      for (const campaign of resource.campaigns || []) {
        if (campaign.id && !seenIds.has(campaign.id)) {
          seenIds.add(campaign.id);
          useCases.push({
            id: campaign.id,
            name: campaign.name,
            type: "campaign",
            stage: campaign.stage || "unassigned",
            framework: campaign.framework || "lifecycle",
            description: campaign.purpose || "",
            keywords: [campaign.name.toLowerCase()],
          });
        }
      }
    }

    return useCases;
  }, [resources, industry, findMatchingResources]);

  // Map campaigns to use cases with strict resolution logic
  const mappedCampaigns = useMemo((): MappedCampaign[] => {
    return campaignData.map(campaign => {
      const subjectLower = cleanSubjectLine(campaign.title || campaign.subjectLine);
      const campaignNameLower = campaign.campaignName.toLowerCase();
      const combinedText = `${subjectLower} ${campaignNameLower}`;

      // Priority 1: Internal Resource Match (Authoritative)
      for (const useCase of internalUseCases) {
        const matchesKeyword = useCase.keywords.some(keyword => 
          combinedText.includes(keyword) || keyword.includes(subjectLower.slice(0, 20))
        );
        
        // Also check if use case name appears in campaign
        const matchesName = combinedText.includes(useCase.name.toLowerCase()) ||
          useCase.name.toLowerCase().split(' ').some(word => 
            word.length > 3 && combinedText.includes(word)
          );

        if (matchesKeyword || matchesName) {
          return {
            campaign,
            useCaseName: useCase.name,
            useCaseId: useCase.id,
            stage: useCase.stage, // Stage MUST come from internal resource
            framework: useCase.framework,
            source: "internal" as UseCaseSource,
            matchConfidence: matchesKeyword ? "high" : "medium",
          };
        }
      }

      // Priority 2: Lovable-Inferred Match
      for (const pattern of INFERRED_USE_CASE_PATTERNS) {
        if (pattern.pattern.test(combinedText)) {
          return {
            campaign,
            useCaseName: pattern.useCaseName,
            useCaseId: null,
            stage: pattern.stage, // Labeled as inferred
            framework: pattern.framework,
            source: "lovable-inferred" as UseCaseSource,
            matchConfidence: pattern.confidence,
          };
        }
      }

      // Priority 3: Unclassified
      return {
        campaign,
        useCaseName: null,
        useCaseId: null,
        stage: null,
        framework: null,
        source: "unclassified" as UseCaseSource,
        matchConfidence: "low",
      };
    });
  }, [campaignData, internalUseCases]);

  // Build use case coverage summary
  const coverageSummary = useMemo((): UseCaseCoverage[] => {
    const useCaseMap = new Map<string, UseCaseCoverage>();

    // Add all internal use cases first (they're authoritative)
    for (const uc of internalUseCases) {
      useCaseMap.set(uc.id, {
        useCaseId: uc.id,
        useCaseName: uc.name,
        framework: uc.framework,
        stage: uc.stage,
        objective: uc.description,
        triggerType: uc.triggerType,
        campaignsMapped: 0,
        source: "internal",
        status: "missing", // Will update if campaigns found
      });
    }

    // Count campaigns per use case
    for (const mapped of mappedCampaigns) {
      if (mapped.useCaseName) {
        const key = mapped.useCaseId || `inferred_${mapped.useCaseName}`;
        
        if (useCaseMap.has(key)) {
          const existing = useCaseMap.get(key)!;
          existing.campaignsMapped++;
          existing.status = "active";
        } else if (mapped.source === "lovable-inferred") {
          // Add inferred use cases
          const existingInferred = Array.from(useCaseMap.values()).find(
            uc => uc.useCaseName === mapped.useCaseName && uc.source === "lovable-inferred"
          );
          
          if (existingInferred) {
            existingInferred.campaignsMapped++;
          } else {
            useCaseMap.set(key, {
              useCaseId: key,
              useCaseName: mapped.useCaseName,
              framework: mapped.framework || "—",
              stage: mapped.stage || "Unassigned",
              objective: "",
              campaignsMapped: 1,
              source: "lovable-inferred",
              status: "review-needed",
            });
          }
        }
      }
    }

    // Add unclassified count
    const unclassifiedCount = mappedCampaigns.filter(m => m.source === "unclassified").length;
    if (unclassifiedCount > 0) {
      useCaseMap.set("unclassified", {
        useCaseId: "unclassified",
        useCaseName: "Unclassified / Review Needed",
        framework: "—",
        stage: "Unassigned",
        objective: "Campaigns that could not be confidently mapped to any use case",
        campaignsMapped: unclassifiedCount,
        source: "unclassified",
        status: "review-needed",
      });
    }

    return Array.from(useCaseMap.values()).sort((a, b) => {
      // Sort: Active first, then by campaign count desc
      if (a.status === "active" && b.status !== "active") return -1;
      if (a.status !== "active" && b.status === "active") return 1;
      if (a.status === "missing" && b.status === "review-needed") return 1;
      if (a.status === "review-needed" && b.status === "missing") return -1;
      return b.campaignsMapped - a.campaignsMapped;
    });
  }, [mappedCampaigns, internalUseCases]);

  // Missing use cases from internal resources
  const missingUseCases = useMemo(() => {
    return coverageSummary.filter(uc => uc.status === "missing" && uc.source === "internal");
  }, [coverageSummary]);

  // Stage distribution
  const stageDistribution = useMemo(() => {
    const stages: Record<string, { internal: number; inferred: number }> = {};
    
    for (const mapped of mappedCampaigns) {
      const stage = mapped.stage || "Unassigned";
      if (!stages[stage]) {
        stages[stage] = { internal: 0, inferred: 0 };
      }
      if (mapped.source === "internal") {
        stages[stage].internal++;
      } else if (mapped.source === "lovable-inferred") {
        stages[stage].inferred++;
      }
    }
    
    return stages;
  }, [mappedCampaigns]);

  // Stats
  const stats = useMemo(() => {
    const internal = mappedCampaigns.filter(m => m.source === "internal").length;
    const inferred = mappedCampaigns.filter(m => m.source === "lovable-inferred").length;
    const unclassified = mappedCampaigns.filter(m => m.source === "unclassified").length;
    const total = mappedCampaigns.length;
    
    return {
      total,
      internal,
      inferred,
      unclassified,
      internalPercent: total > 0 ? ((internal / total) * 100).toFixed(1) : "0",
      inferredPercent: total > 0 ? ((inferred / total) * 100).toFixed(1) : "0",
      unclassifiedPercent: total > 0 ? ((unclassified / total) * 100).toFixed(1) : "0",
      activeUseCases: coverageSummary.filter(uc => uc.status === "active").length,
      missingUseCases: missingUseCases.length,
    };
  }, [mappedCampaigns, coverageSummary, missingUseCases]);

  const getSourceBadge = (source: UseCaseSource) => {
    switch (source) {
      case "internal":
        return (
          <Badge className="bg-green-500/20 text-green-700 border-green-500/30 gap-1">
            <Database className="w-3 h-3" />
            Internal Resource
          </Badge>
        );
      case "lovable-inferred":
        return (
          <Badge className="bg-purple-500/20 text-purple-700 border-purple-500/30 gap-1">
            <Sparkles className="w-3 h-3" />
            Lovable Inferred
          </Badge>
        );
      case "unclassified":
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-500/30 gap-1">
            <HelpCircle className="w-3 h-3" />
            Review Needed
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: "active" | "missing" | "review-needed") => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Active</Badge>;
      case "missing":
        return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">Missing</Badge>;
      case "review-needed":
        return <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">Review Needed</Badge>;
    }
  };

  return (
    <motion.div className="magic-card rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 hover:bg-muted/20 transition-colors"
      >
        <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Send Mix & Use Case Coverage Analysis
          <span className="text-xs font-normal text-muted-foreground ml-2">
            (Stage-Aware)
          </span>
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
            {/* Attribution Rule Notice */}
            <div className="bg-muted/30 rounded-lg p-4 text-sm">
              <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                Stage Assignment Rule
              </p>
              <p className="text-muted-foreground text-xs">
                If a campaign maps to an internal resource use case, the <strong>Stage</strong> defined in the internal resource is mandatory and authoritative. 
                Stage inference is allowed only when no internal resource match exists and is explicitly labeled as <em>"Lovable Inferred"</em>.
              </p>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-500/10 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.internal}</p>
                <p className="text-xs text-muted-foreground">Internal Resource Match</p>
                <p className="text-xs text-green-600 font-medium">{stats.internalPercent}%</p>
              </div>
              <div className="bg-purple-500/10 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">{stats.inferred}</p>
                <p className="text-xs text-muted-foreground">Lovable Inferred</p>
                <p className="text-xs text-purple-600 font-medium">{stats.inferredPercent}%</p>
              </div>
              <div className="bg-amber-500/10 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{stats.unclassified}</p>
                <p className="text-xs text-muted-foreground">Unclassified</p>
                <p className="text-xs text-amber-600 font-medium">{stats.unclassifiedPercent}%</p>
              </div>
              <div className="bg-primary/10 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-primary">{stats.activeUseCases}</p>
                <p className="text-xs text-muted-foreground">Active Use Cases</p>
                <p className="text-xs text-red-500 font-medium">{stats.missingUseCases} missing</p>
              </div>
            </div>

            {/* Stage Distribution */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-foreground">Stage Distribution</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stageDistribution).map(([stage, counts]) => (
                  <div key={stage} className="bg-muted/30 rounded-lg px-3 py-2 text-sm">
                    <span className="font-medium capitalize">{stage}</span>
                    <span className="text-muted-foreground ml-2">
                      {counts.internal > 0 && (
                        <span className="text-green-600">{counts.internal} internal</span>
                      )}
                      {counts.internal > 0 && counts.inferred > 0 && " / "}
                      {counts.inferred > 0 && (
                        <span className="text-purple-600">{counts.inferred} inferred</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Use Case Coverage Table */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-foreground">Use Case Coverage Summary</h4>
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Use Case</TableHead>
                      <TableHead>Framework</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead className="text-center">Campaigns</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coverageSummary.slice(0, 15).map((uc) => (
                      <TableRow key={uc.useCaseId}>
                        <TableCell className="font-medium max-w-[200px]">
                          <span className="whitespace-normal break-words">{uc.useCaseName}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground capitalize">
                          {uc.framework}
                        </TableCell>
                        <TableCell className="capitalize">{uc.stage}</TableCell>
                        <TableCell className="text-center font-medium">
                          {uc.campaignsMapped}
                        </TableCell>
                        <TableCell>{getSourceBadge(uc.source)}</TableCell>
                        <TableCell>{getStatusBadge(uc.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {coverageSummary.length > 15 && (
                <p className="text-xs text-muted-foreground text-center">
                  Showing 15 of {coverageSummary.length} use cases
                </p>
              )}
            </div>

            {/* Missing Use Cases Section */}
            {missingUseCases.length > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-sm text-amber-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Missing Use Cases from Internal Resources
                </h4>
                <p className="text-xs text-muted-foreground">
                  These use cases are defined in your internal resource library for the <strong>{industry}</strong> vertical but have zero campaigns mapped:
                </p>
                <div className="space-y-2">
                  {missingUseCases.map((uc) => (
                    <div key={uc.useCaseId} className="bg-white/50 dark:bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{uc.useCaseName}</span>
                        <span className="text-xs px-2 py-0.5 bg-muted rounded capitalize">
                          {uc.stage}
                        </span>
                      </div>
                      {uc.objective && (
                        <p className="text-xs text-muted-foreground">{uc.objective}</p>
                      )}
                      {uc.triggerType && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <strong>Suggested trigger:</strong> {uc.triggerType}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Internal Resources Warning */}
            {internalUseCases.length === 0 && (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <h5 className="font-semibold text-sm text-blue-700">No Internal Resources Found</h5>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add use cases to your Resource Library (with <strong>inbox-diagnostics</strong> or <strong>use-case-studio</strong> tab relevance 
                      and <strong>{industry}</strong> industry) to enable authoritative use case matching. 
                      Currently, all classifications are inferred by Lovable Intelligence.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Footnote */}
            <p className="text-xs text-muted-foreground italic border-t border-border pt-3">
              * Use case coverage is based on campaign count. Internal resource matches take precedence over Lovable inference. 
              Percentages are calculated from {stats.total} total campaigns.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
