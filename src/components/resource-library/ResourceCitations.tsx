import React from "react";
import { motion } from "framer-motion";
import { 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from "lucide-react";
import { ResourceCitation, ConfidenceLevel } from "@/types/resources";

interface CoverageStats {
  journeysFromResource: number;
  journeysFromNative: number;
  campaignsFromResource: number;
  campaignsFromNative: number;
}

interface MatchDiagnostic {
  resourceTitle: string;
  industryMatch: boolean;
  tabMatch: boolean;
  isEnabled: boolean;
  isPrimary: boolean;
  reason: string;
}

interface ResourceCitationsProps {
  citations: ResourceCitation[];
  confidenceLevel: ConfidenceLevel;
  usedNativeIntelligence: boolean;
  coverageStats?: CoverageStats;
  diagnostics?: MatchDiagnostic[];
}

const confidenceConfig: Record<ConfidenceLevel, { 
  label: string; 
  description: string;
  icon: typeof CheckCircle2;
  colorClass: string;
}> = {
  high: {
    label: "High Confidence",
    description: "Internal resources fully cover this",
    icon: CheckCircle2,
    colorClass: "text-emerald-400",
  },
  medium: {
    label: "Medium Confidence",
    description: "Internal + Lovable inference",
    icon: AlertCircle,
    colorClass: "text-amber-400",
  },
  low: {
    label: "Low Confidence",
    description: "Lovable inference only",
    icon: HelpCircle,
    colorClass: "text-muted-foreground",
  },
};

export const ResourceCitations: React.FC<ResourceCitationsProps> = ({
  citations,
  confidenceLevel,
  usedNativeIntelligence,
  coverageStats,
  diagnostics,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [showDiagnostics, setShowDiagnostics] = React.useState(false);
  
  const config = confidenceConfig[confidenceLevel];
  const ConfidenceIcon = config.icon;

  if (citations.length === 0 && !usedNativeIntelligence) {
    return null;
  }

  const unmatchedResources = diagnostics?.filter(d => !d.tabMatch || !d.industryMatch || !d.isEnabled);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-3 rounded-lg bg-muted/30 border border-border"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Sources Referenced
          </span>
          <span className="text-xs text-muted-foreground">
            ({citations.length} resource{citations.length !== 1 ? "s" : ""})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 ${config.colorClass}`}>
            <ConfidenceIcon className="w-4 h-4" />
            <span className="text-xs font-medium">{config.label}</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="mt-3 pt-3 border-t border-border space-y-3"
        >
          {/* Coverage Breakdown */}
          {coverageStats && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-medium text-emerald-400">From Internal Resources</span>
                </div>
                <div className="text-muted-foreground">
                  {coverageStats.journeysFromResource} journeys, {coverageStats.campaignsFromResource} campaigns
                </div>
              </div>
              <div className="p-2 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-1.5 mb-1">
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground">From Native Intelligence</span>
                </div>
                <div className="text-muted-foreground">
                  {coverageStats.journeysFromNative} journeys, {coverageStats.campaignsFromNative} campaigns
                </div>
              </div>
            </div>
          )}

          {/* Resource List */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Referenced Resources:</span>
            {citations.map((citation, idx) => (
              <div 
                key={citation.resourceId}
                className="flex items-start gap-2 text-sm"
              >
                <span className="text-muted-foreground">{idx + 1}.</span>
                <div className="flex-1">
                  <span className="text-foreground">{citation.resourceTitle}</span>
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                    citation.matchType === "exact" 
                      ? "bg-emerald-500/20 text-emerald-400"
                      : citation.matchType === "partial"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {citation.matchType}
                  </span>
                  {citation.excerpt && (
                    <span className="ml-2 text-xs text-muted-foreground">{citation.excerpt}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {usedNativeIntelligence && (
            <div className="flex items-start gap-2 text-sm pt-2 border-t border-border/50">
              <span className="text-muted-foreground">+</span>
              <span className="text-muted-foreground italic">
                Extended by native intelligence for uncovered use cases
              </span>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-2">
            {config.description}
          </p>

          {/* Diagnostics Section */}
          {diagnostics && diagnostics.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDiagnostics(!showDiagnostics);
                }}
                className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Why aren't my resources matching?</span>
                {showDiagnostics ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>

              {showDiagnostics && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-2 space-y-2"
                >
                  {diagnostics.map((diag, idx) => (
                    <div 
                      key={idx}
                      className={`p-2 rounded-lg text-xs ${
                        diag.tabMatch && diag.industryMatch && diag.isEnabled
                          ? "bg-emerald-500/10 border border-emerald-500/20" 
                          : "bg-amber-500/10 border border-amber-500/20"
                      }`}
                    >
                      <div className="font-medium text-foreground mb-1 flex items-center gap-2">
                        {diag.resourceTitle}
                        {diag.isPrimary && (
                          <span className="px-1 py-0.5 bg-primary/20 text-primary rounded text-[10px]">Primary</span>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-muted-foreground">
                        <div className="flex items-start gap-1">
                          <span className={diag.tabMatch ? "text-emerald-400" : "text-red-400"}>
                            {diag.tabMatch ? "✓" : "✗"}
                          </span>
                          <span>Tab match: {diag.tabMatch ? "Yes" : "No (resource not tagged for this tab)"}</span>
                        </div>
                        
                        <div className="flex items-start gap-1">
                          <span className={diag.industryMatch ? "text-emerald-400" : "text-red-400"}>
                            {diag.industryMatch ? "✓" : "✗"}
                          </span>
                          <span>Industry match: {diag.industryMatch ? "Yes" : "No (resource not tagged for this industry)"}</span>
                        </div>
                        
                        <div className="flex items-start gap-1">
                          <span className={diag.isEnabled ? "text-emerald-400" : "text-red-400"}>
                            {diag.isEnabled ? "✓" : "✗"}
                          </span>
                          <span>Enabled: {diag.isEnabled ? "Yes" : "No"}</span>
                        </div>

                        <div className="mt-2 p-2 bg-muted/50 rounded text-[11px]">
                          <span className={diag.tabMatch && diag.industryMatch && diag.isEnabled ? "text-emerald-400" : "text-amber-400"}>
                            {diag.reason}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};
