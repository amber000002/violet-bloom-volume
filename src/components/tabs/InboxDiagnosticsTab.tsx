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
  Download
} from "lucide-react";
import { exportDiagnosticsToPPT } from "@/lib/diagnosticsPptExport";
import { ViewMode } from "@/hooks/usePresentationMode";
import { 
  parseCSV, 
  parsePostmasterCSV,
  generateAnalysisReport,
  generateReputationRepairReport,
  DiagnosticsData,
  ValidationResult,
  PostmasterValidationResult,
  CampaignRow,
  PostmasterRow,
  DeliverabilityDiagnosticSummary,
  EnhancedReputationReport,
  ReputationSignalRow,
} from "@/lib/csvAnalyzer";
import { InboxDiagnosticsSlides } from "../presentation/InboxDiagnosticsSlides";
import { Button } from "../ui/button";

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

// Clean subject line by removing "{Subject:" prefix
const cleanSubjectLine = (subject: string): string => {
  if (!subject) return '';
  return subject.replace(/^\{Subject:\s*/i, '').replace(/\}$/, '').trim();
};

// Color coding logic for percentage metrics (WCAG AA compliant)
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
  const [contextText, setContextText] = useState<string>("");
  const [campaignFileName, setCampaignFileName] = useState<string>("");
  const [postmasterFileName, setPostmasterFileName] = useState<string>("");
  
  // UI states
  const [isDraggingCampaign, setIsDraggingCampaign] = useState(false);
  const [isDraggingPostmaster, setIsDraggingPostmaster] = useState(false);
  const [activeReport, setActiveReport] = useState<"analysis" | "reputation" | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    provider: true,
    monthly: true,
    best: true,
    worst: true,
    trends: true,
    learnings: true,
    issues: true,
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
  }, [campaignData, postmasterData, contextText, onDataChange]);

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
              * Dates parsed as DD/MM/YYYY format. Percentages calculated using {diagnostics.analysisReport.monthlyOverview[0]?.useDeliveredAsDenominator ? 'Delivered' : 'Sent'} as denominator.
            </p>
          </CollapsibleSection>

          {/* Report 2: Best Performing */}
          <CollapsibleSection
            title="Best Performing Campaigns"
            icon={<TrendingUp className="w-5 h-5 text-green-500" />}
            isOpen={expandedSections.best}
            onToggle={() => toggleSection("best")}
          >
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
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
                        <td className="py-2 px-3 max-w-xs truncate" title={cleanSubjectLine(c.subjectLine)}>{cleanSubjectLine(c.subjectLine)}</td>
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

          {/* Report 3: Worst Performing */}
          <CollapsibleSection
            title="Worst Performing Campaigns"
            icon={<TrendingDown className="w-5 h-5 text-red-500" />}
            isOpen={expandedSections.worst}
            onToggle={() => toggleSection("worst")}
          >
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
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
                        <td className="py-2 px-3 max-w-xs truncate" title={cleanSubjectLine(c.subjectLine)}>{cleanSubjectLine(c.subjectLine)}</td>
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

          {/* Report 4: Engagement Trends */}
          <CollapsibleSection
            title="Engagement Trends"
            icon={<BarChart3 className="w-5 h-5 text-primary" />}
            isOpen={expandedSections.trends}
            onToggle={() => toggleSection("trends")}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {diagnostics.analysisReport.engagementTrends.slice(-4).map((t, i) => (
                <div key={i} className="bg-muted/30 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{t.month}</p>
                  <p className="text-lg font-bold text-primary">{formatPercent(t.openRate)}</p>
                  <p className="text-xs text-muted-foreground">Open Rate</p>
                  <p className="text-sm font-medium text-secondary mt-1">{formatPercent(t.clickRate)}</p>
                  <p className="text-xs text-muted-foreground">Click Rate</p>
                </div>
              ))}
            </div>
          </CollapsibleSection>

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

              {/* 2️⃣ Reputation Signal Table */}
              <CollapsibleSection
                title="Reputation Signal Table"
                icon={<BarChart3 className="w-5 h-5 text-primary" />}
                isOpen={expandedSections.provider}
                onToggle={() => toggleSection("provider")}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Signal</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Value</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">%</th>
                        <th className="text-center py-2 px-3 font-medium text-muted-foreground">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diagnostics.reputationReport.enhancedReport.signalTable.map((row, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2 px-3 font-medium">{row.signal}</td>
                          <td className="text-right py-2 px-3">{typeof row.value === 'number' ? row.value.toLocaleString() : row.value}</td>
                          <td className="text-right py-2 px-3">{row.percentage}</td>
                          <td className="text-center py-2 px-3">
                            {row.trend === 'up' && <TrendingUp className="w-4 h-4 text-red-500 inline" />}
                            {row.trend === 'down' && <TrendingDown className="w-4 h-4 text-green-500 inline" />}
                            {row.trend === 'stable' && <span className="text-muted-foreground">–</span>}
                            {row.trendDescription && <span className="ml-1 text-xs text-muted-foreground">{row.trendDescription}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-3">{diagnostics.reputationReport.enhancedReport.signalTableDenominatorNote}</p>
              </CollapsibleSection>

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
