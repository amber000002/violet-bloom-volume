import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, Zap, Shield, Lightbulb, Target, Calendar, 
  UserMinus, Activity, TrendingUp, Workflow, Info,
  ChevronDown, ChevronUp, Layers, Users, BookOpen, Sparkles,
  CheckCircle2, Mail, Bell, MessageSquare, Smartphone, Globe,
  Hash, BarChart3, Brain, Crosshair, AlertTriangle
} from "lucide-react";
import {
  industryConfigs,
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
import {
  getFrameworkJourneys,
  getFrameworkCampaigns,
  JourneyMapping,
  CampaignMapping,
} from "@/data/frameworkMappings";

import { ViewMode } from "@/hooks/usePresentationMode";
import { UseCaseStudioSlides } from "../presentation/UseCaseStudioSlides";
import { useResourceLibrary } from "@/contexts/ResourceLibraryContext";
import { ResourceCitations } from "@/components/resource-library/ResourceCitations";
import { ResourceCitation, ResourceJourney, ResourceCampaign } from "@/types/resources";
import { CoreBrandJSON } from "@/types/brandProfile";
import { calculateConfidence, getConfidenceColor, getConfidenceLabel, ConfidenceResult } from "@/lib/confidenceEngine";
import { personalizeUseCase, PersonalizedUseCase } from "@/lib/useCasePersonalizer";

interface UseCaseStudioTabProps {
  industry: string;
  viewMode?: ViewMode;
  brandProfile?: CoreBrandJSON | null;
  onDataChange?: (data: any) => void;
}

// ===== CHANNEL DEFINITIONS =====
const channelOptions = [
  { id: "email", label: "Email", icon: Mail },
  { id: "push", label: "Push", icon: Bell },
  { id: "in-app", label: "In-App", icon: Smartphone },
  { id: "sms", label: "SMS", icon: MessageSquare },
  { id: "whatsapp", label: "WhatsApp", icon: Hash },
  { id: "web-push", label: "Web Push", icon: Globe },
];

const triggerTypeIcons: Record<JourneyUseCase['triggerType'], typeof Clock> = {
  "past-behavior": Activity,
  "live-event": Zap,
  "segment-change": TrendingUp,
  "time-based": Clock,
};

// ===== HELPER FUNCTIONS =====
const normalizeStage = (stage: string): string => {
  return stage.toLowerCase().trim().replace(/\s+/g, "-");
};

const stageToLabel = (stage: string): string => {
  return stage
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// ===== PERSONALIZED USE CASE CARD =====
const UseCaseCard: React.FC<{
  useCase: PersonalizedUseCase;
  confidence: ConfidenceResult;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ useCase, confidence, isExpanded, onToggle }) => {
  const confidenceColorClass = getConfidenceColor(confidence.level);
  const isInternal = useCase.source === "internal";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`magic-card rounded-xl p-5 space-y-3 ${isInternal ? "ring-1 ring-emerald-500/30" : ""}`}
    >
      {/* Header: Title + Badges */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <h4 className="font-display font-semibold text-foreground">{useCase.title}</h4>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Stage badge */}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-xs font-medium text-primary">
              {stageToLabel(useCase.stage)}
            </span>
            {/* Confidence badge */}
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium ${confidenceColorClass}`}>
              {confidence.level === "high" && <CheckCircle2 className="w-3 h-3" />}
              {confidence.level === "medium" && <AlertTriangle className="w-3 h-3" />}
              {confidence.level === "exploratory" && <Lightbulb className="w-3 h-3" />}
              {getConfidenceLabel(confidence.level)}
            </span>
            {/* Source badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
              isInternal ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
            }`}>
              {isInternal ? <BookOpen className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
              {isInternal ? (useCase.sourceLabel || "Internal") : "Native"}
            </span>
            {/* Trigger type */}
            {useCase.triggerType && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50 text-xs text-muted-foreground">
                <Zap className="w-3 h-3" />
                {useCase.triggerType}
              </span>
            )}
          </div>
        </div>
        <button onClick={onToggle} className="p-1 hover:bg-muted rounded flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Objective */}
      <p className="text-sm text-muted-foreground">{useCase.objective}</p>

      {/* Channels Used */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {useCase.channelsUsed.map(ch => {
          const opt = channelOptions.find(o => o.id === ch);
          return opt ? (
            <span key={ch} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted/50 text-xs text-muted-foreground">
              <opt.icon className="w-3 h-3" />
              {opt.label}
            </span>
          ) : null;
        })}
      </div>

      {/* Expandable Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border pt-4 mt-3 space-y-5"
          >
            {/* Why It Matters */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                <Brain className="w-3.5 h-3.5 text-primary" />
                Why It Matters
              </div>
              <p className="text-sm text-muted-foreground">{useCase.whyItMatters}</p>
            </div>

            {/* Execution Strategy */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                <Crosshair className="w-3.5 h-3.5 text-secondary" />
                Execution Strategy
              </div>
              <div className="space-y-2">
                {useCase.executionStrategy.map((strategy, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/20 border border-border">
                    <span className="text-xs font-medium text-primary">{strategy.channel}</span>
                    <p className="text-xs text-muted-foreground mt-1">{strategy.direction}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Personalization Layers */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                <Layers className="w-3.5 h-3.5 text-accent" />
                Personalization Layers Applied
              </div>
              <div className="grid grid-cols-2 gap-2">
                {useCase.personalizationLayers.map((layer, i) => (
                  <div key={i} className="p-2 rounded bg-muted/30">
                    <span className="text-xs font-medium text-foreground">{layer.layer}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{layer.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Campaign Logic Structure */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                <Workflow className="w-3.5 h-3.5 text-primary" />
                Campaign Logic
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-muted/20">
                  <span className="text-muted-foreground">Trigger:</span>
                  <p className="text-foreground mt-0.5">{useCase.campaignLogic.triggerEvent}</p>
                </div>
                <div className="p-2 rounded bg-muted/20">
                  <span className="text-muted-foreground">Segmentation:</span>
                  <p className="text-foreground mt-0.5">{useCase.campaignLogic.segmentationRule}</p>
                </div>
                <div className="p-2 rounded bg-muted/20">
                  <span className="text-muted-foreground">Channel Flow:</span>
                  <p className="text-foreground mt-0.5">{useCase.campaignLogic.channelFlow}</p>
                </div>
                <div className="p-2 rounded bg-muted/20">
                  <span className="text-muted-foreground">Content Theme:</span>
                  <p className="text-foreground mt-0.5">{useCase.campaignLogic.contentTheme}</p>
                </div>
              </div>
            </div>

            {/* Metrics to Impact */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                <BarChart3 className="w-3.5 h-3.5 text-secondary" />
                Metrics to Impact
              </div>
              <div className="flex flex-wrap gap-1.5">
                {useCase.metricsToImpact.map((metric, i) => (
                  <span key={i} className="px-2 py-1 rounded-full bg-secondary/10 text-xs text-secondary">
                    {metric}
                  </span>
                ))}
                {useCase.businessKPIs.map((kpi, i) => (
                  <span key={`kpi-${i}`} className="px-2 py-1 rounded-full bg-primary/10 text-xs text-primary">
                    {kpi}
                  </span>
                ))}
              </div>
            </div>

            {/* Why This Fits Your Brand */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                Why This Fits Your Brand
              </div>
              <p className="text-sm text-muted-foreground p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                {useCase.whyThisFitsYourBrand}
              </p>
            </div>

            {/* Confidence Breakdown */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                Confidence Breakdown
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {confidence.reasons.map((reason, i) => (
                  <span key={i} className="px-2 py-1 rounded bg-muted/30 text-muted-foreground">
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ===== MAIN COMPONENT =====
export const UseCaseStudioTab: React.FC<UseCaseStudioTabProps> = ({
  industry,
  viewMode = "app",
  brandProfile,
  onDataChange,
}) => {
  const [framework, setFramework] = useState<FrameworkType>("lifecycle");
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["email"]);

  // Resource Library integration
  const { findMatchingResources, resources } = useResourceLibrary();

  const config = industry ? industryConfigs[industry] : null;
  
  const inferredBusinessModel = useMemo(() => {
    if (!industry) return null;
    return getInferredBusinessModel(industry);
  }, [industry]);
  
  const businessModelLabel = inferredBusinessModel ? getBusinessModelLabel(inferredBusinessModel) : "";

  // ===== CHANNEL TOGGLE =====
  const toggleChannel = (channelId: string) => {
    setSelectedChannels(prev => {
      if (prev.includes(channelId)) {
        if (prev.length === 1) return prev; // at least one channel
        return prev.filter(c => c !== channelId);
      }
      return [...prev, channelId];
    });
  };

  const selectAllChannels = () => {
    setSelectedChannels(channelOptions.map(c => c.id));
  };

  // ===== STAGES =====
  // Extract unique stages from internal resources
  const internalStages = useMemo(() => {
    const stagesSet = new Set<string>();
    for (const resource of resources) {
      if (!resource.isEnabled) continue;
      if (!resource.tabs.includes("use-case-studio")) continue;
      if (!resource.industries.includes("all") && !resource.industries.includes(industry as any)) continue;
      resource.journeys?.forEach(j => { if (j.stage) stagesSet.add(normalizeStage(j.stage)); });
      resource.campaigns?.forEach(c => { if (c.stage) stagesSet.add(normalizeStage(c.stage)); });
    }
    return Array.from(stagesSet);
  }, [resources, industry]);

  const predefinedStages = useMemo(() => {
    if (!industry) return [];
    return getFrameworkStages(framework, industry);
  }, [industry, framework]);

  const availableStages = useMemo(() => {
    const predefinedIds = new Set(predefinedStages.map(s => normalizeStage(s.id)));
    const merged = [...predefinedStages];
    for (const stage of internalStages) {
      if (!predefinedIds.has(stage)) {
        merged.push({ id: stage, label: stageToLabel(stage) });
      }
    }
    return merged;
  }, [predefinedStages, internalStages]);

  // Reset selected stage when framework or industry changes
  React.useEffect(() => {
    if (availableStages.length > 0) {
      setSelectedStage(availableStages[0].id);
    } else {
      setSelectedStage("");
    }
    setExpandedCard(null);
  }, [availableStages]);

  // ===== RESOURCE MATCHING =====
  const resourceMatches = useMemo(() => {
    if (!industry || !selectedStage) return [];
    return findMatchingResources("use-case-studio", industry);
  }, [industry, selectedStage, findMatchingResources]);

  const internalJourneys = useMemo((): Array<ResourceJourney & { sourceResource: string }> => {
    const result: Array<ResourceJourney & { sourceResource: string }> = [];
    const normalizedSelectedStage = normalizeStage(selectedStage);
    for (const match of resourceMatches) {
      const resource = match.resource;
      if (resource.journeys && resource.journeys.length > 0) {
        for (const journey of resource.journeys) {
          const journeyStage = journey.stage ? normalizeStage(journey.stage) : "";
          if (!journeyStage || journeyStage === normalizedSelectedStage) {
            result.push({ ...journey, sourceResource: resource.title });
          }
        }
      }
    }
    return result;
  }, [resourceMatches, selectedStage]);

  const internalCampaigns = useMemo((): Array<ResourceCampaign & { sourceResource: string }> => {
    const result: Array<ResourceCampaign & { sourceResource: string }> = [];
    const normalizedSelectedStage = normalizeStage(selectedStage);
    for (const match of resourceMatches) {
      const resource = match.resource;
      if (resource.campaigns && resource.campaigns.length > 0) {
        for (const campaign of resource.campaigns) {
          const campaignStage = campaign.stage ? normalizeStage(campaign.stage) : "";
          if (!campaignStage || campaignStage === normalizedSelectedStage) {
            result.push({ ...campaign, sourceResource: resource.title });
          }
        }
      }
    }
    return result;
  }, [resourceMatches, selectedStage]);

  // ===== NATIVE INTELLIGENCE =====
  const nativeJourneys: (JourneyUseCase | JourneyMapping)[] = useMemo(() => {
    if (!selectedStage) return [];
    if (framework === "aida" || framework === "4p" || framework === "7p") {
      return getFrameworkJourneys(framework, selectedStage);
    }
    if (!config) return [];
    return config.journeys[selectedStage] || [];
  }, [config, selectedStage, framework]);

  const nativeCampaigns: (CampaignUseCase | CampaignMapping)[] = useMemo(() => {
    if (!selectedStage) return [];
    if (framework === "aida" || framework === "4p" || framework === "7p") {
      return getFrameworkCampaigns(framework, selectedStage);
    }
    if (!config) return [];
    return config.campaigns[selectedStage] || [];
  }, [config, selectedStage, framework]);

  const hasInternalContent = internalJourneys.length > 0 || internalCampaigns.length > 0;

  // ===== GENERATE PERSONALIZED USE CASES =====
  const personalizedUseCases = useMemo((): Array<{ useCase: PersonalizedUseCase; confidence: ConfidenceResult }> => {
    const results: Array<{ useCase: PersonalizedUseCase; confidence: ConfidenceResult }> = [];

    // Internal journeys
    for (const journey of internalJourneys) {
      const uc = personalizeUseCase({
        name: journey.name,
        stage: selectedStage,
        triggerType: journey.triggerType,
        description: journey.description,
        source: "internal",
        sourceLabel: journey.sourceResource,
      }, brandProfile || null, selectedChannels);

      const confidence = calculateConfidence({
        brandProfile: brandProfile || null,
        stage: selectedStage,
        hasInternalContent: true,
        triggerType: journey.triggerType,
        selectedChannels,
      });

      results.push({ useCase: uc, confidence });
    }

    // Internal campaigns
    for (const campaign of internalCampaigns) {
      const uc = personalizeUseCase({
        name: campaign.name,
        stage: selectedStage,
        description: campaign.purpose,
        source: "internal",
        sourceLabel: campaign.sourceResource,
      }, brandProfile || null, selectedChannels);

      const confidence = calculateConfidence({
        brandProfile: brandProfile || null,
        stage: selectedStage,
        hasInternalContent: true,
        selectedChannels,
      });

      results.push({ useCase: uc, confidence });
    }

    // Native journeys
    for (const journey of nativeJourneys) {
      const isFramework = 'applicableStages' in journey;
      const triggerType = isFramework 
        ? (journey as JourneyMapping).triggerType 
        : (journey as JourneyUseCase).triggerType;

      const uc = personalizeUseCase({
        name: journey.name,
        stage: selectedStage,
        triggerType,
        description: isFramework ? (journey as JourneyMapping).description : (journey as JourneyUseCase).whyItWorks,
        source: "native",
      }, brandProfile || null, selectedChannels);

      const confidence = calculateConfidence({
        brandProfile: brandProfile || null,
        stage: selectedStage,
        hasInternalContent: false,
        triggerType,
        selectedChannels,
      });

      results.push({ useCase: uc, confidence });
    }

    // Native campaigns
    for (const campaign of nativeCampaigns) {
      const uc = personalizeUseCase({
        name: campaign.name,
        stage: selectedStage,
        description: campaign.purpose,
        source: "native",
      }, brandProfile || null, selectedChannels);

      const confidence = calculateConfidence({
        brandProfile: brandProfile || null,
        stage: selectedStage,
        hasInternalContent: false,
        selectedChannels,
      });

      results.push({ useCase: uc, confidence });
    }

    return results;
  }, [internalJourneys, internalCampaigns, nativeJourneys, nativeCampaigns, selectedStage, brandProfile, selectedChannels]);

  // Split by source for display
  const internalUseCases = personalizedUseCases.filter(p => p.useCase.source === "internal");
  const nativeUseCases = personalizedUseCases.filter(p => p.useCase.source === "native");

  // ===== FRAMEWORK REASON =====
  const frameworkReason = useMemo(() => {
    if (!industry) return "Select an industry to see framework recommendations.";
    return getFrameworkReason(framework, industry);
  }, [industry, framework]);

  // ===== EXPORT DATA =====
  const allJourneys = useMemo(() => {
    if (framework === "aida" || framework === "4p" || framework === "7p") return getFrameworkJourneys(framework);
    if (!config) return [];
    return Object.values(config.journeys).flat();
  }, [config, framework]);

  const allCampaigns = useMemo(() => {
    if (framework === "aida" || framework === "4p" || framework === "7p") return getFrameworkCampaigns(framework);
    if (!config) return [];
    return Object.values(config.campaigns).flat();
  }, [config, framework]);

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

  // ===== RENDER =====

  if (!industry) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <span className="text-3xl">📧</span>
        </div>
        <p className="text-muted-foreground">
          Select an industry above to discover hyper-personalized use cases.
        </p>
      </div>
    );
  }

  // Presentation view
  if (viewMode === "presentation") {
    const normalizedJourneys = allJourneys.map((j: any) => {
      if ('description' in j) {
        return {
          name: j.name,
          triggerType: j.triggerType === 'schedule' ? 'time-based' : 
                       j.triggerType === 'api' ? 'live-event' : 
                       j.triggerType === 'segment' ? 'segment-change' : 'live-event',
          trigger: j.description,
          whyItWorks: j.description,
          frequencyGuardrail: "Based on user behavior",
        };
      }
      return j;
    });

    const normalizedCampaigns = allCampaigns.map((c: any) => {
      if ('suppression' in c && !('suppressionAdvice' in c)) {
        return {
          name: c.name,
          purpose: c.purpose,
          bestTiming: c.timing,
          suppressionAdvice: c.suppression,
        };
      }
      return c;
    });

    return (
      <UseCaseStudioSlides
        framework={framework}
        frameworkReason={frameworkReason}
        journeys={normalizedJourneys}
        campaigns={normalizedCampaigns}
        businessModel={businessModelLabel}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Read-only Industry Badge */}
      {config && (
        <div className="flex items-center justify-center gap-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              Industry: {config.name}
            </span>
            {brandProfile && (
              <span className="text-xs text-muted-foreground">
                • {brandProfile.brand_identity.brand_name}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Channel Multi-Select */}
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm font-medium text-foreground">Channels</span>
          <button
            onClick={selectAllChannels}
            className="text-xs text-primary hover:underline"
          >
            Select All
          </button>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {channelOptions.map((ch) => {
            const isSelected = selectedChannels.includes(ch.id);
            return (
              <motion.button
                key={ch.id}
                onClick={() => toggleChannel(ch.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  isSelected
                    ? "bg-primary/20 text-primary border border-primary/40"
                    : "bg-muted/30 text-muted-foreground border border-border hover:bg-muted/50"
                }`}
              >
                <ch.icon className="w-3.5 h-3.5" />
                {ch.label}
              </motion.button>
            );
          })}
        </div>
      </div>

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

      {/* Use Case Cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${framework}-${selectedStage}-${selectedChannels.join(",")}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Summary */}
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span>{personalizedUseCases.length} use cases</span>
            <span>•</span>
            <span>{internalUseCases.length} from internal resources</span>
            <span>•</span>
            <span>{nativeUseCases.length} native intelligence</span>
          </div>

          {/* Internal Use Cases */}
          {internalUseCases.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <BookOpen className="w-3.5 h-3.5" />
                <span>From Internal Resources</span>
              </div>
              {internalUseCases.map(({ useCase, confidence }) => (
                <UseCaseCard
                  key={useCase.id}
                  useCase={useCase}
                  confidence={confidence}
                  isExpanded={expandedCard === useCase.id}
                  onToggle={() => setExpandedCard(expandedCard === useCase.id ? null : useCase.id)}
                />
              ))}
            </div>
          )}

          {/* Native Use Cases */}
          {nativeUseCases.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{hasInternalContent ? "Supplemental (Native Intelligence)" : "Native Intelligence"}</span>
              </div>
              {nativeUseCases.map(({ useCase, confidence }) => (
                <UseCaseCard
                  key={useCase.id}
                  useCase={useCase}
                  confidence={confidence}
                  isExpanded={expandedCard === useCase.id}
                  onToggle={() => setExpandedCard(expandedCard === useCase.id ? null : useCase.id)}
                />
              ))}
            </div>
          )}

          {/* No matches */}
          {personalizedUseCases.length === 0 && (
            <div className="p-8 rounded-xl bg-muted/30 border border-border text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                No direct lifecycle match found for the selected channels. Showing closest aligned use cases.
              </p>
              <p className="text-xs text-muted-foreground/70">
                Try selecting more channels or changing the lifecycle stage.
              </p>
            </div>
          )}

          {/* Resource Citations */}
          {resourceMatches.length > 0 && (
            <ResourceCitations
              citations={resourceMatches.map(m => ({
                resourceId: m.resource.id,
                resourceTitle: m.resource.title,
                matchType: hasInternalContent ? "exact" as const : "partial" as const,
              }))}
              confidenceLevel={hasInternalContent ? "high" : resourceMatches.length > 0 ? "medium" : "low"}
              usedNativeIntelligence={!hasInternalContent}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
