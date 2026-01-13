import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, Zap, Shield, Lightbulb, Target, Calendar, 
  UserMinus, Activity, TrendingUp, Workflow, Info
} from "lucide-react";
import {
  industryConfigs,
  aarrrStages,
  JourneyUseCase,
  CampaignUseCase,
  getTriggerTypeLabel,
  getStageInsight,
  FrameworkType,
  frameworkOptions,
  getFrameworkStages,
  getFrameworkReason,
  getInferredBusinessModel,
  getBusinessModelLabel,
} from "@/data/industryConfig";

import { ViewMode } from "@/hooks/usePresentationMode";
import { UseCaseStudioSlides } from "../presentation/UseCaseStudioSlides";

interface UseCaseStudioTabProps {
  industry: string;
  viewMode?: ViewMode;
  onDataChange?: (data: any) => void;
}

const triggerTypeIcons: Record<JourneyUseCase['triggerType'], typeof Clock> = {
  "past-behavior": Activity,
  "live-event": Zap,
  "segment-change": TrendingUp,
  "time-based": Clock,
};

export const UseCaseStudioTab: React.FC<UseCaseStudioTabProps> = ({
  industry,
  viewMode = "app",
  onDataChange,
}) => {
  const [framework, setFramework] = useState<FrameworkType>("lifecycle");
  const [selectedStage, setSelectedStage] = useState<string>("");

  const config = industry ? industryConfigs[industry] : null;
  
  // Infer business model from industry
  const inferredBusinessModel = useMemo(() => {
    if (!industry) return null;
    return getInferredBusinessModel(industry);
  }, [industry]);
  
  const businessModelLabel = inferredBusinessModel ? getBusinessModelLabel(inferredBusinessModel) : "";

  // Get dynamic stages based on framework and industry
  const availableStages = useMemo(() => {
    if (!industry) return [];
    return getFrameworkStages(framework, industry);
  }, [industry, framework]);

  // Reset selected stage when framework or industry changes
  React.useEffect(() => {
    if (availableStages.length > 0) {
      setSelectedStage(availableStages[0].id);
    } else {
      setSelectedStage("");
    }
  }, [availableStages]);

  // Get journeys and campaigns for selected stage
  const journeys: JourneyUseCase[] = useMemo(() => {
    if (!config || !selectedStage) return [];
    return config.journeys[selectedStage] || [];
  }, [config, selectedStage]);

  const campaigns: CampaignUseCase[] = useMemo(() => {
    if (!config || !selectedStage) return [];
    return config.campaigns[selectedStage] || [];
  }, [config, selectedStage]);

  const stageInsight = useMemo(() => {
    if (!industry || !selectedStage) return null;
    return getStageInsight(industry, selectedStage, framework);
  }, [industry, selectedStage, framework]);

  // Get all journeys and campaigns across all stages for export
  const allJourneys = useMemo(() => {
    if (!config) return [];
    return Object.values(config.journeys).flat();
  }, [config]);

  const allCampaigns = useMemo(() => {
    if (!config) return [];
    return Object.values(config.campaigns).flat();
  }, [config]);

  // Get framework reason
  const frameworkReason = useMemo(() => {
    if (!industry) return "Select an industry to see framework recommendations.";
    return getFrameworkReason(framework, industry);
  }, [industry, framework]);

  // Report data changes for export
  useEffect(() => {
    if (onDataChange && config) {
      onDataChange({
        framework,
        frameworkReason,
        journeys: allJourneys,
        campaigns: allCampaigns,
        businessModel: businessModelLabel,
      });
    }
  }, [framework, frameworkReason, allJourneys, allCampaigns, businessModelLabel, config, onDataChange]);

  if (!industry) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <span className="text-3xl">📧</span>
        </div>
        <p className="text-muted-foreground">
          Select an industry and business model above to discover use cases.
        </p>
      </div>
    );
  }

  // Presentation view
  if (viewMode === "presentation") {
    return (
      <UseCaseStudioSlides
        framework={framework}
        frameworkReason={frameworkReason}
        journeys={allJourneys}
        campaigns={allCampaigns}
        businessModel={businessModelLabel}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Framework Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">Insight Framework</span>
          <div className="group relative">
            <Info className="w-4 h-4 text-muted-foreground cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border border-border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-64 text-xs text-muted-foreground z-10">
              Frameworks help structure insights — they don't change the underlying data.
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {frameworkOptions.map((option) => (
            <motion.button
              key={option.id}
              onClick={() => setFramework(option.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                framework === option.id
                  ? "bg-gradient-magic text-primary-foreground shadow-magic"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
              }`}
            >
              {option.label}
            </motion.button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center max-w-xl mx-auto">
          {frameworkReason}
        </p>
      </div>

      {/* Stage Selector */}
      <div className="flex flex-wrap gap-2 justify-center">
        {availableStages.map((stage) => (
          <motion.button
            key={stage.id}
            onClick={() => setSelectedStage(stage.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
              selectedStage === stage.id
                ? "bg-gradient-magic text-primary-foreground shadow-magic"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
            }`}
          >
            {stage.label}
          </motion.button>
        ))}
      </div>

      {/* Two Column Layout: Journeys and Campaigns */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${framework}-${selectedStage}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="grid lg:grid-cols-2 gap-8"
        >
          {/* Column 1: Journeys */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Workflow className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  Journeys
                </h3>
                <p className="text-xs text-muted-foreground">
                  Always-on, behavior-led
                </p>
              </div>
            </div>

            {journeys.length > 0 ? (
              <div className="space-y-4">
                {journeys.map((journey, index) => {
                  const TriggerIcon = triggerTypeIcons[journey.triggerType];
                  return (
                    <motion.div
                      key={journey.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="magic-card rounded-xl p-5 space-y-3"
                    >
                      <h4 className="font-display font-semibold text-foreground">
                        {journey.name}
                      </h4>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-xs font-medium text-primary">
                          <TriggerIcon className="w-3 h-3" />
                          {getTriggerTypeLabel(journey.triggerType)}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">{journey.trigger}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Zap className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                          <span className="text-foreground">{journey.whyItWorks}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Shield className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">{journey.frequencyGuardrail}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-muted/30 border border-border text-center">
                <p className="text-sm text-muted-foreground">
                  No journeys defined for this stage.
                </p>
              </div>
            )}
          </div>

          {/* Column 2: Campaigns */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
                <Target className="w-4 h-4 text-secondary" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  Campaigns
                </h3>
                <p className="text-xs text-muted-foreground">
                  Contextual, one-time sends
                </p>
              </div>
            </div>

            {campaigns.length > 0 ? (
              <div className="space-y-4">
                {campaigns.map((campaign, index) => (
                  <motion.div
                    key={campaign.name}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="magic-card rounded-xl p-5 space-y-3"
                  >
                    <h4 className="font-display font-semibold text-foreground">
                      {campaign.name}
                    </h4>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <Target className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="text-foreground">{campaign.purpose}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">
                          Best timing: {campaign.bestTiming}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <UserMinus className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">
                          Suppression: {campaign.suppressionAdvice}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-muted/30 border border-border text-center">
                <p className="text-sm text-muted-foreground">
                  No campaigns defined for this stage.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Insight Banner */}
      {stageInsight && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-magic flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-foreground italic">
                "{stageInsight}"
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Mature programs rely more on journeys than campaigns.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
