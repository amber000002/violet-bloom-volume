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
  Shield
} from "lucide-react";
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
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toFixed(0);
};

const formatPercent = (num: number): string => {
  return `${num.toFixed(2)}%`;
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
              <Button variant="outline" size="sm" onClick={() => setActiveReport(null)}>
                ← Back
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear All
              </Button>
            </div>
          </div>

          {/* Report 1a: Campaign Overview by Provider */}
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
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Delivered</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Viewed</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Clicked</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Conversions</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Unsubs</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Hard Bounce</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Soft Bounce</th>
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
                      <td className="text-right py-2 px-3">{formatNumber(p.totalDeliveredUsers)}</td>
                      <td className="text-right py-2 px-3">{formatNumber(p.uniqueViewed)}</td>
                      <td className="text-right py-2 px-3">{formatNumber(p.uniqueClicked)}</td>
                      <td className="text-right py-2 px-3">{formatNumber(p.conversions)}</td>
                      <td className="text-right py-2 px-3">{formatNumber(p.unsubscribes)}</td>
                      <td className="text-right py-2 px-3">{formatNumber(p.hardBounces)}</td>
                      <td className="text-right py-2 px-3">{formatNumber(p.softBounces)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleSection>

          {/* Report 1b: Monthly Overview */}
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
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Open Rate</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Click Rate</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Unsubs</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Hard Bounce</th>
                  </tr>
                </thead>
                <tbody>
                  {diagnostics.analysisReport.monthlyOverview.map((m, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-2 px-3 font-medium">{m.month}</td>
                      <td className="text-right py-2 px-3">{m.campaignCount}</td>
                      <td className="text-right py-2 px-3">{formatNumber(m.totalSentUsers)}</td>
                      <td className="text-right py-2 px-3 text-primary font-medium">{formatPercent(m.openRate)}</td>
                      <td className="text-right py-2 px-3 text-secondary font-medium">{formatPercent(m.clickRate)}</td>
                      <td className="text-right py-2 px-3">{formatNumber(m.unsubscribes)}</td>
                      <td className="text-right py-2 px-3">{formatNumber(m.hardBounces)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Open %</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Click %</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Conv</th>
                  </tr>
                </thead>
                <tbody>
                  {diagnostics.analysisReport.bestCampaigns.slice(0, 5).map((c, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-2 px-3 max-w-xs truncate" title={c.subjectLine}>{c.subjectLine}</td>
                      <td className="text-right py-2 px-3">{formatNumber(c.totalSentUsers)}</td>
                      <td className="text-right py-2 px-3 text-green-500 font-medium">{formatPercent(c.openRate)}</td>
                      <td className="text-right py-2 px-3">{formatPercent(c.clickRate)}</td>
                      <td className="text-right py-2 px-3">{formatNumber(c.conversions)}</td>
                    </tr>
                  ))}
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
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Open %</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Click %</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Hard Bounce</th>
                  </tr>
                </thead>
                <tbody>
                  {diagnostics.analysisReport.worstCampaigns.slice(0, 5).map((c, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-2 px-3 max-w-xs truncate" title={c.subjectLine}>{c.subjectLine}</td>
                      <td className="text-right py-2 px-3">{formatNumber(c.totalSentUsers)}</td>
                      <td className="text-right py-2 px-3 text-red-500 font-medium">{formatPercent(c.openRate)}</td>
                      <td className="text-right py-2 px-3">{formatPercent(c.clickRate)}</td>
                      <td className="text-right py-2 px-3">{formatNumber(c.hardBounces)}</td>
                    </tr>
                  ))}
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

      {/* Reputation Repair View */}
      {activeReport === "reputation" && diagnostics?.reputationReport && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold text-foreground">Reputation Repair Recommendations</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setActiveReport(null)}>
                ← Back
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear All
              </Button>
            </div>
          </div>

          {/* Status indicators */}
          <div className="flex flex-wrap gap-3">
            <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${
              diagnostics.reputationReport.hasPostmasterData 
                ? "bg-green-500/10 text-green-600" 
                : "bg-muted text-muted-foreground"
            }`}>
              <Shield className="w-3.5 h-3.5" />
              Postmaster Data: {diagnostics.reputationReport.hasPostmasterData ? "Included" : "Not provided"}
            </div>
            {diagnostics.reputationReport.contextNotes && (
              <div className="px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Context provided
              </div>
            )}
          </div>

          {/* Issues */}
          <CollapsibleSection
            title={`Issues Detected (${diagnostics.reputationReport.issues.length})`}
            icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
            isOpen={expandedSections.issues}
            onToggle={() => toggleSection("issues")}
          >
            {diagnostics.reputationReport.issues.length > 0 ? (
              <div className="space-y-4">
                {diagnostics.reputationReport.issues.map((issue, i) => (
                  <div key={i} className="bg-muted/20 border border-border rounded-xl p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                            {issue.campaignId}
                          </span>
                          <span className="text-xs text-muted-foreground">{issue.sendDate}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Observation</p>
                        <p className="text-sm text-foreground">{issue.observation}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Impact</p>
                        <p className="text-sm text-amber-600">{issue.impact}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Root Cause</p>
                        <p className="text-sm text-foreground">{issue.rootCause}</p>
                      </div>
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                        <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">Recommendation</p>
                        <p className="text-sm text-foreground">{issue.recommendation}</p>
                      </div>
                      
                      {Object.keys(issue.metricValues).length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {Object.entries(issue.metricValues).map(([key, value]) => (
                            <span key={key} className="text-xs bg-muted px-2 py-1 rounded font-mono">
                              {key}: {typeof value === "number" ? value.toFixed(2) : value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p className="font-medium text-foreground">No reputation issues detected</p>
                <p className="text-sm mt-1">Your campaigns appear healthy based on the data provided.</p>
              </div>
            )}
          </CollapsibleSection>
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
