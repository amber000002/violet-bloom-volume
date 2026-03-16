import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, Zap, Shield, Lightbulb, Target, Calendar, 
  UserMinus, Activity, TrendingUp, Workflow, Info,
  ChevronDown, ChevronUp, Layers, Users, BookOpen, Sparkles,
  CheckCircle2, Mail, Bell, MessageSquare, Smartphone, Globe,
  Hash, BarChart3, Brain, Crosshair, AlertTriangle, Loader2, Wand2,
  RefreshCw, History, CloudOff, Cloud, Check, Download, FileText,
  FileSpreadsheet, Package, Eye, X, User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AugmentedUseCase } from "@/types/augmentedUseCase";
import { AugmentedUseCaseTable } from "@/components/AugmentedUseCaseTable";
import { exportAugmentedCSV, exportAugmentedXLSX } from "@/lib/augmentedExport";
import {
  upsertBrandProfile,
  saveAIUseCaseRun,
  loadLatestCachedRun,
  loadRunHistory,
  loadRunById,
  loadAllRecentRuns,
  CachedRun,
  RunHistoryItem,
} from "@/lib/useCaseCacheService";
import {
  loadAllRecentBrandVersions,
  BrandProfileVersion,
} from "@/lib/brandProfileVersionService";
import { computeCompletenessScore, countPopulatedFields } from "@/lib/brandEnrichmentEngine";
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
import { CHANNEL_OPTIONS, channelsOverlap, normalizeChannels, CHANNEL_DISPLAY_LABELS } from "@/lib/channelNormalization";

interface UseCaseStudioTabProps {
  industry: string;
  viewMode?: ViewMode;
  brandProfile?: CoreBrandJSON | null;
  activeBrandVersionId?: string | null;
  brandVersions?: BrandProfileVersion[];
  onBrandVersionSelect?: (version: BrandProfileVersion) => void;
  onBrandVersionsRefresh?: () => Promise<void>;
  websiteUrl?: string;
  onDataChange?: (data: any) => void;
  eventSchemaCSV?: string;
  userPropertiesCSV?: string;
}

// ===== CHANNEL ICON MAP =====
const channelIcons: Record<string, typeof Mail> = {
  email: Mail,
  push: Bell,
  in_app: Smartphone,
  sms: MessageSquare,
  whatsapp: Hash,
  app_inbox: Globe,
};

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

