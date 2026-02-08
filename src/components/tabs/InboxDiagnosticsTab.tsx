import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Activity
} from "lucide-react";
import { exportDiagnosticsToPPT } from "@/lib/diagnosticsPptExport";
import { ViewMode } from "@/hooks/usePresentationMode";
import { 
  parseCSV, 
  parsePostmasterCSV,
  generateAnalysisReport,
  generateReputationRepairReport,
  runReconciliationCheck,
  DiagnosticsData,
  ValidationResult,
  PostmasterValidationResult,
  CampaignRow,
  PostmasterRow,
  DeliverabilityDiagnosticSummary,
  EnhancedReputationReport,
  ReputationSignalRow,
  ProcessingSummary,
  TopCampaign,
} from "@/lib/csvAnalyzer";
import { InboxDiagnosticsSlides } from "../presentation/InboxDiagnosticsSlides";
import { Button } from "../ui/button";
import { DataIntegrityPanel } from "../DataIntegrityPanel";
import { UseCaseCoverageAnalysis } from "../UseCaseCoverageAnalysis";
import { LifecycleCoverageMatrix } from "../LifecycleCoverageMatrix";
import {
  EmailMetricsTrendChart,
  InfrastructureDetailsTable,
  ReputationSmallMultiples,
} from "../metrics";
import {
  ReputationTrendChart,
  SignalHealthTable,
  RootCauseCorrelation,
  RepairActionsModule,
  ThresholdBreach,
  calculateSignalHealth,
  analyzeRootCauses,
} from "../reputation";

