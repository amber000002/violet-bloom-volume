import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { 
  Resource, 
  ResourceType, 
  TabRelevance, 
  IndustryRelevance, 
  ResourceMatch,
  ConfidenceLevel,
  JSONResourceFile,
  JSONValidationResult,
  ResourceJourney,
  ResourceCampaign,
} from "@/types/resources";

interface ResourceLibraryContextType {
  resources: Resource[];
  addResource: (resource: Omit<Resource, "id" | "createdAt" | "updatedAt">) => void;
  addResourcesFromJSON: (json: JSONResourceFile) => JSONValidationResult;
  updateResource: (id: string, updates: Partial<Resource>) => void;
  removeResource: (id: string) => void;
  toggleResourceEnabled: (id: string) => void;
  toggleResourcePrimary: (id: string) => void;
  getResourcesForTab: (tab: TabRelevance, industry?: string) => Resource[];
  findMatchingResources: (
    tab: TabRelevance, 
    industry: string
  ) => ResourceMatch[];
  getConfidenceLevel: (matches: ResourceMatch[]) => ConfidenceLevel;
  isLibraryOpen: boolean;
  setIsLibraryOpen: (open: boolean) => void;
}

const ResourceLibraryContext = createContext<ResourceLibraryContextType | null>(null);

export const useResourceLibrary = () => {
  const context = useContext(ResourceLibraryContext);
  if (!context) {
    throw new Error("useResourceLibrary must be used within ResourceLibraryProvider");
  }
  return context;
};

interface ResourceLibraryProviderProps {
  children: ReactNode;
}

