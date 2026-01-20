import React from "react";
import { motion } from "framer-motion";
import { 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { ResourceCitation, ConfidenceLevel } from "@/types/resources";

interface ResourceCitationsProps {
  citations: ResourceCitation[];
  confidenceLevel: ConfidenceLevel;
  usedNativeIntelligence: boolean;
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
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  const config = confidenceConfig[confidenceLevel];
  const ConfidenceIcon = config.icon;

  if (citations.length === 0 && !usedNativeIntelligence) {
    return null;
  }

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
          className="mt-3 pt-3 border-t border-border space-y-2"
        >
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
              </div>
            </div>
          ))}

          {usedNativeIntelligence && (
            <div className="flex items-start gap-2 text-sm pt-2 border-t border-border/50">
              <span className="text-muted-foreground">+</span>
              <span className="text-muted-foreground italic">
                Extended by Lovable native intelligence
              </span>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-2">
            {config.description}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};
