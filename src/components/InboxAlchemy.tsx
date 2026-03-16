import React, { useState, useCallback, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Sparkles as SparklesIcon, Zap, Monitor, Presentation, Download, FileText, Activity, CheckCircle2 } from "lucide-react";
import { MagicSelect } from "./ui/MagicSelect";
import { Sparkles } from "./Sparkles";
import { InboxPotentialTab } from "./tabs/InboxPotentialTab";
import { UseCaseStudioTab } from "./tabs/UseCaseStudioTab";
import { AMPEmailStudioTab } from "./tabs/AMPEmailStudioTab";
import { InboxDiagnosticsTab } from "./tabs/InboxDiagnosticsTab";
import { industryConfigs, getInferredBusinessModel, getBusinessModelLabel } from "@/data/industryConfig";
import { PresentationProvider, usePresentationMode, ViewMode, DeckType } from "@/hooks/usePresentationMode";
import { exportToPPT } from "@/lib/pptExport";
import { ResourceLibraryProvider, useResourceLibrary } from "@/contexts/ResourceLibraryContext";
import { ResourceLibrary } from "./resource-library";
import { BrandInputsPanel } from "./BrandInputsPanel";
import { BrandInputs, emptyBrandInputs, CoreBrandJSON } from "@/types/brandProfile";
import { generateCoreBrandJSON } from "@/lib/brandExtractor";
import { supabase } from "@/integrations/supabase/client";
import {
  ensureBrandProfile,
  createBrandProfileVersion,
  loadBrandProfileVersions,
  loadBrandProfileMeta,
  enrichBrandProfile,
  saveBrandSchemaCSVs,
  BrandProfileVersion,
} from "@/lib/brandProfileVersionService";
import { computeCompletenessScore } from "@/lib/brandEnrichmentEngine";

const industryOptions = Object.entries(industryConfigs).map(([key, config]) => ({
  value: key,
  label: config.name,
}));

const tabs = [
  { id: "inbox-diagnostics", label: "Inbox Diagnostics", icon: Activity },
  { id: "use-case-studio", label: "Use Case Studio", icon: SparklesIcon },
  { id: "amp-email-studio", label: "AMP Email Studio (In Progress)", icon: Zap },
  { id: "inbox-potential", label: "Inbox Potential", icon: Mail },
] as const;

type TabId = typeof tabs[number]["id"];