export const ResourceLibraryProvider: React.FC<ResourceLibraryProviderProps> = ({ children }) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  const generateId = () => `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addResource = useCallback((resource: Omit<Resource, "id" | "createdAt" | "updatedAt">) => {
    const newResource: Resource = {
      ...resource,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setResources(prev => [...prev, newResource]);
  }, []);

  // ===== JSON INGESTION LOGIC =====
  // Follows PRD: merge by use_case_id, preserve version history, never overwrite unless ID matches
  const addResourcesFromJSON = useCallback((json: JSONResourceFile): JSONValidationResult => {
    const errors: string[] = [];
    let parsedUseCases = 0;
    let duplicatesSkipped = 0;
    let updatedUseCases = 0;

    // Validate metadata
    if (!json.metadata) {
      errors.push("Missing 'metadata' block in JSON");
    }
    if (!json.use_cases || !Array.isArray(json.use_cases)) {
      errors.push("Missing or invalid 'use_cases' array in JSON");
      return { isValid: false, errors, parsedUseCases, duplicatesSkipped, updatedUseCases };
    }

    // Group use cases by their target resource (based on industry + source)
    const resourceMap = new Map<string, {
      journeys: ResourceJourney[];
      campaigns: ResourceCampaign[];
      tabs: Set<TabRelevance>;
      industries: Set<IndustryRelevance>;
      isPrimary: boolean;
      useCaseIds: Set<string>;
    }>();

    for (const useCase of json.use_cases) {
      if (!useCase.use_case_id) {
        errors.push(`Use case missing 'use_case_id': ${useCase.name || "unnamed"}`);
        continue;
      }
      if (!useCase.name) {
        errors.push(`Use case ${useCase.use_case_id} missing 'name'`);
        continue;
      }
      if (!useCase.type || !["journey", "campaign"].includes(useCase.type)) {
        errors.push(`Use case ${useCase.use_case_id} has invalid 'type' (must be 'journey' or 'campaign')`);
        continue;
      }

      // Create resource key based on source/industry grouping
      const industry = useCase.industry || "all";
      const resourceKey = `${json.metadata.source}_${industry}`;

      if (!resourceMap.has(resourceKey)) {
        resourceMap.set(resourceKey, {
          journeys: [],
          campaigns: [],
          tabs: new Set(),
          industries: new Set(),
          isPrimary: false,
          useCaseIds: new Set(),
        });
      }

      const resourceData = resourceMap.get(resourceKey)!;

      // Check for duplicate use_case_id within this upload
      if (resourceData.useCaseIds.has(useCase.use_case_id)) {
        duplicatesSkipped++;
        continue;
      }
      resourceData.useCaseIds.add(useCase.use_case_id);

      // Add tabs and industries
      if (useCase.tabs) {
        useCase.tabs.forEach(t => resourceData.tabs.add(t));
      } else {
        resourceData.tabs.add("use-case-studio"); // Default
      }
      resourceData.industries.add(industry as IndustryRelevance);
      
      if (useCase.is_primary) {
        resourceData.isPrimary = true;
      }

      // Convert to journey or campaign
      if (useCase.type === "journey") {
        const journey: ResourceJourney = {
          id: useCase.use_case_id,
          name: useCase.name,
          triggerType: useCase.trigger_type || "event",
          description: useCase.description || "",
          stage: useCase.stage,
          framework: useCase.framework,
          events: useCase.events,
          segments: useCase.segments,
        };
        resourceData.journeys.push(journey);
      } else {
        const campaign: ResourceCampaign = {
          id: useCase.use_case_id,
          name: useCase.name,
          purpose: useCase.purpose || "",
          timing: useCase.timing || "",
          suppression: useCase.suppression || "",
          stage: useCase.stage,
          framework: useCase.framework,
        };
        resourceData.campaigns.push(campaign);
      }

      parsedUseCases++;
    }

    if (errors.length > 0 && parsedUseCases === 0) {
      return { isValid: false, errors, parsedUseCases, duplicatesSkipped, updatedUseCases };
    }

    // Create or merge resources
    setResources(prev => {
      const newResources = [...prev];

      for (const [key, data] of resourceMap.entries()) {
        const [source, industry] = key.split("_");
        const title = `${source} (${industry.toUpperCase()})`;

        // Find existing resource by title
        const existingIndex = newResources.findIndex(r => r.title === title);

        if (existingIndex >= 0) {
          // MERGE: Update existing resource with new/updated use cases
          const existing = newResources[existingIndex];
          const existingJourneyIds = new Set(existing.journeys?.map(j => j.id) || []);
          const existingCampaignIds = new Set(existing.campaigns?.map(c => c.id) || []);

          const mergedJourneys = [...(existing.journeys || [])];
          const mergedCampaigns = [...(existing.campaigns || [])];

          for (const journey of data.journeys) {
            if (journey.id && existingJourneyIds.has(journey.id)) {
              // Update existing journey
              const idx = mergedJourneys.findIndex(j => j.id === journey.id);
              if (idx >= 0) {
                mergedJourneys[idx] = journey;
                updatedUseCases++;
              }
            } else {
              mergedJourneys.push(journey);
            }
          }

          for (const campaign of data.campaigns) {
            if (campaign.id && existingCampaignIds.has(campaign.id)) {
              // Update existing campaign
              const idx = mergedCampaigns.findIndex(c => c.id === campaign.id);
              if (idx >= 0) {
                mergedCampaigns[idx] = campaign;
                updatedUseCases++;
              }
            } else {
              mergedCampaigns.push(campaign);
            }
          }

          newResources[existingIndex] = {
            ...existing,
            journeys: mergedJourneys,
            campaigns: mergedCampaigns,
            tabs: [...new Set([...existing.tabs, ...data.tabs])],
            industries: [...new Set([...existing.industries, ...data.industries])] as IndustryRelevance[],
            isPrimary: existing.isPrimary || data.isPrimary,
            version: (existing.version || 1) + 1,
            lastUpdated: new Date(),
            updatedAt: new Date(),
          };
        } else {
          // CREATE: New resource
          const newResource: Resource = {
            id: generateId(),
            title,
            type: "json",
            url: `json://${json.metadata.source}`,
            tabs: [...data.tabs],
            industries: [...data.industries] as IndustryRelevance[],
            keywords: [],
            journeys: data.journeys,
            campaigns: data.campaigns,
            isEnabled: true,
            isPrimary: data.isPrimary,
            version: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          newResources.push(newResource);
        }
      }

      return newResources;
    });

    return { 
      isValid: true, 
      errors, 
      parsedUseCases, 
      duplicatesSkipped, 
      updatedUseCases 
    };
  }, []);

  const updateResource = useCallback((id: string, updates: Partial<Resource>) => {
    setResources(prev => prev.map(r => 
      r.id === id 
        ? { ...r, ...updates, updatedAt: new Date() } 
        : r
    ));
  }, []);

  const removeResource = useCallback((id: string) => {
    setResources(prev => prev.filter(r => r.id !== id));
  }, []);

  const toggleResourceEnabled = useCallback((id: string) => {
    setResources(prev => prev.map(r => 
      r.id === id 
        ? { ...r, isEnabled: !r.isEnabled, updatedAt: new Date() } 
        : r
    ));
  }, []);

  const toggleResourcePrimary = useCallback((id: string) => {
    setResources(prev => prev.map(r => 
      r.id === id 
        ? { ...r, isPrimary: !r.isPrimary, updatedAt: new Date() } 
        : r
    ));
  }, []);

  const getResourcesForTab = useCallback((tab: TabRelevance, industry?: string): Resource[] => {
    return resources.filter(r => {
      if (!r.isEnabled) return false;
      if (!r.tabs.includes(tab)) return false;
      if (industry && !r.industries.includes("all") && !r.industries.includes(industry as IndustryRelevance)) {
        return false;
      }
      return true;
    });
  }, [resources]);

  // INTELLIGENCE RESOLUTION LOGIC (per PRD):
  // Priority 1: Internal Resource - Exact Match (industry + tab + framework match)
  // Priority 2: Internal Resource - Partial Match (same tab or framework)
  // Priority 3: Lovable Native Intelligence (only when no internal resource exists)
  const findMatchingResources = useCallback((
    tab: TabRelevance, 
    industry: string
  ): ResourceMatch[] => {
    const tabResources = getResourcesForTab(tab, industry);
    const matches: ResourceMatch[] = [];

    // Sort by primary first, then by whether they have actual content
    const sortedResources = [...tabResources].sort((a, b) => {
      // Primary resources first
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      // Then resources with actual content
      const aHasContent = (a.journeys?.length || 0) + (a.campaigns?.length || 0);
      const bHasContent = (b.journeys?.length || 0) + (b.campaigns?.length || 0);
      return bHasContent - aHasContent;
    });

    for (const resource of sortedResources) {
      const hasContent = (resource.journeys?.length || 0) + (resource.campaigns?.length || 0) > 0;
      const industryExact = resource.industries.includes(industry as IndustryRelevance);
      
      // Determine match type based on content and alignment
      let matchType: "exact" | "partial" | "fallback" = "partial";
      let relevanceScore = 0.5;

      if (hasContent && industryExact && resource.isPrimary) {
        matchType = "exact";
        relevanceScore = 1.0;
      } else if (hasContent && industryExact) {
        matchType = "exact";
        relevanceScore = 0.9;
      } else if (hasContent) {
        matchType = "partial";
        relevanceScore = 0.7;
      } else if (resource.isPrimary) {
        matchType = "partial";
        relevanceScore = 0.6;
      }

      matches.push({
        resource,
        relevanceScore,
        matchedKeywords: [],
        matchType,
      });
    }

    return matches.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }, [getResourcesForTab]);

  const getConfidenceLevel = useCallback((matches: ResourceMatch[]): ConfidenceLevel => {
    if (matches.length === 0) return "low";
    
    // Check if any match has actual content
    const hasContentMatch = matches.some(m => 
      (m.resource.journeys?.length || 0) + (m.resource.campaigns?.length || 0) > 0
    );
    
    const hasPrimaryMatch = matches.some(m => m.resource.isPrimary);
    
    if (hasContentMatch && hasPrimaryMatch) return "high";
    if (hasContentMatch) return "high";
    if (hasPrimaryMatch) return "medium";
    if (matches.length > 0) return "medium";
    return "low";
  }, []);

  return (
    <ResourceLibraryContext.Provider 
      value={{
        resources,
        addResource,
        addResourcesFromJSON,
        updateResource,
        removeResource,
        toggleResourceEnabled,
        toggleResourcePrimary,
        getResourcesForTab,
        findMatchingResources,
        getConfidenceLevel,
        isLibraryOpen,
        setIsLibraryOpen,
      }}
    >
      {children}
    </ResourceLibraryContext.Provider>
  );
};
