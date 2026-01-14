import React from "react";
import { PresentationSlide } from "./PresentationSlide";
import { CheckCircle2, AlertTriangle, Lightbulb } from "lucide-react";

interface CreativeAnalyzerSlidesProps {
  effectivePractices: { area: string; practice: string }[];
  riskAreas: { area: string; observation: string; impact: string }[];
  improvements: string[];
  context?: string;
  imagePreview?: string | null;
}

export const CreativeAnalyzerSlides: React.FC<CreativeAnalyzerSlidesProps> = ({
  effectivePractices,
  riskAreas,
  improvements,
  context,
  imagePreview,
}) => {
  return (
    <div className="space-y-6">
      {/* Slide 1: Overview */}
      <PresentationSlide
        title="Creative Audit Overview"
        subtitle="Email Creative Analysis Summary"
        slideNumber={1}
        footer="Creative & Content Effectiveness Analyzer"
      >
        <div className="h-full flex flex-col gap-4">
          {/* Context highlight */}
          {context && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
              <p className="text-sm text-foreground italic">"{context}"</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 flex-1">
            {/* Effective Practices */}
            <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-green-600 mb-3">
                <CheckCircle2 className="w-4 h-4" />
                Effective Practices
              </h4>
              {effectivePractices.length > 0 ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-1 font-medium text-muted-foreground">
                        Area
                      </th>
                      <th className="text-left py-1 font-medium text-muted-foreground">
                        Practice
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {effectivePractices.slice(0, 6).map((practice, index) => (
                      <tr key={index} className="border-b border-border/50">
                        <td className="py-1 font-medium text-foreground">
                          {practice.area}
                        </td>
                        <td className="py-1 text-muted-foreground">
                          {practice.practice}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No practices documented
                </p>
              )}
            </div>

            {/* Risk Areas */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-amber-600 mb-3">
                <AlertTriangle className="w-4 h-4" />
                Risk Areas
              </h4>
              {riskAreas.length > 0 ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-1 font-medium text-muted-foreground">
                        Area
                      </th>
                      <th className="text-left py-1 font-medium text-muted-foreground">
                        Observation
                      </th>
                      <th className="text-left py-1 font-medium text-muted-foreground">
                        Impact
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {riskAreas.slice(0, 6).map((risk, index) => (
                      <tr key={index} className="border-b border-border/50">
                        <td className="py-1 font-medium text-foreground">
                          {risk.area}
                        </td>
                        <td className="py-1 text-muted-foreground">
                          {risk.observation}
                        </td>
                        <td className="py-1 text-muted-foreground">
                          {risk.impact}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No risks documented
                </p>
              )}
            </div>
          </div>
        </div>
      </PresentationSlide>

      {/* Slide 2: Improvements */}
      <PresentationSlide
        title="Improvement Opportunities"
        subtitle="Recommended Optimizations"
        slideNumber={2}
        footer="Creative & Content Effectiveness Analyzer"
      >
        <div className="h-full flex items-center">
          <div className="w-full">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-primary" />
              <h4 className="font-semibold text-foreground">
                Recommended Actions
              </h4>
            </div>
            {improvements.length > 0 ? (
              <ul className="space-y-3">
                {improvements.map((improvement, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="w-6 h-6 flex items-center justify-center bg-primary/10 text-primary rounded-full text-xs font-medium shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-sm text-foreground">{improvement}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No improvements documented
              </p>
            )}
          </div>
        </div>
      </PresentationSlide>
    </div>
  );
};
