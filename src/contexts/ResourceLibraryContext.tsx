import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
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
import { 
  uploadResourceJSON, 
  resolveResourceForIndustry, 
  fetchResourceLibraryItems,
  softDeleteResourceItem,
  hardDeleteResourceItem,
  downloadResourceJSON,
  ResourceLibraryItem,
} from "@/lib/resourceCloudService";

// ===== OWNER ROLE DETECTION =====
// This is a single-tenant workspace app — all users in the workspace are treated as owners.
// No localStorage gating: every session has full management access.
function checkIsOwner(): boolean {
  return true;
}

// Canonical industry key: lowercase, hyphenated (e.g. "Food Tech" / "food_tech" -> "food-tech")
function normalizeIndustryKey(raw: string): string {
  return (raw || "").toLowerCase().trim().replace(/[\s_/]+/g, "-").replace(/-+/g, "-");
}

interface ResourceLibraryContextType {
  resources: Resource[];
  isOwner: boolean;
  addResource: (resource: Omit<Resource, "id" | "createdAt" | "updatedAt">) => void;
  addResourcesFromJSON: (json: JSONResourceFile) => Promise<JSONValidationResult>;
  updateResource: (id: string, updates: Partial<Resource>) => void;
  removeResource: (id: string, cloudItemId?: string) => Promise<void>;
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
  loadResourcesForIndustry: (industry: string) => Promise<void>;
  isLoadingCloudResources: boolean;
  cloudItems: ResourceLibraryItem[];
  noResourceForIndustry: boolean;
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
  const [isLoadingCloudResources, setIsLoadingCloudResources] = useState(false);
  const [cloudItems, setCloudItems] = useState<ResourceLibraryItem[]>([]);
  const [noResourceForIndustry, setNoResourceForIndustry] = useState(false);
  // Owner role: true for the browser session that first claimed ownership via upload
  const [isOwner, setIsOwner] = useState<boolean>(checkIsOwner);
  const lastLoadedIndustry = useRef<string>("");
  const initialLoadDone = useRef(false);

