import React from "react";
import { PresentationSlide } from "./PresentationSlide";
import { AMPUseCase } from "@/data/industryConfig";
import { Sparkles, Gift, ChevronRight, Star } from "lucide-react";

interface AMPStudioSlidesProps {
  industry: string;
  ampUseCases: AMPUseCase[];
  supportsGamification: boolean;
}

export const AMPStudioSlides: React.FC<AMPStudioSlidesProps> = ({
  industry,
  ampUseCases,
  supportsGamification,
}) => {
  const ampBenefits = [
    "Reduce app dependency for quick actions",
    "Increase engagement with in-email interactivity",
    "Provide real-time content updates",
    "Shorten user journeys from email to conversion",
  ];

  const guardrails = [
    "Ensure graceful fallback for non-AMP clients",
    "Keep interactions simple and purposeful",
    "Test across email clients thoroughly",
  ];

  return (
    <div className="space-y-8">
      {/* Slide 1: Why Interactive Email */}
      <PresentationSlide
        title="Why Interactive Email"
        subtitle="AMP-powered experiences for modern engagement"
        slideNumber={1}
      >
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Where AMP adds value
            </h4>
            <ul className="space-y-2">
              {ampBenefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <ChevronRight className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">Best suited use cases</h4>
            <ul className="space-y-2">
              {ampUseCases.slice(0, 4).map((uc, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <ChevronRight className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                  {uc.name}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 p-3 rounded-lg bg-muted/30 border border-border">
          <h4 className="font-semibold text-foreground text-sm mb-2">Guardrails</h4>
          <div className="flex flex-wrap gap-2">
            {guardrails.map((g, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                {g}
              </span>
            ))}
          </div>
        </div>
      </PresentationSlide>

      {/* Slide 2: Brand-led Carousel */}
      <PresentationSlide
        title="Brand-led Carousel Template"
        subtitle="Visual-first, personalized browsing experience"
        slideNumber={2}
      >
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Key Components</h4>
            <ul className="space-y-2 text-sm">
              {[
                "Brand logo at top",
                "Hero carousel (3-4 items)",
                "Personalized headline",
                "Primary CTA",
                "Supporting text",
                "Footer with social icons",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Visual mock */}
          <div className="bg-muted/30 rounded-lg p-4 border border-border">
            <div className="flex justify-center mb-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-magic flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>
            <div className="flex gap-2 mb-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex-1 h-16 rounded bg-primary/10 flex items-center justify-center">
                  <Star className="w-4 h-4 text-primary" />
                </div>
              ))}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Personalized for you</p>
              <button className="mt-2 px-4 py-1.5 rounded bg-gradient-magic text-primary-foreground text-xs">
                Explore
              </button>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground italic mt-4">
          Personalization signals: Past purchases, browsing history, preferences
        </p>
      </PresentationSlide>

      {/* Slide 3: Gamified Template (conditional) */}
      {supportsGamification && (
        <PresentationSlide
          title="Gamified Interactive Template"
          subtitle="Engagement-driven reward experience"
          slideNumber={3}
        >
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Key Components</h4>
              <ul className="space-y-2 text-sm">
                {[
                  "Contextual hero image",
                  "Interactive element (spin wheel, scratch card)",
                  "Inline reward/result reveal",
                  "CTA post-interaction",
                  "Compliance-friendly footer",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                    {item}
                  </li>
                ))}
              </ul>

              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Best for:</span> Commerce, Gaming, Fitness, Ed-tech, Loyalty
              </p>
            </div>

            {/* Visual mock */}
            <div className="bg-muted/30 rounded-lg p-4 border border-border">
              <div className="h-16 rounded bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-3">
                <Gift className="w-6 h-6 text-primary" />
              </div>
              <div className="w-20 h-20 mx-auto rounded-full border-4 border-primary/30 flex items-center justify-center mb-3">
                <span className="text-2xl">🎯</span>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Spin to Win!</p>
                <button className="mt-2 px-4 py-1.5 rounded bg-gradient-magic text-primary-foreground text-xs">
                  Try Your Luck
                </button>
              </div>
            </div>
          </div>
        </PresentationSlide>
      )}
    </div>
  );
};