interface InboxDiagnosticsTabProps {
  industry: string;
  viewMode?: ViewMode;
  onDataChange?: (data: DiagnosticsData | null) => void;
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

export const InboxDiagnosticsTab: React.FC<InboxDiagnosticsTabProps> = ({
  industry,
  viewMode = "app",
  onDataChange,
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
  
  // UI states
  const [isDraggingCampaign, setIsDraggingCampaign] = useState(false);
  const [isDraggingPostmaster, setIsDraggingPostmaster] = useState(false);
  const [activeReport, setActiveReport] = useState<"analysis" | "reputation" | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [thresholdBreaches, setThresholdBreaches] = useState<ThresholdBreach[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    provider: true,
    monthly: true,
    reputationTrends: true,
    signalHealth: true,
    rootCause: true,
    repairActions: true,
    best: true,
    worst: true,
    trends: true,
    learnings: true,
    issues: true,
    useCaseCoverage: true,
    lifecycleCoverage: true,
    infrastructure: true,
    emailMetricsTrend: true,
  });

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
    
    // Also generate reputation report for Reputation Snapshot, Root Cause Summary, and Repair Actions
    const reputationReport = generateReputationRepairReport(campaignData, postmasterData, contextText || null);
    const newDiagnostics: DiagnosticsData = {
      rawData: campaignData,
      postmasterData,
      contextText: contextText || null,
      analysisReport,
      reputationReport,
    };
    setDiagnostics(newDiagnostics);
    setActiveReport("analysis");
    onDataChange?.(newDiagnostics);
  }, [campaignData, postmasterData, contextText, processingSummary, onDataChange]);

  const runReputationReport = useCallback(() => {
    if (campaignData.length === 0) return;
    
    const reputationReport = generateReputationRepairReport(campaignData, postmasterData, contextText || null);
    const newDiagnostics: DiagnosticsData = {
      rawData: campaignData,
      postmasterData,
      contextText: contextText || null,
      analysisReport: null,
      reputationReport,
    };
    setDiagnostics(newDiagnostics);
    setActiveReport("reputation");
    onDataChange?.(newDiagnostics);
  }, [campaignData, postmasterData, contextText, onDataChange]);

  const clearAll = useCallback(() => {
    setCampaignValidation(null);
    setPostmasterValidation(null);
    setCampaignData([]);
    setPostmasterData(null);
    setProcessingSummary(null);
    setContextText("");
    setCampaignFileName("");
    setPostmasterFileName("");
    setDiagnostics(null);
    setActiveReport(null);
    onDataChange?.(null);
  }, [onDataChange]);

  // Presentation mode
  if (viewMode === "presentation" && diagnostics) {
    return (
      <div className="flex flex-col items-center gap-8">
        <InboxDiagnosticsSlides diagnostics={diagnostics} activeReport={activeReport} />
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

          {/* Postmaster CSV Upload (Optional) */}
          <div className="magic-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <Shield className="w-5 h-5 text-secondary" />
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
                <span className="font-medium text-sm">{postmasterFileName}</span>
                <span className="text-xs text-muted-foreground">• {postmasterData?.length || 0} records</span>
              </div>
            )}

            <div className="mt-3">
              <p className="text-xs text-muted-foreground">Expected: {POSTMASTER_HEADERS.join(", ")}</p>
            </div>
          </div>

          {/* Context Text (Optional) */}
          <div className="magic-card rounded-2xl p-6">
            <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
              Additional Context
              <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
            </h3>
            <textarea
              value={contextText}
              onChange={(e) => setContextText(e.target.value)}
              placeholder="E.g., 'Emails started landing in spam since last week' or 'Long emails getting clipped in Gmail'"
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
              onClick={runReputationReport}
              disabled={!hasData}
              className="flex-1 h-14 text-base font-semibold"
              variant="secondary"
            >
              <Shield className="w-5 h-5 mr-2" />
              Reputation Repair Recommendations
            </Button>
          </div>
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
            <h2 className="font-display text-2xl font-semibold text-foreground">Analysis & Report</h2>
            <div className="flex gap-2">
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => exportDiagnosticsToPPT(diagnostics, "analysis", "Campaign")}
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
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Unique Sent</th>
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
                  {diagnostics.analysisReport.monthlyOverview.map((m, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-2 px-3 font-medium">{m.month}</td>
                      <td className="text-right py-2 px-3">{m.campaignCount}</td>
                      <td className="text-right py-2 px-3">{formatNumber(m.totalSentUsers)}</td>
                      {m.useDeliveredAsDenominator && (
                        <td className="text-right py-2 px-3">{formatNumber(m.totalDeliveredUsers)}</td>
                      )}
                      <td className="text-right py-2 px-3">{formatNumber(m.uniqueSentUsers)}</td>
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
          >
            <EmailMetricsTrendChart campaignData={diagnostics.rawData} />
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
          >
            <ReputationSmallMultiples
              postmasterData={postmasterData}
              campaignData={diagnostics.rawData}
            />
          </CollapsibleSection>

          {/* ============= LEGACY REPUTATION TREND CHART (COMBINED VIEW) ============= */}
          {postmasterData && postmasterData.length > 0 && (
            <CollapsibleSection
              title="Reputation Trends (Combined)"
              icon={<Activity className="w-5 h-5 text-primary" />}
              isOpen={expandedSections.reputationTrends}
              onToggle={() => toggleSection("reputationTrends")}
            >
              <ReputationTrendChart
                postmasterData={postmasterData}
                onBreachDetected={setThresholdBreaches}
              />
            </CollapsibleSection>
          )}

          {/* 2. Reputation Scorecard */}
          <CollapsibleSection
            title="Reputation Scorecard"
            icon={<Shield className="w-5 h-5 text-primary" />}
            isOpen={expandedSections.signalHealth}
            onToggle={() => toggleSection("signalHealth")}
          >
            <SignalHealthTable
              postmasterData={postmasterData}
              campaignData={diagnostics.rawData}
            />
          </CollapsibleSection>

          {/* 3. Root Cause Correlation Engine */}
          {thresholdBreaches.length > 0 && (
            <CollapsibleSection
              title="Root Cause Summary"
              icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
              isOpen={expandedSections.rootCause}
              onToggle={() => toggleSection("rootCause")}
            >
              <RootCauseCorrelation
                postmasterData={postmasterData}
                campaignData={diagnostics.rawData}
                breaches={thresholdBreaches}
              />
            </CollapsibleSection>
          )}

          {/* 4. Reputation Repair Actions */}
          <CollapsibleSection
            title="Reputation Repair Actions"
            icon={<Lightbulb className="w-5 h-5 text-primary" />}
            isOpen={expandedSections.repairActions}
            onToggle={() => toggleSection("repairActions")}
          >
            {(() => {
              const signalHealth = calculateSignalHealth(postmasterData, diagnostics.rawData);
              const rootCauses = analyzeRootCauses(postmasterData, diagnostics.rawData, thresholdBreaches);
              return (
                <RepairActionsModule
                  signalHealth={signalHealth}
                  rootCauses={rootCauses}
                />
              );
            })()}
          </CollapsibleSection>

          {/* ============= END REPUTATION INTELLIGENCE ============= */}

          {/* Legacy Reputation Snapshot (from Reputation Repair - kept for backward compatibility) */}
          {diagnostics.reputationReport?.enhancedReport && (
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
          )}

          {/* Root Cause Summary (from Reputation Repair) */}
          {diagnostics.reputationReport?.enhancedReport?.rootCauses && diagnostics.reputationReport.enhancedReport.rootCauses.length > 0 && (
            <CollapsibleSection
              title="Root Cause Summary"
              icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
              isOpen={expandedSections.issues}
              onToggle={() => toggleSection("issues")}
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

          {/* Reputation Repair Actions (from Reputation Repair) */}
          {diagnostics.reputationReport?.enhancedReport?.repairActions && (
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
          )}

          {/* Report 2: Best Performing */}
          <CollapsibleSection
            title="Best Performing Campaigns"
            icon={<TrendingUp className="w-5 h-5 text-green-500" />}
            isOpen={expandedSections.best}
            onToggle={() => toggleSection("best")}
          >
            <div className="flex justify-end mb-2">
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
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Viewed</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Open %</th>
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
                  {diagnostics.analysisReport.bestCampaigns.slice(0, 5).map((c, i) => {
                    const denominator = c.totalDeliveredUsers > 0 ? c.totalDeliveredUsers : c.totalSentUsers;
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
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
              <h4 className="font-medium text-sm text-green-600 mb-2">What Worked</h4>
              <p className="text-sm text-muted-foreground">{diagnostics.analysisReport.bestSummary}</p>
            </div>
          </CollapsibleSection>

          {/* Report 3: Under-Performing */}
          <CollapsibleSection
            title="Under-Performing Campaigns"
            icon={<TrendingDown className="w-5 h-5 text-red-500" />}
            isOpen={expandedSections.worst}
            onToggle={() => toggleSection("worst")}
          >
            <div className="flex justify-end mb-2">
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
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Viewed</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Open %</th>
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
                  {diagnostics.analysisReport.worstCampaigns.slice(0, 5).map((c, i) => {
                    const denominator = c.totalDeliveredUsers > 0 ? c.totalDeliveredUsers : c.totalSentUsers;
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
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
              <h4 className="font-medium text-sm text-red-600 mb-2">What Didn't Work</h4>
              <p className="text-sm text-muted-foreground">{diagnostics.analysisReport.worstSummary}</p>
            </div>
          </CollapsibleSection>

          {/* Send Mix & Use Case Coverage Analysis (Stage-Aware) */}
          <UseCaseCoverageAnalysis
            campaignData={diagnostics.rawData}
            industry={industry}
            isOpen={expandedSections.useCaseCoverage}
            onToggle={() => toggleSection("useCaseCoverage")}
          />

          {/* Lifecycle Coverage Visualization & Insight Engine */}
          <LifecycleCoverageMatrix
            campaignData={diagnostics.rawData}
            industry={industry}
            isOpen={expandedSections.lifecycleCoverage}
            onToggle={() => toggleSection("lifecycleCoverage")}
          />

          {/* Report 5: Key Learnings */}
          <CollapsibleSection
            title="Key Learnings & Recommendations"
            icon={<Lightbulb className="w-5 h-5 text-amber-500" />}
            isOpen={expandedSections.learnings}
            onToggle={() => toggleSection("learnings")}
          >
            <ul className="space-y-3">
              {diagnostics.analysisReport.keyLearnings.map((l, i) => (
                <li key={i} className="flex items-start gap-3 bg-muted/20 rounded-xl p-4">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{l.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{l.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        </motion.div>
      )}

      {/* Reputation Repair View - Enhanced Structure */}
      {activeReport === "reputation" && diagnostics?.reputationReport && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold text-foreground">Reputation Repair Analysis</h2>
            <div className="flex gap-2">
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => exportDiagnosticsToPPT(diagnostics, "reputation", "Campaign")}
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
  children: React.ReactNode;
}> = ({ title, icon, isOpen, onToggle, children }) => (
  <motion.div className="magic-card rounded-2xl overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-6 hover:bg-muted/20 transition-colors"
    >
      <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
        {icon}
        {title}
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
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);
