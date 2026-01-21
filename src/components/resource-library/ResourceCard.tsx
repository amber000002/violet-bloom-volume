import React from "react";
import { motion } from "framer-motion";
import { 
  Star, 
  StarOff, 
  ToggleLeft, 
  ToggleRight, 
  Trash2, 
  ExternalLink,
  Link as LinkIcon,
  FileText,
  Globe,
  FileJson,
  BookOpen,
} from "lucide-react";
import { useResourceLibrary } from "@/contexts/ResourceLibraryContext";
import { Resource, ResourceType, TabRelevance } from "@/types/resources";

interface ResourceCardProps {
  resource: Resource;
}

const typeIcons: Record<ResourceType, typeof LinkIcon> = {
  url: Globe,
  confluence: FileText,
  "google-doc": FileText,
  pdf: FileText,
  word: FileText,
  dashboard: LinkIcon,
  json: FileJson,
};

const tabLabels: Record<TabRelevance, string> = {
  "inbox-potential": "Inbox Potential",
  "use-case-studio": "Use Case",
  "amp-email-studio": "AMP",
  "inbox-diagnostics": "Diagnostics",
  "creative": "Creative",
};

export const ResourceCard: React.FC<ResourceCardProps> = ({ resource }) => {
  const { toggleResourceEnabled, toggleResourcePrimary, removeResource } = useResourceLibrary();
  
  const TypeIcon = typeIcons[resource.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`p-4 rounded-xl border transition-all ${
        resource.isEnabled 
          ? "bg-card border-border" 
          : "bg-muted/30 border-border/50 opacity-60"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            resource.isPrimary 
              ? "bg-gradient-magic" 
              : "bg-muted"
          }`}>
            <TypeIcon className={`w-4 h-4 ${
              resource.isPrimary ? "text-primary-foreground" : "text-muted-foreground"
            }`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-foreground truncate">
                {resource.title}
              </h4>
              {resource.isPrimary && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/20 text-primary">
                  PRIMARY
                </span>
              )}
            </div>
            <a 
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary truncate block"
            >
              {resource.url}
            </a>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleResourcePrimary(resource.id)}
            title={resource.isPrimary ? "Remove primary status" : "Mark as primary"}
            className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
          >
            {resource.isPrimary ? (
              <Star className="w-4 h-4 text-primary fill-primary" />
            ) : (
              <StarOff className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          <button
            onClick={() => toggleResourceEnabled(resource.id)}
            title={resource.isEnabled ? "Disable" : "Enable"}
            className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
          >
            {resource.isEnabled ? (
              <ToggleRight className="w-4 h-4 text-primary" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          <button
            onClick={() => removeResource(resource.id)}
            title="Delete"
            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {resource.tabs.map(tab => (
          <span 
            key={tab}
            className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary"
          >
            {tabLabels[tab]}
          </span>
        ))}
        {resource.industries.filter(i => i !== "all").map(industry => (
          <span 
            key={industry}
            className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary/10 text-secondary"
          >
            {industry}
          </span>
        ))}
      </div>

      {/* Content Stats (for JSON resources) */}
      {resource.type === "json" && (
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          {resource.journeys && resource.journeys.length > 0 && (
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-emerald-400" />
              {resource.journeys.length} journeys
            </span>
          )}
          {resource.campaigns && resource.campaigns.length > 0 && (
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-emerald-400" />
              {resource.campaigns.length} campaigns
            </span>
          )}
          {resource.version && resource.version > 1 && (
            <span className="text-amber-400">v{resource.version}</span>
          )}
        </div>
      )}

      {/* Keywords (for non-JSON resources) */}
      {resource.type !== "json" && resource.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {resource.keywords.slice(0, 5).map((keyword, idx) => (
            <span 
              key={idx}
              className="px-2 py-0.5 rounded text-[10px] bg-muted text-muted-foreground"
            >
              {keyword}
            </span>
          ))}
          {resource.keywords.length > 5 && (
            <span className="px-2 py-0.5 rounded text-[10px] text-muted-foreground">
              +{resource.keywords.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Added {resource.createdAt.toLocaleDateString()}</span>
        {resource.type !== "json" ? (
          <a 
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-primary"
          >
            Open <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="flex items-center gap-1 text-emerald-400">
            <FileJson className="w-3 h-3" />
            JSON Source
          </span>
        )}
      </div>
    </motion.div>
  );
};
