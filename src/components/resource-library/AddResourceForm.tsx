import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Link as LinkIcon, 
  FileText, 
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useResourceLibrary } from "@/contexts/ResourceLibraryContext";
import { ResourceType, TabRelevance, IndustryRelevance } from "@/types/resources";

interface AddResourceFormProps {
  onClose: () => void;
}

const resourceTypeOptions: { value: ResourceType; label: string; icon: typeof LinkIcon }[] = [
  { value: "url", label: "Website URL", icon: LinkIcon },
  { value: "confluence", label: "Confluence", icon: FileText },
  { value: "google-doc", label: "Google Doc", icon: FileText },
  { value: "pdf", label: "PDF File", icon: FileText },
  { value: "word", label: "Word Doc", icon: FileText },
  { value: "dashboard", label: "Dashboard", icon: LinkIcon },
];

const tabOptions: { value: TabRelevance; label: string }[] = [
  { value: "inbox-potential", label: "Inbox Potential" },
  { value: "use-case-studio", label: "Use Case Studio" },
  { value: "amp-email-studio", label: "AMP Email Studio" },
  { value: "inbox-diagnostics", label: "Inbox Diagnostics" },
  { value: "creative", label: "Creative Analyzer" },
];

const industryOptions: { value: IndustryRelevance; label: string }[] = [
  { value: "all", label: "All Industries" },
  { value: "banking", label: "Banking" },
  { value: "nbfcs", label: "NBFCs" },
  { value: "amcs", label: "AMCs" },
  { value: "insurance", label: "Insurance" },
  { value: "travel-hospitality", label: "Travel & Hospitality" },
  { value: "aviation", label: "Aviation" },
  { value: "cab-aggregators", label: "Cab Aggregators" },
  { value: "food-tech", label: "Food Tech" },
  { value: "apparel-fashion", label: "Apparel & Fashion" },
  { value: "retail", label: "Retail" },
  { value: "quick-commerce", label: "Quick Commerce" },
  { value: "beauty", label: "Beauty" },
  { value: "edtech", label: "Ed-tech" },
  { value: "fintech", label: "FinTech" },
  { value: "ott", label: "OTT" },
  { value: "healthcare", label: "Healthcare" },
  { value: "gaming", label: "Gaming" },
  { value: "news-media", label: "News & Media" },
  { value: "telecom", label: "Telecom" },
  { value: "home-services", label: "Home Services" },
  { value: "ticket-booking", label: "Ticket Booking" },
  { value: "real-estate", label: "Real Estate" },
  { value: "job-portals", label: "Job Portals" },
  { value: "d2c-subscriptions", label: "D2C Subscriptions" },
  { value: "fitness-wellness", label: "Fitness & Wellness" },
  { value: "education-marketplace", label: "Education Marketplaces" },
  { value: "auto-mobility", label: "Auto & Mobility" },
];

export const AddResourceForm: React.FC<AddResourceFormProps> = ({ onClose }) => {
  const { addResource } = useResourceLibrary();
  
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<ResourceType>("url");
  const [selectedTabs, setSelectedTabs] = useState<TabRelevance[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<IndustryRelevance[]>(["all"]);
  const [keywords, setKeywords] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleTab = (tab: TabRelevance) => {
    setSelectedTabs(prev => 
      prev.includes(tab) 
        ? prev.filter(t => t !== tab)
        : [...prev, tab]
    );
  };

  const toggleIndustry = (industry: IndustryRelevance) => {
    if (industry === "all") {
      setSelectedIndustries(["all"]);
    } else {
      setSelectedIndustries(prev => {
        const filtered = prev.filter(i => i !== "all");
        if (filtered.includes(industry)) {
          return filtered.filter(i => i !== industry);
        }
        return [...filtered, industry];
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!url.trim()) {
      setError("URL is required");
      return;
    }
    if (selectedTabs.length === 0) {
      setError("Select at least one tab");
      return;
    }

    setIsLoading(true);

    try {
      // Parse keywords from comma-separated string
      const keywordList = keywords
        .split(",")
        .map(k => k.trim())
        .filter(k => k.length > 0);

      addResource({
        title: title.trim(),
        url: url.trim(),
        type,
        tabs: selectedTabs,
        industries: selectedIndustries.length > 0 ? selectedIndustries : ["all"],
        keywords: keywordList,
        isEnabled: true,
        isPrimary,
        content: undefined, // Will be parsed when needed
      });

      onClose();
    } catch (err) {
      setError("Failed to add resource");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h3 className="text-lg font-display font-semibold text-foreground">
          Add Resource
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Resource Title <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Fintech Email Benchmarks 2024"
            className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Resource Type */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Resource Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {resourceTypeOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setType(option.value)}
                className={`p-3 rounded-lg border text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                  type === option.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-muted-foreground text-muted-foreground"
                }`}
              >
                <option.icon className="w-4 h-4" />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* URL */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            URL / Link <span className="text-destructive">*</span>
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Applicable Tabs */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Applicable Tabs <span className="text-destructive">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {tabOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleTab(option.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedTabs.includes(option.value)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Industries */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Industry Relevance
          </label>
          <div className="flex flex-wrap gap-2">
            {industryOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleIndustry(option.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedIndustries.includes(option.value)
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Keywords */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Keywords (comma-separated)
          </label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="e.g., open rate, deliverability, bounce rate"
            className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Keywords help match this resource to relevant outputs
          </p>
        </div>

        {/* Primary Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Mark as Primary</p>
            <p className="text-xs text-muted-foreground">
              Primary resources are prioritized in intelligence resolution
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsPrimary(!isPrimary)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              isPrimary ? "bg-primary" : "bg-muted"
            }`}
          >
            <motion.div
              animate={{ x: isPrimary ? 24 : 2 }}
              className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
            />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-border rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            Cancel
          </button>
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="flex-1 px-4 py-3 bg-gradient-magic text-primary-foreground rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Add Resource
              </>
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
};