// ===== BRAND GROUP COLLAPSIBLE =====
const BrandGroupCollapsible: React.FC<{
  brandName: string;
  host: string;
  versions: BrandProfileVersion[];
  activeBrandVersionId: string | null;
  onSelect: (v: BrandProfileVersion) => void;
  onView: (v: BrandProfileVersion) => void;
  countSignals: (p: CoreBrandJSON | null) => number;
  computeCompleteness: (p: CoreBrandJSON | null) => number;
  countPopulatedFields: (p: CoreBrandJSON | null) => number;
}> = ({ brandName, host, versions, activeBrandVersionId, onSelect, onView, countSignals, computeCompleteness, countPopulatedFields }) => {
  const [open, setOpen] = useState(false);
  const hasActive = versions.some(v => v.brandProfileVersionId === activeBrandVersionId);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/20 transition-colors ${hasActive ? "bg-primary/5" : ""}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">{brandName}</span>
          <span className="text-xs text-muted-foreground truncate">({host})</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium flex-shrink-0">
            {versions.length} {versions.length === 1 ? "version" : "versions"}
          </span>
          {hasActive && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary flex-shrink-0">
              <Check className="w-2.5 h-2.5" /> Active
            </span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-border/50 bg-muted/5">
              {versions.map((v, idx) => {
                const signals = countSignals(v.brandProfileJson);
                const completeness = computeCompleteness(v.brandProfileJson);
                const populatedFields = countPopulatedFields(v.brandProfileJson);
                const isActive = activeBrandVersionId === v.brandProfileVersionId;
                return (
                  <div key={v.brandProfileVersionId} className={`px-4 py-2.5 hover:bg-muted/10 transition-colors ${isActive ? "bg-primary/5" : ""}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-muted-foreground">
                            Iteration {versions.length - idx}
                          </span>
                          {(() => {
                            const qualityLabel = completeness >= 75 ? "high" : completeness >= 45 ? "medium" : "low";
                            return (
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                qualityLabel === "high" ? "bg-emerald-500/10 text-emerald-400"
                                  : qualityLabel === "medium" ? "bg-amber-500/10 text-amber-400"
                                  : "bg-destructive/10 text-destructive"
                              }`}>
                                {qualityLabel} quality
                              </span>
                            );
                          })()}
                          {isActive && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              <Check className="w-2.5 h-2.5" /> Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            {signals} signals
                          </span>
                          <span className="flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" />
                            {completeness}% ({populatedFields}/80 fields detected)
                          </span>
                          <span>{new Date(v.generatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelect(v); }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-primary hover:bg-primary/10 border border-primary/30 transition-colors"
                        >
                          <Check className="w-3 h-3" /> Use
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onView(v); }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border transition-colors"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
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
    <div
      className={`px-5 py-4 space-y-3 ${isInternal ? "" : ""}`}
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
            {/* Confidence badge - hide exploratory */}
            {confidence.level !== "exploratory" && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium ${confidenceColorClass}`}>
              {confidence.level === "high" && <CheckCircle2 className="w-3 h-3" />}
              {confidence.level === "medium" && <AlertTriangle className="w-3 h-3" />}
              {getConfidenceLabel(confidence.level)}
            </span>
            )}
            {/* Source badge - native only */}
            {!isInternal && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
              <Sparkles className="w-3 h-3" />
              Native
            </span>
            )}
            {/* Trigger type */}
            {useCase.triggerType && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50 text-xs text-muted-foreground">
                <Zap className="w-3 h-3" />
                {useCase.triggerType}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Objective - AI only */}
      {!isInternal && (
        <p className="text-sm text-muted-foreground">{useCase.objective}</p>
      )}

      {/* Channels Used */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {useCase.channelsUsed.map(ch => {
          const Icon = channelIcons[ch];
          const label = CHANNEL_DISPLAY_LABELS[ch] || ch;
          return (
            <span key={ch} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted/50 text-xs text-muted-foreground">
              {Icon && <Icon className="w-3 h-3" />}
              {label}
            </span>
          );
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
            {/* Why It Matters - AI only */}
            {!isInternal && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                <Brain className="w-3.5 h-3.5 text-primary" />
                Why It Matters
              </div>
              <p className="text-sm text-muted-foreground">{useCase.whyItMatters}</p>
            </div>
            )}

            {/* Execution Strategy - AI only */}
            {!isInternal && (
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
            )}

            {/* Personalization Layers - AI only */}
            {!isInternal && (
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
            )}

            {/* Campaign Logic - AI only */}
            {!isInternal && (
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
            )}

            {/* Metrics to Impact - AI only */}
            {!isInternal && (
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
            )}

            {/* Why This Fits Your Brand - AI only */}
            {!isInternal && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                Why This Fits Your Brand
              </div>
              <p className="text-sm text-muted-foreground p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                {useCase.whyThisFitsYourBrand}
              </p>
            </div>
            )}

            {/* Confidence Breakdown - AI only */}
            {!isInternal && (
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
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ===== MAIN COMPONENT =====
export const UseCaseStudioTab: React.FC<UseCaseStudioTabProps> = ({
  industry,
  viewMode = "app",
  brandProfile,
  activeBrandVersionId,
  brandVersions = [],
  onBrandVersionSelect,
  onBrandVersionsRefresh,
  websiteUrl: websiteUrlProp,
  onDataChange,
  eventSchemaCSV,
  userPropertiesCSV,
}) => {
  const [framework, setFramework] = useState<FrameworkType>("lifecycle");
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["email"]);
  const [isAugmenting, setIsAugmenting] = useState(false);
  const [augmentedUseCases, setAugmentedUseCases] = useState<AugmentedUseCase[] | null>(null);
  const [cachedRunMeta, setCachedRunMeta] = useState<{ runId: string; generatedAt: string; status: string } | null>(null);
  const [runHistory, setRunHistory] = useState<RunHistoryItem[]>([]);
  const [allRecentRuns, setAllRecentRuns] = useState<RunHistoryItem[]>([]);
  const [allRecentBrandVersions, setAllRecentBrandVersions] = useState<BrandProfileVersion[]>([]);
  const [isLoadingCache, setIsLoadingCache] = useState(false);
  const [isLoadingAllRuns, setIsLoadingAllRuns] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [showBrandHistory, setShowBrandHistory] = useState(true);
  const [cacheSource, setCacheSource] = useState<"saved" | "new" | null>(null);
  const [viewingProfileJson, setViewingProfileJson] = useState<CoreBrandJSON | null>(null);
  const { findMatchingResources, resources, noResourceForIndustry, isLoadingCloudResources } = useResourceLibrary();

  const config = industry ? industryConfigs[industry] : null;

  // ===== AUTO-LOAD CACHED RESULTS =====
  const websiteHost = useMemo(() => {
    if (!brandProfile) return "";
    const url = (brandProfile as any)?.brand_identity?.website_url || brandProfile?.brand_identity?.brand_name || "";
    try {
      return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "").toLowerCase().trim();
    } catch { return url.toLowerCase().trim(); }
  }, [brandProfile]);

  const loadCachedResults = useCallback(async () => {
    if (!websiteHost || !industry || selectedChannels.length === 0) return;
    setIsLoadingCache(true);
    try {
      const cached = await loadLatestCachedRun({
        websiteUrl: websiteHost,
        industry,
        channelsSelected: selectedChannels,
      });
      if (cached && cached.augmentedUseCases.length > 0) {
        setAugmentedUseCases(cached.augmentedUseCases);
        setCachedRunMeta({ runId: cached.runId, generatedAt: cached.generatedAt, status: cached.status });
        setCacheSource("saved");
      } else {
        setAugmentedUseCases(null);
        setCachedRunMeta(null);
        setCacheSource(null);
      }
      const history = await loadRunHistory({ websiteUrl: websiteHost, industry });
      setRunHistory(history);
    } catch (err) {
      console.error("Failed to load cached results:", err);
    } finally {
      setIsLoadingCache(false);
    }
  }, [websiteHost, industry, selectedChannels]);

  useEffect(() => {
    loadCachedResults();
  }, [loadCachedResults]);

  // ===== LOAD ALL RECENT RUNS + BRAND VERSIONS (global, no brand filter) =====
  useEffect(() => {
    let cancelled = false;
    setIsLoadingAllRuns(true);
    Promise.all([
      loadAllRecentRuns(20),
      loadAllRecentBrandVersions(20),
    ]).then(([runs, versions]) => {
      if (!cancelled) {
        setAllRecentRuns(runs);
        setAllRecentBrandVersions(versions);
        setIsLoadingAllRuns(false);
      }
    }).catch(() => {
      if (!cancelled) setIsLoadingAllRuns(false);
    });
    return () => { cancelled = true; };
  }, []);
  
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
    setSelectedChannels(CHANNEL_OPTIONS.map(c => c.id));
  };

  // ===== STAGES =====
  // Extract unique stages from internal resources
  // Strict industry-filtered resources (case-insensitive, no "all" fallback for stages)
  const industryFilteredResources = useMemo(() => {
    const normalizedIndustry = industry?.toLowerCase().trim();
    if (!normalizedIndustry) return [];
    return resources.filter(r => {
      if (!r.isEnabled) return false;
      if (!r.tabs.includes("use-case-studio")) return false;
      const resourceIndustries = r.industries.map(i => (i as string).toLowerCase().trim());
      // Only match exact industry — never "all" to prevent cross-industry leakage
      return resourceIndustries.includes(normalizedIndustry);
    });
  }, [resources, industry]);

  // Build a map of normalized stage -> original label from resources
  const internalStageLabels = useMemo(() => {
    const labelMap = new Map<string, string>();
    for (const resource of industryFilteredResources) {
      resource.journeys?.forEach(j => {
        if (j.stage) labelMap.set(normalizeStage(j.stage), j.stage);
      });
      resource.campaigns?.forEach(c => {
        if (c.stage) labelMap.set(normalizeStage(c.stage), c.stage);
      });
    }
    return labelMap;
  }, [industryFilteredResources]);

  const internalStages = useMemo(() => {
    return Array.from(internalStageLabels.keys());
  }, [internalStageLabels]);

  // Debug data for Data Integrity panel
  const debugData = useMemo(() => {
    const allIndustriesInResources = new Set<string>();
    let totalUseCases = 0;
    let afterIndustryFilter = 0;
    for (const r of resources) {
      r.industries.forEach(i => allIndustriesInResources.add((i as string).toLowerCase().trim()));
      totalUseCases += (r.journeys?.length || 0) + (r.campaigns?.length || 0);
    }
    for (const r of industryFilteredResources) {
      afterIndustryFilter += (r.journeys?.length || 0) + (r.campaigns?.length || 0);
    }
    return {
      selectedIndustry: industry?.toLowerCase().trim() || "none",
      totalLoaded: totalUseCases,
      afterFilter: afterIndustryFilter,
      industriesFound: Array.from(allIndustriesInResources),
      resourceCount: resources.length,
      filteredResourceCount: industryFilteredResources.length,
    };
  }, [resources, industryFilteredResources, industry]);

  const predefinedStages = useMemo(() => {
    if (!industry) return [];
    return getFrameworkStages(framework, industry);
  }, [industry, framework]);

  // Compute which stages actually have use cases (internal or native)
  const stagesWithContent = useMemo(() => {
    const stageSet = new Set<string>();
    // Internal resource stages
    for (const resource of industryFilteredResources) {
      resource.journeys?.forEach(j => {
        if (j.stage && (!j.channels || channelsOverlap(j.channels, selectedChannels))) {
          stageSet.add(normalizeStage(j.stage));
        }
      });
      resource.campaigns?.forEach(c => {
        if (c.stage && (!c.channels || channelsOverlap(c.channels, selectedChannels))) {
          stageSet.add(normalizeStage(c.stage));
        }
      });
    }
    // Native/predefined stages with content
    for (const stage of predefinedStages) {
      const stageId = normalizeStage(stage.id);
      if (framework === "aida" || framework === "4p" || framework === "7p") {
        if (getFrameworkJourneys(framework, stageId).length > 0 || getFrameworkCampaigns(framework, stageId).length > 0) {
          stageSet.add(stageId);
        }
      } else if (config) {
        if ((config.journeys[stageId] && config.journeys[stageId].length > 0) || (config.campaigns[stageId] && config.campaigns[stageId].length > 0)) {
          stageSet.add(stageId);
        }
      }
    }
    return stageSet;
  }, [industryFilteredResources, predefinedStages, framework, config, selectedChannels]);

  const availableStages = useMemo(() => {
    const predefinedIds = new Set(predefinedStages.map(s => normalizeStage(s.id)));
    // Use internal resource labels to override predefined labels
    const merged = predefinedStages.map(s => {
      const normalizedId = normalizeStage(s.id);
      const internalLabel = internalStageLabels.get(normalizedId);
      return internalLabel ? { id: s.id, label: internalLabel } : s;
    });
    for (const stage of internalStages) {
      if (!predefinedIds.has(stage)) {
        const label = internalStageLabels.get(stage) || stageToLabel(stage);
        merged.push({ id: stage, label });
      }
    }
    // Filter to only stages that have content
    return merged.filter(s => stagesWithContent.has(normalizeStage(s.id)));
  }, [predefinedStages, internalStages, stagesWithContent, internalStageLabels]);

  // Reset selected stage when framework or industry changes
  React.useEffect(() => {
    if (availableStages.length > 0) {
      setSelectedStage(availableStages[0].id);
    } else {
      setSelectedStage("");
    }
    setExpandedCard(null);
    // Don't clear augmentedUseCases here — cache loading handles it
  }, [availableStages]);

  // ===== RESOURCE MATCHING =====
  const resourceMatches = useMemo(() => {
    if (!industry || !selectedStage) return [];
    // Use strictly industry-filtered resources instead of findMatchingResources
    return industryFilteredResources.map(resource => ({
      resource,
      relevanceScore: resource.isPrimary ? 1.0 : 0.9,
      matchedKeywords: [] as string[],
      matchType: "exact" as const,
    }));
  }, [industry, selectedStage, industryFilteredResources]);

  const internalJourneys = useMemo((): Array<ResourceJourney & { sourceResource: string }> => {
    const result: Array<ResourceJourney & { sourceResource: string }> = [];
    const normalizedSelectedStage = normalizeStage(selectedStage);
    for (const match of resourceMatches) {
      const resource = match.resource;
      if (resource.journeys && resource.journeys.length > 0) {
        for (const journey of resource.journeys) {
          const journeyStage = journey.stage ? normalizeStage(journey.stage) : "";
          if (!journeyStage || journeyStage === normalizedSelectedStage) {
            if (!channelsOverlap(journey.channels || [], selectedChannels)) continue;
            result.push({ ...journey, sourceResource: resource.title });
          }
        }
      }
    }
    return result;
  }, [resourceMatches, selectedStage, selectedChannels]);

  const internalCampaigns = useMemo((): Array<ResourceCampaign & { sourceResource: string }> => {
    const result: Array<ResourceCampaign & { sourceResource: string }> = [];
    const normalizedSelectedStage = normalizeStage(selectedStage);
    for (const match of resourceMatches) {
      const resource = match.resource;
      if (resource.campaigns && resource.campaigns.length > 0) {
        for (const campaign of resource.campaigns) {
          const campaignStage = campaign.stage ? normalizeStage(campaign.stage) : "";
          if (!campaignStage || campaignStage === normalizedSelectedStage) {
            if (!channelsOverlap(campaign.channels || [], selectedChannels)) continue;
            result.push({ ...campaign, sourceResource: resource.title });
          }
        }
      }
    }
    return result;
  }, [resourceMatches, selectedStage, selectedChannels]);

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
        stage: journey.stage || selectedStage,
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
        stage: campaign.stage || selectedStage,
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

  // ===== COLLECT ALL INTERNAL USE CASES ACROSS ALL STAGES =====
  const allInternalUseCasesForAI = useMemo(() => {
    const result: any[] = [];
    for (const match of resourceMatches) {
      const resource = match.resource;
      // Collect journeys across all stages
      if (resource.journeys) {
        for (const journey of resource.journeys) {
          if (!channelsOverlap(journey.channels || [], selectedChannels)) continue;
          result.push({
            name: journey.name,
            type: "journey",
            stage: journey.stage ? normalizeStage(journey.stage) : "unknown",
            triggerType: journey.triggerType,
            description: journey.description,
            channels: journey.channels,
            events: journey.events,
            segments: journey.segments,
            // Pass through any extra fields from the JSON
            ...(journey as any).business_goal && { business_goal: (journey as any).business_goal },
            ...(journey as any).business_challenge && { business_challenge: (journey as any).business_challenge },
            ...(journey as any).clevertap_solution && { clevertap_solution: (journey as any).clevertap_solution },
            ...(journey as any).metrics_impacted && { metrics_impacted: (journey as any).metrics_impacted },
            ...(journey as any).business_impact && { business_impact: (journey as any).business_impact },
          });
        }
      }
      // Collect campaigns across all stages
      if (resource.campaigns) {
        for (const campaign of resource.campaigns) {
          if (!channelsOverlap(campaign.channels || [], selectedChannels)) continue;
          result.push({
            name: campaign.name,
            type: "campaign",
            stage: campaign.stage ? normalizeStage(campaign.stage) : "unknown",
            description: campaign.purpose,
            channels: campaign.channels,
            ...(campaign as any).business_goal && { business_goal: (campaign as any).business_goal },
            ...(campaign as any).business_challenge && { business_challenge: (campaign as any).business_challenge },
            ...(campaign as any).clevertap_solution && { clevertap_solution: (campaign as any).clevertap_solution },
            ...(campaign as any).metrics_impacted && { metrics_impacted: (campaign as any).metrics_impacted },
            ...(campaign as any).business_impact && { business_impact: (campaign as any).business_impact },
          });
        }
      }
    }
    return result;
  }, [resourceMatches, selectedChannels]);

  // ===== AI AUGMENTATION HANDLER (BATCHED) =====
  const BATCH_SIZE = 8; // Max use cases per AI call to avoid truncation

  const handleAugmentWithAI = async () => {
    if (allInternalUseCasesForAI.length === 0 && personalizedUseCases.length === 0) {
      toast.error("No use cases to augment. Upload an internal resource JSON first.");
      return;
    }
    setIsAugmenting(true);
    setAugmentedUseCases(null);
    try {
      // Group use cases by stage
      const ucsByStage: Record<string, any[]> = {};
      for (const uc of allInternalUseCasesForAI) {
        const stage = uc.stage || "unknown";
        if (!ucsByStage[stage]) ucsByStage[stage] = [];
        ucsByStage[stage].push(uc);
      }

      // Create batches: each batch gets a subset of use cases + their stages
      const batches: { useCases: any[]; stages: string[] }[] = [];
      let currentBatch: any[] = [];
      let currentStages = new Set<string>();

      for (const [stage, ucs] of Object.entries(ucsByStage)) {
        for (const uc of ucs) {
          currentBatch.push(uc);
          currentStages.add(stage);
          if (currentBatch.length >= BATCH_SIZE) {
            batches.push({ useCases: [...currentBatch], stages: Array.from(currentStages) });
            currentBatch = [];
            currentStages = new Set<string>();
          }
        }
      }
      if (currentBatch.length > 0) {
        batches.push({ useCases: currentBatch, stages: Array.from(currentStages) });
      }

      toast.info(`Processing ${allInternalUseCasesForAI.length} use cases in ${batches.length} batch(es)...`);

      const allAugmented: AugmentedUseCase[] = [];
      const seenNativeKeys = new Set<string>(); // deduplicate AI-native across batches

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        toast.info(`Batch ${i + 1}/${batches.length}: augmenting ${batch.useCases.length} use cases...`);

        const { data, error } = await supabase.functions.invoke("use-case-augment", {
          body: {
            industry,
            channels: selectedChannels,
            allInternalUseCases: batch.useCases,
            lifecycleStages: batch.stages,
            brandProfile: brandProfile || null,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const augmented = data?.data?.augmented_use_cases;
        if (augmented && Array.isArray(augmented)) {
          for (const uc of augmented) {
            // Deduplicate AI-Native expansions across batches
            if (uc.source === "AI-Native Expansion") {
              const key = `${uc.lifecycle_stage}__${uc.use_case_title}`;
              if (seenNativeKeys.has(key)) continue;
              seenNativeKeys.add(key);
            }
            allAugmented.push(uc);
          }
        }
      }

      if (allAugmented.length > 0) {
        setAugmentedUseCases(allAugmented);
        setCacheSource("new");
        const internalCount = allAugmented.filter(uc => uc.source === "Internal Resource (AI Augmented)").length;
        const nativeCount = allAugmented.filter(uc => uc.source === "AI-Native Expansion").length;
        toast.success(`${internalCount} use cases augmented + ${nativeCount} AI-native expansions generated`);

        // Save to cloud
        try {
          if (websiteHost) {
            const brandId = await upsertBrandProfile({
              websiteUrl: websiteHost,
              industry,
              brandName: brandProfile?.brand_identity?.brand_name,
              brandProfileJson: brandProfile,
            });
            const runId = await saveAIUseCaseRun({
              brandId,
              websiteUrl: websiteHost,
              industry,
              channelsSelected: selectedChannels,
              augmentedUseCases: allAugmented,
              brandProfileVersionId: activeBrandVersionId || undefined,
            });
            setCachedRunMeta({ runId, generatedAt: new Date().toISOString(), status: "success" });
            toast.success("Results saved to cloud — will persist across sessions");
            // Refresh both filtered history and global all-runs list
            const history = await loadRunHistory({ websiteUrl: websiteHost, industry });
            setRunHistory(history);
            const allRuns = await loadAllRecentRuns(20);
            setAllRecentRuns(allRuns);
          }
        } catch (saveErr: any) {
          console.error("Failed to save AI results:", saveErr);
          toast.warning("Results generated but failed to save to cloud");
        }
      } else {
        throw new Error("No augmented use cases returned from AI");
      }
    } catch (err: any) {
      console.error("AI augmentation error:", err);
      toast.error(err.message || "AI augmentation failed. Please try again.");
    } finally {
      setIsAugmenting(false);
    }
  };

  // ===== LOAD HISTORICAL RUN =====
  const handleLoadHistoricalRun = async (runId: string) => {
    try {
      const run = await loadRunById(runId);
      if (run && run.augmentedUseCases.length > 0) {
        setAugmentedUseCases(run.augmentedUseCases);
        setCachedRunMeta({ runId: run.runId, generatedAt: run.generatedAt, status: run.status });
        setCacheSource("saved");
        toast.success("Historical results loaded");
      }
    } catch (err) {
      console.error("Failed to load historical run:", err);
      toast.error("Failed to load historical results");
    }
  };

  // ===== SNAPSHOT-BASED EXPORT FOR A SPECIFIC RUN =====
  const handleExportRun = async (runId: string, format: "csv" | "xlsx") => {
    try {
      const run = await loadRunById(runId);
      if (!run || run.augmentedUseCases.length === 0) {
        toast.error("No data found for this run");
        return;
      }
      const label = `${run.industry}_${new Date(run.generatedAt).toISOString().slice(0, 10)}`;
      if (format === "csv") {
        exportAugmentedCSV(run.augmentedUseCases, `use-cases-${label}.csv`);
      } else {
        exportAugmentedXLSX(run.augmentedUseCases, `use-cases-${label}.xlsx`);
      }
    } catch {
      toast.error("Failed to export run");
    }
  };

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

  // Always show ALL brand profiles and runs across all brands
  const historyRunsToShow = allRecentRuns;
  const isLoadingHistory = isLoadingAllRuns;

  // Always show all brand versions across all brands
  const brandVersionsToShow = allRecentBrandVersions;

  const renderHistoryPanel = () => (
    <div className="space-y-3">
      {/* Section A: Saved Brand Profiles */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button
          onClick={() => setShowBrandHistory(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium text-foreground">Saved Brand Profiles</span>
            {brandVersionsToShow.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-secondary/15 text-secondary font-medium">
                {brandVersionsToShow.length}
              </span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showBrandHistory ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence initial={false}>
          {showBrandHistory && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              {isLoadingAllRuns ? (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading brand profiles...
                </div>
              ) : brandVersionsToShow.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <User className="w-6 h-6 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No saved brand profiles yet.</p>
                  <p className="text-xs text-muted-foreground/60">
                    Enter a website URL and generate a brand profile to get started.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {(() => {
                    // Group versions by brand (websiteHostNormalized)
                    const grouped = new Map<string, { brandName: string; host: string; versions: typeof brandVersionsToShow }>();
                    brandVersionsToShow.forEach((v) => {
                      const key = v.websiteHostNormalized;
                      if (!grouped.has(key)) {
                        grouped.set(key, {
                          brandName: v.brandProfileJson?.brand_identity?.brand_name || key,
                          host: key,
                          versions: [],
                        });
                      }
                      grouped.get(key)!.versions.push(v);
                    });

                    const countSignals = (profile: CoreBrandJSON | null): number => {
                      if (!profile) return 0;
                      let count = 0;
                      const lsm = profile.lifecycle_signal_map;
                      if (lsm) {
                        count += (lsm.key_user_actions?.length || 0)
                          + (lsm.key_user_events?.length || 0)
                          + (lsm.activation_events?.length || 0)
                          + (lsm.monetization_events?.length || 0)
                          + (lsm.churn_signals?.length || 0)
                          + (lsm.inactivity_markers?.length || 0)
                          + (lsm.lifecycle_markers?.length || 0);
                      }
                      const ea = profile.engagement_architecture;
                      if (ea) {
                        count += (ea.engagement_drivers?.length || 0)
                          + (ea.seasonal_triggers?.length || 0)
                          + (ea.event_based_triggers?.length || 0)
                          + (ea.urgency_patterns?.length || 0);
                      }
                      return count;
                    };

                    const computeCompleteness = (profile: CoreBrandJSON | null): number => {
                      if (!profile) return 0;
                      return computeCompletenessScore(profile);
                    };

                    const getPopulatedFields = (profile: CoreBrandJSON | null): number => {
                      return countPopulatedFields(profile);
                    };

                    return Array.from(grouped.entries()).map(([host, group]) => (
                      <BrandGroupCollapsible
                        key={host}
                        brandName={group.brandName}
                        host={host}
                        versions={group.versions}
                        activeBrandVersionId={activeBrandVersionId}
                        onSelect={(v) => onBrandVersionSelect?.(v)}
                        onView={(v) => setViewingProfileJson(v.brandProfileJson)}
                        countSignals={countSignals}
                        computeCompleteness={computeCompleteness}
                        countPopulatedFields={getPopulatedFields}
                      />
                    ));
                  })()}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Section B: Saved AI Use Case Runs */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button
          onClick={() => setShowHistory(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">AI Use Case Runs</span>
            {historyRunsToShow.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                {historyRunsToShow.length}
              </span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showHistory ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence initial={false}>
          {showHistory && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              {isLoadingHistory ? (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading saved results...
                </div>
              ) : historyRunsToShow.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Package className="w-8 h-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No saved AI results found yet.</p>
                  <p className="text-xs text-muted-foreground/60">
                    Run "Augment with AI" to generate results.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {historyRunsToShow.map((item) => (
                    <div key={item.runId} className="p-3 hover:bg-muted/10 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground truncate">
                              {item.websiteHostNormalized || "—"}
                            </span>
                            {item.brandName && (
                              <span className="text-xs text-muted-foreground">({item.brandName})</span>
                            )}
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${
                              item.status === "success"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-destructive/10 text-destructive"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${item.status === "success" ? "bg-emerald-400" : "bg-destructive"}`} />
                              {item.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                            <span className="capitalize">{item.industryNormalized}</span>
                            <span>•</span>
                            <span>{item.useCaseCount} use cases</span>
                            <span>•</span>
                            <span>{new Date(item.generatedAt).toLocaleString()}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {item.channelsSelected.map(ch => (
                              <span key={ch} className="px-1.5 py-0.5 rounded bg-muted/50 text-xs text-muted-foreground">
                                {CHANNEL_DISPLAY_LABELS[ch] || ch}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleLoadHistoricalRun(item.runId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-primary hover:bg-primary/10 border border-primary/30 transition-colors"
                          >
                            <Cloud className="w-3 h-3" /> Load
                          </button>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleExportRun(item.runId, "csv")}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border transition-colors"
                              title="Export CSV"
                            >
                              <FileText className="w-3 h-3" /> CSV
                            </button>
                            <button
                              onClick={() => handleExportRun(item.runId, "xlsx")}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border transition-colors"
                              title="Export XLSX"
                            >
                              <FileSpreadsheet className="w-3 h-3" /> XLSX
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Brand Profile JSON Viewer Modal */}
      {viewingProfileJson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setViewingProfileJson(null)}>
          <div className="bg-background border border-border rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Brand Profile JSON</span>
                {viewingProfileJson.brand_identity?.brand_name && (
                  <span className="text-xs text-muted-foreground">— {viewingProfileJson.brand_identity.brand_name}</span>
                )}
              </div>
              <button onClick={() => setViewingProfileJson(null)} className="p-1 hover:bg-muted rounded">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[70vh]">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                {JSON.stringify(viewingProfileJson, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!industry) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-3">
            <span className="text-2xl">📧</span>
          </div>
          <p className="text-muted-foreground text-sm">
            Select an industry above to discover hyper-personalized use cases.
          </p>
        </div>
        {renderHistoryPanel()}
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

      {/* Always-visible History Panel */}
      {renderHistoryPanel()}

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
          {CHANNEL_OPTIONS.map((ch) => {
            const isSelected = selectedChannels.includes(ch.id);
            const Icon = channelIcons[ch.id] || Globe;
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
                <Icon className="w-3.5 h-3.5" />
                {ch.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Data Integrity Panel (collapsible debug) */}
      <details className="mx-auto max-w-xl">
        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
          <Shield className="w-3 h-3" />
          Data Integrity
        </summary>
        <div className="mt-2 p-3 rounded-lg bg-muted/20 border border-border text-xs text-muted-foreground space-y-1">
          <div><span className="font-medium text-foreground">Selected Industry:</span> {debugData.selectedIndustry}</div>
          <div><span className="font-medium text-foreground">Total resources loaded:</span> {debugData.resourceCount} ({debugData.totalLoaded} use cases)</div>
          <div><span className="font-medium text-foreground">After industry filter:</span> {debugData.filteredResourceCount} resources ({debugData.afterFilter} use cases)</div>
          <div><span className="font-medium text-foreground">Industries in loaded resources:</span> [{debugData.industriesFound.join(", ")}]</div>
          {debugData.afterFilter === 0 && debugData.totalLoaded > 0 && (
            <div className="text-yellow-500 mt-1">
              ⚠ No use cases match "{debugData.selectedIndustry}". Available: [{debugData.industriesFound.join(", ")}]
            </div>
          )}
        </div>
      </details>

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

          {/* Channel Debug Info */}
          {personalizedUseCases.length === 0 && internalUseCases.length === 0 && resourceMatches.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center space-y-2">
              <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto" />
              <p className="text-sm font-medium text-foreground">
                No use cases support selected channel(s).
              </p>
              <p className="text-xs text-muted-foreground">
                Selected: {selectedChannels.map(c => CHANNEL_DISPLAY_LABELS[c] || c).join(", ")}
              </p>
              <p className="text-xs text-muted-foreground">
                Available channels in this industry:{" "}
                {(() => {
                  const allCh = new Set<string>();
                  for (const match of resourceMatches) {
                    match.resource.journeys?.forEach(j => j.channels?.forEach(c => allCh.add(c)));
                    match.resource.campaigns?.forEach(ca => ca.channels?.forEach(c => allCh.add(c)));
                  }
                  const normalized = normalizeChannels(Array.from(allCh));
                  return normalized.map(c => CHANNEL_DISPLAY_LABELS[c] || c).join(", ") || "None detected";
                })()}
              </p>
            </div>
          )}

          {/* All Use Cases in Single Card */}
          {personalizedUseCases.length > 0 && (
            <div className="magic-card rounded-xl overflow-hidden">
              {/* Internal Use Cases Section */}
              {internalUseCases.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-5 py-3 bg-emerald-500/5 border-b border-border">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-400">From Internal Resources</span>
                    <span className="text-xs text-muted-foreground">({internalUseCases.length})</span>
                  </div>
                  <div className="divide-y divide-border">
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
                </div>
              )}

              {/* Native Use Cases Section */}
              {nativeUseCases.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-5 py-3 bg-muted/30 border-b border-t border-border">
                    <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {hasInternalContent ? "Supplemental (Native Intelligence)" : "Native Intelligence"}
                    </span>
                    <span className="text-xs text-muted-foreground">({nativeUseCases.length})</span>
                  </div>
                  <div className="divide-y divide-border">
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
                </div>
              )}
            </div>
          )}

          {/* No internal resource found for industry */}
          {noResourceForIndustry && internalUseCases.length === 0 && (
            <div className="p-6 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center space-y-2">
              <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto" />
              <p className="text-sm font-medium text-foreground">
                No internal resource JSON found for this industry in Resource Library.
              </p>
              <p className="text-xs text-muted-foreground">
                Upload a JSON resource via the Resource Library to see internal use cases here.
              </p>
            </div>
          )}

          {/* No matches */}
          {personalizedUseCases.length === 0 && !noResourceForIndustry && (
            <div className="p-8 rounded-xl bg-muted/30 border border-border text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                No direct lifecycle match found for the selected channels. Showing closest aligned use cases.
              </p>
              <p className="text-xs text-muted-foreground/70">
                Try selecting more channels or changing the lifecycle stage.
              </p>
            </div>
          )}

          {/* AI Augmentation Section */}
          {personalizedUseCases.length > 0 && (
            <div className="pt-4 border-t border-border space-y-4">
              {/* Status Header — shown when a run is loaded */}
              {cachedRunMeta && augmentedUseCases && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      cacheSource === "saved"
                        ? "bg-primary/10 text-primary"
                        : "bg-emerald-500/10 text-emerald-400"
                    }`}>
                      {cacheSource === "saved" ? <Cloud className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                      {cacheSource === "saved" ? "Saved" : "Newly Generated"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Generated on: {new Date(cachedRunMeta.generatedAt).toLocaleString()}
                    </span>
                    {(() => {
                      const daysOld = (Date.now() - new Date(cachedRunMeta.generatedAt).getTime()) / (1000 * 60 * 60 * 24);
                      if (daysOld > 30) return (
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Consider regenerating
                        </span>
                      );
                      return null;
                    })()}
                  </div>
                </div>
              )}

              {/* Augment / Regenerate buttons */}
              <div className="flex items-center justify-center gap-3">
                <motion.button
                  onClick={handleAugmentWithAI}
                  disabled={isAugmenting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-gradient-magic text-primary-foreground shadow-magic disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isAugmenting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Augmenting All Use Cases with AI...
                    </>
                  ) : augmentedUseCases ? (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Regenerate AI Results
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Augment All {allInternalUseCasesForAI.length} Use Cases with AI
                    </>
                  )}
                </motion.button>
              </div>

              {isAugmenting && (
                <div className="text-center space-y-2 py-4">
                  <p className="text-xs text-muted-foreground">
                    AI is augmenting all {allInternalUseCasesForAI.length} internal use cases across {internalStages.length} lifecycle stages + generating {internalStages.length * 2} AI-native expansions...
                  </p>
                  <p className="text-xs text-muted-foreground/50">This may take 30-60 seconds for comprehensive coverage</p>
                </div>
              )}

              {augmentedUseCases && augmentedUseCases.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Wand2 className="w-4 h-4 text-primary" />
                    AI-Augmented Output — Full Coverage
                  </div>
                  <AugmentedUseCaseTable
                    useCases={augmentedUseCases}
                    onExportCSV={() => exportAugmentedCSV(augmentedUseCases)}
                    onExportXLSX={() => exportAugmentedXLSX(augmentedUseCases)}
                  />
                </div>
              )}
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
