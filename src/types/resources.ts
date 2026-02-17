// Resource Library Types

export type ResourceType = 
  | "url" 
  | "confluence" 
  | "google-doc" 
  | "pdf" 
  | "word" 
  | "dashboard"
  | "json"; // New: JSON-based ingestion

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

// Attribution source types for output traceability
export type SourceAttribution = 
  | "internal" 
  | "internal-extended" 
  | "native";

// Use case definitions that can be stored in resources
export interface ResourceJourney {
  id?: string; // Unique ID for merge logic
  name: string;
  triggerType: "event" | "segment" | "schedule" | "api" | "past-behavior" | "live-event" | "segment-change" | "time-based";
  description: string;
  stage?: string;
  framework?: string; // lifecycle, aida, 4p, 7p
  events?: string[]; // Key events for this journey
  segments?: string[]; // Target segments
  channels?: string[]; // e.g. ["Email", "WhatsApp", "Push"]
  // Extended fields from JSON for AI augmentation
  business_goal?: string;
  business_challenge?: string;
  clevertap_solution?: string;
  metrics_impacted?: string[];
  business_impact?: string;
}

export interface ResourceCampaign {
  id?: string; // Unique ID for merge logic
  name: string;
  purpose: string;
  timing: string;
  suppression: string;
  stage?: string;
  framework?: string;
  channels?: string[]; // e.g. ["Email", "WhatsApp", "Push"]
  // Extended fields from JSON for AI augmentation
  business_goal?: string;
  business_challenge?: string;
  clevertap_solution?: string;
  metrics_impacted?: string[];
  business_impact?: string;
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
  // JSON ingestion metadata
  version?: number;
  lastUpdated?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ===== JSON INGESTION SCHEMA =====
// This defines the expected format for JSON file uploads

export interface JSONResourceMetadata {
  source: string;
  version: string;
  last_updated: string;
  author?: string;
  description?: string;
}

export interface JSONUseCase {
  use_case_id: string;
  name: string;
  type: "journey" | "campaign";
  // Journey fields
  trigger_type?: ResourceJourney["triggerType"];
  description?: string;
  events?: string[];
  segments?: string[];
  // Campaign fields
  purpose?: string;
  timing?: string;
  suppression?: string;
  // Common fields
  stage?: string;
  framework?: string;
  industry?: IndustryRelevance;
  tabs?: TabRelevance[];
  channels?: string[]; // e.g. ["Email", "WhatsApp", "Push"]
  is_primary?: boolean;
}

export interface JSONResourceFile {
  metadata: JSONResourceMetadata;
  use_cases: JSONUseCase[];
}

// Validation result for JSON parsing
export interface JSONValidationResult {
  isValid: boolean;
  errors: string[];
  parsedUseCases: number;
  duplicatesSkipped: number;
  updatedUseCases: number;
}

// ===== EXISTING TYPES =====

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
  sourceAttribution?: SourceAttribution;
}

export interface IntelligenceResult {
  content: string;
  citations: ResourceCitation[];
  confidenceLevel: ConfidenceLevel;
  usedNativeIntelligence: boolean;
  sourceBreakdown?: {
    internalCount: number;
    nativeCount: number;
  };
}
