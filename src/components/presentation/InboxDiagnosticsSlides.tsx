import React from "react";
import { PresentationSlide } from "./PresentationSlide";
import { DiagnosticsData } from "@/lib/csvAnalyzer";
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Shield, BarChart3 } from "lucide-react";

interface InboxDiagnosticsSlidesProps {
  diagnostics: DiagnosticsData;
  activeReport?: "analysis" | "reputation" | null;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toFixed(0);
};

const formatPercent = (num: number): string => `${num.toFixed(1)}%`;

export const InboxDiagnosticsSlides: React.FC<InboxDiagnosticsSlidesProps> = ({
  diagnostics,
  activeReport,
}) => {
  // Analysis Report Slides
  if (activeReport === "analysis" && diagnostics.analysisReport) {
    const report = diagnostics.analysisReport;
    
    return (
      <>
        {/* Slide 1: Title */}
        <PresentationSlide
          title="Email Campaign Analysis"
          subtitle="Performance Report"
          footer={`${diagnostics.rawData.length} campaigns analyzed`}
          slideNumber={1}
        >
          <div className="flex flex-col items-center justify-center h-full">
            <div className="grid grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-4xl font-bold text-primary">
                  {formatNumber(diagnostics.rawData.reduce((s, c) => s + c.totalSentUsers, 0))}
                </p>
                <p className="text-muted-foreground mt-1">Total Sent</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-foreground">
                  {report.monthlyOverview.length}
                </p>
                <p className="text-muted-foreground mt-1">Months</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-foreground">
                  {report.providerAggregates.length}
                </p>
                <p className="text-muted-foreground mt-1">Providers</p>
              </div>
            </div>
          </div>
        </PresentationSlide>

        {/* Slide 2: Provider Overview */}
        <PresentationSlide
          title="Campaign Overview by Provider"
          subtitle="Aggregate metrics by service provider"
          slideNumber={2}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Provider</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">Sent</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">Viewed</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">Clicked</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">Conv</th>
                </tr>
              </thead>
              <tbody>
                {report.providerAggregates.slice(0, 5).map((p, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 px-2">{p.serviceProvider} / {p.providerName}</td>
                    <td className="text-right py-2 px-2">{formatNumber(p.totalSentUsers)}</td>
                    <td className="text-right py-2 px-2">{formatNumber(p.uniqueViewed)}</td>
                    <td className="text-right py-2 px-2">{formatNumber(p.uniqueClicked)}</td>
                    <td className="text-right py-2 px-2">{formatNumber(p.conversions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PresentationSlide>

        {/* Slide 3: Monthly Trends */}
        <PresentationSlide
          title="Monthly Performance"
          subtitle="Open and click rate trends"
          slideNumber={3}
        >
          <div className="grid grid-cols-4 gap-4">
            {report.monthlyOverview.slice(-4).map((m, i) => (
              <div key={i} className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">{m.month}</p>
                <p className="text-2xl font-bold text-primary">{formatPercent(m.openRate)}</p>
                <p className="text-xs text-muted-foreground">Open Rate</p>
                <p className="text-lg font-semibold text-secondary mt-2">{formatPercent(m.clickRate)}</p>
                <p className="text-xs text-muted-foreground">Click Rate</p>
              </div>
            ))}
          </div>
        </PresentationSlide>

        {/* Slide 4: Best Performers */}
        <PresentationSlide
          title="Top Performing Campaigns"
          subtitle="Ranked by unique views"
          slideNumber={4}
        >
          <div className="space-y-3">
            {report.bestCampaigns.slice(0, 4).map((c, i) => (
              <div key={i} className="flex items-center justify-between bg-green-500/5 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-600 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium truncate max-w-[300px]">{c.subjectLine}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-green-600 font-medium">{formatPercent(c.openRate)}</span>
                  <span className="text-muted-foreground">{formatNumber(c.totalSentUsers)} sent</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4 italic">{report.bestSummary}</p>
        </PresentationSlide>

        {/* Slide 5: Worst Performers */}
        <PresentationSlide
          title="Underperforming Campaigns"
          subtitle="Opportunities for improvement"
          slideNumber={5}
        >
          <div className="space-y-3">
            {report.worstCampaigns.slice(0, 4).map((c, i) => (
              <div key={i} className="flex items-center justify-between bg-red-500/5 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium truncate max-w-[300px]">{c.subjectLine}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-red-500 font-medium">{formatPercent(c.openRate)}</span>
                  <span className="text-muted-foreground">{formatNumber(c.totalSentUsers)} sent</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4 italic">{report.worstSummary}</p>
        </PresentationSlide>

        {/* Slide 6: Key Learnings */}
        <PresentationSlide
          title="Key Learnings & Recommendations"
          subtitle="Actionable insights"
          slideNumber={6}
        >
          <div className="space-y-4">
            {report.keyLearnings.map((l, i) => (
              <div key={i} className="flex items-start gap-3">
                <Lightbulb className={`w-4 h-4 shrink-0 mt-0.5 ${i === 0 ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className="font-medium text-sm">{l.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{l.description}</p>
                </div>
              </div>
            ))}
          </div>
        </PresentationSlide>
      </>
    );
  }

  // Reputation Repair Slides
  if (activeReport === "reputation" && diagnostics.reputationReport) {
    const report = diagnostics.reputationReport;

    return (
      <>
        {/* Slide 1: Title */}
        <PresentationSlide
          title="Reputation Repair Report"
          subtitle="Deliverability Analysis & Recommendations"
          footer={`${report.issues.length} issues detected`}
          slideNumber={1}
        >
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center">
              <Shield className={`w-16 h-16 mx-auto mb-4 ${
                report.issues.length === 0 ? "text-green-500" : 
                report.issues.length < 3 ? "text-amber-500" : "text-red-500"
              }`} />
              <p className="text-3xl font-bold text-foreground mb-2">
                {report.issues.length === 0 ? "Healthy" : 
                 report.issues.length < 3 ? "Attention Needed" : "Critical Issues"}
              </p>
              <p className="text-muted-foreground">
                {report.hasPostmasterData ? "Analysis includes Postmaster data" : "Based on campaign metrics only"}
              </p>
            </div>
          </div>
        </PresentationSlide>

        {/* Issue Slides */}
        {report.issues.slice(0, 4).map((issue, i) => (
          <PresentationSlide
            key={i}
            title={`Issue ${i + 1}: ${issue.campaignId}`}
            subtitle={issue.sendDate}
            slideNumber={i + 2}
          >
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Observation</p>
                <p className="text-sm">{issue.observation}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Impact</p>
                <p className="text-sm text-amber-600">{issue.impact}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Root Cause</p>
                <p className="text-sm">{issue.rootCause}</p>
              </div>
              <div className="bg-primary/5 rounded-lg p-3">
                <p className="text-xs font-medium text-primary uppercase mb-1">Recommendation</p>
                <p className="text-sm">{issue.recommendation}</p>
              </div>
            </div>
          </PresentationSlide>
        ))}

        {/* Summary Slide */}
        <PresentationSlide
          title="Summary & Next Steps"
          subtitle="Priority actions"
          slideNumber={report.issues.length > 4 ? 6 : report.issues.length + 2}
        >
          <div className="space-y-4">
            {report.issues.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-green-600 font-medium">No critical issues detected</p>
                <p className="text-sm text-muted-foreground mt-2">Continue monitoring and maintain current practices</p>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-600 flex items-center justify-center text-xs font-bold">1</span>
                  <p className="text-sm">Address hard bounce issues immediately - clean email list</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center text-xs font-bold">2</span>
                  <p className="text-sm">Review and fix email authentication (SPF/DKIM/DMARC)</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-600 flex items-center justify-center text-xs font-bold">3</span>
                  <p className="text-sm">Implement gradual warm-up if reputation is degraded</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">4</span>
                  <p className="text-sm">Monitor Postmaster Tools daily for the next 2 weeks</p>
                </div>
              </>
            )}
          </div>
        </PresentationSlide>
      </>
    );
  }

  // Default fallback
  return (
    <PresentationSlide
      title="Inbox Diagnostics"
      subtitle="Upload data to generate report"
      slideNumber={1}
    >
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <BarChart3 className="w-12 h-12 mb-4" />
        <p>No report data available</p>
      </div>
    </PresentationSlide>
  );
};
