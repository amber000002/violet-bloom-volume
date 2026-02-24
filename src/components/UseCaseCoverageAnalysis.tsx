import React, { useMemo, useState } from "react";
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
  ChevronRight,
} from "lucide-react";
import { CampaignRow } from "@/lib/csvAnalyzer";
import { useResourceLibrary } from "@/contexts/ResourceLibraryContext";
import { ResourceJourney, ResourceCampaign, IndustryRelevance } from "@/types/resources";
import {
  normalizeForMatching,
  extractSignalTokens,
  countTokenOverlap,
  getDeliveryTypeStageBias,
  MatchTrace,
  MatchReasonCode,
} from "@/lib/coverageNormalization";
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
  matchTrace: MatchTrace;
}

interface UseCaseCoverage {
  useCaseId: string;
  useCaseName: string;
  framework: string;
  stage: string;
  objective: string;
  triggerType?: string;
  campaignsMapped: number;
  campaignNames: string[];
  source: UseCaseSource;
  status: "active" | "missing" | "review-needed";
}

// Normalize text for matching using PRD v2 pipeline
const cleanSubjectLine = (subject: string): string => {
  if (!subject) return '';
  let cleaned = subject.replace(/^\{Subject:\s*/i, '').replace(/\}$/, '').trim();
  cleaned = cleaned.split('|')[0].trim();
  cleaned = cleaned.split(',Preheader:')[0].trim();
  return normalizeForMatching(cleaned);
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

// Collapsible row component for campaign list
const UseCaseCoverageRow: React.FC<{ uc: UseCaseCoverage; pct: string }> = ({ uc, pct }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasCampaigns = uc.campaignNames.length > 0;

  return (
    <>
      <TableRow>
        <TableCell className="font-medium max-w-[250px]">
          <span className="whitespace-normal break-words">{uc.useCaseName}</span>
        </TableCell>
        <TableCell className="text-center font-medium">
          {uc.campaignsMapped} <span className="text-muted-foreground text-xs">({pct}%)</span>
        </TableCell>
        <TableCell>
          {hasCampaigns ? (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-xs text-primary hover:underline transition-colors"
            >
              <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
              View {uc.campaignNames.length} Campaign{uc.campaignNames.length !== 1 ? "s" : ""}
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">No campaigns mapped</span>
          )}
        </TableCell>
      </TableRow>
      {isExpanded && hasCampaigns && (
        <TableRow>
          <TableCell colSpan={3} className="bg-muted/20 py-2 px-6">
            <ul className="text-xs text-muted-foreground space-y-1 max-h-48 overflow-y-auto">
              {uc.campaignNames.map((name, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0" />
                  <span className="whitespace-normal break-words">{name}</span>
                </li>
              ))}
            </ul>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

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

  // Map campaigns to use cases with enhanced v2 resolution logic
  const mappedCampaigns = useMemo((): MappedCampaign[] => {
    // Apply 1,000-send noise filter
    const significantCampaigns = campaignData.filter(c => c.totalSentUsers >= 1000);
    return significantCampaigns.map(campaign => {
      // ===== PRD v2: Normalize all evidence fields =====
      const normTitle = cleanSubjectLine(campaign.title || campaign.subjectLine);
      const normCampaignName = normalizeForMatching(campaign.campaignName);
      const normWhoQuery = normalizeForMatching(campaign.whoQuery || "");
      const normConversionEvent = normalizeForMatching(campaign.conversionEvent || "");
      const normLabels = normalizeForMatching(campaign.labels || "");
      const normDeliveryType = normalizeForMatching(campaign.deliveryType || "");

      // Combined text for broad matching (all evidence fields)
      const allEvidenceText = [normTitle, normCampaignName, normWhoQuery, normConversionEvent, normLabels].filter(Boolean).join(" ");

      // Delivery type stage bias (narrows possible stages, does NOT assign use case)
      const stageBias = getDeliveryTypeStageBias(campaign.deliveryType || "");

      // ===== Priority 1: Internal Resource Match (Enhanced Multi-Field) =====
      let bestInternalMatch: { useCase: typeof internalUseCases[0]; confidence: "high" | "medium"; reasonCodes: MatchReasonCode[]; evidenceFields: string[] } | null = null;

      for (const useCase of internalUseCases) {
        const reasonCodes: MatchReasonCode[] = [];
        const evidenceFields: string[] = [];

        // A) Direct Keyword Match across all fields
        for (const keyword of useCase.keywords) {
          if (!keyword || keyword.length < 3) continue;
          const normKeyword = normalizeForMatching(keyword);
          if (normCampaignName.includes(normKeyword)) {
            reasonCodes.push("keyword_hit_campaign_name");
            evidenceFields.push("campaign_name");
          }
          if (normTitle.includes(normKeyword)) {
            reasonCodes.push("keyword_hit_title");
            evidenceFields.push("title");
          }
          if (normWhoQuery.includes(normKeyword)) {
            reasonCodes.push("keyword_hit_who_query");
            evidenceFields.push("who_query");
          }
          if (normConversionEvent.includes(normKeyword)) {
            reasonCodes.push("keyword_hit_conversion_event");
            evidenceFields.push("conversion_event");
          }
          if (normLabels.includes(normKeyword)) {
            reasonCodes.push("keyword_hit_labels");
            evidenceFields.push("labels");
          }
        }

        // Also check use case name tokens
        const ucNameNorm = normalizeForMatching(useCase.name);
        if (allEvidenceText.includes(ucNameNorm)) {
          reasonCodes.push("keyword_hit_campaign_name");
          evidenceFields.push("use_case_name_in_evidence");
        }

        // B) Token Overlap Match (≥2 high-signal tokens)
        if (reasonCodes.length === 0) {
          const ucDescription = normalizeForMatching(useCase.description || "");
          const ucFullText = `${ucNameNorm} ${ucDescription}`;

          // Check token overlap with conversion_event and who_query
          if (normConversionEvent) {
            const overlap = countTokenOverlap(normConversionEvent, ucFullText);
            if (overlap.count >= 2) {
              reasonCodes.push("token_overlap_threshold_met");
              evidenceFields.push("conversion_event");
            }
          }
          if (normWhoQuery && reasonCodes.length === 0) {
            const overlap = countTokenOverlap(normWhoQuery, ucFullText);
            if (overlap.count >= 2) {
              reasonCodes.push("token_overlap_threshold_met");
              evidenceFields.push("who_query");
            }
          }
        }

        // C) Delivery Type Stage Narrowing (boost confidence if stage aligns)
        if (reasonCodes.length > 0 && stageBias.length > 0) {
          const ucStageNorm = normalizeForMatching(useCase.stage);
          if (stageBias.some(s => normalizeForMatching(s) === ucStageNorm)) {
            reasonCodes.push("delivery_type_narrowed_stage");
            evidenceFields.push("delivery_type");
          }
        }

        // D) Conversion Event Override (High Signal Rule)
        if (reasonCodes.length === 0 && normConversionEvent) {
          // Direct match: conversion event matches use case name or key events
          const ucNameTokens = extractSignalTokens(useCase.name);
          const convTokens = extractSignalTokens(normConversionEvent);
          const directOverlap = convTokens.filter(t => ucNameTokens.includes(t));
          if (directOverlap.length >= 2 || normConversionEvent.includes(ucNameNorm)) {
            reasonCodes.push("conversion_event_direct_match");
            evidenceFields.push("conversion_event");
          }
        }

        if (reasonCodes.length > 0) {
          const confidence = reasonCodes.includes("keyword_hit_conversion_event") || 
                            reasonCodes.includes("conversion_event_direct_match") ||
                            reasonCodes.filter(r => r.startsWith("keyword_hit_")).length >= 2 
                            ? "high" : "medium";
          
          // Pick best match (most reason codes)
          if (!bestInternalMatch || reasonCodes.length > bestInternalMatch.reasonCodes.length) {
            bestInternalMatch = { useCase, confidence, reasonCodes: [...new Set(reasonCodes)], evidenceFields: [...new Set(evidenceFields)] };
          }
        }
      }

      if (bestInternalMatch) {
        return {
          campaign,
          useCaseName: bestInternalMatch.useCase.name,
          useCaseId: bestInternalMatch.useCase.id,
          stage: bestInternalMatch.useCase.stage,
          framework: bestInternalMatch.useCase.framework,
          source: "internal" as UseCaseSource,
          matchConfidence: bestInternalMatch.confidence,
          matchTrace: {
            matchSource: "internal",
            matchedUseCaseId: bestInternalMatch.useCase.id,
            evidenceFieldsUsed: bestInternalMatch.evidenceFields,
            matchReasonCodes: bestInternalMatch.reasonCodes,
          },
        };
      }

      // ===== Priority 2: Lovable-Inferred Regex (now checks all evidence fields) =====
      for (const pattern of INFERRED_USE_CASE_PATTERNS) {
        if (pattern.pattern.test(allEvidenceText)) {
          // Determine which field triggered the match
          const triggeredFields: string[] = [];
          if (pattern.pattern.test(normTitle)) triggeredFields.push("title");
          if (pattern.pattern.test(normCampaignName)) triggeredFields.push("campaign_name");
          if (pattern.pattern.test(normWhoQuery)) triggeredFields.push("who_query");
          if (pattern.pattern.test(normConversionEvent)) triggeredFields.push("conversion_event");
          if (pattern.pattern.test(normLabels)) triggeredFields.push("labels");

          return {
            campaign,
            useCaseName: pattern.useCaseName,
            useCaseId: null,
            stage: pattern.stage,
            framework: pattern.framework,
            source: "lovable-inferred" as UseCaseSource,
            matchConfidence: pattern.confidence,
            matchTrace: {
              matchSource: "inferred",
              matchedUseCaseId: null,
              evidenceFieldsUsed: triggeredFields.length > 0 ? triggeredFields : ["combined_text"],
              matchReasonCodes: ["regex_rule_hit"],
            },
          };
        }
      }

      // ===== Priority 3: Unclassified =====
      return {
        campaign,
        useCaseName: null,
        useCaseId: null,
        stage: null,
        framework: null,
        source: "unclassified" as UseCaseSource,
        matchConfidence: "low",
        matchTrace: {
          matchSource: "unclassified",
          matchedUseCaseId: null,
          evidenceFieldsUsed: [],
          matchReasonCodes: [],
        },
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
        campaignNames: [],
        source: "internal",
        status: "missing",
      });
    }

    // Count campaigns per use case and collect names
    for (const mapped of mappedCampaigns) {
      if (mapped.useCaseName) {
        const key = mapped.useCaseId || `inferred_${mapped.useCaseName}`;
        const campName = mapped.campaign.campaignName || mapped.campaign.title || "Unnamed";
        
        if (useCaseMap.has(key)) {
          const existing = useCaseMap.get(key)!;
          existing.campaignsMapped++;
          existing.campaignNames.push(campName);
          existing.status = "active";
        } else if (mapped.source === "lovable-inferred") {
          const existingInferred = Array.from(useCaseMap.values()).find(
            uc => uc.useCaseName === mapped.useCaseName && uc.source === "lovable-inferred"
          );
          
          if (existingInferred) {
            existingInferred.campaignsMapped++;
            existingInferred.campaignNames.push(campName);
          } else {
            useCaseMap.set(key, {
              useCaseId: key,
              useCaseName: mapped.useCaseName,
              framework: mapped.framework || "—",
              stage: mapped.stage || "Unassigned",
              objective: "",
              campaignsMapped: 1,
              campaignNames: [campName],
              source: "lovable-inferred",
              status: "review-needed",
            });
          }
        }
      }
    }

    // Add unclassified count
    const unclassifiedCampaigns = mappedCampaigns.filter(m => m.source === "unclassified");
    if (unclassifiedCampaigns.length > 0) {
      useCaseMap.set("unclassified", {
        useCaseId: "unclassified",
        useCaseName: "Unclassified / Review Needed",
        framework: "—",
        stage: "Unassigned",
        objective: "Campaigns that could not be confidently mapped to any use case",
        campaignsMapped: unclassifiedCampaigns.length,
        campaignNames: unclassifiedCampaigns.map(m => m.campaign.campaignName || m.campaign.title || "Unnamed"),
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

  return (
    <motion.div className="rounded-2xl overflow-hidden relative" style={{
      background: 'rgba(255, 255, 255, 0.45)',
      backdropFilter: 'blur(24px) saturate(1.8)',
      WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
      border: '1px solid rgba(255, 255, 255, 0.5)',
      boxShadow: '0 20px 50px rgba(99, 102, 241, 0.08)',
    }}>
      {/* Top gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] z-[1]" style={{ background: 'linear-gradient(to right, #A855F7, #FB7185)' }} />
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
                      <TableHead className="text-center">Volume / %</TableHead>
                      <TableHead>Campaigns</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coverageSummary.slice(0, 15).map((uc) => {
                      const totalCampaigns = stats.total;
                      const pct = totalCampaigns > 0 ? ((uc.campaignsMapped / totalCampaigns) * 100).toFixed(1) : "0";
                      return (
                        <UseCaseCoverageRow key={uc.useCaseId} uc={uc} pct={pct} />
                      );
                    })}
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
              * Campaigns with fewer than 1,000 sends are excluded as noise. Enhanced v2 matching evaluates campaign_name, title, who_query, conversion_event, labels, and delivery_type. 
              Internal resource matches take precedence. Token overlap (≥2 tokens) and conversion event overrides are deterministic. 
              Percentages are calculated from {stats.total} significant campaigns.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
