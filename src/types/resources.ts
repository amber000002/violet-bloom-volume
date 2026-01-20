// Resource Library Types

export type ResourceType = 
  | "url" 
  | "confluence" 
  | "google-doc" 
  | "pdf" 
  | "word" 
  | "dashboard";

export type TabRelevance = 
  | "inbox-potential" 
  | "use-case-studio" 
  | "amp-email-studio" 
  | "inbox-diagnostics" 
  | "creative";

export type IndustryRelevance = 
  | "all" 
  | "ecommerce" 
  | "fintech" 
  | "gaming" 
  | "media" 
  | "travel" 
  | "healthcare"
  | "education"
  | "saas";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  url: string;
  tabs: TabRelevance[];
  industries: IndustryRelevance[];
  keywords: string[];
  content?: string; // Parsed content from URL/file
  isEnabled: boolean;
  isPrimary: boolean; // Confidence-locked primary resource
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceMatch {
  resource: Resource;
  relevanceScore: number;
  matchedKeywords: string[];
  matchType: "exact" | "partial" | "fallback";
}

export interface ResourceCitation {
  resourceId: string;
  resourceTitle: string;
  matchType: "exact" | "partial" | "fallback";
  excerpt?: string;
}

export interface IntelligenceResult {
  content: string;
  citations: ResourceCitation[];
  confidenceLevel: ConfidenceLevel;
  usedNativeIntelligence: boolean;
}
