import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  Minus,
  BarChart3,
  Type,
  Activity,
  AlertTriangle,
  Lightbulb,
  X
} from "lucide-react";
import { ViewMode } from "@/hooks/usePresentationMode";
import { 
  parseCSV, 
  runFullAnalysis, 
  DiagnosticsData,
  ValidationResult 
} from "@/lib/csvAnalyzer";
import { InboxDiagnosticsSlides } from "../presentation/InboxDiagnosticsSlides";

interface InboxDiagnosticsTabProps {
  industry: string;
  viewMode?: ViewMode;
  onDataChange?: (data: any) => void;
}

const REQUIRED_HEADERS = [
  "campaign_name",
  "subject_line", 
  "sent_date",
  "emails_sent",
  "open_rate",
  "click_rate",
];

const OPTIONAL_HEADERS = [
  "campaign_type",
  "audience_segment",
  "unsubscribe_rate",
  "bounce_rate",
  "send_time",
];

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toFixed(0);
};

export const InboxDiagnosticsTab: React.FC<InboxDiagnosticsTabProps> = ({
  industry,
  viewMode = "app",
  onDataChange,
}) => {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string>("");

  const handleFileUpload = useCallback((file: File) => {
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = parseCSV(text);
      setValidation(result);

      if (result.isValid) {
        const analysis = runFullAnalysis(result.data);
        setDiagnostics(analysis);
        onDataChange?.(analysis);
      } else {
        setDiagnostics(null);
        onDataChange?.(null);
      }
    };
    reader.readAsText(file);
  }, [onDataChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const clearData = useCallback(() => {
    setValidation(null);
    setDiagnostics(null);
    setFileName("");
    onDataChange?.(null);
  }, [onDataChange]);

  // Presentation mode view
  if (viewMode === "presentation" && diagnostics) {
    return (
      <div className="flex flex-col items-center gap-8">
        <InboxDiagnosticsSlides diagnostics={diagnostics} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Upload Section */}
      {!diagnostics && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="magic-card rounded-2xl p-8"
        >
          <h2 className="font-display text-2xl font-semibold text-foreground mb-6 text-center">
            Upload Campaign Performance Report
          </h2>

          {/* Drop Zone */}
          <motion.div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
              isDragging 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            
            <motion.div
              animate={{ y: isDragging ? -5 : 0 }}
              className="flex flex-col items-center gap-4"
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                isDragging ? "bg-primary/20" : "bg-muted"
              }`}>
                <Upload className={`w-8 h-8 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground mb-1">
                  Drop your CSV file here
                </p>
                <p className="text-sm text-muted-foreground">
                  or click to browse
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* Required Headers Info */}
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Required Columns
              </h3>
              <div className="flex flex-wrap gap-2">
                {REQUIRED_HEADERS.map((header) => (
                  <span
                    key={header}
                    className="px-2.5 py-1 text-xs font-mono bg-primary/10 text-primary rounded-md"
                  >
                    {header}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Optional Columns
              </h3>
              <div className="flex flex-wrap gap-2">
                {OPTIONAL_HEADERS.map((header) => (
                  <span
                    key={header}
                    className="px-2.5 py-1 text-xs font-mono bg-muted text-muted-foreground rounded-md"
                  >
                    {header}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-4 text-center italic">
            Percentages should be numbers (e.g., 24.5), not symbols.
          </p>

          {/* Validation Errors/Warnings */}
          <AnimatePresence>
            {validation && !validation.isValid && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive mb-2">Validation Failed</p>
                    <ul className="text-sm text-destructive/80 space-y-1">
                      {validation.errors.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Results Section */}
      {diagnostics && (
        <>
          {/* File Info Bar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary" />
              <span className="font-medium text-sm">{fileName}</span>
              <span className="text-xs text-muted-foreground">
                • {diagnostics.rawData.length} campaigns analyzed
              </span>
              {validation?.warnings && validation.warnings.length > 0 && (
                <span className="text-xs text-amber-500">
                  • {validation.warnings.length} warnings
                </span>
              )}
            </div>
            <button
              onClick={clearData}
              className="p-1.5 hover:bg-muted rounded-md transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </motion.div>

          {/* Performance Snapshot */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="magic-card rounded-2xl p-6"
          >
            <h3 className="font-display text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Performance Snapshot
            </h3>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-muted/30 rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Sent</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatNumber(diagnostics.performance.totalEmailsSent)}
                </p>
              </div>
              <div className="bg-muted/30 rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Campaigns</p>
                <p className="text-2xl font-bold text-foreground">
                  {diagnostics.performance.totalCampaigns}
                </p>
              </div>
              <div className="bg-muted/30 rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Median Open Rate</p>
                <p className="text-2xl font-bold text-primary">
                  {diagnostics.performance.medianOpenRate.toFixed(1)}%
                </p>
              </div>
              <div className="bg-muted/30 rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Median Click Rate</p>
                <p className="text-2xl font-bold text-secondary">
                  {diagnostics.performance.medianClickRate.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Best & Worst */}
            <div className="grid md:grid-cols-2 gap-4">
              {diagnostics.performance.bestCampaign && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-primary uppercase tracking-wide">Top Performer</span>
                  </div>
                  <p className="font-medium text-foreground truncate">
                    {diagnostics.performance.bestCampaign.campaign_name}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {diagnostics.performance.bestCampaign.open_rate.toFixed(1)}% open • {diagnostics.performance.bestCampaign.click_rate.toFixed(1)}% click
                  </p>
                </div>
              )}
              {diagnostics.performance.worstCampaign && (
                <div className="bg-muted/30 border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Needs Attention</span>
                  </div>
                  <p className="font-medium text-foreground truncate">
                    {diagnostics.performance.worstCampaign.campaign_name}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {diagnostics.performance.worstCampaign.open_rate.toFixed(1)}% open • {diagnostics.performance.worstCampaign.click_rate.toFixed(1)}% click
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Subject Line Signals */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="magic-card rounded-2xl p-6"
          >
            <h3 className="font-display text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <Type className="w-5 h-5 text-primary" />
              Subject Line Signals
            </h3>

            <p className="text-sm text-muted-foreground mb-6">
              {diagnostics.subjectLines.lengthInsight}
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  High-Performing Patterns
                </h4>
                <div className="space-y-2">
                  {diagnostics.subjectLines.topPatterns.length > 0 ? (
                    diagnostics.subjectLines.topPatterns.map((pattern, i) => (
                      <div key={i} className="flex items-center justify-between bg-primary/5 rounded-lg px-3 py-2">
                        <span className="text-sm font-medium">{pattern.pattern}</span>
                        <span className="text-xs text-primary">{pattern.avgOpenRate.toFixed(1)}% avg open</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No clear patterns detected</p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-muted-foreground" />
                  Underperforming Patterns
                </h4>
                <div className="space-y-2">
                  {diagnostics.subjectLines.lowPatterns.length > 0 ? (
                    diagnostics.subjectLines.lowPatterns.map((pattern, i) => (
                      <div key={i} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                        <span className="text-sm font-medium">{pattern.pattern}</span>
                        <span className="text-xs text-muted-foreground">{pattern.avgOpenRate.toFixed(1)}% avg open</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No clear patterns detected</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Trend Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="magic-card rounded-2xl p-6"
          >
            <h3 className="font-display text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Trend Analysis
            </h3>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-muted/30 rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Open Rate Trend</p>
                <div className="flex items-center gap-2">
                  {diagnostics.trends.openRateTrend === "improving" && <TrendingUp className="w-5 h-5 text-green-500" />}
                  {diagnostics.trends.openRateTrend === "declining" && <TrendingDown className="w-5 h-5 text-red-500" />}
                  {diagnostics.trends.openRateTrend === "stable" && <Minus className="w-5 h-5 text-muted-foreground" />}
                  <span className="font-medium capitalize">{diagnostics.trends.openRateTrend}</span>
                </div>
              </div>
              <div className="bg-muted/30 rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Click Rate Trend</p>
                <div className="flex items-center gap-2">
                  {diagnostics.trends.clickRateTrend === "improving" && <TrendingUp className="w-5 h-5 text-green-500" />}
                  {diagnostics.trends.clickRateTrend === "declining" && <TrendingDown className="w-5 h-5 text-red-500" />}
                  {diagnostics.trends.clickRateTrend === "stable" && <Minus className="w-5 h-5 text-muted-foreground" />}
                  <span className="font-medium capitalize">{diagnostics.trends.clickRateTrend}</span>
                </div>
              </div>
              <div className="bg-muted/30 rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Data Points</p>
                <p className="font-medium">{diagnostics.trends.dataPoints.length} time periods</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground italic">
              {diagnostics.trends.volumeVsEngagement}
            </p>
          </motion.div>

          {/* Fatigue & Risk Signals */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="magic-card rounded-2xl p-6"
          >
            <h3 className="font-display text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-primary" />
              Fatigue & Risk Signals
            </h3>

            <div className="flex items-center gap-3 mb-6">
              <span className="text-sm text-muted-foreground">Overall Risk Level:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                diagnostics.fatigue.overallRisk === "high" 
                  ? "bg-red-500/10 text-red-500" 
                  : diagnostics.fatigue.overallRisk === "medium"
                    ? "bg-amber-500/10 text-amber-500"
                    : "bg-green-500/10 text-green-500"
              }`}>
                {diagnostics.fatigue.overallRisk.toUpperCase()}
              </span>
            </div>

            {diagnostics.fatigue.signals.length > 0 ? (
              <div className="space-y-3">
                {diagnostics.fatigue.signals.map((signal, i) => (
                  <div 
                    key={i} 
                    className={`rounded-xl p-4 border ${
                      signal.severity === "high"
                        ? "bg-red-500/5 border-red-500/20"
                        : signal.severity === "medium"
                          ? "bg-amber-500/5 border-amber-500/20"
                          : "bg-muted/30 border-border"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${
                        signal.severity === "high" ? "text-red-500" : 
                        signal.severity === "medium" ? "text-amber-500" : "text-muted-foreground"
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{signal.description}</p>
                        {signal.campaigns.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Affected: {signal.campaigns.slice(0, 3).join(", ")}
                            {signal.campaigns.length > 3 && ` +${signal.campaigns.length - 3} more`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No significant fatigue signals detected. Your email program appears healthy.
              </p>
            )}
          </motion.div>

          {/* Recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="magic-card rounded-2xl p-6"
          >
            <h3 className="font-display text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              Actionable Recommendations
            </h3>

            <div className="space-y-4">
              {diagnostics.recommendations.map((rec, i) => (
                <div key={i} className="bg-muted/30 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h4 className="font-medium text-foreground">{rec.title}</h4>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        rec.priority === "high"
                          ? "bg-primary/10 text-primary"
                          : rec.priority === "medium"
                            ? "bg-secondary/10 text-secondary"
                            : "bg-muted text-muted-foreground"
                      }`}>
                        {rec.priority}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground capitalize">
                        {rec.category}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};