  const generateId = () => `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // ===== LOAD PERSISTED ITEMS ON MOUNT =====
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    (async () => {
      try {
        const items = await fetchResourceLibraryItems();
        setCloudItems(items);

        // Load all active items into resources
        for (const item of items) {
          const json = await downloadResourceJSON(item.file_path);
          if (json) {
            setResources(prev => {
              const { newResources } = parseJSONToResources(json, prev);
              return newResources;
            });
          }
        }
      } catch (err) {
        console.warn("Failed to load persisted resources:", err);
      }
    })();
  }, []);

  const addResource = useCallback((resource: Omit<Resource, "id" | "createdAt" | "updatedAt">) => {
    const newResource: Resource = {
      ...resource,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setResources(prev => [...prev, newResource]);
  }, []);

  // ===== PARSE JSON INTO RESOURCES (shared logic) =====
  const parseJSONToResources = useCallback((json: JSONResourceFile, existingResources: Resource[]): {
    newResources: Resource[];
    result: JSONValidationResult;
  } => {
    // Determine top-level industry from JSON (source of truth for all use cases in this file)
    const topLevelIndustry = normalizeIndustryKey((json as any)?.industry || (json?.metadata as any)?.industry || "");

    const errors: string[] = [];
    let parsedUseCases = 0;
    let duplicatesSkipped = 0;
    let updatedUseCases = 0;

    if (!json.metadata) {
      errors.push("Missing 'metadata' block in JSON");
    }
    if (!json.use_cases || !Array.isArray(json.use_cases)) {
      errors.push("Missing or invalid 'use_cases' array in JSON");
      return { 
        newResources: existingResources, 
        result: { isValid: false, errors, parsedUseCases, duplicatesSkipped, updatedUseCases } 
      };
    }

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
      // Normalize type — default to "journey" if missing or non-standard
      const useCaseType = useCase.type && ["journey", "campaign"].includes(useCase.type) ? useCase.type : "campaign";

      // Use case-level industry → top-level JSON industry → "all" as last resort
      const industry = normalizeIndustryKey(useCase.industry || topLevelIndustry || "all");
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

      if (resourceData.useCaseIds.has(useCase.use_case_id)) {
        duplicatesSkipped++;
        continue;
      }
      resourceData.useCaseIds.add(useCase.use_case_id);

      if (useCase.tabs) {
        useCase.tabs.forEach(t => resourceData.tabs.add(t));
      } else {
        resourceData.tabs.add("use-case-studio");
      }
      resourceData.industries.add(industry as IndustryRelevance);
      
      if (useCase.is_primary) {
        resourceData.isPrimary = true;
      }

      if (useCaseType === "journey") {
        const journey: ResourceJourney = {
          id: useCase.use_case_id,
          name: useCase.name,
          triggerType: useCase.trigger_type || "event",
          description: useCase.description || "",
          stage: useCase.stage,
          framework: useCase.framework,
          events: useCase.events,
          segments: useCase.segments,
          channels: useCase.channels,
          // Preserve extended fields for AI augmentation
          business_goal: (useCase as any).business_goal,
          business_challenge: (useCase as any).business_challenge,
          clevertap_solution: (useCase as any).clevertap_solution,
          metrics_impacted: (useCase as any).metrics_impacted,
          business_impact: (useCase as any).business_impact,
          rawData: { ...useCase } as Record<string, any>,
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
          channels: useCase.channels,
          // Preserve extended fields for AI augmentation
          business_goal: (useCase as any).business_goal,
          business_challenge: (useCase as any).business_challenge,
          clevertap_solution: (useCase as any).clevertap_solution,
          metrics_impacted: (useCase as any).metrics_impacted,
          business_impact: (useCase as any).business_impact,
          rawData: { ...useCase } as Record<string, any>,
        };
        resourceData.campaigns.push(campaign);
      }

      parsedUseCases++;
    }

    if (errors.length > 0 && parsedUseCases === 0) {
      return { 
        newResources: existingResources, 
        result: { isValid: false, errors, parsedUseCases, duplicatesSkipped, updatedUseCases } 
      };
    }

    const newResources = [...existingResources];

    for (const [key, data] of resourceMap.entries()) {
      const [source, industry] = key.split("_");
      const title = `${source} (${industry.toUpperCase()})`;

      const existingIndex = newResources.findIndex(r => r.title === title);

      if (existingIndex >= 0) {
        const existing = newResources[existingIndex];
        const existingJourneyIds = new Set(existing.journeys?.map(j => j.id) || []);
        const existingCampaignIds = new Set(existing.campaigns?.map(c => c.id) || []);

        const mergedJourneys = [...(existing.journeys || [])];
        const mergedCampaigns = [...(existing.campaigns || [])];

        for (const journey of data.journeys) {
          if (journey.id && existingJourneyIds.has(journey.id)) {
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

    return { 
      newResources, 
      result: { isValid: true, errors, parsedUseCases, duplicatesSkipped, updatedUseCases } 
    };
  }, []);

  // ===== JSON INGESTION (with cloud persistence) =====
  const addResourcesFromJSON = useCallback(async (json: JSONResourceFile): Promise<JSONValidationResult> => {
    // Parse locally first
    let finalResult: JSONValidationResult = {
      isValid: false,
      errors: ["Unknown error"],
      parsedUseCases: 0,
      duplicatesSkipped: 0,
      updatedUseCases: 0,
    };

    setResources(prev => {
      const { newResources, result } = parseJSONToResources(json, prev);
      finalResult = result;
      return newResources;
    });

    // Persist to cloud
    if (finalResult.isValid) {
      const { success, error, alreadyExists, item } = await uploadResourceJSON(json);
      if (!success) {
        console.warn("Cloud persistence failed (resources still loaded locally):", error);
      } else if (alreadyExists) {
        console.log("Resource JSON already exists in cloud (checksum match)");
        finalResult = {
          ...finalResult,
          duplicatesSkipped: finalResult.duplicatesSkipped,
        };
      } else {
        console.log("Resource JSON persisted to cloud storage");
        if (item) {
          setCloudItems(prev => [item, ...prev]);
        }
      }
    }

    return finalResult;
  }, [parseJSONToResources]);

  // ===== AUTO-LOAD RESOURCES FOR INDUSTRY =====
  const loadResourcesForIndustry = useCallback(async (industry: string) => {
    if (!industry || industry === lastLoadedIndustry.current) return;
    lastLoadedIndustry.current = industry;
    setNoResourceForIndustry(false);

    setIsLoadingCloudResources(true);
    try {
      const json = await resolveResourceForIndustry(industry);
      if (json) {
        setResources(prev => {
          // Remove previously cloud-loaded resources
          const manualResources = prev.filter(r => !r.url.startsWith("cloud://"));
          const { newResources } = parseJSONToResources(json, manualResources);
          // Tag cloud-loaded resources
          return newResources.map(r => 
            r.url.startsWith("json://") && !prev.some(p => p.id === r.id)
              ? { ...r, url: `cloud://${r.url.replace("json://", "")}` }
              : r
          );
        });
        setNoResourceForIndustry(false);
        console.log(`Auto-loaded cloud resource for industry: ${industry}`);
      } else {
        setNoResourceForIndustry(true);
      }
    } catch (err) {
      console.warn("Failed to auto-load cloud resources:", err);
      setNoResourceForIndustry(true);
    } finally {
      setIsLoadingCloudResources(false);
    }
  }, [parseJSONToResources]);

  const updateResource = useCallback((id: string, updates: Partial<Resource>) => {
    setResources(prev => prev.map(r => 
      r.id === id 
        ? { ...r, ...updates, updatedAt: new Date() } 
        : r
    ));
  }, []);

  // ===== HARD DELETE (owner-only) =====
  // cloudItemId is the resource_library_items.id from the DB (optional — needed only for JSON/cloud resources)
  const removeResource = useCallback(async (id: string, cloudItemId?: string): Promise<void> => {
    // Hard delete from cloud if we have a DB record id
    if (cloudItemId) {
      const { success, error } = await hardDeleteResourceItem(cloudItemId);
      if (!success) {
        console.error("Hard delete failed:", error);
        // Still remove from local state so UI is consistent
      } else {
        // Purge from cloudItems cache immediately
        setCloudItems(prev => prev.filter(c => c.id !== cloudItemId));
      }
    }
    // Remove from local state regardless
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
    const normalizedIndustry = industry ? normalizeIndustryKey(industry) : undefined;
    return resources.filter(r => {
      if (!r.isEnabled) return false;
      if (!r.tabs.includes(tab)) return false;
      if (normalizedIndustry && !r.industries.includes("all")) {
        const resourceIndustries = r.industries.map(i => normalizeIndustryKey(i as string));
        if (!resourceIndustries.includes(normalizedIndustry)) {
          return false;
        }
      }
      return true;
    });
  }, [resources]);

  const findMatchingResources = useCallback((
    tab: TabRelevance, 
    industry: string
  ): ResourceMatch[] => {
    const tabResources = getResourcesForTab(tab, industry);
    const matches: ResourceMatch[] = [];

    const sortedResources = [...tabResources].sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      const aHasContent = (a.journeys?.length || 0) + (a.campaigns?.length || 0);
      const bHasContent = (b.journeys?.length || 0) + (b.campaigns?.length || 0);
      return bHasContent - aHasContent;
    });

    for (const resource of sortedResources) {
      const hasContent = (resource.journeys?.length || 0) + (resource.campaigns?.length || 0) > 0;
      const industryExact = resource.industries.map(i => (i as string).toLowerCase().trim()).includes(industry.toLowerCase().trim());
      
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
        isOwner,
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
        loadResourcesForIndustry,
        isLoadingCloudResources,
        cloudItems,
        noResourceForIndustry,
      }}
    >
      {children}
    </ResourceLibraryContext.Provider>
  );
};
