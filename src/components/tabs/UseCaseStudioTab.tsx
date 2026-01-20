import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, Zap, Shield, Lightbulb, Target, Calendar, 
  UserMinus, Activity, TrendingUp, Workflow, Info,
  ChevronDown, ChevronUp, Layers, Users, BookOpen, Sparkles
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
import { ResourceCitation } from "@/types/resources";

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

// Events and segments data - now inline with use cases
interface EventInfo {
  name: string;
  description: string;
}

interface SegmentInfo {
  name: string;
  description: string;
}

// Get relevant events for a journey or campaign
const getRelevantEvents = (stage: string, industry: string): EventInfo[] => {
  const eventsByStage: Record<string, EventInfo[]> = {
    activation: [
      { name: "User Registered", description: "Registration completed" },
      { name: "App Opened", description: "First session started" },
      { name: "Profile Completed", description: "User details filled" },
    ],
    usage: [
      { name: "Feature Used", description: "Core feature interaction" },
      { name: "Session Started", description: "App/web session" },
      { name: "Content Viewed", description: "Page or item viewed" },
    ],
    retention: [
      { name: "Last Active Date", description: "Days since activity" },
      { name: "Session Count", description: "Engagement frequency" },
      { name: "Notification Clicked", description: "Re-engagement action" },
    ],
    // AIDA stages
    attention: [
      { name: "Ad Clicked", description: "Campaign click-through" },
      { name: "First Page View", description: "Initial landing" },
      { name: "Email Opened", description: "Welcome email engagement" },
    ],
    interest: [
      { name: "Content Viewed", description: "Browse behavior" },
      { name: "Search Performed", description: "Active exploration" },
      { name: "Time on Site", description: "Engagement depth" },
    ],
    desire: [
      { name: "Added to Cart", description: "Purchase intent signal" },
      { name: "Wishlist Added", description: "Saved for later" },
      { name: "Price Alert Set", description: "Price sensitivity" },
    ],
    action: [
      { name: "Checkout Started", description: "Conversion attempt" },
      { name: "Purchase Completed", description: "Transaction success" },
      { name: "Payment Failed", description: "Transaction failure" },
    ],
    // 4P/7P stages
    product: [
      { name: "Product Viewed", description: "Item detail page" },
      { name: "Category Browsed", description: "Catalog exploration" },
      { name: "Review Read", description: "Social proof consumed" },
    ],
    price: [
      { name: "Price Compared", description: "Value evaluation" },
      { name: "Coupon Applied", description: "Discount usage" },
      { name: "Bundle Viewed", description: "Package consideration" },
    ],
    place: [
      { name: "Channel Preference", description: "Email/Push/SMS" },
      { name: "Store Located", description: "Geo interaction" },
      { name: "App Downloaded", description: "Platform adoption" },
    ],
    promotion: [
      { name: "Offer Clicked", description: "Promotion engagement" },
      { name: "Referral Made", description: "Advocacy action" },
      { name: "Loyalty Points", description: "Rewards earned" },
    ],
    people: [
      { name: "Support Contacted", description: "Service interaction" },
      { name: "Chat Started", description: "Live assistance" },
      { name: "Feedback Submitted", description: "Voice of customer" },
    ],
    process: [
      { name: "Onboarding Step", description: "Flow progression" },
      { name: "Order Status Checked", description: "Tracking behavior" },
      { name: "Self-Service Used", description: "Automation adoption" },
    ],
    "physical-evidence": [
      { name: "Review Submitted", description: "Testimonial created" },
      { name: "Photo Uploaded", description: "UGC contribution" },
      { name: "Certificate Downloaded", description: "Proof obtained" },
    ],
  };
  return eventsByStage[stage] || eventsByStage.activation;
};

