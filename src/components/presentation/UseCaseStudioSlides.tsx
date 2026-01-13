import React from "react";
import { PresentationSlide } from "./PresentationSlide";
import { JourneyUseCase, CampaignUseCase, FrameworkType, getTriggerTypeLabel, frameworkOptions } from "@/data/industryConfig";
import { Clock, Zap, Activity, TrendingUp } from "lucide-react";

interface UseCaseStudioSlidesProps {
  framework: FrameworkType;
  frameworkReason: string;
  journeys: JourneyUseCase[];
  campaigns: CampaignUseCase[];
  businessModel: string;
}

const triggerTypeIcons: Record<JourneyUseCase["triggerType"], typeof Clock> = {
  "past-behavior": Activity,
  "live-event": Zap,
  "segment-change": TrendingUp,
  "time-based": Clock,
};

// Get label for framework
const getFrameworkLabel = (framework: FrameworkType): string => {
  const option = frameworkOptions.find(f => f.id === framework);
  return option?.label || framework;
};

export const UseCaseStudioSlides: React.FC<UseCaseStudioSlidesProps> = ({
  framework,
  frameworkReason,
  journeys,
  campaigns,
  businessModel,
}) => {
  return (
    <div className="space-y-8">
      {/* Slide 1: Framework */}
      <PresentationSlide
        title="Use Case Framework"
        slideNumber={1}
      >
        <div className="space-y-6">
          <div className="text-center py-4">
            <span className="inline-flex px-4 py-2 rounded-full bg-gradient-magic text-primary-foreground font-medium">
              {getFrameworkLabel(framework)}
            </span>
          </div>

          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <h4 className="font-semibold text-foreground mb-2">Why this framework fits</h4>
            <p className="text-sm text-muted-foreground">{frameworkReason}</p>
          </div>

          {businessModel && (
            <p className="text-sm text-muted-foreground text-center italic">
              Inferred model: {businessModel}
            </p>
          )}
        </div>
      </PresentationSlide>

      {/* Slide 2: Journeys */}
      <PresentationSlide
        title="Always-on Journeys"
        subtitle="Behavior-led, automated sequences"
        slideNumber={2}
      >
        <div className="grid gap-3">
          {journeys.slice(0, 5).map((journey, i) => {
            const Icon = triggerTypeIcons[journey.triggerType];
            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-foreground text-sm">{journey.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="text-primary font-medium">{getTriggerTypeLabel(journey.triggerType)}</span>
                    {" • "}
                    {journey.whyItWorks}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </PresentationSlide>

      {/* Slide 3: Campaigns */}
      <PresentationSlide
        title="Contextual Campaigns"
        subtitle="One-time, targeted sends"
        slideNumber={3}
      >
        <div className="grid gap-3">
          {campaigns.slice(0, 5).map((campaign, i) => (
            <div key={i} className="p-3 rounded-lg bg-muted/30">
              <h4 className="font-medium text-foreground text-sm">{campaign.name}</h4>
              <p className="text-xs text-muted-foreground mt-1">{campaign.purpose}</p>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span>
                  <span className="text-foreground font-medium">Timing:</span> {campaign.bestTiming}
                </span>
                <span>
                  <span className="text-foreground font-medium">Suppress:</span> {campaign.suppressionAdvice}
                </span>
              </div>
            </div>
          ))}
        </div>
      </PresentationSlide>
    </div>
  );
};
