import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, FileText, ChevronDown, ChevronUp, Plus, RefreshCw } from "lucide-react";
import { BrandInputs, emptyBrandInputs, additionalContextFields } from "@/types/brandProfile";
import { Textarea } from "@/components/ui/textarea";

interface BrandInputsPanelProps {
  inputs: BrandInputs;
  onChange: (inputs: BrandInputs) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  hasIndustry: boolean;
  brandMeta?: { completenessScore: number; iterationCount: number; lastUpdated: string } | null;
  hasBrandProfile?: boolean;
}

export const BrandInputsPanel: React.FC<BrandInputsPanelProps> = ({
  inputs,
  onChange,
  onGenerate,
  isGenerating,
  hasIndustry,
  brandMeta,
  hasBrandProfile,
}) => {
  const [showAdditional, setShowAdditional] = useState(false);

  const canGenerate = hasIndustry && inputs.websiteUrl.trim();
  const isEnrich = hasBrandProfile && brandMeta && brandMeta.iterationCount > 0;

  return (
    <div className="flex-1 space-y-3">
      {/* Website URL */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          <Globe className="w-3.5 h-3.5 inline mr-1.5 text-primary" />
          Website URL <span className="text-secondary">*</span>
        </label>
        <input
          type="url"
          value={inputs.websiteUrl}
          onChange={(e) => onChange({ ...inputs, websiteUrl: e.target.value })}
          placeholder="https://www.yourbrand.com"
          className="w-full h-10 px-3 rounded-lg border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 text-sm"
        />
      </div>

      {/* Website Text */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          <FileText className="w-3.5 h-3.5 inline mr-1.5 text-primary" />
          Website Text <span className="text-xs text-muted-foreground font-normal">(optional)</span>
        </label>
        <Textarea
          value={inputs.websiteText}
          onChange={(e) => onChange({ ...inputs, websiteText: e.target.value })}
          placeholder="Paste your website's main content here — homepage, about page, product descriptions, etc."
          className="min-h-[100px] border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm resize-y"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {inputs.websiteText.length > 0 
            ? `${inputs.websiteText.split(/\s+/).filter(Boolean).length} words detected`
            : "More text = better brand extraction"
          }
        </p>
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
        onClick={onGenerate}
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