const getRelevantSegments = (stage: string, industry: string): SegmentInfo[] => {
  const segmentsByStage: Record<string, SegmentInfo[]> = {
    activation: [
      { name: "New Users", description: "Registered < 7 days" },
      { name: "Incomplete Onboarding", description: "Profile < 50% complete" },
    ],
    usage: [
      { name: "Active Users", description: "Session in last 7 days" },
      { name: "Power Users", description: "> 10 sessions/month" },
    ],
    retention: [
      { name: "At-Risk Users", description: "Inactive 14-30 days" },
      { name: "Dormant Users", description: "Inactive > 30 days" },
    ],
    // AIDA stages
    attention: [
      { name: "First-Time Visitors", description: "New to platform" },
      { name: "Ad Responders", description: "Campaign-driven traffic" },
    ],
    interest: [
      { name: "Browsers", description: "Multiple page views" },
      { name: "Engaged Prospects", description: "High time on site" },
    ],
    desire: [
      { name: "High-Intent Users", description: "Cart/wishlist activity" },
      { name: "Comparison Shoppers", description: "Multiple item views" },
    ],
    action: [
      { name: "Cart Abandoners", description: "Checkout not completed" },
      { name: "Repeat Buyers", description: "Multiple purchases" },
    ],
    // 4P/7P stages
    product: [
      { name: "Category Enthusiasts", description: "Single category focus" },
      { name: "New Product Viewers", description: "Launch interest" },
    ],
    price: [
      { name: "Price-Sensitive", description: "Coupon users" },
      { name: "Premium Buyers", description: "Full-price purchasers" },
    ],
    place: [
      { name: "Multi-Channel", description: "Web + App users" },
      { name: "Store Visitors", description: "Geo-fenced" },
    ],
    promotion: [
      { name: "Offer Responders", description: "Promotion-driven" },
      { name: "Loyal Members", description: "Active in program" },
    ],
    people: [
      { name: "Support Seekers", description: "Ticket creators" },
      { name: "Feedback Providers", description: "Survey completers" },
    ],
    process: [
      { name: "Self-Servicers", description: "Prefer automation" },
      { name: "Assisted Users", description: "Need hand-holding" },
    ],
    "physical-evidence": [
      { name: "Brand Advocates", description: "Reviewers & sharers" },
      { name: "Credential Earners", description: "Certificate holders" },
    ],
  };
  return segmentsByStage[stage] || segmentsByStage.activation;
};

