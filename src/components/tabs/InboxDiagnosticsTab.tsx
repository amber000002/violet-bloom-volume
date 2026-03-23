import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CoreBrandJSON } from "@/types/brandProfile";
import { StrategicInsightsOutput } from "@/lib/strategicInsightsEngine";
import { StrategicInsights } from "../StrategicInsights";
import { StrategicInsightsExtended } from "../StrategicInsightsExtended";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  FileSpreadsheet,
  MessageSquare,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lightbulb,
  Shield,
  Download,
  Calendar,
  PieChart,
  Activity,
  Image as ImageIcon,
  Palette,
  Loader2,
} from "lucide-react";
import { exportDiagnosticsToPPT } from "@/lib/diagnosticsPptExport";
import { exportElementAsPNG, exportCreativeAnalysisAsText, exportCreativeAnalysisAsCSV } from "@/lib/exportUtils";
import { ViewMode } from "@/hooks/usePresentationMode";
import { 
  parseCSV, 
  parsePostmasterCSV,
  generateAnalysisReport,
  runReconciliationCheck,
  DiagnosticsData,
  ValidationResult,
  PostmasterValidationResult,
  CampaignRow,
  PostmasterRow,
  ProcessingSummary,
  TopCampaign,
  AnalysisReport,
} from "@/lib/csvAnalyzer";
import { InboxDiagnosticsSlides } from "../presentation/InboxDiagnosticsSlides";
import { Button } from "../ui/button";
import { DataIntegrityPanel } from "../DataIntegrityPanel";
import { UseCaseCoverageAnalysis } from "../UseCaseCoverageAnalysis";
import { LifecycleCoverageMatrix } from "../LifecycleCoverageMatrix";
import { parseEventSchemaCSV, parseUserPropertyCSV, EventSchemaRow, UserPropertyRow } from "@/lib/schemaAnalyzer";
import { generateExtendedInsights, ExtendedInsightsData, CoverageDataForRevenue } from "@/lib/strategicInsightsExtendedEngine";
import { useResourceLibrary } from "@/contexts/ResourceLibraryContext";
import { OpportunityRefreshEngine } from "../OpportunityRefreshEngine";
import { generateSectionInsights, SectionInsights } from "@/lib/sectionInsightEngine";
import { ActiveUseCaseInfo } from "@/lib/opportunityEngine";
import {
  EmailMetricsTrendChart,
  InfrastructureDetailsTable,
  ReputationSmallMultiples,
} from "../metrics";

interface InboxDiagnosticsTabProps {
  industry: string;
  viewMode?: ViewMode;
  onDataChange?: (data: DiagnosticsData | null) => void;
  brandProfile?: CoreBrandJSON | null;
  websiteUrl?: string;
  eventSchemaCSV?: string;
  userPropertiesCSV?: string;
}

const REQUIRED_HEADERS = [
  "Campaign Name", "Campaign ID", "Channel", "Title", "Start Date", "Start Time",
  "Service provider", "Provider Name", "Status", "Total Sent (users)",
  "Total Delivered (users)", "Total Sent (events)", "Unique Sent (users)",
  "Unique Viewed Within Conversion Time", "Unique Clicked Within Conversion Time",
  "Click through conversions", "Total Unsubscribes", 
  "Error: Email hard bounced", "Error: Email soft bounced"
];

const POSTMASTER_HEADERS = [
  "Date", "Domain", "IP Reputation", "IP Count", "Sample IPs",
  "Domain Reputation", "Spam Ratio", "Error Ratio"
];

const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

const formatPercent = (num: number): string => {
  return `${num.toFixed(2)}%`;
};

// Clean subject line by removing "{Subject:" prefix and preheader text (after "|" or ",Preheader:")
const cleanSubjectLine = (subject: string): string => {
  if (!subject) return '';
  // Remove {Subject: prefix
  let cleaned = subject.replace(/^\{Subject:\s*/i, '').replace(/\}$/, '').trim();
  // Remove preheader text (everything after "|" or ",Preheader:")
  cleaned = cleaned.split('|')[0].trim();
  cleaned = cleaned.split(',Preheader:')[0].trim();
  return cleaned;
};

