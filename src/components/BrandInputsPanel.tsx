import React, { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, ChevronDown, ChevronUp, Plus, RefreshCw, Upload, FileText, X, Database, Code2, Copy, Check } from "lucide-react";
import { BrandInputs, emptyBrandInputs, additionalContextFields } from "@/types/brandProfile";

const URL_HISTORY_KEY = "brand-url-history";
const MAX_URL_HISTORY = 20;

function loadUrlHistory(): string[] {
  try {
    const raw = localStorage.getItem(URL_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveUrlToHistory(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return;
  const existing = loadUrlHistory();
  const filtered = existing.filter((u) => u.toLowerCase() !== trimmed.toLowerCase());
  const updated = [trimmed, ...filtered].slice(0, MAX_URL_HISTORY);
  localStorage.setItem(URL_HISTORY_KEY, JSON.stringify(updated));
}

interface BrandInputsPanelProps {
  inputs: BrandInputs;
  onChange: (inputs: BrandInputs) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  hasIndustry: boolean;
  industry?: string;
  brandMeta?: { completenessScore: number; iterationCount: number; lastUpdated: string } | null;
  hasBrandProfile?: boolean;
}

// Mirrors the prompt sent by supabase/functions/brand-profile-generate (Step 1)
function buildBrandProfilePrompt(websiteUrl: string, industry: string): { system: string; user: string } {
  const ind = industry || "<industry>";
  const url = websiteUrl || "<website_url>";
  const system = `You are a brand intelligence extraction engine. Analyze website content to produce a structured Brand JSON. Extract ONLY what is evidenced. Use empty arrays for missing data. For brand_colors, extract the actual hex color codes used on the website. If EVENT SCHEMA or USER PROPERTIES SCHEMA data is provided, use it to enrich lifecycle_signal_map (map events to key_user_actions, activation_events, monetization_events, churn_signals etc.), engagement_architecture (engagement_drivers, event_based_triggers), tech_scale_layer (supported_channels, volume_indicators), and kpi_framework sections with real instrumented data. Industry context: ${ind}. Return ONLY valid JSON, no markdown fences.`;
  const user = `Extract a Brand JSON from this content for industry "${ind}", website "${url}".

Return this exact JSON structure:
{"brand_identity":{...},"business_model":{...},"product_ecosystem":{...},"audience_intelligence":{...},"value_framework":{...},"engagement_architecture":{...},"lifecycle_signal_map":{...},"risk_compliance_layer":{...},"industry_signal_layer":{...},"kpi_framework":{...},"tech_scale_layer":{...},"brand_colors":{...},"extraction_metadata":{"source_mode":"<auto>","pages_crawled":[...],"confidence_by_section":{},"evidence_snippets":[],"missing_sections":[],"warnings":[...]}}

Content:
<crawled website text + optional EVENT SCHEMA + USER PROPERTIES SCHEMA appended at runtime>`;
  return { system, user };
}

const CSVUploadBox: React.FC<{
  label: string;
  icon: React.ReactNode;
  fileName: string | null;
  onFile: (text: string, name: string) => void;
  onClear: () => void;
  rowCount: number;
}> = ({ label, icon, fileName, onFile, onClear, rowCount }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      onFile(text, file.name);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="flex-1 min-w-0">
      <label className="block text-xs font-medium text-muted-foreground mb-1.5 truncate">
        {icon}
        {label}
      </label>
      <input ref={inputRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFile} />
      {fileName ? (
        <div className="h-9 px-2.5 rounded-lg border border-primary/30 bg-primary/5 flex items-center gap-1.5 text-xs">
          <FileText className="w-3 h-3 text-primary flex-shrink-0" />
          <span className="truncate text-foreground font-medium">{fileName}</span>
          <span className="text-muted-foreground flex-shrink-0">({rowCount})</span>
          <button onClick={onClear} className="ml-auto p-0.5 hover:text-destructive transition-colors flex-shrink-0">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full h-9 px-2.5 rounded-lg border border-dashed border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/40 flex items-center justify-center gap-1.5 text-xs text-muted-foreground transition-all"
        >
          <Upload className="w-3 h-3" />
          Upload CSV
        </button>
      )}
    </div>
  );
};

export const BrandInputsPanel: React.FC<BrandInputsPanelProps> = ({
  inputs,
  onChange,
  onGenerate,
  isGenerating,
  hasIndustry,
  brandMeta,
  hasBrandProfile,
  industry,
}) => {
  const [showAdditional, setShowAdditional] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [eventFileName, setEventFileName] = useState<string | null>(null);
  const [userPropFileName, setUserPropFileName] = useState<string | null>(null);

  const canGenerate = hasIndustry && inputs.websiteUrl.trim();
  const isEnrich = hasBrandProfile && brandMeta && brandMeta.iterationCount > 0;

  const eventRowCount = inputs.eventSchemaCSV
    ? inputs.eventSchemaCSV.trim().split("\n").length - 1
    : 0;
  const userPropRowCount = inputs.userPropertiesCSV
    ? inputs.userPropertiesCSV.trim().split("\n").length - 1
    : 0;

  const [urlHistory, setUrlHistory] = useState<string[]>([]);
  const [savedBrandUrls, setSavedBrandUrls] = useState<string[]>([]);
  const [showUrlDropdown, setShowUrlDropdown] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const urlWrapperRef = useRef<HTMLDivElement>(null);

  // Load history on mount + fetch saved brand URLs from DB
  useEffect(() => {
    setUrlHistory(loadUrlHistory());

    const fetchSavedUrls = async () => {
      try {
        const { data } = await supabase
          .from("brand_profiles")
          .select("website_url, website_host_normalized, brand_name")
          .order("updated_at", { ascending: false });
        if (data) {
          const urls = data
            .map((d) => d.website_url || `https://${d.website_host_normalized}`)
            .filter((u) => {
              try { return u && new URL(u).hostname.includes('.'); }
              catch { return false; }
            });
          setSavedBrandUrls(urls);
        }
      } catch {
        // Silent
      }
    };
    fetchSavedUrls();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (urlWrapperRef.current && !urlWrapperRef.current.contains(e.target as Node)) {
        setShowUrlDropdown(false);
        setShowAllHistory(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Save URL to history when it's used (on generate)
  const originalOnGenerate = onGenerate;
  const handleGenerate = useCallback(() => {
    if (inputs.websiteUrl.trim()) {
      saveUrlToHistory(inputs.websiteUrl);
      setUrlHistory(loadUrlHistory());
    }
    originalOnGenerate();
  }, [inputs.websiteUrl, originalOnGenerate]);

  // Merge localStorage history with saved brand URLs (deduplicated)
  const mergedHistory = React.useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const u of [...urlHistory, ...savedBrandUrls]) {
      const key = u.toLowerCase().replace(/\/+$/, "");
      if (!seen.has(key)) {
        seen.add(key);
        result.push(u);
      }
    }
    return result;
  }, [urlHistory, savedBrandUrls]);

  const displayHistory = showAllHistory
    ? mergedHistory
    : inputs.websiteUrl.trim()
      ? mergedHistory.filter(
          (u) => u.toLowerCase().includes(inputs.websiteUrl.toLowerCase()) && u.toLowerCase() !== inputs.websiteUrl.toLowerCase()
        )
      : mergedHistory;

  return (
    <div className="flex-1 space-y-3">
      {/* Website URL */}
      <div ref={urlWrapperRef} className="relative">
        <label className="block text-sm font-medium text-foreground mb-1.5">
          <Globe className="w-3.5 h-3.5 inline mr-1.5 text-primary" />
          Website URL <span className="text-secondary">*</span>
        </label>
        <div className="relative">
          <input
            type="url"
            value={inputs.websiteUrl}
            onChange={(e) => {
              onChange({ ...inputs, websiteUrl: e.target.value });
              setShowAllHistory(false);
              setShowUrlDropdown(true);
            }}
            onFocus={() => setShowUrlDropdown(true)}
            placeholder="https://www.yourbrand.com"
            className="w-full h-10 px-3 pr-8 rounded-lg border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 text-sm"
          />
          {mergedHistory.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setShowAllHistory(true);
                setShowUrlDropdown(!showUrlDropdown);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showUrlDropdown ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>
        <AnimatePresence>
          {showUrlDropdown && displayHistory.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 w-full mt-1 rounded-lg border border-border bg-card shadow-lg overflow-hidden max-h-[200px] overflow-y-auto"
            >
              {displayHistory.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => {
                    onChange({ ...inputs, websiteUrl: url });
                    setShowUrlDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors truncate"
                >
                  {url}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Prompt Preview — visible once a website URL is provided */}
      {inputs.websiteUrl.trim() && (() => {
        const { system, user } = buildBrandProfilePrompt(inputs.websiteUrl, industry || "");
        const fullPrompt = `[SYSTEM]\n${system}\n\n[USER]\n${user}`;
        return (
          <div className="rounded-lg border border-border bg-muted/20">
            <button
              type="button"
              onClick={() => setShowPrompt((s) => !s)}
              className="w-full flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Code2 className="w-3.5 h-3.5 text-primary" />
              AI Prompt for Brand Profile
              <span className="text-[10px] font-normal text-muted-foreground/70">
                (sent to the model when you generate)
              </span>
              {showPrompt ? (
                <ChevronUp className="w-3.5 h-3.5 ml-auto" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 ml-auto" />
              )}
            </button>
            <AnimatePresence>
              {showPrompt && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 space-y-2">
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(fullPrompt);
                            setPromptCopied(true);
                            setTimeout(() => setPromptCopied(false), 1500);
                          } catch {}
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        {promptCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {promptCopied ? "Copied" : "Copy prompt"}
                      </button>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground/80 mb-1">System</p>
                      <pre className="text-[11px] leading-relaxed text-foreground/90 whitespace-pre-wrap break-words bg-background/60 border border-border rounded-md p-2 max-h-40 overflow-auto">
{system}
                      </pre>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground/80 mb-1">User</p>
                      <pre className="text-[11px] leading-relaxed text-foreground/90 whitespace-pre-wrap break-words bg-background/60 border border-border rounded-md p-2 max-h-60 overflow-auto">
{user}
                      </pre>
                    </div>
                    {!hasIndustry && (
                      <p className="text-[10px] text-secondary">
                        Select an industry to substitute it into the prompt.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })()}

      {/* Event Schema + User Properties - 1x2 Grid */}
      <div className="grid grid-cols-2 gap-3">
        <CSVUploadBox
          label="Event Schema"
          icon={<Database className="w-3 h-3 inline mr-1 text-primary" />}
          fileName={eventFileName}
          onFile={(text, name) => {
            onChange({ ...inputs, eventSchemaCSV: text });
            setEventFileName(name);
          }}
          onClear={() => {
            onChange({ ...inputs, eventSchemaCSV: "" });
            setEventFileName(null);
          }}
          rowCount={eventRowCount}
        />
        <CSVUploadBox
          label="User Properties"
          icon={<Database className="w-3 h-3 inline mr-1 text-secondary" />}
          fileName={userPropFileName}
          onFile={(text, name) => {
            onChange({ ...inputs, userPropertiesCSV: text });
            setUserPropFileName(name);
          }}
          onClear={() => {
            onChange({ ...inputs, userPropertiesCSV: "" });
            setUserPropFileName(null);
          }}
          rowCount={userPropRowCount}
        />
      </div>

      {/* Additional Context (Expandable) */}
      <div>
        <button
          onClick={() => setShowAdditional(!showAdditional)}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Additional Context
          {showAdditional ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span className="text-xs font-normal">(optional)</span>
        </button>

        <AnimatePresence>
          {showAdditional && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {additionalContextFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      {field.label}
                    </label>
                    <input
                      type="text"
                      value={inputs.additionalContext[field.key]}
                      onChange={(e) =>
                        onChange({
                          ...inputs,
                          additionalContext: {
                            ...inputs.additionalContext,
                            [field.key]: e.target.value,
                          },
                        })
                      }
                      placeholder={field.placeholder}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-xs"
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Completeness Score Indicator */}
      {brandMeta && brandMeta.iterationCount > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/30 border border-border">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Completeness</span>
              <span className="text-xs font-bold text-primary">{brandMeta.completenessScore}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-muted/50 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-magic"
                initial={{ width: 0 }}
                animate={{ width: `${brandMeta.completenessScore}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-muted-foreground">
              Iter. {brandMeta.iterationCount}
            </p>
            <p className="text-[10px] text-muted-foreground/70">
              {new Date(brandMeta.lastUpdated).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {/* Generate / Enhance Button */}
      <motion.button
        whileHover={{ scale: canGenerate ? 1.01 : 1 }}
        whileTap={{ scale: canGenerate ? 0.98 : 1 }}
        onClick={handleGenerate}
        disabled={!canGenerate || isGenerating}
        className={`w-full h-10 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
          canGenerate
            ? "bg-gradient-magic text-primary-foreground shadow-magic hover:shadow-lg"
            : "bg-muted/30 text-muted-foreground/50 cursor-not-allowed"
        }`}
      >
        {isGenerating ? (
          "Extracting Brand Signals (this may take 30-60s)..."
        ) : isEnrich ? (
          <>
            <RefreshCw className="w-3.5 h-3.5" />
            Enhance Brand Profile
          </>
        ) : (
          "Generate Brand Profile"
        )}
      </motion.button>
    </div>
  );
};