// Separate component to use the context
const InboxAlchemyContent: React.FC = () => {
  const [industry, setIndustry] = useState("");
  const { loadResourcesForIndustry } = useResourceLibrary();
  const [activeTab, setActiveTab] = useState<TabId>("inbox-potential");
  const [showDeckOptions, setShowDeckOptions] = useState(false);
  const [brandInputs, setBrandInputs] = useState<BrandInputs>(emptyBrandInputs);
  const [brandProfile, setBrandProfile] = useState<CoreBrandJSON | null>(null);
  const [isGeneratingBrand, setIsGeneratingBrand] = useState(false);
  const [activeBrandVersionId, setActiveBrandVersionId] = useState<string | null>(null);
  const [brandVersions, setBrandVersions] = useState<BrandProfileVersion[]>([]);
  const [brandMeta, setBrandMeta] = useState<{ completenessScore: number; iterationCount: number; lastUpdated: string } | null>(null);
  const [persistedEventSchemaCSV, setPersistedEventSchemaCSV] = useState<string | null>(null);
  const [persistedUserPropertiesCSV, setPersistedUserPropertiesCSV] = useState<string | null>(null);
  const { viewMode, setViewMode, deckType, setDeckType, isExporting, setIsExporting } = usePresentationMode();

  // Auto-load saved brand profile when URL + industry are set
  useEffect(() => {
    if (!industry || !brandInputs.websiteUrl.trim()) return;
    let cancelled = false;

    const loadSaved = async () => {
      try {
        const [versions, meta] = await Promise.all([
          loadBrandProfileVersions({ websiteUrl: brandInputs.websiteUrl, industry }),
          loadBrandProfileMeta({ websiteUrl: brandInputs.websiteUrl, industry }),
        ]);
        if (cancelled) return;
        setBrandVersions(versions);
        if (meta) {
          setBrandMeta({ completenessScore: meta.completenessScore, iterationCount: meta.iterationCount, lastUpdated: meta.lastUpdated });
          // Restore persisted schema CSVs
          if (meta.eventSchemaCSV) setPersistedEventSchemaCSV(meta.eventSchemaCSV);
          if (meta.userPropertiesCSV) setPersistedUserPropertiesCSV(meta.userPropertiesCSV);
          // Also restore into brandInputs if not already set
          if (meta.eventSchemaCSV && !brandInputs.eventSchemaCSV) {
            setBrandInputs(prev => ({ ...prev, eventSchemaCSV: meta.eventSchemaCSV! }));
          }
          if (meta.userPropertiesCSV && !brandInputs.userPropertiesCSV) {
            setBrandInputs(prev => ({ ...prev, userPropertiesCSV: meta.userPropertiesCSV! }));
          }
        }
        // Only auto-load if no profile is currently active
        if (!brandProfile && versions.length > 0) {
          const latest = versions[0];
          setBrandProfile(latest.brandProfileJson as CoreBrandJSON);
          setActiveBrandVersionId(latest.brandProfileVersionId);
          toast.info(`Loaded saved brand profile for ${(latest.brandProfileJson as any)?.brand_identity?.brand_name || "brand"}`);
        }
      } catch {
        // Silent
      }
    };

    loadSaved();
    return () => { cancelled = true; };
  }, [industry, brandInputs.websiteUrl]);

  // Get current state for export
  const [exportData, setExportData] = useState<{
    inboxData: any;
    useCaseData: any;
    ampData: any;
    diagnosticsData: any;
  }>({ inboxData: null, useCaseData: null, ampData: null, diagnosticsData: null });

  const config = industry ? industryConfigs[industry] : null;
  
  // Infer business model from industry
  const inferredBusinessModel = useMemo(() => {
    if (!industry) return null;
    return getInferredBusinessModel(industry);
  }, [industry]);
  
  const businessModelLabel = inferredBusinessModel ? getBusinessModelLabel(inferredBusinessModel) : "";

  const handleGenerateBrandProfile = useCallback(async () => {
    if (!industry || !brandInputs.websiteUrl.trim()) return;
    setIsGeneratingBrand(true);
    try {
      const { data, error } = await supabase.functions.invoke("brand-profile-generate", {
        body: {
          websiteUrl: brandInputs.websiteUrl,
          websiteText: brandInputs.websiteText || "",
          additionalContext: brandInputs.additionalContext,
          industry,
          eventSchemaCSV: brandInputs.eventSchemaCSV || "",
          userPropertiesCSV: brandInputs.userPropertiesCSV || "",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.success && data.data) {
        let profile: CoreBrandJSON = data.data;

        // === ENRICHMENT: merge with existing if available ===
        if (brandProfile) {
          profile = await enrichBrandProfile({
            brandId: "", // not needed by merge logic
            existingProfile: brandProfile,
            newProfile: profile,
          });
        }
        setBrandProfile(profile);

        // Persist version to cloud
        try {
          const brandId = await ensureBrandProfile({
            websiteUrl: brandInputs.websiteUrl,
            industry,
            brandName: profile.brand_identity?.brand_name,
            eventSchemaCSV: brandInputs.eventSchemaCSV || undefined,
            userPropertiesCSV: brandInputs.userPropertiesCSV || undefined,
          });

          // Update persisted state
          if (brandInputs.eventSchemaCSV) setPersistedEventSchemaCSV(brandInputs.eventSchemaCSV);
          if (brandInputs.userPropertiesCSV) setPersistedUserPropertiesCSV(brandInputs.userPropertiesCSV);

          const sourceMode = profile.extraction_metadata?.source_mode || "url_crawl";
          const confidence = profile.extraction_metadata?.confidence_by_section
            ? (Object.values(profile.extraction_metadata.confidence_by_section).filter(v => v === "high").length > 3 ? "high" : "medium")
            : "medium";

          const versionId = await createBrandProfileVersion({
            brandId,
            websiteUrl: brandInputs.websiteUrl,
            brandProfileJson: profile,
            brandDesignProfileJson: profile.brand_design_profile || null,
            extractionMethod: sourceMode === "url_only" ? "url_crawl" : sourceMode === "text_only" ? "user_paste" : "url_crawl",
            confidence,
            status: "success",
          });

          setActiveBrandVersionId(versionId);

          // Refresh versions list + meta
          const [versions, meta] = await Promise.all([
            loadBrandProfileVersions({ websiteUrl: brandInputs.websiteUrl, industry }),
            loadBrandProfileMeta({ websiteUrl: brandInputs.websiteUrl, industry }),
          ]);
          setBrandVersions(versions);
          if (meta) setBrandMeta({ completenessScore: meta.completenessScore, iterationCount: meta.iterationCount, lastUpdated: meta.lastUpdated });

          toast.success(`Brand profile saved (version ${versions.length}, completeness ${meta?.completenessScore || computeCompletenessScore(profile)}%)`);
        } catch (saveErr: any) {
          console.error("Failed to persist brand profile version:", saveErr);
          toast.warning("Brand profile generated but failed to save version to cloud");
        }

        const meta = profile.extraction_metadata;
        if (meta?.warnings && meta.warnings.length > 0) {
          toast.warning(`Brand profile generated with warnings: ${meta.warnings[0]}`);
        } else {
          const sourceLabel = meta?.source_mode === "url_only" ? "URL crawl" : 
                             meta?.source_mode === "url_plus_text" ? "URL + text" : "text analysis";
          toast.success(`Brand profile generated via ${sourceLabel}`);
        }
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err: any) {
      console.error("Brand profile generation error:", err);
      toast.error(err.message || "Failed to generate brand profile. Try providing Website Text.");
    } finally {
      setIsGeneratingBrand(false);
    }
  }, [industry, brandInputs]);

  // Callback to collect export data from tabs
  const updateExportData = useCallback((tab: string, data: any) => {
    setExportData(prev => ({ ...prev, [tab]: data }));
  }, []);

  const handleExport = async (type: DeckType) => {
    if (!config || !industry) return;
    
    setIsExporting(true);
    setShowDeckOptions(false);

    try {
      // Prepare export data
      const inboxData = exportData.inboxData ? {
        industry: config.name,
        businessModel: businessModelLabel,
        ...exportData.inboxData,
        purchaseCycle: config.purchaseCycle,
        frequencyReason: config.frequencyReason,
        fatigueRisk: config.fatigueRisk,
        activePercent: config.activeUserPercent,
      } : null;

      const useCaseData = exportData.useCaseData ? {
        ...exportData.useCaseData,
      } : null;

      const ampData = config ? {
        industry: config.name,
        ampBenefits: [
          "Reduce app dependency for quick actions",
          "Increase engagement with in-email interactivity",
          "Provide real-time content updates",
          "Shorten user journeys from email to conversion",
        ],
        useCases: config.ampUseCases.map(uc => uc.name),
        guardrails: [
          "Ensure graceful fallback for non-AMP clients",
          "Keep interactions simple and purposeful",
          "Test across email clients thoroughly",
        ],
        supportsGamification: config.supportsGamification,
      } : null;

      const diagnosticsExport = exportData.diagnosticsData ? {
        totalCampaigns: exportData.diagnosticsData.performance?.totalCampaigns || 0,
        totalEmailsSent: exportData.diagnosticsData.performance?.totalEmailsSent || 0,
        medianOpenRate: exportData.diagnosticsData.performance?.medianOpenRate || 0,
        medianClickRate: exportData.diagnosticsData.performance?.medianClickRate || 0,
        bestCampaign: exportData.diagnosticsData.performance?.bestCampaign?.campaign_name || "",
        worstCampaign: exportData.diagnosticsData.performance?.worstCampaign?.campaign_name || "",
        openRateTrend: exportData.diagnosticsData.trends?.openRateTrend || "stable",
        clickRateTrend: exportData.diagnosticsData.trends?.clickRateTrend || "stable",
        overallRisk: exportData.diagnosticsData.fatigue?.overallRisk || "low",
        recommendations: exportData.diagnosticsData.recommendations || [],
      } : null;

      await exportToPPT(inboxData, useCaseData, ampData, type, diagnosticsExport, brandProfile);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Sparkles count={viewMode === "presentation" ? 20 : 40} />

      {/* Aurora atmospheric glow blobs */}
      <div className="aurora-center-glow" />
      <div className="absolute -top-40 -right-40 w-[800px] h-[800px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(168,130,247,0.18) 0%, rgba(99,102,241,0.08) 40%, transparent 70%)', filter: 'blur(100px)' }} />
      <div className="absolute -bottom-40 -left-40 w-[800px] h-[800px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(251,113,133,0.15) 0%, rgba(245,180,160,0.08) 40%, transparent 70%)', filter: 'blur(100px)' }} />

      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-magic flex items-center justify-center shadow-magic float">
              <Mail className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-extrabold text-gradient-magic text-glow-aurora mb-3">
            Inbox Alchemy
          </h1>
          <p className="text-lg text-muted-foreground/85 max-w-2xl mx-auto tracking-wide">
            Design lifecycle-led emails your customers actually want to receive.
          </p>
        </motion.div>

        {/* Global Controls - Sticky Header */}
        <motion.div
          className="sticky top-4 z-20 rounded-2xl p-4 md:p-6 mb-8 glass-effect"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Industry selector */}
              <div className="lg:w-72">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Industry Vertical <span className="text-secondary">*</span>
                </label>
                <MagicSelect
                  value={industry}
                  onValueChange={(v) => {
                    setIndustry(v);
                    setBrandProfile(null); // Reset brand profile on industry change
                    loadResourcesForIndustry(v); // Auto-load cloud resources for this industry
                  }}
                  placeholder="Choose your industry"
                  options={industryOptions}
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  {inferredBusinessModel ? (
                    <>Your industry suggests a <span className="text-primary font-medium">{businessModelLabel}</span> model.</>
                  ) : (
                    "Choose the industry closest to your core customer behavior."
                  )}
                </p>
              </div>

              {/* Brand Inputs */}
              <BrandInputsPanel
                inputs={brandInputs}
                onChange={(newInputs) => {
                  // Persist schema CSVs to cloud when changed
                  const csvChanged = newInputs.eventSchemaCSV !== brandInputs.eventSchemaCSV || newInputs.userPropertiesCSV !== brandInputs.userPropertiesCSV;
                  setBrandInputs(newInputs);
                  if (csvChanged && industry && newInputs.websiteUrl.trim()) {
                    saveBrandSchemaCSVs({
                      websiteUrl: newInputs.websiteUrl,
                      industry,
                      eventSchemaCSV: newInputs.eventSchemaCSV,
                      userPropertiesCSV: newInputs.userPropertiesCSV,
                    }).then(() => {
                      if (newInputs.eventSchemaCSV) setPersistedEventSchemaCSV(newInputs.eventSchemaCSV);
                      if (newInputs.userPropertiesCSV) setPersistedUserPropertiesCSV(newInputs.userPropertiesCSV);
                    }).catch(() => {});
                  }
                }}
                onGenerate={handleGenerateBrandProfile}
                isGenerating={isGeneratingBrand}
                hasIndustry={!!industry}
                brandMeta={brandMeta}
                hasBrandProfile={!!brandProfile}
              />

              {/* Presentation Controls */}
              <div className="flex flex-col gap-2 lg:border-l lg:border-border lg:pl-4 lg:w-40 flex-shrink-0">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                View Mode
              </label>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setViewMode("app")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium nav-pill ${
                    viewMode === "app"
                      ? "nav-pill-active"
                      : "nav-pill-inactive"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  App
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setViewMode("presentation")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium nav-pill ${
                    viewMode === "presentation"
                      ? "nav-pill-active"
                      : "nav-pill-inactive"
                  }`}
                >
                  <Presentation className="w-3.5 h-3.5" />
                  Slides
                </motion.button>
              </div>

              {/* Export Button */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowDeckOptions(!showDeckOptions)}
                  disabled={!industry || isExporting}
                  className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all btn-aurora-glow ${
                    industry
                      ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                      : "bg-[rgba(255,255,255,0.08)] text-muted-foreground/50 cursor-not-allowed backdrop-blur-sm"
                  }`}
                >
                  {isExporting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </motion.div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5" />
                      Add to PPT
                    </>
                  )}
                </motion.button>

                {/* Deck Options Dropdown */}
                <AnimatePresence>
                  {showDeckOptions && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full right-0 mt-2 w-48 bg-background border border-border rounded-lg shadow-lg overflow-hidden z-30"
                    >
                      <button
                        onClick={() => handleExport("executive")}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-muted/50 transition-colors"
                      >
                        <p className="font-medium text-foreground">Executive Summary</p>
                        <p className="text-xs text-muted-foreground">Key insights only</p>
                      </button>
                      <div className="border-t border-border" />
                      <button
                        onClick={() => handleExport("detailed")}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-muted/50 transition-colors"
                      >
                        <p className="font-medium text-foreground">Detailed Working Deck</p>
                        <p className="text-xs text-muted-foreground">Full use cases included</p>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            </div>

            {/* Brand Profile Status */}
            {brandProfile && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-primary">
                  Brand Profile: {brandProfile.brand_identity.brand_name}
                </span>
                <span className="text-xs text-muted-foreground">
                  — {(() => {
                    let count = 0;
                    const lsm = brandProfile.lifecycle_signal_map;
                    if (lsm) {
                      count += (lsm.key_user_actions?.length || 0)
                        + (lsm.key_user_events?.length || 0)
                        + (lsm.activation_events?.length || 0)
                        + (lsm.monetization_events?.length || 0)
                        + (lsm.churn_signals?.length || 0)
                        + (lsm.inactivity_markers?.length || 0)
                        + (lsm.lifecycle_markers?.length || 0);
                    }
                    const ea = brandProfile.engagement_architecture;
                    if (ea) {
                      count += (ea.engagement_drivers?.length || 0)
                        + (ea.seasonal_triggers?.length || 0)
                        + (ea.event_based_triggers?.length || 0)
                        + (ea.urgency_patterns?.length || 0);
                    }
                    return count;
                  })()} signals
                  {brandMeta ? ` · ${brandMeta.completenessScore}% complete · ${brandMeta.iterationCount} iteration${brandMeta.iterationCount !== 1 ? "s" : ""}` : ""}
                </span>
                {brandMeta && brandMeta.completenessScore < 85 && (
                  <span className="text-[10px] text-secondary font-medium ml-auto">
                    Enhance for richer insights →
                  </span>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          className="flex flex-wrap justify-center gap-2 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-medium nav-pill ${
                activeTab === tab.id
                  ? "nav-pill-active"
                  : "nav-pill-inactive"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </motion.button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-6xl mx-auto"
          >
            {activeTab === "inbox-potential" && (
              <InboxPotentialTab 
                industry={industry} 
                viewMode={viewMode}
                onDataChange={(data) => updateExportData("inboxData", data)}
              />
            )}
            {activeTab === "use-case-studio" && (
              <UseCaseStudioTab 
                industry={industry} 
                viewMode={viewMode}
                brandProfile={brandProfile}
                activeBrandVersionId={activeBrandVersionId}
                brandVersions={brandVersions}
                onBrandVersionSelect={(v) => {
                  setActiveBrandVersionId(v.brandProfileVersionId);
                  setBrandProfile(v.brandProfileJson);
                }}
                onBrandVersionsRefresh={async () => {
                  if (brandInputs.websiteUrl) {
                    const versions = await loadBrandProfileVersions({ websiteUrl: brandInputs.websiteUrl, industry });
                    setBrandVersions(versions);
                  }
                }}
                websiteUrl={brandInputs.websiteUrl}
                onDataChange={(data) => updateExportData("useCaseData", data)}
                eventSchemaCSV={persistedEventSchemaCSV || brandInputs.eventSchemaCSV || undefined}
                userPropertiesCSV={persistedUserPropertiesCSV || brandInputs.userPropertiesCSV || undefined}
              />
            )}
            {activeTab === "amp-email-studio" && (
              <AMPEmailStudioTab 
                industry={industry} 
                viewMode={viewMode}
                onDataChange={(data) => updateExportData("ampData", data)}
              />
            )}
            {activeTab === "inbox-diagnostics" && (
              <InboxDiagnosticsTab 
                industry={industry}
                viewMode={viewMode}
                onDataChange={(data) => updateExportData("diagnosticsData", data)}
                brandProfile={brandProfile}
                websiteUrl={brandInputs.websiteUrl}
                eventSchemaCSV={persistedEventSchemaCSV || brandInputs.eventSchemaCSV || undefined}
                userPropertiesCSV={persistedUserPropertiesCSV || brandInputs.userPropertiesCSV || undefined}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <motion.p
          className="text-center text-sm text-muted-foreground mt-12 italic"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          "Inbox excellence is built on relevance, not volume."
        </motion.p>
      </div>

      {/* Click outside to close dropdown */}
      {showDeckOptions && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowDeckOptions(false)}
        />
      )}

      {/* Resource Library */}
      <ResourceLibrary />
    </div>
  );
};

// Wrap content in providers
export const InboxAlchemy: React.FC = () => {
  return (
    <ResourceLibraryProvider>
      <PresentationProvider>
        <InboxAlchemyContent />
      </PresentationProvider>
    </ResourceLibraryProvider>
  );
};
