import React from "react";
import { PresentationSlide } from "./PresentationSlide";
import { DiagnosticsData } from "@/lib/csvAnalyzer";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Lightbulb } from "lucide-react";

interface InboxDiagnosticsSlidesProps {
  diagnostics: DiagnosticsData;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toFixed(0);
};

export const InboxDiagnosticsSlides: React.FC<InboxDiagnosticsSlidesProps> = ({
  diagnostics,
}) => {
  return (
    <>
      {/* Slide 1: Title Slide */}
      <PresentationSlide
        title="Inbox Diagnostics"
        subtitle="Campaign Performance Analysis"
        footer={`${diagnostics.rawData.length} campaigns analyzed`}
        slideNumber={1}
      >
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-center">
            <p className="text-4xl font-bold text-primary mb-2">
              {formatNumber(diagnostics.performance.totalEmailsSent)}
            </p>
            <p className="text-muted-foreground">Total Emails Analyzed</p>
          </div>
          <div className="flex gap-8 mt-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {diagnostics.performance.medianOpenRate.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Median Open Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {diagnostics.performance.medianClickRate.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Median Click Rate</p>
            </div>
          </div>
        </div>
      </PresentationSlide>

      {/* Slide 2: Performance Snapshot */}
      <PresentationSlide
        title="Performance Snapshot"
        subtitle="Best and worst performing campaigns"
        slideNumber={2}
      >
        <div className="space-y-6">
          {diagnostics.performance.bestCampaign && (
            <div className="bg-primary/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Top Performer</span>
              </div>
              <p className="font-semibold text-foreground">
                {diagnostics.performance.bestCampaign.campaign_name}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {diagnostics.performance.bestCampaign.open_rate.toFixed(1)}% open rate • {diagnostics.performance.bestCampaign.click_rate.toFixed(1)}% click rate
              </p>
            </div>
          )}
          
          {diagnostics.performance.worstCampaign && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Needs Attention</span>
              </div>
              <p className="font-semibold text-foreground">
                {diagnostics.performance.worstCampaign.campaign_name}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {diagnostics.performance.worstCampaign.open_rate.toFixed(1)}% open rate • {diagnostics.performance.worstCampaign.click_rate.toFixed(1)}% click rate
              </p>
            </div>
          )}
        </div>
      </PresentationSlide>

      {/* Slide 3: Subject Line Signals */}
      <PresentationSlide
        title="Subject Line Signals"
        subtitle="What's working and what's not"
        slideNumber={3}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            {diagnostics.subjectLines.lengthInsight}
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-primary mb-3">High Performers</h4>
              <ul className="space-y-2">
                {diagnostics.subjectLines.topPatterns.slice(0, 3).map((pattern, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium">{pattern.pattern}</span>
                    <span className="text-muted-foreground ml-2">
                      ({pattern.avgOpenRate.toFixed(1)}% avg)
                    </span>
                  </li>
                ))}
                {diagnostics.subjectLines.topPatterns.length === 0 && (
                  <li className="text-sm text-muted-foreground italic">No patterns detected</li>
                )}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Underperformers</h4>
              <ul className="space-y-2">
                {diagnostics.subjectLines.lowPatterns.slice(0, 3).map((pattern, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium">{pattern.pattern}</span>
                    <span className="text-muted-foreground ml-2">
                      ({pattern.avgOpenRate.toFixed(1)}% avg)
                    </span>
                  </li>
                ))}
                {diagnostics.subjectLines.lowPatterns.length === 0 && (
                  <li className="text-sm text-muted-foreground italic">No patterns detected</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </PresentationSlide>

      {/* Slide 4: Trend Analysis */}
      <PresentationSlide
        title="Trend Analysis"
        subtitle="Engagement over time"
        slideNumber={4}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground uppercase mb-2">Open Rate Trend</p>
              <div className="flex items-center gap-2">
                {diagnostics.trends.openRateTrend === "improving" && <TrendingUp className="w-5 h-5 text-green-500" />}
                {diagnostics.trends.openRateTrend === "declining" && <TrendingDown className="w-5 h-5 text-red-500" />}
                {diagnostics.trends.openRateTrend === "stable" && <Minus className="w-5 h-5 text-muted-foreground" />}
                <span className="font-medium capitalize">{diagnostics.trends.openRateTrend}</span>
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground uppercase mb-2">Click Rate Trend</p>
              <div className="flex items-center gap-2">
                {diagnostics.trends.clickRateTrend === "improving" && <TrendingUp className="w-5 h-5 text-green-500" />}
                {diagnostics.trends.clickRateTrend === "declining" && <TrendingDown className="w-5 h-5 text-red-500" />}
                {diagnostics.trends.clickRateTrend === "stable" && <Minus className="w-5 h-5 text-muted-foreground" />}
                <span className="font-medium capitalize">{diagnostics.trends.clickRateTrend}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-muted/20 rounded-lg p-4">
            <p className="text-sm text-foreground">{diagnostics.trends.volumeVsEngagement}</p>
          </div>
        </div>
      </PresentationSlide>

      {/* Slide 5: Risk Assessment */}
      <PresentationSlide
        title="Fatigue & Risk Assessment"
        subtitle="Signals requiring attention"
        slideNumber={5}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className={`w-5 h-5 ${
              diagnostics.fatigue.overallRisk === "high" 
                ? "text-red-500" 
                : diagnostics.fatigue.overallRisk === "medium"
                  ? "text-amber-500"
                  : "text-green-500"
            }`} />
            <span className="font-medium">
              Overall Risk: <span className="capitalize">{diagnostics.fatigue.overallRisk}</span>
            </span>
          </div>
          
          {diagnostics.fatigue.signals.length > 0 ? (
            <ul className="space-y-3">
              {diagnostics.fatigue.signals.slice(0, 4).map((signal, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    signal.severity === "high" ? "bg-red-500" : 
                    signal.severity === "medium" ? "bg-amber-500" : "bg-muted-foreground"
                  }`} />
                  <span>{signal.description}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No significant risk signals detected
            </p>
          )}
        </div>
      </PresentationSlide>

      {/* Slide 6: Recommendations */}
      <PresentationSlide
        title="Recommendations"
        subtitle="Actionable next steps"
        slideNumber={6}
      >
        <div className="space-y-4">
          {diagnostics.recommendations.slice(0, 5).map((rec, i) => (
            <div key={i} className="flex items-start gap-3">
              <Lightbulb className={`w-4 h-4 shrink-0 mt-0.5 ${
                rec.priority === "high" ? "text-primary" : "text-muted-foreground"
              }`} />
              <div>
                <p className="font-medium text-sm">{rec.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{rec.description}</p>
              </div>
            </div>
          ))}
        </div>
      </PresentationSlide>
    </>
  );
};
