import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, ChevronDown, ChevronUp, Plus, RefreshCw, Upload, FileText, X, Database } from "lucide-react";
import { BrandInputs, emptyBrandInputs, additionalContextFields } from "@/types/brandProfile";

interface BrandInputsPanelProps {
  inputs: BrandInputs;
  onChange: (inputs: BrandInputs) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  hasIndustry: boolean;
  brandMeta?: { completenessScore: number; iterationCount: number; lastUpdated: string } | null;
  hasBrandProfile?: boolean;
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
}) => {
  const [showAdditional, setShowAdditional] = useState(false);
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
