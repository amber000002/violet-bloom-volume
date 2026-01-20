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
  | "banking"
  | "nbfcs"
  | "amcs"
  | "insurance"
  | "travel-hospitality"
  | "aviation"
  | "cab-aggregators"
  | "food-tech"
  | "apparel-fashion"
  | "retail"
  | "quick-commerce"
  | "beauty"
  | "edtech"
  | "fintech"
  | "ott"
  | "healthcare"
  | "gaming"
  | "news-media"
  | "telecom"
  | "home-services"
  | "ticket-booking"
  | "real-estate"
  | "job-portals"
  | "d2c-subscriptions"
  | "fitness-wellness"
  | "education-marketplace"
  | "auto-mobility";

export type ConfidenceLevel = "high" | "medium" | "low";

// Use case definitions that can be stored in resources
export interface ResourceJourney {
  name: string;
  triggerType: "event" | "segment" | "schedule" | "api" | "past-behavior" | "live-event" | "segment-change" | "time-based";
  description: string;
  stage?: string;
}

export interface ResourceCampaign {
  name: string;
  purpose: string;
  timing: string;
  suppression: string;
  stage?: string;
}

export interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  url: string;
  tabs: TabRelevance[];
  industries: IndustryRelevance[];
  keywords: string[];
  content?: string; // Parsed content from URL/file
  // Use cases defined in this resource
  journeys?: ResourceJourney[];
  campaigns?: ResourceCampaign[];
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