export const UseCaseStudioTab: React.FC<UseCaseStudioTabProps> = ({
  industry,
  viewMode = "app",
  onDataChange,
}) => {
  const [framework, setFramework] = useState<FrameworkType>("lifecycle");
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [expandedJourney, setExpandedJourney] = useState<string | null>(null);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);

  // Resource Library integration
  const { findMatchingResources, getConfidenceLevel, resources } = useResourceLibrary();

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
    // Reset expanded states
    setExpandedJourney(null);
    setExpandedCampaign(null);
  }, [availableStages]);

  // Get journeys and campaigns for selected stage
  // For AIDA, 4P, 7P: use framework mappings
  // For lifecycle/aarrr: use industry config
  const journeys: (JourneyUseCase | JourneyMapping)[] = useMemo(() => {
    if (!selectedStage) return [];
    
    if (framework === "aida" || framework === "4p" || framework === "7p") {
      return getFrameworkJourneys(framework, selectedStage);
    }
    
    if (!config) return [];
    return config.journeys[selectedStage] || [];
  }, [config, selectedStage, framework]);

  const campaigns: (CampaignUseCase | CampaignMapping)[] = useMemo(() => {
    if (!selectedStage) return [];
    
    if (framework === "aida" || framework === "4p" || framework === "7p") {
      return getFrameworkCampaigns(framework, selectedStage);
    }
    
    if (!config) return [];
    return config.campaigns[selectedStage] || [];
  }, [config, selectedStage, framework]);

  // Get events and segments for current stage
  const stageEvents = useMemo(() => {
    return getRelevantEvents(selectedStage, industry);
  }, [selectedStage, industry]);

  const stageSegments = useMemo(() => {
    return getRelevantSegments(selectedStage, industry);
  }, [selectedStage, industry]);

  const stageInsight = useMemo(() => {
    if (!industry || !selectedStage) return null;
    return getStageInsight(industry, selectedStage, framework);
  }, [industry, selectedStage, framework]);

  // Resource Library: Find matching internal resources for current context
  const resourceMatches = useMemo(() => {
    if (!industry || !selectedStage) return [];
    return findMatchingResources("use-case-studio", industry);
  }, [industry, selectedStage, findMatchingResources]);

  // All use cases are covered by resources if we have matching resources
  const useCaseAttribution = useMemo(() => {
    const journeyCoverage: Record<string, { resourceTitle: string; matchType: "exact" | "partial" | "fallback" } | null> = {};
    const campaignCoverage: Record<string, { resourceTitle: string; matchType: "exact" | "partial" | "fallback" } | null> = {};
    
    const primaryMatch = resourceMatches.find(m => m.resource.isPrimary);
    const firstMatch = resourceMatches[0];
    const coveringResource = primaryMatch || firstMatch;
    
    journeys.forEach(journey => {
      journeyCoverage[journey.name] = coveringResource 
        ? { resourceTitle: coveringResource.resource.title, matchType: coveringResource.matchType }
        : null;
    });
    
    campaigns.forEach(campaign => {
      campaignCoverage[campaign.name] = coveringResource 
        ? { resourceTitle: coveringResource.resource.title, matchType: coveringResource.matchType }
        : null;
    });
    
    return { journeyCoverage, campaignCoverage };
  }, [journeys, campaigns, resourceMatches]);

  // Compute confidence level and citations
  const confidenceLevel = useMemo(() => {
    return getConfidenceLevel(resourceMatches);
  }, [resourceMatches, getConfidenceLevel]);

  const citations: ResourceCitation[] = useMemo(() => {
    return resourceMatches.map(match => ({
      resourceId: match.resource.id,
      resourceTitle: match.resource.title,
      matchType: match.matchType,
    }));
  }, [resourceMatches]);

  // Determine if native intelligence was used (when no internal resources cover this)
  const usedNativeIntelligence = resourceMatches.length === 0;
  
  // Count how many use cases are covered by resources vs native
  const coverageStats = useMemo(() => {
    const journeysFromResource = Object.values(useCaseAttribution.journeyCoverage).filter(Boolean).length;
    const campaignsFromResource = Object.values(useCaseAttribution.campaignCoverage).filter(Boolean).length;
    return {
      journeysFromResource,
      journeysFromNative: journeys.length - journeysFromResource,
      campaignsFromResource,
      campaignsFromNative: campaigns.length - campaignsFromResource,
    };
  }, [useCaseAttribution, journeys.length, campaigns.length]);

  // Generate simplified diagnostics for each resource to explain why it matched or didn't
  const resourceDiagnostics = useMemo(() => {
    return resources.map(resource => {
      const tabMatch = resource.tabs.includes("use-case-studio");
      const industryMatch = resource.industries.includes("all") || 
        resource.industries.includes(industry as any);

      let reason = "";
      if (!resource.isEnabled) {
        reason = "Resource is disabled.";
      } else if (!tabMatch) {
        reason = "Resource is not tagged for the Use Case Studio tab.";
      } else if (!industryMatch) {
        reason = `Resource is not tagged for the "${industry}" industry.`;
      } else {
        reason = "✓ Resource is being referenced (matches tab + industry).";
      }

      return {
        resourceTitle: resource.title,
        industryMatch,
        tabMatch,
        isEnabled: resource.isEnabled,
        isPrimary: resource.isPrimary,
        reason,
      };
    });
  }, [resources, industry]);

  // Get all journeys and campaigns across all stages for export
  const allJourneys = useMemo(() => {
    if (framework === "aida" || framework === "4p" || framework === "7p") {
      return getFrameworkJourneys(framework);
    }
    if (!config) return [];
    return Object.values(config.journeys).flat();
  }, [config, framework]);

  const allCampaigns = useMemo(() => {
    if (framework === "aida" || framework === "4p" || framework === "7p") {
      return getFrameworkCampaigns(framework);
    }
    if (!config) return [];
    return Object.values(config.campaigns).flat();
  }, [config, framework]);

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

  // Helper to check if it's a framework mapping journey
  const isFrameworkJourney = (j: JourneyUseCase | JourneyMapping): j is JourneyMapping => {
    return 'description' in j && 'applicableStages' in j;
  };

  // Helper to check if it's a framework mapping campaign
  const isFrameworkCampaign = (c: CampaignUseCase | CampaignMapping): c is CampaignMapping => {
    return 'timing' in c && 'suppression' in c && 'applicableStages' in c;
  };

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
    // Normalize journeys for presentation
    const normalizedJourneys = allJourneys.map((j: any) => {
      if ('description' in j) {
        // Framework mapping
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
        // Framework mapping
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
                  const journeyName = journey.name;
                  const isExpanded = expandedJourney === journeyName;
                  const attribution = useCaseAttribution.journeyCoverage[journeyName];
                  
                  if (isFrameworkJourney(journey)) {
                    // Framework mapping journey (AIDA, 4P, 7P)
                    return (
                      <motion.div
                        key={journey.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`magic-card rounded-xl p-5 space-y-3 ${
                          attribution ? "ring-1 ring-emerald-500/30" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="font-display font-semibold text-foreground">
                            {journey.name}
                          </h4>
                          <button
                            onClick={() => setExpandedJourney(isExpanded ? null : journeyName)}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-xs font-medium text-primary">
                            <Zap className="w-3 h-3" />
                            {journey.triggerType}
                          </span>
                          {attribution ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-xs text-emerald-400" title={`From: ${attribution.resourceTitle}`}>
                              <BookOpen className="w-3 h-3" />
                              Internal
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground" title="Generated by native intelligence">
                              <Sparkles className="w-3 h-3" />
                              Native
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground">
                          {journey.description}
                        </p>

                        {/* Expandable Events & Segments */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="border-t border-border pt-3 mt-3 space-y-3"
                            >
                              <div>
                                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                                  <Layers className="w-3.5 h-3.5 text-primary" />
                                  Key Events
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {stageEvents.map((event) => (
                                    <span
                                      key={event.name}
                                      className="px-2 py-1 bg-muted/50 rounded text-xs text-muted-foreground"
                                      title={event.description}
                                    >
                                      {event.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                                  <Users className="w-3.5 h-3.5 text-secondary" />
                                  Target Segments
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {stageSegments.map((segment) => (
                                    <span
                                      key={segment.name}
                                      className="px-2 py-1 bg-secondary/10 rounded text-xs text-secondary"
                                      title={segment.description}
                                    >
                                      {segment.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  } else {
                    // Industry config journey (Lifecycle, AARRR)
                    const TriggerIcon = triggerTypeIcons[journey.triggerType];
                    return (
                      <motion.div
                        key={journey.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`magic-card rounded-xl p-5 space-y-3 ${
                          attribution ? "ring-1 ring-emerald-500/30" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="font-display font-semibold text-foreground">
                            {journey.name}
                          </h4>
                          <button
                            onClick={() => setExpandedJourney(isExpanded ? null : journeyName)}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-xs font-medium text-primary">
                            <TriggerIcon className="w-3 h-3" />
                            {getTriggerTypeLabel(journey.triggerType)}
                          </span>
                          {attribution ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-xs text-emerald-400" title={`From: ${attribution.resourceTitle}`}>
                              <BookOpen className="w-3 h-3" />
                              Internal
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground" title="Generated by native intelligence">
                              <Sparkles className="w-3 h-3" />
                              Native
                            </span>
                          )}
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

                        {/* Expandable Events & Segments */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="border-t border-border pt-3 mt-3 space-y-3"
                            >
                              <div>
                                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                                  <Layers className="w-3.5 h-3.5 text-primary" />
                                  Key Events
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {stageEvents.map((event) => (
                                    <span
                                      key={event.name}
                                      className="px-2 py-1 bg-muted/50 rounded text-xs text-muted-foreground"
                                      title={event.description}
                                    >
                                      {event.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                                  <Users className="w-3.5 h-3.5 text-secondary" />
                                  Target Segments
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {stageSegments.map((segment) => (
                                    <span
                                      key={segment.name}
                                      className="px-2 py-1 bg-secondary/10 rounded text-xs text-secondary"
                                      title={segment.description}
                                    >
                                      {segment.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  }
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
                {campaigns.map((campaign, index) => {
                  const campaignName = campaign.name;
                  const isExpanded = expandedCampaign === campaignName;
                  const attribution = useCaseAttribution.campaignCoverage[campaignName];

                  if (isFrameworkCampaign(campaign)) {
                    // Framework mapping campaign (AIDA, 4P, 7P)
                    return (
                      <motion.div
                        key={campaign.name}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`magic-card rounded-xl p-5 space-y-3 ${
                          attribution ? "ring-1 ring-emerald-500/30" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="font-display font-semibold text-foreground">
                            {campaign.name}
                          </h4>
                          <button
                            onClick={() => setExpandedCampaign(isExpanded ? null : campaignName)}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>

                        {/* Source indicator */}
                        <div className="flex items-center gap-2">
                          {attribution ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-xs text-emerald-400" title={`From: ${attribution.resourceTitle}`}>
                              <BookOpen className="w-3 h-3" />
                              Internal
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground" title="Generated by native intelligence">
                              <Sparkles className="w-3 h-3" />
                              Native
                            </span>
                          )}
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <Target className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span className="text-foreground">{campaign.purpose}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Calendar className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">
                              Timing: {campaign.timing}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <UserMinus className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">
                              Suppression: {campaign.suppression}
                            </span>
                          </div>
                        </div>

                        {/* Expandable Events & Segments */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="border-t border-border pt-3 mt-3 space-y-3"
                            >
                              <div>
                                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                                  <Layers className="w-3.5 h-3.5 text-primary" />
                                  Key Events
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {stageEvents.map((event) => (
                                    <span
                                      key={event.name}
                                      className="px-2 py-1 bg-muted/50 rounded text-xs text-muted-foreground"
                                      title={event.description}
                                    >
                                      {event.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                                  <Users className="w-3.5 h-3.5 text-secondary" />
                                  Target Segments
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {stageSegments.map((segment) => (
                                    <span
                                      key={segment.name}
                                      className="px-2 py-1 bg-secondary/10 rounded text-xs text-secondary"
                                      title={segment.description}
                                    >
                                      {segment.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  } else {
                    // Industry config campaign (Lifecycle, AARRR)
                    return (
                      <motion.div
                        key={campaign.name}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`magic-card rounded-xl p-5 space-y-3 ${
                          attribution ? "ring-1 ring-emerald-500/30" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="font-display font-semibold text-foreground">
                            {campaign.name}
                          </h4>
                          <button
                            onClick={() => setExpandedCampaign(isExpanded ? null : campaignName)}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>

                        {/* Source indicator */}
                        <div className="flex items-center gap-2">
                          {attribution ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-xs text-emerald-400" title={`From: ${attribution.resourceTitle}`}>
                              <BookOpen className="w-3 h-3" />
                              Internal
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground" title="Generated by native intelligence">
                              <Sparkles className="w-3 h-3" />
                              Native
                            </span>
                          )}
                        </div>

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

                        {/* Expandable Events & Segments */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="border-t border-border pt-3 mt-3 space-y-3"
                            >
                              <div>
                                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                                  <Layers className="w-3.5 h-3.5 text-primary" />
                                  Key Events
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {stageEvents.map((event) => (
                                    <span
                                      key={event.name}
                                      className="px-2 py-1 bg-muted/50 rounded text-xs text-muted-foreground"
                                      title={event.description}
                                    >
                                      {event.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                                  <Users className="w-3.5 h-3.5 text-secondary" />
                                  Target Segments
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {stageSegments.map((segment) => (
                                    <span
                                      key={segment.name}
                                      className="px-2 py-1 bg-secondary/10 rounded text-xs text-secondary"
                                      title={segment.description}
                                    >
                                      {segment.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  }
                })}
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

      {/* Resource Library Citations */}
      {resources.length > 0 && (
        <ResourceCitations
          citations={citations}
          confidenceLevel={confidenceLevel}
          usedNativeIntelligence={usedNativeIntelligence}
          coverageStats={coverageStats}
          diagnostics={resourceDiagnostics}
        />
      )}
    </div>
  );
};
