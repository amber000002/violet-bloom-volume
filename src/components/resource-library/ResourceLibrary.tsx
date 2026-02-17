import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Library, 
  Plus, 
  X, 
  Database,
  ExternalLink,
  Search,
  FileJson,
} from "lucide-react";
import { useResourceLibrary } from "@/contexts/ResourceLibraryContext";
import { TabRelevance } from "@/types/resources";
import { AddResourceForm } from "./AddResourceForm";
import { ResourceCard } from "./ResourceCard";
import { JSONResourceUpload } from "./JSONResourceUpload";

const tabLabels: Record<TabRelevance, string> = {
  "inbox-potential": "Inbox Potential",
  "use-case-studio": "Use Case Studio",
  "amp-email-studio": "AMP Email Studio",
  "inbox-diagnostics": "Inbox Diagnostics",
  "creative": "Creative Analyzer",
};

type ViewMode = "list" | "add-form" | "add-json";

export const ResourceLibrary: React.FC = () => {
  const { resources, isLibraryOpen, setIsLibraryOpen } = useResourceLibrary();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [filterTab, setFilterTab] = useState<TabRelevance | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredResources = resources.filter(r => {
    if (filterTab !== "all" && !r.tabs.includes(filterTab)) return false;
    if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const enabledCount = resources.filter(r => r.isEnabled).length;
  const primaryCount = resources.filter(r => r.isPrimary).length;
  const jsonCount = resources.filter(r => r.type === "json").length;

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsLibraryOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-magic text-primary-foreground shadow-magic hover:shadow-lg transition-all"
      >
        <Library className="w-5 h-5" />
        <span className="font-medium">Resource Library</span>
        {resources.length > 0 && (
          <span className="ml-1 px-2 py-0.5 rounded-full bg-primary-foreground/20 text-xs">
            {enabledCount}/{resources.length}
          </span>
        )}
      </motion.button>

      {/* Slide-over Panel */}
      <AnimatePresence>
        {isLibraryOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLibraryOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-xl bg-card border-l border-border shadow-xl z-50 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-magic flex items-center justify-center">
                      <Library className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h2 className="text-xl font-display font-semibold text-foreground">
                        Resource Library
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {resources.length} resources • {primaryCount} primary
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsLibraryOpen(false)}
                    className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                {/* Search and Filter */}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search resources..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <select
                    value={filterTab}
                    onChange={(e) => setFilterTab(e.target.value as TabRelevance | "all")}
                    className="px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="all">All Tabs</option>
                    {Object.entries(tabLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {viewMode === "add-form" ? (
                  <AddResourceForm onClose={() => setViewMode("list")} />
                ) : viewMode === "add-json" ? (
                  <JSONResourceUpload onClose={() => setViewMode("list")} />
                ) : (
                  <div className="space-y-4">
                    {/* Add Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setViewMode("add-form")}
                        className="p-4 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary hover:text-primary transition-colors flex flex-col items-center justify-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        <span className="text-sm font-medium">Add Resource</span>
                        <span className="text-xs text-muted-foreground">Form-based entry</span>
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setViewMode("add-json")}
                        className="p-4 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-emerald-500 hover:text-emerald-500 transition-colors flex flex-col items-center justify-center gap-2"
                      >
                        <FileJson className="w-5 h-5" />
                        <span className="text-sm font-medium">Upload JSON</span>
                        <span className="text-xs text-muted-foreground">Bulk import</span>
                      </motion.button>
                    </div>

                    {/* Stats Banner */}
                    {jsonCount > 0 && (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs">
                        <FileJson className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">
                          {jsonCount} JSON resource{jsonCount !== 1 ? "s" : ""} with{" "}
                          {resources
                            .filter(r => r.type === "json")
                            .reduce((acc, r) => acc + (r.journeys?.length || 0) + (r.campaigns?.length || 0), 0)
                          } use cases
                        </span>
                      </div>
                    )}

                    {/* Resource List */}
                    {filteredResources.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-4">
                          <Database className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">
                          {resources.length === 0 
                            ? "No resources added yet" 
                            : "No resources match your filter"}
                        </p>
                        <p className="text-sm text-muted-foreground/70 mt-1">
                          Add CleverTap playbooks, benchmarks, and guides
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredResources.map(resource => (
                          <ResourceCard key={resource.id} resource={resource} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border bg-muted/30">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Resources persist in cloud • Auto-loaded by industry</span>
                  <a 
                    href="#" 
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    Learn more <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