// Export campaign data to CSV
const exportCampaignsToCSV = (campaigns: TopCampaign[], filename: string) => {
  const headers = ["Start Date","Campaign Name","Subject Line","Sent","Viewed","Open %","Clicked","Click %","Unsubs","Unsub %","Hard Bounce","Hard %","Soft Bounce","Soft %"];
  const rows = campaigns.map(c => {
    const denom = c.totalDeliveredUsers > 0 ? c.totalDeliveredUsers : c.totalSentUsers;
    const unsubPct = denom > 0 ? (c.unsubscribes / denom) * 100 : 0;
    const hardPct = denom > 0 ? (c.hardBounces / denom) * 100 : 0;
    const softPct = denom > 0 ? (c.softBounces / denom) * 100 : 0;
    return [
      c.startDate,
      `"${c.campaignName.replace(/"/g, '""')}"`,
      `"${cleanSubjectLine(c.subjectLine).replace(/"/g, '""')}"`,
      c.totalSentUsers,
      c.uniqueViewed,
      c.openRate.toFixed(2),
      c.uniqueClicked,
      c.clickRate.toFixed(2),
      c.unsubscribes,
      unsubPct.toFixed(2),
      c.hardBounces,
      hardPct.toFixed(2),
      c.softBounces,
      softPct.toFixed(2),
    ].join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

type MetricType = 'openRate' | 'clickRate' | 'bounceRate' | 'unsubscribeRate';

// ============= STRATEGIC AUDITOR KEY LEARNINGS ENGINE =============
interface IntelligentRecommendation {
  issue: string;
  recommendation: string;
  priority: "P0" | "P1" | "P2";
  severity: number; // for sorting within priority
}

// Tactical findings for Root Cause section (campaign/segment-specific)
export interface TacticalFinding {
  issue: string;
  recommendation: string;
  priority: "P0" | "P1" | "P2";
  severity: number;
}

const MIN_VOLUME_THRESHOLD = 1000;

const sortByPriority = (recs: IntelligentRecommendation[]): IntelligentRecommendation[] => {
  const priorityOrder = { P0: 0, P1: 1, P2: 2 };
  return recs.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return b.severity - a.severity;
  });
};

// ============= TACTICAL FINDINGS (Segment/Campaign-Specific) =============
// NOTE: Reputation repair analysis removed - simplified tactical findings
export const generateTacticalFindings = (
  campaignData: CampaignRow[],
  postmasterData: PostmasterRow[] | null
): TacticalFinding[] => {
  const recs: TacticalFinding[] = [];
  
  // Volume-based findings
  const lowVolumeCampaigns = campaignData.filter(c => c.totalSentUsers < MIN_VOLUME_THRESHOLD);
  if (lowVolumeCampaigns.length > 0) {
    recs.push({
      issue: `${lowVolumeCampaigns.length} campaigns sent to fewer than ${MIN_VOLUME_THRESHOLD} users`,
      recommendation: "Consider consolidating low-volume campaigns or reviewing targeting criteria to improve statistical significance",
      priority: "P2", severity: 3,
    });
  }
  
  return sortByPriority(recs) as TacticalFinding[];
};

// ============= EXECUTIVE KEY LEARNINGS (Global/Structural patterns only) =============
// NOTE: Simplified - removed reputation signal analysis dependencies
const generateIntelligentLearnings = (
  campaignData: CampaignRow[],
  analysisReport: AnalysisReport,
  postmasterData: PostmasterRow[] | null
): IntelligentRecommendation[] => {
  const recs: IntelligentRecommendation[] = [];
  // Only consider campaigns with >= 1000 sends for global metrics
  const significantCampaigns = campaignData.filter(c => c.totalSentUsers >= MIN_VOLUME_THRESHOLD);
  const totalSent = significantCampaigns.reduce((s, c) => s + c.totalSentUsers, 0);
  const totalViewed = significantCampaigns.reduce((s, c) => s + c.uniqueViewedWithinConversion, 0);
  const totalClicked = significantCampaigns.reduce((s, c) => s + c.uniqueClickedWithinConversion, 0);
  const totalBounce = significantCampaigns.reduce((s, c) => s + c.hardBounces + c.softBounces, 0);
  const totalUnsub = significantCampaigns.reduce((s, c) => s + c.totalUnsubscribes, 0);
  const avgOpenRate = totalSent > 0 ? (totalViewed / totalSent) * 100 : 0;
  const avgClickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
  const avgBounceRate = totalSent > 0 ? (totalBounce / totalSent) * 100 : 0;
  const avgUnsubRate = totalSent > 0 ? (totalUnsub / totalSent) * 100 : 0;

  // === LAYER 1: Critical Bounce Rate (P0) ===
  if (avgBounceRate > 3.0) {
    recs.push({
      issue: `Critical bounce rate at ${avgBounceRate.toFixed(2)}% — exceeds 3% threshold and risks reputation degradation.`,
      recommendation: "Immediate list hygiene required: validate email collection points, suppress hard-bounced addresses before next send. Review CleverTap Email Best Practices: List Hygiene.",
      priority: "P0", severity: 10,
    });
  }

  // === LAYER 2: High Unsubscribe Rate (P0) ===
  if (avgUnsubRate > 0.7) {
    recs.push({
      issue: `Unsubscribe rate at ${avgUnsubRate.toFixed(2)}% — exceeding 0.7% indicates content/expectation misalignment.`,
      recommendation: "Audit opt-in flows for clear value proposition. Review send frequency and content relevance per segment. Add preference center options.",
      priority: "P0", severity: 9,
    });
  }

  // === LAYER 3: Low Open Rate (P1) ===
  if (avgOpenRate < 10.0) {
    recs.push({
      issue: `Low average open rate (${avgOpenRate.toFixed(2)}%). Consider reputation audit.`,
      recommendation: "Review subject line practices, preheader optimization, and send-time targeting. Validate authentication setup (SPF/DKIM/DMARC). Check blocklist status via Google Postmaster Tools and third-party tools.",
      priority: "P1", severity: 7,
    });
  }

  // === LAYER 4: Low Click Rate (P1) ===
  if (avgClickRate < 1.5) {
    recs.push({
      issue: `Click rate at ${avgClickRate.toFixed(2)}% across significant campaigns, indicating weak content engagement across the program.`,
      recommendation: "Review content relevance per lifecycle stage. Test dynamic content blocks personalized by user behavior. Ensure mobile optimization of all templates.",
      priority: "P2", severity: 2,
    });
  }

  // === LAYER 2: Global Bounce & List Hygiene (P0/P1) ===
  if (avgBounceRate > 3) {
    recs.push({
      issue: `Average bounce rate at ${avgBounceRate.toFixed(2)}% across significant campaigns (≥1,000 sends), significantly above the 1% acceptable threshold. This degrades sender reputation and wastes IP capacity.`,
      recommendation: "Implement real-time email verification at point of collection. Remove addresses with 2+ consecutive hard bounces. Deploy re-verification for addresses older than 6 months. Follow CleverTap Email Best Practices: Email Data Collection.",
      priority: "P0", severity: 6,
    });
  } else if (avgBounceRate > 1) {
    recs.push({
      issue: `Bounce rate at ${avgBounceRate.toFixed(2)}% across significant campaigns, above optimal threshold. Sustained levels will erode sender score over time.`,
      recommendation: "Audit list acquisition sources for quality. Implement email validation API at signup. Consider monthly re-verification cycles for dormant addresses.",
      priority: "P1", severity: 5,
    });
  }

  // === LAYER 3: Global Unsubscribe Patterns (account-wide, not campaign-specific) ===
  if (avgUnsubRate > 0.5) {
    recs.push({
      issue: `Account-wide unsubscribe rate at ${avgUnsubRate.toFixed(2)}%, indicating systemic content-audience mismatch or frequency fatigue across the program.`,
      recommendation: "Deploy a preference center allowing frequency and content category control. Reduce send cadence for segments with >0.5% unsub rate. A/B test content personalization by lifecycle stage per CleverTap Email Best Practices: Audience Selection.",
      priority: "P0", severity: 7,
    });
  } else if (avgUnsubRate > 0.2) {
    recs.push({
      issue: `Account-wide unsubscribe rate at ${avgUnsubRate.toFixed(2)}%, approaching warning threshold. Early intervention prevents escalation.`,
      recommendation: "Segment campaigns by content interest. Introduce send frequency caps per user (max 3 emails/week). A/B test subject line relevance per audience cohort.",
      priority: "P1", severity: 4,
    });
  }

  // === LAYER 4: Global Engagement Analysis (P1/P2) ===
  if (avgOpenRate < 10) {
    recs.push({
      issue: `Average open rate at ${avgOpenRate.toFixed(1)}% across significant campaigns, indicating systemic inbox placement issues or audience-content misalignment across the program.`,
      recommendation: "Conduct seed-based inbox placement testing across Gmail, Yahoo, and Outlook. Review sender authentication chain (SPF/DKIM/DMARC). Shift 30% of promotional volume to behavior-triggered journeys. Follow CleverTap Email Best Practices: Campaign Content.",
      priority: "P1", severity: 6,
    });
  } else if (avgOpenRate < 15) {
    recs.push({
      issue: `Open rate at ${avgOpenRate.toFixed(1)}% across significant campaigns, below industry benchmark. This suggests either filtering or subject line fatigue.`,
      recommendation: "Implement systematic subject line A/B testing (minimum 10% holdout). Optimize send-time per segment using engagement history. Review from-name consistency.",
      priority: "P2", severity: 3,
    });
  }

  if (avgClickRate < 1 && avgOpenRate > 5) {
    recs.push({
      issue: `Click rate at ${avgClickRate.toFixed(2)}% despite ${avgOpenRate.toFixed(1)}% open rate — significant open-to-click drop-off indicates CTA or content structure issues across the program.`,
      recommendation: "Audit CTA placement (above-the-fold primary CTA). Ensure mobile-responsive templates. Test single-CTA vs multi-CTA layouts. Align content promise in subject line with email body.",
      priority: "P2", severity: 2,
    });
  } else if (avgClickRate < 1) {
    recs.push({
      issue: `Click rate at ${avgClickRate.toFixed(2)}% across significant campaigns, indicating weak content engagement across the program.`,
      recommendation: "Review content relevance per lifecycle stage. Test dynamic content blocks personalized by user behavior. Ensure mobile optimization of all templates.",
      priority: "P2", severity: 2,
    });
  }

  // === LAYER 5: Lifecycle Gap Detection (structural, not campaign-specific) ===
  const highPerformLowVolume = significantCampaigns.filter(c =>
    c.totalSentUsers > 0 && c.totalSentUsers < totalSent * 0.01 &&
    (c.uniqueViewedWithinConversion / c.totalSentUsers) * 100 > avgOpenRate * 1.5
  );
  if (highPerformLowVolume.length >= 3) {
    const examples = highPerformLowVolume.slice(0, 2).map(c => `"${c.campaignName}"`).join(", ");
    recs.push({
      issue: `${highPerformLowVolume.length} campaigns show strong engagement (>1.5x avg open rate) but account for <1% of total volume each. Examples: ${examples}. Lifecycle-triggered messaging is underutilized.`,
      recommendation: "Expand trigger-based and lifecycle journey campaigns. Shift 20-30% of batch promotional volume to behavior-triggered journeys (e.g., browse abandonment, milestone-based). This improves engagement ratios and dilutes negative signals.",
      priority: "P2", severity: 4,
    });
  }

  // === LAYER 6: Campaign Structure Concentration (structural) ===
  const channels = new Map<string, number>();
  significantCampaigns.forEach(c => {
    channels.set(c.channel, (channels.get(c.channel) || 0) + 1);
  });
  const totalCampaigns = significantCampaigns.length;
  channels.forEach((count, channel) => {
    const pct = (count / totalCampaigns) * 100;
    if (pct > 70) {
      recs.push({
        issue: `${channel} channel accounts for ${pct.toFixed(0)}% of all significant campaigns (${count}/${totalCampaigns}), indicating over-concentration on a single campaign type.`,
        recommendation: `Diversify campaign mix by introducing transactional triggers, lifecycle journeys, and re-engagement automations alongside ${channel} campaigns. Target <50% concentration per channel type.`,
        priority: "P2", severity: 2,
      });
    }
  });

  // === LAYER 7: Postmaster Delivery Error Patterns (global) ===
  if (postmasterData && postmasterData.length > 0) {
    const errorDays = postmasterData.filter(p => (p.errorRatio || 0) > 0);
    if (errorDays.length > postmasterData.length * 0.3) {
      recs.push({
        issue: `Delivery errors detected on ${errorDays.length} of ${postmasterData.length} days (${((errorDays.length / postmasterData.length) * 100).toFixed(0)}%). Persistent errors indicate infrastructure or authentication issues.`,
        recommendation: "Verify SPF/DKIM/DMARC alignment across all sending domains. Check for blocklist inclusions via MXToolbox or similar. Review DNS configuration for sending IPs. Follow CleverTap Email Best Practices: Compliance.",
        priority: "P1", severity: 5,
      });
    }
  }

  // If no issues found, add a positive note
  if (recs.length === 0) {
    recs.push({
      issue: "No critical deliverability or engagement issues detected in the analyzed period (campaigns ≥1,000 sends).",
      recommendation: "Continue current practices. Maintain daily monitoring cadence via Postmaster Tools for early detection of emerging patterns.",
      priority: "P2", severity: 0,
    });
  }

  return sortByPriority(recs);
};

interface ColorResult {
  colorClass: string;
  tooltip: string;
}

const getPercentageColor = (value: number, metricType: MetricType): ColorResult => {
  const roundedValue = Math.round(value * 100) / 100; // Round to 2 decimals before evaluation
  
  switch (metricType) {
    case 'openRate':
      // Open Rate: >25% green, 10-25% amber, ≤10% red
      if (roundedValue > 25.0) return { colorClass: 'text-green-600 font-medium', tooltip: 'Healthy' };
      if (roundedValue > 10.0) return { colorClass: 'text-amber-600 font-medium', tooltip: 'Needs Attention' };
      return { colorClass: 'text-red-600 font-medium', tooltip: 'Deliverability Risk' };
    
    case 'clickRate':
      // Click Rate: >3% green, 1.5-3% amber, ≤1.5% red
      if (roundedValue > 3.0) return { colorClass: 'text-green-600 font-medium', tooltip: 'Healthy' };
      if (roundedValue > 1.5) return { colorClass: 'text-amber-600 font-medium', tooltip: 'Needs Attention' };
      return { colorClass: 'text-red-600 font-medium', tooltip: 'Deliverability Risk' };
    
    case 'bounceRate':
      // Bounce Rate: <1% green, 1-3% amber, >3% red
      if (roundedValue < 1.0) return { colorClass: 'text-green-600 font-medium', tooltip: 'Healthy' };
      if (roundedValue <= 3.0) return { colorClass: 'text-amber-600 font-medium', tooltip: 'Needs Attention' };
      return { colorClass: 'text-red-600 font-medium', tooltip: 'Deliverability Risk' };
    
    case 'unsubscribeRate':
      // Unsubscribe Rate: <0.3% green, 0.3-0.7% amber, >0.7% red
      if (roundedValue < 0.3) return { colorClass: 'text-green-600 font-medium', tooltip: 'Healthy' };
      if (roundedValue <= 0.7) return { colorClass: 'text-amber-600 font-medium', tooltip: 'Needs Attention' };
      return { colorClass: 'text-red-600 font-medium', tooltip: 'Deliverability Risk' };
    
    default:
      return { colorClass: 'text-muted-foreground', tooltip: '' };
  }
};

// Colored percentage cell component
const ColoredPercent: React.FC<{ value: number; metricType: MetricType }> = ({ value, metricType }) => {
  const { colorClass, tooltip } = getPercentageColor(value, metricType);
  return (
    <span className={colorClass} title={tooltip}>
      {formatPercent(value)}
    </span>
  );
};

// Wrapper component for extended insights that computes coverage data
const StrategicInsightsExtendedWrapper: React.FC<{
  campaignData: CampaignRow[];
  eventSchemaData: EventSchemaRow[] | null;
  userPropertyData: UserPropertyRow[] | null;
  industry: string;
  brandName: string;
  brandProfile?: CoreBrandJSON | null;
  websiteUrl?: string;
}> = ({ campaignData, eventSchemaData, userPropertyData, industry, brandName, brandProfile, websiteUrl }) => {
  const { resources, getResourcesForTab } = useResourceLibrary();
  
  const { extendedData, activeCoverage, coverageData } = useMemo(() => {
    // Build coverage data from internal resources
    const tabResources = getResourcesForTab("inbox-potential");
    const coverageData: CoverageDataForRevenue[] = [];
    
    tabResources.forEach(r => {
      const journeys = r.journeys || [];
      const campaigns = r.campaigns || [];
      [...journeys, ...campaigns].forEach(uc => {
        const name = 'name' in uc ? uc.name : '';
        const stage = uc.stage || "Unknown";
        const matchCount = campaignData.filter(c => 
          c.campaignName.toLowerCase().includes(name.toLowerCase().split(" ")[0]) ||
          (c.title || "").toLowerCase().includes(name.toLowerCase().split(" ")[0])
        ).length;
        
        coverageData.push({
          useCaseName: name,
          stage,
          status: matchCount > 0 ? "active" : "missing",
          campaignCount: matchCount,
        });
      });
    });

    if (coverageData.length === 0) {
      const stages = ["Onboarding", "Engagement", "Monetization", "Retention", "Churn Prevention"];
      stages.forEach(s => coverageData.push({ useCaseName: `${s} Journey`, stage: s, status: "missing", campaignCount: 0 }));
    }

    // Build activeCoverage for opportunity engine
    const activeCoverage: ActiveUseCaseInfo[] = coverageData.map(cd => ({
      name: cd.useCaseName,
      stage: cd.stage,
      status: cd.status,
    }));

    const extendedData = generateExtendedInsights(campaignData, coverageData, eventSchemaData, userPropertyData, brandName);

    return { extendedData, activeCoverage, coverageData };
  }, [campaignData, eventSchemaData, userPropertyData, brandName, getResourcesForTab]);

  return (
    <>
      <StrategicInsightsExtended data={extendedData} />
      {/* Opportunity Refresh Engine */}
      <OpportunityRefreshEngine
        campaignData={campaignData}
        activeCoverage={activeCoverage}
        sendMix={extendedData.sendMix}
        eventSchemaData={eventSchemaData}
        userPropertyData={userPropertyData}
        brandProfile={brandProfile || null}
        websiteUrl={websiteUrl || ""}
      />
    </>
  );
};

export const InboxDiagnosticsTab: React.FC<InboxDiagnosticsTabProps> = ({
  industry,
  viewMode = "app",
  onDataChange,
  brandProfile,
  websiteUrl,
  eventSchemaCSV: brandEventSchemaCSV,
  userPropertiesCSV: brandUserPropertiesCSV,
}) => {
  // File states
  const [campaignValidation, setCampaignValidation] = useState<ValidationResult | null>(null);
  const [postmasterValidation, setPostmasterValidation] = useState<PostmasterValidationResult | null>(null);
  const [campaignData, setCampaignData] = useState<CampaignRow[]>([]);
  const [postmasterData, setPostmasterData] = useState<PostmasterRow[] | null>(null);
  const [processingSummary, setProcessingSummary] = useState<ProcessingSummary | null>(null);
  const [contextText, setContextText] = useState<string>("");
  const [campaignFileName, setCampaignFileName] = useState<string>("");
  const [postmasterFileName, setPostmasterFileName] = useState<string>("");
  const [eventSchemaFileName, setEventSchemaFileName] = useState<string>("");
  const [userPropertyFileName, setUserPropertyFileName] = useState<string>("");
  const [eventSchemaData, setEventSchemaData] = useState<EventSchemaRow[] | null>(null);
  const [userPropertyData, setUserPropertyData] = useState<UserPropertyRow[] | null>(null);

  // Auto-populate from brand-persisted schema CSVs
  useEffect(() => {
    if (!eventSchemaData && brandEventSchemaCSV) {
      const result = parseEventSchemaCSV(brandEventSchemaCSV);
      if (result.isValid && result.data.length > 0) {
        setEventSchemaData(result.data);
        setEventSchemaFileName("Brand Profile (auto-loaded)");
      }
    }
  }, [brandEventSchemaCSV]);

  useEffect(() => {
    if (!userPropertyData && brandUserPropertiesCSV) {
      const result = parseUserPropertyCSV(brandUserPropertiesCSV);
      if (result.isValid && result.data.length > 0) {
        setUserPropertyData(result.data);
        setUserPropertyFileName("Brand Profile (auto-loaded)");
      }
    }
  }, [brandUserPropertiesCSV]);

  // Creative Analyzer states
  const [creativeImage, setCreativeImage] = useState<string | null>(null);
  const [creativeFileName, setCreativeFileName] = useState<string>("");
  const [creativeContext, setCreativeContext] = useState<string>("");
  const [isAnalyzingCreative, setIsAnalyzingCreative] = useState(false);
  const [creativeAnalysis, setCreativeAnalysis] = useState<{
    effectivePractices: { area: string; practice: string }[];
    riskAreas: { area: string; observation: string; impact: string }[];
    improvements: string[];
  } | null>(null);
  
   // Campaign sort toggles (independent per table)
   const [bestSortBy, setBestSortBy] = useState<"openRate" | "clickRate">("openRate");
   const [worstSortBy, setWorstSortBy] = useState<"openRate" | "clickRate">("openRate");

  // UI states
  const [isDraggingCampaign, setIsDraggingCampaign] = useState(false);
  const [isDraggingPostmaster, setIsDraggingPostmaster] = useState(false);
  const [activeReport, setActiveReport] = useState<"analysis" | "strategic" | null>(null);
  const [strategicInsights, setStrategicInsights] = useState<StrategicInsightsOutput | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [strategicContext, setStrategicContext] = useState<string>("");
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const emailMetricsRef = useRef<HTMLDivElement>(null);
  const reputationTrendsRef = useRef<HTMLDivElement>(null);
  const creativeAnalysisRef = useRef<HTMLDivElement>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    provider: true,
    monthly: true,
    reputationTrends: true,
    best: true,
    worst: true,
    trends: true,
    learnings: true,
    issues: true,
    useCaseCoverage: false,
    lifecycleCoverage: true,
    infrastructure: true,
    emailMetricsTrend: true,
  });

  // Section-wise insights (memoized)
  const sectionInsights = useMemo<SectionInsights | null>(() => {
    if (!diagnostics?.analysisReport) return null;
    return generateSectionInsights(
      diagnostics.rawData,
      diagnostics.analysisReport,
      postmasterData,
      null, // extendedData computed elsewhere
      null, // lifecycleCoverageStats — computed by child components
    );
  }, [diagnostics, postmasterData]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // File handlers
  const handleCampaignUpload = useCallback((file: File) => {
    setCampaignFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = parseCSV(text);
      setCampaignValidation(result);
      setProcessingSummary(result.processingSummary);
      if (result.isValid) {
        setCampaignData(result.data);
      }
    };
    reader.readAsText(file);
  }, []);

  const handlePostmasterUpload = useCallback((file: File) => {
    setPostmasterFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = parsePostmasterCSV(text);
      setPostmasterValidation(result);
      if (result.isValid) {
        setPostmasterData(result.data);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDropCampaign = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCampaign(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) {
      handleCampaignUpload(file);
    }
  }, [handleCampaignUpload]);

  const handleDropPostmaster = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPostmaster(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) {
      handlePostmasterUpload(file);
    }
  }, [handlePostmasterUpload]);

  const handleEventSchemaUpload = useCallback((file: File) => {
    setEventSchemaFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = parseEventSchemaCSV(text);
      if (result.isValid) {
        setEventSchemaData(result.data);
        toast.success(`Event schema loaded: ${result.totalEvents} events`);
      } else {
        toast.error(result.errors[0] || "Failed to parse event schema");
        setEventSchemaFileName("");
      }
    };
    reader.readAsText(file);
  }, []);

  const handleUserPropertyUpload = useCallback((file: File) => {
    setUserPropertyFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = parseUserPropertyCSV(text);
      if (result.isValid) {
        setUserPropertyData(result.data);
        toast.success(`User properties loaded: ${result.totalProperties} properties`);
      } else {
        toast.error(result.errors[0] || "Failed to parse user properties");
        setUserPropertyFileName("");
      }
    };
    reader.readAsText(file);
  }, []);

  // Creative image upload handler
  const handleCreativeUpload = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a PNG or JPG image");
      return;
    }
    setCreativeFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setCreativeImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const removeCreativeImage = useCallback(() => {
    setCreativeImage(null);
    setCreativeFileName("");
    setCreativeAnalysis(null);
  }, []);

  const runCreativeAnalysis = useCallback(async () => {
    if (!creativeImage) return;
    setIsAnalyzingCreative(true);
    setCreativeAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke("creative-analyze", {
        body: {
          imageBase64: creativeImage,
          additionalContext: creativeContext || undefined,
          industry: industry || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          toast.error("Rate limit exceeded. Please try again in a moment.");
        } else if (data.error.includes("credits")) {
          toast.error("AI credits exhausted. Please add credits to continue.");
        } else {
          toast.error(data.error);
        }
        return;
      }

      if (data?.success && data?.data) {
        setCreativeAnalysis(data.data);
        toast.success("Creative analysis complete");
      } else {
        throw new Error("Unexpected response format");
      }
    } catch (err: any) {
      console.error("Creative analysis error:", err);
      toast.error(err.message || "Failed to analyze creative. Please try again.");
    } finally {
      setIsAnalyzingCreative(false);
    }
  }, [creativeImage, creativeContext, industry]);

  const runAnalysisReport = useCallback(() => {
    if (campaignData.length === 0) return;
    
    const analysisReport = generateAnalysisReport(campaignData);
    
    // Run reconciliation check (MANDATORY)
    const reconciliation = runReconciliationCheck(
      campaignData,
      analysisReport.providerAggregates,
      analysisReport.monthlyOverview
    );
    
    // Update processing summary with reconciliation results
    if (processingSummary) {
      setProcessingSummary({
        ...processingSummary,
        reconciliation,
      });
    }
    
    const newDiagnostics: DiagnosticsData = {
      rawData: campaignData,
      postmasterData,
      contextText: contextText || null,
      analysisReport,
      reputationReport: null,
    };
    setDiagnostics(newDiagnostics);
    setActiveReport("analysis");
    onDataChange?.(newDiagnostics);

    // Trigger creative analysis if image is uploaded
    if (creativeImage && !creativeAnalysis && !isAnalyzingCreative) {
      runCreativeAnalysis();
    }
  }, [campaignData, postmasterData, contextText, processingSummary, onDataChange, creativeImage, creativeAnalysis, isAnalyzingCreative, runCreativeAnalysis]);

  const runStrategicInsights = useCallback(async () => {
    if (!industry) return;
    setIsGeneratingInsights(true);
    setActiveReport("strategic");
    setStrategicInsights(null);

    // Determine mode
    const hasCSV = campaignData.length > 0;
    const hasSegmentation = hasCSV && campaignData.some(c => c.whoQuery && c.whoQuery.trim().length > 0);
    const mode = !hasCSV ? "website-only" : hasSegmentation ? "website-csv-segmentation" : "website-csv";

    // Build campaign summary for AI (don't send raw CSV)
    let campaignSummary = null;
    if (hasCSV) {
      const significantCampaigns = campaignData.filter(c => c.totalSentUsers >= 1000);
      const totalVolume = significantCampaigns.reduce((s, c) => s + c.totalSentUsers, 0);
      const totalViewed = significantCampaigns.reduce((s, c) => s + c.uniqueViewedWithinConversion, 0);
      const totalClicked = significantCampaigns.reduce((s, c) => s + c.uniqueClickedWithinConversion, 0);
      const totalBounce = significantCampaigns.reduce((s, c) => s + c.hardBounces + c.softBounces, 0);
      const totalUnsub = significantCampaigns.reduce((s, c) => s + c.totalUnsubscribes, 0);
      const channels = [...new Set(campaignData.map(c => c.channel))];
      const dates = [...new Set(campaignData.map(c => c.startDate))].sort();
      const triggerKeywords = ["triggered", "journey", "automation", "auto", "event", "behavior", "real-time", "drip"];
      const triggerCount = campaignData.filter(c => triggerKeywords.some(kw => c.campaignName.toLowerCase().includes(kw))).length;

      const segments = campaignData.filter(c => c.whoQuery?.trim()).map(c => c.whoQuery.trim());
      const uniqueSegments = [...new Set(segments)];

      campaignSummary = {
        totalCampaigns: significantCampaigns.length,
        totalVolume,
        avgOpenRate: totalVolume > 0 ? ((totalViewed / totalVolume) * 100).toFixed(2) : "0",
        avgClickRate: totalVolume > 0 ? ((totalClicked / totalVolume) * 100).toFixed(2) : "0",
        avgBounceRate: totalVolume > 0 ? ((totalBounce / totalVolume) * 100).toFixed(2) : "0",
        avgUnsubRate: totalVolume > 0 ? ((totalUnsub / totalVolume) * 100).toFixed(2) : "0",
        channels,
        dateRange: dates.length > 0 ? `${dates[0]} to ${dates[dates.length - 1]}` : undefined,
        triggerRatio: `${Math.round((triggerCount / campaignData.length) * 100)}% trigger / ${Math.round(((campaignData.length - triggerCount) / campaignData.length) * 100)}% batch`,
        hasSegmentation,
        sampleCampaignNames: significantCampaigns.slice(0, 15).map(c => c.campaignName),
        sampleSubjectLines: significantCampaigns.slice(0, 10).map(c => c.title || c.subjectLine).filter(Boolean),
        segmentSummary: hasSegmentation ? `${uniqueSegments.length} unique segments across ${segments.length} campaigns` : undefined,
      };
    }

    try {
      const { data, error } = await supabase.functions.invoke("strategic-insights", {
        body: {
          brandProfile: brandProfile || null,
          industry,
          websiteUrl: websiteUrl || "",
          strategicContext,
          campaignSummary,
          mode,
        },
      });

      if (error) {
        console.error("Strategic insights error:", error);
        toast.error("Failed to generate strategic insights. Please try again.");
        setIsGeneratingInsights(false);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setIsGeneratingInsights(false);
        return;
      }

      if (data?.success && data?.data) {
        setStrategicInsights(data.data as StrategicInsightsOutput);
      } else {
        toast.error("Unexpected response format. Please try again.");
      }
    } catch (err) {
      console.error("Strategic insights generation failed:", err);
      toast.error("Failed to generate strategic insights. Please try again.");
    } finally {
      setIsGeneratingInsights(false);
    }
  }, [industry, brandProfile, websiteUrl, campaignData, strategicContext]);

  const clearAll = useCallback(() => {
    setCampaignValidation(null);
    setPostmasterValidation(null);
    setCampaignData([]);
    setPostmasterData(null);
    setProcessingSummary(null);
    setContextText("");
    setStrategicContext("");
    setCampaignFileName("");
    setPostmasterFileName("");
    setEventSchemaFileName("");
    setUserPropertyFileName("");
    setEventSchemaData(null);
    setUserPropertyData(null);
    setCreativeImage(null);
    setCreativeFileName("");
    setCreativeContext("");
    setCreativeAnalysis(null);
    setDiagnostics(null);
    setStrategicInsights(null);
    setActiveReport(null);
    onDataChange?.(null);
  }, [onDataChange]);

  // Presentation mode
  if (viewMode === "presentation" && diagnostics) {
    return (
      <div className="flex flex-col items-center gap-8">
        <InboxDiagnosticsSlides diagnostics={diagnostics} activeReport={activeReport === "strategic" ? "analysis" : activeReport} />
      </div>
    );
  }

  const hasData = campaignData.length > 0;

  return (
    <div className="space-y-6">
      {/* Input Section */}
      {!activeReport && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Campaign CSV Upload (Required) */}
          <div className="magic-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                Campaign Performance CSV
                <span className="text-xs text-primary font-normal">(Required)</span>
              </h3>
              {campaignFileName && (
                <button onClick={() => { setCampaignValidation(null); setCampaignData([]); setCampaignFileName(""); }} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {!campaignFileName ? (
              <motion.div
                onDragOver={(e) => { e.preventDefault(); setIsDraggingCampaign(true); }}
                onDragLeave={() => setIsDraggingCampaign(false)}
                onDrop={handleDropCampaign}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                  isDraggingCampaign ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleCampaignUpload(e.target.files[0])}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className={`w-8 h-8 mx-auto mb-2 ${isDraggingCampaign ? "text-primary" : "text-muted-foreground"}`} />
                <p className="text-sm text-muted-foreground">Drop CSV or click to upload</p>
              </motion.div>
            ) : (
              <div className="flex items-center gap-3 bg-primary/5 rounded-lg px-4 py-3">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="font-medium text-sm">{campaignFileName}</span>
                <span className="text-xs text-muted-foreground">• {campaignData.length} campaigns loaded</span>
              </div>
            )}

            {/* Required headers info */}
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Required headers (case-sensitive):</p>
              <div className="flex flex-wrap gap-1.5">
                {REQUIRED_HEADERS.slice(0, 8).map(h => (
                  <span key={h} className="px-2 py-0.5 text-xs font-mono bg-muted text-muted-foreground rounded">
                    {h}
                  </span>
                ))}
                <span className="px-2 py-0.5 text-xs text-muted-foreground">+{REQUIRED_HEADERS.length - 8} more</span>
              </div>
            </div>

            {/* Validation errors */}
            <AnimatePresence>
              {campaignValidation && !campaignValidation.isValid && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <div className="text-sm text-destructive">
                      {campaignValidation.errors.map((e, i) => <p key={i}>{e}</p>)}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Postmaster + Creative Upload (1x2 layout) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Postmaster CSV Upload (Optional) */}
            <div className="magic-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4 text-secondary" />
                  Postmaster CSV
                  <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                </h3>
                {postmasterFileName && (
                  <button onClick={() => { setPostmasterValidation(null); setPostmasterData(null); setPostmasterFileName(""); }} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {!postmasterFileName ? (
                <motion.div
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingPostmaster(true); }}
                  onDragLeave={() => setIsDraggingPostmaster(false)}
                  onDrop={handleDropPostmaster}
                  className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                    isDraggingPostmaster ? "border-secondary bg-secondary/5" : "border-border hover:border-secondary/50"
                  }`}
                >
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => e.target.files?.[0] && handlePostmasterUpload(e.target.files[0])}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className={`w-6 h-6 mx-auto mb-2 ${isDraggingPostmaster ? "text-secondary" : "text-muted-foreground"}`} />
                  <p className="text-xs text-muted-foreground">Google Postmaster Tools export</p>
                </motion.div>
              ) : (
                <div className="flex items-center gap-3 bg-secondary/5 rounded-lg px-4 py-3">
                  <CheckCircle2 className="w-5 h-5 text-secondary" />
                  <span className="font-medium text-sm truncate">{postmasterFileName}</span>
                  <span className="text-xs text-muted-foreground">• {postmasterData?.length || 0} records</span>
                </div>
              )}

              <div className="mt-3">
                <p className="text-xs text-muted-foreground">Expected: {POSTMASTER_HEADERS.slice(0, 4).join(", ")}...</p>
              </div>
            </div>

            {/* Creative & Content Effectiveness Analyzer */}
            <div className="magic-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" />
                  Email Creative Upload
                  <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                </h3>
                {creativeFileName && (
                  <button onClick={removeCreativeImage} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {!creativeImage ? (
                <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary/50 transition-colors text-center">
                  <ImageIcon className="w-6 h-6 text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">PNG or JPG (single creative)</p>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg"
                    onChange={(e) => e.target.files?.[0] && handleCreativeUpload(e.target.files[0])}
                  />
                </label>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <img
                      src={creativeImage}
                      alt="Uploaded creative"
                      className="w-full max-h-32 object-contain rounded-lg border border-border"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    <span className="truncate">{creativeFileName}</span>
                  </div>
                </div>
              )}

              {creativeImage && (
                <div className="mt-3">
                  <textarea
                    value={creativeContext}
                    onChange={(e) => setCreativeContext(e.target.value)}
                    placeholder="Additional context (e.g., clipping, low CTR, deliverability issues, AMP email...)"
                    className="w-full h-16 px-3 py-2 rounded-lg bg-muted/30 border border-border focus:border-primary focus:outline-none resize-none text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Analysis runs automatically when you click "Analysis and Report"</p>
                </div>
              )}
            </div>
          </div>

          {/* Event Schema & User Property Schema Uploads (1x2 layout) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Event Schema Upload */}
            <div className="magic-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Event Schema
                  <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                </h3>
                {eventSchemaFileName && (
                  <button onClick={() => { setEventSchemaData(null); setEventSchemaFileName(""); }} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {!eventSchemaFileName ? (
                <div className="relative border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer border-border hover:border-primary/50">
                  <input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleEventSchemaUpload(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Upload events_schema.csv</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Analyze lifecycle instrumentation & funnel health</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-primary/5 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="font-medium text-xs">{eventSchemaFileName}</span>
                  <span className="text-[10px] text-muted-foreground">• {eventSchemaData?.length || 0} events</span>
                </div>
              )}
            </div>

            {/* User Property Schema Upload */}
            <div className="magic-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-primary" />
                  User Property Schema
                  <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                </h3>
                {userPropertyFileName && (
                  <button onClick={() => { setUserPropertyData(null); setUserPropertyFileName(""); }} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {!userPropertyFileName ? (
                <div className="relative border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer border-border hover:border-primary/50">
                  <input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleUserPropertyUpload(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Upload user_properties_schema.csv</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Analyze segmentation & personalization readiness</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-primary/5 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="font-medium text-xs">{userPropertyFileName}</span>
                  <span className="text-[10px] text-muted-foreground">• {userPropertyData?.length || 0} properties</span>
                </div>
              )}
            </div>
          </div>

          {/* Strategic Priorities (Optional - for Strategic Insights) */}
          <div className="magic-card rounded-2xl p-6">
            <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-muted-foreground" />
              Strategic Priorities
              <span className="text-xs text-muted-foreground font-normal">(Optional — for Strategic Insights)</span>
            </h3>
            <textarea
              value={strategicContext}
              onChange={(e) => setStrategicContext(e.target.value)}
              placeholder="Share current business focus areas such as revenue growth, retention improvement, competitive pressure, lifecycle automation, cross-sell expansion, or board mandates."
              className="w-full h-24 px-4 py-3 rounded-xl bg-muted/30 border border-border focus:border-primary focus:outline-none resize-none text-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={runAnalysisReport}
              disabled={!hasData}
              className="flex-1 h-14 text-base font-semibold"
              variant="default"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              Analysis and Report
            </Button>
            <Button
              onClick={runStrategicInsights}
              disabled={!industry || isGeneratingInsights}
              className="flex-1 h-14 text-base font-semibold bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] text-primary-foreground hover:opacity-90"
            >
              {isGeneratingInsights ? (
                <>
                  <div className="w-5 h-5 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating AI Insights...
                </>
              ) : (
                <>
                  <Lightbulb className="w-5 h-5 mr-2" />
                  Strategic Insights
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Strategic Insights View */}
      {activeReport === "strategic" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-gradient-magic">Strategic Growth & Lifecycle Acceleration</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setActiveReport(null)}>
                ← Back
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear All
              </Button>
            </div>
          </div>
          {isGeneratingInsights ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-muted-foreground text-sm font-medium">AI is analyzing your brand and generating personalized strategic insights...</p>
              <p className="text-muted-foreground/60 text-xs">This may take 15-30 seconds</p>
            </div>
          ) : strategicInsights ? (
            <>
              <StrategicInsights data={strategicInsights} />
              {/* Extended Revenue Intelligence — appended after existing tables */}
              {campaignData.length > 0 && (
                <StrategicInsightsExtendedWrapper
                  campaignData={campaignData}
                  eventSchemaData={eventSchemaData}
                  userPropertyData={userPropertyData}
                  industry={industry}
                  brandName={brandProfile?.brand_identity?.brand_name || ""}
                  brandProfile={brandProfile}
                  websiteUrl={websiteUrl}
                />
              )}
            </>
          ) : null}
        </motion.div>
      )}

      {/* Analysis Report View */}
      {activeReport === "analysis" && diagnostics?.analysisReport && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-gradient-magic">Analysis & Report</h2>
            <div className="flex gap-2">
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => {
                  const learnings = generateIntelligentLearnings(diagnostics.rawData, diagnostics.analysisReport, postmasterData);
                  exportDiagnosticsToPPT({
                    diagnostics,
                    brandName: brandProfile?.brand_identity?.brand_name || "Campaign",
                    brandProfile: brandProfile || null,
                    signalHealthData: [],
                    intelligentLearnings: learnings,
                    industry,
                    sourceFileName: campaignFileName,
                    creativeAnalysis: creativeAnalysis || null,
                    creativeImage: creativeImage || null,
                  });
                }}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Add to PPT
              </Button>
              <Button variant="outline" size="sm" onClick={() => setActiveReport(null)}>
                ← Back
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear All
              </Button>
            </div>
          </div>

          {/* Data Integrity & Calculation Rules Panel */}
          {processingSummary && <DataIntegrityPanel processingSummary={processingSummary} />}

          {/* Report 1a: Campaign Overview by Provider with Percentages */}
          <CollapsibleSection
            title="Campaign Overview (by Provider)"
            icon={<BarChart3 className="w-5 h-5 text-primary" />}
            isOpen={expandedSections.provider}
            onToggle={() => toggleSection("provider")}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Provider</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Sent</th>
                    {diagnostics.analysisReport.providerAggregates[0]?.useDeliveredAsDenominator && (
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Delivered</th>
                    )}
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Viewed</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">View %</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Clicked</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Click %</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Unsubs</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Unsub %</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Hard Bounce</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Hard %</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Soft Bounce</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Soft %</th>
                  </tr>
                </thead>
                <tbody>
                  {diagnostics.analysisReport.providerAggregates.map((p, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-2 px-3">
                        <span className="font-medium">{p.serviceProvider}</span>
                        <span className="text-muted-foreground ml-1">/ {p.providerName}</span>
                      </td>
                      <td className="text-right py-2 px-3">{formatNumber(p.totalSentUsers)}</td>
                      {p.useDeliveredAsDenominator && (
                        <td className="text-right py-2 px-3">{formatNumber(p.totalDeliveredUsers)}</td>
                      )}
                      <td className="text-right py-2 px-3">{formatNumber(p.uniqueViewed)}</td>
                      <td className="text-right py-2 px-3"><ColoredPercent value={p.viewPercent} metricType="openRate" /></td>
                      <td className="text-right py-2 px-3">{formatNumber(p.uniqueClicked)}</td>
                      <td className="text-right py-2 px-3"><ColoredPercent value={p.clickPercent} metricType="clickRate" /></td>
                      <td className="text-right py-2 px-3">{formatNumber(p.unsubscribes)}</td>
                      <td className="text-right py-2 px-3"><ColoredPercent value={p.unsubscribePercent} metricType="unsubscribeRate" /></td>
                      <td className="text-right py-2 px-3">{formatNumber(p.hardBounces)}</td>
                      <td className="text-right py-2 px-3"><ColoredPercent value={p.hardBouncePercent} metricType="bounceRate" /></td>
                      <td className="text-right py-2 px-3">{formatNumber(p.softBounces)}</td>
                      <td className="text-right py-2 px-3"><ColoredPercent value={p.softBouncePercent} metricType="bounceRate" /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {(() => {
                    const totals = diagnostics.analysisReport.providerAggregates.reduce((acc, p) => ({
                      totalSentUsers: acc.totalSentUsers + p.totalSentUsers,
                      totalDeliveredUsers: acc.totalDeliveredUsers + p.totalDeliveredUsers,
                      uniqueViewed: acc.uniqueViewed + p.uniqueViewed,
                      uniqueClicked: acc.uniqueClicked + p.uniqueClicked,
                      unsubscribes: acc.unsubscribes + p.unsubscribes,
                      hardBounces: acc.hardBounces + p.hardBounces,
                      softBounces: acc.softBounces + p.softBounces,
                    }), { totalSentUsers: 0, totalDeliveredUsers: 0, uniqueViewed: 0, uniqueClicked: 0, unsubscribes: 0, hardBounces: 0, softBounces: 0 });
                    const useDelivered = diagnostics.analysisReport.providerAggregates[0]?.useDeliveredAsDenominator;
                    const denom = useDelivered ? totals.totalDeliveredUsers : totals.totalSentUsers;
                    return (
                      <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                        <td className="py-2 px-3">Grand Total</td>
                        <td className="text-right py-2 px-3">{formatNumber(totals.totalSentUsers)}</td>
                        {useDelivered && <td className="text-right py-2 px-3">{formatNumber(totals.totalDeliveredUsers)}</td>}
                        <td className="text-right py-2 px-3">{formatNumber(totals.uniqueViewed)}</td>
                        <td className="text-right py-2 px-3"><ColoredPercent value={denom > 0 ? (totals.uniqueViewed / denom) * 100 : 0} metricType="openRate" /></td>
                        <td className="text-right py-2 px-3">{formatNumber(totals.uniqueClicked)}</td>
                        <td className="text-right py-2 px-3"><ColoredPercent value={denom > 0 ? (totals.uniqueClicked / denom) * 100 : 0} metricType="clickRate" /></td>
                        <td className="text-right py-2 px-3">{formatNumber(totals.unsubscribes)}</td>
                        <td className="text-right py-2 px-3"><ColoredPercent value={denom > 0 ? (totals.unsubscribes / denom) * 100 : 0} metricType="unsubscribeRate" /></td>
                        <td className="text-right py-2 px-3">{formatNumber(totals.hardBounces)}</td>
                        <td className="text-right py-2 px-3"><ColoredPercent value={denom > 0 ? (totals.hardBounces / denom) * 100 : 0} metricType="bounceRate" /></td>
                        <td className="text-right py-2 px-3">{formatNumber(totals.softBounces)}</td>
                        <td className="text-right py-2 px-3"><ColoredPercent value={denom > 0 ? (totals.softBounces / denom) * 100 : 0} metricType="bounceRate" /></td>
                      </tr>
                    );
                  })()}
                </tfoot>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              * Percentages calculated using {diagnostics.analysisReport.providerAggregates[0]?.useDeliveredAsDenominator ? 'Delivered' : 'Sent'} as denominator
            </p>
          </CollapsibleSection>

          {/* Report 1b: Monthly Overview with correct date parsing */}
          <CollapsibleSection
            title="Monthly Overview"
            icon={<BarChart3 className="w-5 h-5 text-primary" />}
            isOpen={expandedSections.monthly}
            onToggle={() => toggleSection("monthly")}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Month</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Campaigns</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Sent</th>
                    {diagnostics.analysisReport.monthlyOverview[0]?.useDeliveredAsDenominator && (
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Delivered</th>
                    )}
                    
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Viewed</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">View %</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Clicked</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Click %</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Unsubs</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Unsub %</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Hard Bounce</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Hard %</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Soft Bounce</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Soft %</th>
                  </tr>
                </thead>
                <tbody>
                  {diagnostics.analysisReport.monthlyOverview
                    .filter((m) => {
                      if (m.month !== "Unknown Date") return true;
                      const eb = processingSummary?.exclusionBreakdown;
                      const totalDateIssues = eb ? (eb.invalidStartDateFormat + eb.invalidStartDateCalendar + eb.missingStartDate) : 0;
                      return totalDateIssues > 0;
                    })
                    .map((m, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-2 px-3 font-medium">{m.month}</td>
                      <td className="text-right py-2 px-3">{m.campaignCount}</td>
                      <td className="text-right py-2 px-3">{formatNumber(m.totalSentUsers)}</td>
                      {m.useDeliveredAsDenominator && (
                        <td className="text-right py-2 px-3">{formatNumber(m.totalDeliveredUsers)}</td>
                      )}
                      
                      <td className="text-right py-2 px-3">{formatNumber(m.uniqueViewed)}</td>
                      <td className="text-right py-2 px-3"><ColoredPercent value={m.viewPercent} metricType="openRate" /></td>
                      <td className="text-right py-2 px-3">{formatNumber(m.uniqueClicked)}</td>
                      <td className="text-right py-2 px-3"><ColoredPercent value={m.clickPercent} metricType="clickRate" /></td>
                      <td className="text-right py-2 px-3">{formatNumber(m.unsubscribes)}</td>
                      <td className="text-right py-2 px-3"><ColoredPercent value={m.unsubscribePercent} metricType="unsubscribeRate" /></td>
                      <td className="text-right py-2 px-3">{formatNumber(m.hardBounces)}</td>
                      <td className="text-right py-2 px-3"><ColoredPercent value={m.hardBouncePercent} metricType="bounceRate" /></td>
                      <td className="text-right py-2 px-3">{formatNumber(m.softBounces)}</td>
                      <td className="text-right py-2 px-3"><ColoredPercent value={m.softBouncePercent} metricType="bounceRate" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              * Dates parsed as DD/MM/YY or DD/MM/YYYY format. Percentages calculated using {diagnostics.analysisReport.monthlyOverview[0]?.useDeliveredAsDenominator ? 'Delivered' : 'Sent'} as denominator.
            </p>
          </CollapsibleSection>

          {/* ============= EMAIL METRICS TREND CHART ============= */}
          <CollapsibleSection
            title="Email Metrics Trend"
            icon={<TrendingUp className="w-5 h-5 text-primary" />}
            isOpen={expandedSections.trends}
            onToggle={() => toggleSection("trends")}
            headerRight={
              <Button variant="outline" size="sm" onClick={async (e) => {
                e.stopPropagation();
                if (emailMetricsRef.current) {
                  await exportElementAsPNG(emailMetricsRef.current, "email-metrics-trend.png");
                  toast.success("Email Metrics Trend exported as PNG");
                }
              }}>
                <Download className="w-4 h-4 mr-1" /> PNG
              </Button>
            }
          >
            <div ref={emailMetricsRef}>
              <EmailMetricsTrendChart campaignData={diagnostics.rawData} />
            </div>
          </CollapsibleSection>

          {/* ============= INFRASTRUCTURE DETAILS ============= */}
          <CollapsibleSection
            title="Infrastructure Details"
            icon={<Shield className="w-5 h-5 text-secondary" />}
            isOpen={expandedSections.infrastructure ?? true}
            onToggle={() => toggleSection("infrastructure")}
          >
            <InfrastructureDetailsTable
              campaignData={diagnostics.rawData}
              postmasterData={postmasterData}
            />
          </CollapsibleSection>

          {/* ============= REPUTATION TRENDS (SMALL MULTIPLES) ============= */}
          <CollapsibleSection
            title="Reputation Trends"
            icon={<Activity className="w-5 h-5 text-primary" />}
            isOpen={expandedSections.reputationTrends}
            onToggle={() => toggleSection("reputationTrends")}
            headerRight={
              <Button variant="outline" size="sm" onClick={async (e) => {
                e.stopPropagation();
                if (reputationTrendsRef.current) {
                  await exportElementAsPNG(reputationTrendsRef.current, "reputation-trends.png");
                  toast.success("Reputation Trends exported as PNG");
                }
              }}>
                <Download className="w-4 h-4 mr-1" /> PNG
              </Button>
            }
          >
            <div ref={reputationTrendsRef}>
              <ReputationSmallMultiples
                postmasterData={postmasterData}
                campaignData={diagnostics.rawData}
              />
            </div>
          </CollapsibleSection>

          {/* ============= BEST PERFORMING CAMPAIGNS ============= */}
          <CollapsibleSection
            title="Best Performing Campaigns"
            icon={<TrendingUp className="w-5 h-5 text-green-500" />}
            isOpen={expandedSections.best}
            onToggle={() => toggleSection("best")}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-0.5">
                <button
                   onClick={() => setBestSortBy("openRate")}
                   className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                     bestSortBy === "openRate"
                       ? "bg-primary text-primary-foreground shadow-sm"
                       : "text-muted-foreground hover:text-foreground"
                   }`}
                 >
                   By Unique Open Rate
                 </button>
                 <button
                   onClick={() => setBestSortBy("clickRate")}
                   className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                     bestSortBy === "clickRate"
                       ? "bg-primary text-primary-foreground shadow-sm"
                       : "text-muted-foreground hover:text-foreground"
                   }`}
                 >
                   By Unique CTR
                 </button>
               </div>
               <Button variant="outline" size="sm" onClick={() => exportCampaignsToCSV(diagnostics.analysisReport.bestCampaigns, "best-performing-campaigns")}>
                 <Download className="w-4 h-4 mr-1" /> Export CSV
               </Button>
             </div>
             <div className="overflow-x-auto mb-4">
               <table className="w-full text-sm">
                 <thead>
                   <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Start Date</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Campaign Name</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Subject Line</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Sent</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Unique Open</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Open %</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Unique Clicked</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Click %</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Unique CTR</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Unsubs</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Unsub %</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Hard Bounce</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Hard %</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Soft Bounce</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Soft %</th>
                   </tr>
                 </thead>
                 <tbody>
                   {(bestSortBy === "clickRate"
                     ? [...campaignData].filter(c => c.totalSentUsers >= 1000).map(c => ({
                         campaignId: c.campaignId, campaignName: c.campaignName, subjectLine: c.subjectLine,
                         totalSentUsers: c.totalSentUsers, totalDeliveredUsers: c.totalDeliveredUsers,
                         uniqueViewed: c.uniqueViewedWithinConversion, uniqueClicked: c.uniqueClickedWithinConversion,
                         conversions: c.clickThroughConversions, unsubscribes: c.totalUnsubscribes,
                         hardBounces: c.hardBounces, softBounces: c.softBounces,
                         openRate: c.openRate, clickRate: c.clickRate, startDate: c.startDate,
                       })).sort((a, b) => {
                         const ctrA = a.uniqueViewed > 0 ? (a.uniqueClicked / a.uniqueViewed) * 100 : 0;
                         const ctrB = b.uniqueViewed > 0 ? (b.uniqueClicked / b.uniqueViewed) * 100 : 0;
                         return ctrB - ctrA;
                       })
                     : [...diagnostics.analysisReport.bestCampaigns].sort((a, b) => b.openRate - a.openRate)
                   ).slice(0, 5).map((c, i) => {
                    const denominator = c.totalDeliveredUsers > 0 ? c.totalDeliveredUsers : c.totalSentUsers;
                    const uniqueCTR = c.uniqueViewed > 0 ? (c.uniqueClicked / c.uniqueViewed) * 100 : 0;
                    const unsubPercent = denominator > 0 ? (c.unsubscribes / denominator) * 100 : 0;
                    const hardBouncePercent = denominator > 0 ? (c.hardBounces / denominator) * 100 : 0;
                    const softBouncePercent = denominator > 0 ? (c.softBounces / denominator) * 100 : 0;
                    return (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-2 px-3 whitespace-nowrap text-muted-foreground">{c.startDate}</td>
                        <td className="py-2 px-3 min-w-[180px] whitespace-normal break-words">{c.campaignName}</td>
                        <td className="py-2 px-3 min-w-[200px] whitespace-normal break-words">{cleanSubjectLine(c.subjectLine)}</td>
                        <td className="text-right py-2 px-3">{formatNumber(c.totalSentUsers)}</td>
                        <td className="text-right py-2 px-3">{formatNumber(c.uniqueViewed)}</td>
                        <td className="text-right py-2 px-3"><ColoredPercent value={c.openRate} metricType="openRate" /></td>
                        <td className="text-right py-2 px-3">{formatNumber(c.uniqueClicked)}</td>
                        <td className="text-right py-2 px-3"><ColoredPercent value={c.clickRate} metricType="clickRate" /></td>
                        <td className="text-right py-2 px-3"><ColoredPercent value={uniqueCTR} metricType="clickRate" /></td>
                        <td className="text-right py-2 px-3">{formatNumber(c.unsubscribes)}</td>
                        <td className="text-right py-2 px-3"><ColoredPercent value={unsubPercent} metricType="unsubscribeRate" /></td>
                        <td className="text-right py-2 px-3">{formatNumber(c.hardBounces)}</td>
                        <td className="text-right py-2 px-3"><ColoredPercent value={hardBouncePercent} metricType="bounceRate" /></td>
                        <td className="text-right py-2 px-3">{formatNumber(c.softBounces)}</td>
                        <td className="text-right py-2 px-3"><ColoredPercent value={softBouncePercent} metricType="bounceRate" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Single-line summary */}
            <p className="text-sm text-muted-foreground italic">
              {(() => {
                const best = diagnostics.analysisReport.bestCampaigns;
                if (best.length === 0) return "";
                const avgOpen = best.reduce((s, c) => s + c.openRate, 0) / best.length;
                const avgClick = best.reduce((s, c) => s + c.clickRate, 0) / best.length;
                return `Top performers achieved ${avgOpen.toFixed(1)}% avg open rate and ${avgClick.toFixed(1)}% click rate.`;
              })()}
            </p>
          </CollapsibleSection>

          {/* ============= UNDER-PERFORMING CAMPAIGNS ============= */}
          <CollapsibleSection
            title="Under-Performing Campaigns"
            icon={<TrendingDown className="w-5 h-5 text-red-500" />}
            isOpen={expandedSections.worst}
            onToggle={() => toggleSection("worst")}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-0.5">
                <button
                   onClick={() => setWorstSortBy("openRate")}
                   className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                     worstSortBy === "openRate"
                       ? "bg-primary text-primary-foreground shadow-sm"
                       : "text-muted-foreground hover:text-foreground"
                   }`}
                 >
                   By Unique Open Rate
                 </button>
                 <button
                   onClick={() => setWorstSortBy("clickRate")}
                   className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                     worstSortBy === "clickRate"
                       ? "bg-primary text-primary-foreground shadow-sm"
                       : "text-muted-foreground hover:text-foreground"
                   }`}
                 >
                   By Unique CTR
                 </button>
               </div>
               <Button variant="outline" size="sm" onClick={() => exportCampaignsToCSV(diagnostics.analysisReport.worstCampaigns, "under-performing-campaigns")}>
                 <Download className="w-4 h-4 mr-1" /> Export CSV
               </Button>
             </div>
             <div className="overflow-x-auto mb-4">
               <table className="w-full text-sm">
                 <thead>
                   <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Start Date</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Campaign Name</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Subject Line</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Sent</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Unique Open</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Open %</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Unique Clicked</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Click %</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Unique CTR</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Unsubs</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Unsub %</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Hard Bounce</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Hard %</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Soft Bounce</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Soft %</th>
                   </tr>
                 </thead>
                 <tbody>
                   {(worstSortBy === "clickRate"
                     ? [...campaignData].filter(c => c.campaignName && c.campaignName.trim() !== "" && c.totalSentUsers >= 1000).map(c => ({
                         campaignId: c.campaignId, campaignName: c.campaignName, subjectLine: c.subjectLine,
                         totalSentUsers: c.totalSentUsers, totalDeliveredUsers: c.totalDeliveredUsers,
                         uniqueViewed: c.uniqueViewedWithinConversion, uniqueClicked: c.uniqueClickedWithinConversion,
                         conversions: c.clickThroughConversions, unsubscribes: c.totalUnsubscribes,
                         hardBounces: c.hardBounces, softBounces: c.softBounces,
                         openRate: c.openRate, clickRate: c.clickRate, startDate: c.startDate,
                       })).sort((a, b) => {
                         const ctrA = a.uniqueViewed > 0 ? (a.uniqueClicked / a.uniqueViewed) * 100 : 0;
                         const ctrB = b.uniqueViewed > 0 ? (b.uniqueClicked / b.uniqueViewed) * 100 : 0;
                         return ctrA - ctrB;
                       })
                     : [...diagnostics.analysisReport.worstCampaigns].filter(c => c.campaignName && c.campaignName.trim() !== "").sort((a, b) => a.openRate - b.openRate)
                   ).slice(0, 5).map((c, i) => {
                    const denominator = c.totalDeliveredUsers > 0 ? c.totalDeliveredUsers : c.totalSentUsers;
                    const uniqueCTR = c.uniqueViewed > 0 ? (c.uniqueClicked / c.uniqueViewed) * 100 : 0;
                    const unsubPercent = denominator > 0 ? (c.unsubscribes / denominator) * 100 : 0;
                    const hardBouncePercent = denominator > 0 ? (c.hardBounces / denominator) * 100 : 0;
                    const softBouncePercent = denominator > 0 ? (c.softBounces / denominator) * 100 : 0;
                    return (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-2 px-3 whitespace-nowrap text-muted-foreground">{c.startDate}</td>
                        <td className="py-2 px-3 min-w-[180px] whitespace-normal break-words">{c.campaignName}</td>
                        <td className="py-2 px-3 min-w-[200px] whitespace-normal break-words">{cleanSubjectLine(c.subjectLine)}</td>
                        <td className="text-right py-2 px-3">{formatNumber(c.totalSentUsers)}</td>
                        <td className="text-right py-2 px-3">{formatNumber(c.uniqueViewed)}</td>
                        <td className="text-right py-2 px-3"><ColoredPercent value={c.openRate} metricType="openRate" /></td>
                        <td className="text-right py-2 px-3">{formatNumber(c.uniqueClicked)}</td>
                        <td className="text-right py-2 px-3"><ColoredPercent value={c.clickRate} metricType="clickRate" /></td>
                        <td className="text-right py-2 px-3"><ColoredPercent value={uniqueCTR} metricType="clickRate" /></td>
                        <td className="text-right py-2 px-3">{formatNumber(c.unsubscribes)}</td>
                        <td className="text-right py-2 px-3"><ColoredPercent value={unsubPercent} metricType="unsubscribeRate" /></td>
                        <td className="text-right py-2 px-3">{formatNumber(c.hardBounces)}</td>
                        <td className="text-right py-2 px-3"><ColoredPercent value={hardBouncePercent} metricType="bounceRate" /></td>
                        <td className="text-right py-2 px-3">{formatNumber(c.softBounces)}</td>
                        <td className="text-right py-2 px-3"><ColoredPercent value={softBouncePercent} metricType="bounceRate" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Single-line summary */}
            <p className="text-sm text-muted-foreground italic">
              {(() => {
                const worst = diagnostics.analysisReport.worstCampaigns;
                if (worst.length === 0) return "";
                const avgOpen = worst.reduce((s, c) => s + c.openRate, 0) / worst.length;
                const avgClick = worst.reduce((s, c) => s + c.clickRate, 0) / worst.length;
                return `Under-performers averaged ${avgOpen.toFixed(1)}% open rate and ${avgClick.toFixed(1)}% click rate.`;
              })()}
            </p>
          </CollapsibleSection>

          {/* ============= CREATIVE & CONTENT EFFECTIVENESS ANALYZER ============= */}
          {(creativeAnalysis || isAnalyzingCreative) && (
            <CollapsibleSection
              title="Creative & Content Effectiveness Analyzer"
              icon={<Palette className="w-5 h-5 text-primary" />}
              isOpen={expandedSections.creativeAnalysis ?? true}
              onToggle={() => toggleSection("creativeAnalysis")}
              headerRight={creativeAnalysis ? (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={async (e) => {
                    e.stopPropagation();
                    if (creativeAnalysisRef.current) {
                      await exportElementAsPNG(creativeAnalysisRef.current, "creative-analysis.png");
                      toast.success("Creative Analysis exported as PNG");
                    }
                  }}>
                    <Download className="w-4 h-4 mr-1" /> PNG
                  </Button>
                  <Button variant="outline" size="sm" onClick={(e) => {
                    e.stopPropagation();
                    if (creativeAnalysis) {
                      exportCreativeAnalysisAsText(creativeAnalysis, "creative-analysis.txt");
                      toast.success("Creative Analysis exported as text");
                    }
                  }}>
                    <Download className="w-4 h-4 mr-1" /> TXT
                  </Button>
                  <Button variant="outline" size="sm" onClick={(e) => {
                    e.stopPropagation();
                    if (creativeAnalysis) {
                      exportCreativeAnalysisAsCSV(creativeAnalysis, "creative-analysis.csv");
                      toast.success("Creative Analysis exported as CSV");
                    }
                  }}>
                    <Download className="w-4 h-4 mr-1" /> CSV
                  </Button>
                </div>
              ) : undefined}
            >
              {isAnalyzingCreative ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Analyzing email creative...</p>
                </div>
              ) : creativeAnalysis ? (
                <div ref={creativeAnalysisRef} className="space-y-6">
                  {/* Effective Practices */}
                  <div>
                    <h4 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Effective Design & Content Practices
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground w-36">Area</th>
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Practice</th>
                          </tr>
                        </thead>
                        <tbody>
                          {creativeAnalysis.effectivePractices.map((p, i) => (
                            <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                              <td className="py-2 px-3 font-medium text-foreground">{p.area}</td>
                              <td className="py-2 px-3 text-muted-foreground">{p.practice}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Risk Areas */}
                  <div>
                    <h4 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Design & Content Risk Areas
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground w-36">Area</th>
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Observation</th>
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Impact</th>
                          </tr>
                        </thead>
                        <tbody>
                          {creativeAnalysis.riskAreas.map((r, i) => (
                            <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                              <td className="py-2 px-3 font-medium text-foreground">{r.area}</td>
                              <td className="py-2 px-3 text-muted-foreground">{r.observation}</td>
                              <td className="py-2 px-3 text-muted-foreground">{r.impact}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Improvements */}
                  <div>
                    <h4 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-primary" />
                      Recommended Optimizations
                    </h4>
                    <div className="space-y-2">
                      {creativeAnalysis.improvements.map((imp, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="w-5 h-5 flex items-center justify-center bg-primary/10 text-primary rounded-full text-xs font-medium flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <p className="text-sm text-muted-foreground">{imp}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </CollapsibleSection>
          )}

          {/* ============= SEND MIX & USE CASE COVERAGE (collapsed by default) ============= */}
          <UseCaseCoverageAnalysis
            campaignData={diagnostics.rawData}
            industry={industry}
            isOpen={expandedSections.useCaseCoverage}
            onToggle={() => toggleSection("useCaseCoverage")}
          />

          {/* ============= LIFECYCLE COVERAGE ============= */}
          <LifecycleCoverageMatrix
            campaignData={diagnostics.rawData}
            industry={industry}
            isOpen={expandedSections.lifecycleCoverage}
            onToggle={() => toggleSection("lifecycleCoverage")}
          />

          {/* ============= KEY LEARNINGS & RECOMMENDATIONS (Intelligent Table) ============= */}
          <CollapsibleSection
            title="Key Learnings & Recommendations"
            icon={<Lightbulb className="w-5 h-5 text-amber-500" />}
            isOpen={expandedSections.learnings}
            onToggle={() => toggleSection("learnings")}
          >
            {(() => {
              const recommendations = generateIntelligentLearnings(
                diagnostics.rawData,
                diagnostics.analysisReport,
                postmasterData
              );

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Issue Identified</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Recommendation</th>
                        <th className="text-center py-3 px-4 font-semibold text-foreground">Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recommendations.map((rec, i) => (
                        <tr key={i} className={`border-b border-border/20 hover:bg-muted/10 ${
                          rec.priority === "P0" ? "bg-destructive/5" : ""
                        }`}>
                          <td className="py-3 px-4 whitespace-normal break-words max-w-[350px]">{rec.issue}</td>
                          <td className="py-3 px-4 text-muted-foreground whitespace-normal break-words max-w-[400px]">{rec.recommendation}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                              rec.priority === "P0" ? "bg-destructive/10 text-destructive" :
                              rec.priority === "P1" ? "bg-amber-500/10 text-amber-600" :
                              "bg-primary/10 text-primary"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                rec.priority === "P0" ? "bg-destructive shadow-[0_0_4px_rgba(239,68,68,0.6)]" :
                                rec.priority === "P1" ? "bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.6)]" :
                                "bg-primary shadow-[0_0_4px_rgba(168,85,247,0.6)]"
                              }`} />
                              {rec.priority}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </CollapsibleSection>
        </motion.div>
      )}

      {/* Reputation Repair View - REMOVED */}
      {false && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-gradient-magic">Reputation Repair Analysis</h2>
            <div className="flex gap-2">
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => exportDiagnosticsToPPT({
                  diagnostics,
                  brandName: brandProfile?.brand_identity?.brand_name || "Campaign",
                  brandProfile: brandProfile || null,
                  industry,
                  sourceFileName: campaignFileName,
                })}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Add to PPT
              </Button>
              <Button variant="outline" size="sm" onClick={() => setActiveReport(null)}>
                ← Back
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear All
              </Button>
            </div>
          </div>

          {/* Refusal Notice (if applicable) */}
          {diagnostics.reputationReport.enhancedReport?.refusalReason && (
            <div className="magic-card rounded-2xl p-6 border-2 border-destructive/30 bg-destructive/5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-destructive shrink-0" />
                <div>
                  <h3 className="font-semibold text-destructive">Analysis Cannot Be Completed</h3>
                  <p className="text-sm text-muted-foreground mt-1">{diagnostics.reputationReport.enhancedReport.refusalReason}</p>
                </div>
              </div>
            </div>
          )}

          {/* 0️⃣ Versioning & Scope */}
          {diagnostics.reputationReport.enhancedReport && !diagnostics.reputationReport.enhancedReport.refusalReason && (
            <>
              <div className="magic-card rounded-2xl p-4 bg-muted/30">
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span><strong>Version:</strong> {diagnostics.reputationReport.enhancedReport.versioningScope.analysisVersion}</span>
                  <span><strong>Period:</strong> {diagnostics.reputationReport.enhancedReport.versioningScope.dataRange}</span>
                  <span><strong>Domain:</strong> {diagnostics.reputationReport.enhancedReport.versioningScope.senderDomain}</span>
                  <span><strong>Sources:</strong> {diagnostics.reputationReport.enhancedReport.versioningScope.dataSources.join(", ")}</span>
                </div>
              </div>

              {/* 1️⃣ Monthly Reputation Snapshot */}
              <div className="magic-card rounded-2xl p-6 border-2 border-primary/20 bg-primary/5">
                <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-primary" />
                  Reputation Snapshot (Executive View)
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      diagnostics.reputationReport.enhancedReport.reputationSnapshot.reputationDirection === 'improving' ? 'bg-green-500/20 text-green-600' :
                      diagnostics.reputationReport.enhancedReport.reputationSnapshot.reputationDirection === 'degrading' ? 'bg-red-500/20 text-red-600' :
                      'bg-amber-500/20 text-amber-600'
                    }`}>
                      {diagnostics.reputationReport.enhancedReport.reputationSnapshot.reputationDirection.toUpperCase()}
                    </span>
                    <span className="text-sm">{diagnostics.reputationReport.enhancedReport.reputationSnapshot.reputationEvidence}</span>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li><strong>Primary Stress Signal:</strong> {diagnostics.reputationReport.enhancedReport.reputationSnapshot.primaryStressSignal}</li>
                    <li><strong>Timing Correlation:</strong> {diagnostics.reputationReport.enhancedReport.reputationSnapshot.timingCorrelation}</li>
                    <li><strong>Damage Assessment:</strong> <span className={diagnostics.reputationReport.enhancedReport.reputationSnapshot.damageAssessment === 'structural' ? 'text-red-600 font-medium' : 'text-green-600'}>{diagnostics.reputationReport.enhancedReport.reputationSnapshot.damageAssessment}</span></li>
                  </ul>
                  <div className={`p-3 rounded-lg ${diagnostics.reputationReport.enhancedReport.reputationSnapshot.safeToScale ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                    <p className={`font-semibold ${diagnostics.reputationReport.enhancedReport.reputationSnapshot.safeToScale ? 'text-green-600' : 'text-red-600'}`}>
                      {diagnostics.reputationReport.enhancedReport.reputationSnapshot.verdict}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2️⃣ Reputation Signal Table - Horizontal Layout */}
              <CollapsibleSection
                title="Reputation Signal Table"
                icon={<BarChart3 className="w-5 h-5 text-primary" />}
                isOpen={expandedSections.provider}
                onToggle={() => toggleSection("provider")}
              >
                {(() => {
                  const signalTable = diagnostics.reputationReport.enhancedReport.signalTable;
                  const getSignalMetricType = (signal: string): MetricType | null => {
                    const lower = signal.toLowerCase();
                    if (lower.includes('open') || lower.includes('view')) return 'openRate';
                    if (lower.includes('click')) return 'clickRate';
                    if (lower.includes('bounce')) return 'bounceRate';
                    if (lower.includes('unsub')) return 'unsubscribeRate';
                    return null;
                  };
                  
                  const getTrendColor = (signal: string, trend: string): string => {
                    const isNegativeMetric = signal.toLowerCase().includes('bounce') || 
                                             signal.toLowerCase().includes('unsub') ||
                                             signal.toLowerCase().includes('spam');
                    if (trend === 'up') return isNegativeMetric ? 'text-red-600' : 'text-green-600';
                    if (trend === 'down') return isNegativeMetric ? 'text-green-600' : 'text-red-600';
                    return 'text-muted-foreground';
                  };

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground w-24"></th>
                            {signalTable.map((row, i) => (
                              <th key={i} className="text-center py-2 px-3 font-medium text-muted-foreground min-w-[100px]">
                                {row.signal}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {/* Row 1: Values */}
                          <tr className="border-b border-border/50">
                            <td className="py-2 px-3 font-medium text-muted-foreground">Value</td>
                            {signalTable.map((row, i) => (
                              <td key={i} className="text-center py-2 px-3 font-medium">
                                {typeof row.value === 'number' ? row.value.toLocaleString() : row.value}
                              </td>
                            ))}
                          </tr>
                          {/* Row 2: Percentages with color coding */}
                          <tr className="border-b border-border/50">
                            <td className="py-2 px-3 font-medium text-muted-foreground">Rate %</td>
                            {signalTable.map((row, i) => {
                              const metricType = getSignalMetricType(row.signal);
                              const numericValue = parseFloat(row.percentage.replace('%', ''));
                              return (
                                <td key={i} className="text-center py-2 px-3">
                                  {metricType && !isNaN(numericValue) ? (
                                    <ColoredPercent value={numericValue} metricType={metricType} />
                                  ) : (
                                    <span className="font-medium">{row.percentage}</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                          {/* Row 3: Trend (Combined with Change) */}
                          <tr>
                            <td className="py-2 px-3 font-medium text-muted-foreground">Trend</td>
                            {signalTable.map((row, i) => (
                              <td key={i} className={`text-center py-2 px-3 ${getTrendColor(row.signal, row.trend)}`}>
                                <div className="flex flex-col items-center gap-0.5">
                                  <div className="flex items-center gap-1">
                                    {row.trend === 'up' && <TrendingUp className="w-4 h-4" />}
                                    {row.trend === 'down' && <TrendingDown className="w-4 h-4" />}
                                    {row.trend === 'stable' && <span>–</span>}
                                    {row.trend === 'N/A' && <span className="text-muted-foreground">N/A</span>}
                                  </div>
                                  {row.trendDescription && (
                                    <span className="text-xs opacity-80">{row.trendDescription}</span>
                                  )}
                                </div>
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
                <p className="text-xs text-muted-foreground mt-3">{diagnostics.reputationReport.enhancedReport.signalTableDenominatorNote}</p>
              </CollapsibleSection>

              {/* 3️⃣ MoM Analysis - Horizontal Layout */}
              {diagnostics.reputationReport.enhancedReport.momAnalysis.comparisonAvailable && (
                <CollapsibleSection
                  title="Month-over-Month Analysis"
                  icon={<Calendar className="w-5 h-5 text-primary" />}
                  isOpen={expandedSections.monthly}
                  onToggle={() => toggleSection("monthly")}
                >
                  {(() => {
                    const mom = diagnostics.reputationReport.enhancedReport!.momAnalysis;
                    const categories = ['Changes This Month', 'Stable Factors', 'Worsened Before Shift'];
                    const categoryData = [mom.changesThisMonth, mom.stableFactors, mom.worsenedBeforeShift];
                    const maxRows = Math.max(...categoryData.map(arr => arr.length), 1);
                    
                    return (
                      <div className="space-y-4">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground w-24"></th>
                                {categories.map((cat, i) => (
                                  <th key={i} className={`text-center py-2 px-3 font-medium min-w-[180px] ${
                                    i === 0 ? 'text-amber-600' : i === 1 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {cat}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from({ length: maxRows }).map((_, rowIdx) => (
                                <tr key={rowIdx} className="border-b border-border/50">
                                  <td className="py-2 px-3 font-medium text-muted-foreground text-xs">
                                    {rowIdx === 0 ? 'Observations' : ''}
                                  </td>
                                  {categoryData.map((data, colIdx) => (
                                    <td key={colIdx} className="text-center py-2 px-3 text-xs">
                                      {data[rowIdx] || '—'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {mom.comparisonNote && (
                          <p className="text-xs text-muted-foreground italic">{mom.comparisonNote}</p>
                        )}
                      </div>
                    );
                  })()}
                </CollapsibleSection>
              )}

              {/* 4️⃣ Send Mix & Use Case Coverage Analysis (Stage-Aware) */}
              <UseCaseCoverageAnalysis
                campaignData={diagnostics.rawData}
                industry={industry}
                isOpen={expandedSections.useCaseCoverage}
                onToggle={() => toggleSection("useCaseCoverage")}
              />

              {/* 4.5️⃣ Lifecycle Coverage Visualization & Insight Engine */}
              <LifecycleCoverageMatrix
                campaignData={diagnostics.rawData}
                industry={industry}
                isOpen={expandedSections.lifecycleCoverage}
                onToggle={() => toggleSection("lifecycleCoverage")}
              />

              {/* 5️⃣ Root Cause Summary */}
              {diagnostics.reputationReport.enhancedReport.rootCauses.length > 0 && (
                <CollapsibleSection
                  title="Root Cause Summary"
                  icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
                  isOpen={expandedSections.worst}
                  onToggle={() => toggleSection("worst")}
                >
                  <ul className="space-y-3">
                    {diagnostics.reputationReport.enhancedReport.rootCauses.map((rc, i) => (
                      <li key={i} className="bg-muted/20 rounded-lg p-4">
                        <p className="font-medium">{rc.cause}</p>
                        <p className="text-sm text-muted-foreground mt-1">Evidence: {rc.evidence}</p>
                        <span className="text-xs px-2 py-0.5 bg-muted rounded mt-2 inline-block">{rc.evidenceType.replace('_', ' ')}</span>
                      </li>
                    ))}
                  </ul>
                </CollapsibleSection>
              )}

              {/* 6️⃣ Repair Actions */}
              <CollapsibleSection
                title="Reputation Repair Actions"
                icon={<Lightbulb className="w-5 h-5 text-primary" />}
                isOpen={expandedSections.learnings}
                onToggle={() => toggleSection("learnings")}
              >
                <div className="space-y-3">
                  {diagnostics.reputationReport.enhancedReport.repairActions.map((action, i) => (
                    <div key={i} className="bg-muted/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          action.priority === 'immediate' ? 'bg-red-500/20 text-red-600' :
                          action.priority === 'short-term' ? 'bg-amber-500/20 text-amber-600' :
                          'bg-blue-500/20 text-blue-600'
                        }`}>
                          {action.priority === 'immediate' ? '0-7 days' : action.priority === 'short-term' ? '7-21 days' : 'Ongoing'}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded ${action.confidence === 'high' ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                          {action.confidence} confidence
                        </span>
                      </div>
                      <p className="text-sm">{action.action}</p>
                      {action.metricToWatch && (
                        <p className="text-xs text-muted-foreground mt-2">Watch: {action.metricToWatch} | Abort if: {action.abortCondition}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleSection>

              {/* 9️⃣ Data Quality Notes */}
              {diagnostics.reputationReport.enhancedReport.dataQualityNotes.length > 0 && (
                <div className="magic-card rounded-2xl p-4 bg-amber-500/5 border border-amber-500/20">
                  <h4 className="font-medium text-sm text-amber-600 mb-2">Data Quality & Limitations</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {diagnostics.reputationReport.enhancedReport.dataQualityNotes.map((note, i) => (
                      <li key={i}>• {note.description}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ✅ Final Confirmation */}
              <p className="text-xs text-muted-foreground italic text-center">
                {diagnostics.reputationReport.enhancedReport.finalConfirmation}
              </p>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
};

// Collapsible Section Component
const CollapsibleSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, isOpen, onToggle, headerRight, children }) => (
  <motion.div 
    className="rounded-2xl overflow-hidden"
    style={{
      background: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.04)',
    }}
  >
    <div className="w-full flex items-center justify-between p-6">
      <button
        onClick={onToggle}
        className="flex-1 flex items-center justify-between hover:bg-muted/10 transition-colors"
      >
        <h3 className="font-display text-lg font-bold text-gradient-magic flex items-center gap-2">
          {icon}
          {title}
        </h3>
        {!headerRight && (isOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />)}
      </button>
      {headerRight && (
        <div className="flex items-center gap-2 ml-4">
          {headerRight}
          <button onClick={onToggle}>
            {isOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </button>
        </div>
      )}
    </div>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-6 pb-6"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);
