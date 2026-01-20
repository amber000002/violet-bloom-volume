import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { 
  Resource, 
  ResourceType, 
  TabRelevance, 
  IndustryRelevance, 
  ResourceMatch,
  ConfidenceLevel 
} from "@/types/resources";

interface ResourceLibraryContextType {
  resources: Resource[];
  addResource: (resource: Omit<Resource, "id" | "createdAt" | "updatedAt">) => void;
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

  const findMatchingResources = useCallback((
    tab: TabRelevance, 
    industry: string
  ): ResourceMatch[] => {
    const tabResources = getResourcesForTab(tab, industry);
    const matches: ResourceMatch[] = [];

    // Sort by primary first
    const sortedResources = [...tabResources].sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return 0;
    });

    for (const resource of sortedResources) {
      // Match based purely on tab + industry alignment
      const relevanceScore = resource.isPrimary ? 1.0 : 0.8;
      matches.push({
        resource,
        relevanceScore,
        matchedKeywords: [], // No longer used
        matchType: resource.isPrimary ? "exact" : "partial",
      });
    }

    return matches.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }, [getResourcesForTab]);

  const getConfidenceLevel = useCallback((matches: ResourceMatch[]): ConfidenceLevel => {
    if (matches.length === 0) return "low";
    
    const hasPrimaryMatch = matches.some(m => m.resource.isPrimary);
    
    if (hasPrimaryMatch) return "high";
    if (matches.length > 0) return "medium";
    return "low";
  }, []);

  return (
    <ResourceLibraryContext.Provider 
      value={{
        resources,
        addResource,
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
