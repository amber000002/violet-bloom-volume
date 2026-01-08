import React from "react";
import { PresentationSlide } from "./PresentationSlide";
import { IndustryConfig } from "@/data/industryConfig";

interface InboxPotentialSlidesProps {
  industry: string;
  businessModel: string;
  minVolume: number;
  maxVolume: number;
  activeVolume: number;
  inactiveVolume: number;
  config: IndustryConfig;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toFixed(0);
};

export const InboxPotentialSlides: React.FC<InboxPotentialSlidesProps> = ({
  industry,
  businessModel,
  minVolume,
  maxVolume,
  activeVolume,
  inactiveVolume,
  config,
}) => {
  const total = activeVolume + inactiveVolume;
  const activePercent = Math.round((activeVolume / total) * 100);

  return (
    <div className="space-y-8">
      {/* Slide 1: Title */}
      <PresentationSlide
        title="Responsible Inbox Potential"
        subtitle="Industry-aligned monthly email scale"
        footer={`${config.name} • ${businessModel}`}
        slideNumber={1}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-muted-foreground mb-4 text-sm uppercase tracking-wide">
              Estimated Monthly Email Volume
            </p>
            <p className="text-5xl md:text-6xl font-display font-bold text-gradient-magic">
              ≈ {formatNumber(minVolume)} – {formatNumber(maxVolume)}
            </p>
            <p className="text-muted-foreground mt-2">emails per month</p>
          </div>
        </div>
      </PresentationSlide>

      {/* Slide 2: Volume Summary */}
      <PresentationSlide
        title="Volume Summary"
        slideNumber={2}
      >
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-3xl font-display font-bold text-gradient-magic">
              ≈ {formatNumber(minVolume)} – {formatNumber(maxVolume)}
            </p>
            <p className="text-sm text-muted-foreground">emails per month</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Volume Breakdown</h3>
            
            <div className="h-4 rounded-full overflow-hidden bg-muted/50">
              <div
                className="h-full bg-gradient-magic rounded-full"
                style={{ width: `${activePercent}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-magic" />
                <span>Active users: {formatNumber(activeVolume)} ({activePercent}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted-foreground/50" />
                <span>Re-engagement: {formatNumber(inactiveVolume)} ({100 - activePercent}%)</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Key assumption:</span>{" "}
              {Math.round(config.activeUserPercent * 100)}% active user base with industry-specific frequency guardrails
            </p>
          </div>
        </div>
      </PresentationSlide>

      {/* Slide 3: Strategic Insight */}
      <PresentationSlide
        title="Strategic Insight"
        slideNumber={3}
      >
        <div className="space-y-5">
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <h4 className="text-sm font-semibold text-primary mb-2">
              What drives volume in this industry
            </h4>
            <p className="text-sm text-foreground">{config.purchaseCycle}</p>
          </div>

          <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
            <h4 className="text-sm font-semibold text-destructive mb-2">
              Primary risk to avoid
            </h4>
            <p className="text-sm text-foreground">{config.fatigueRisk}</p>
          </div>

          <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
            <h4 className="text-sm font-semibold text-accent mb-2">
              Biggest growth lever
            </h4>
            <p className="text-sm text-foreground">{config.frequencyReason}</p>
          </div>
        </div>
      </PresentationSlide>
    </div>
  );
};
