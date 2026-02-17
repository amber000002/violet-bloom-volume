// Core Brand JSON Schema v1.0
// Generated client-side from website text + industry + additional context

export interface CoreBrandJSON {
  brand_identity: {
    brand_name: string;
    website: string;
    industry: string;
    geography_focus: string;
    tagline: string;
    positioning: string;
    tone_of_voice: string;
  };

  business_model: {
    business_model_description: string;
    monetization_model: string;
    pricing_tiers: string[];
  };

  product_ecosystem: {
    core_products: string[];
    product_modules: string[];
    feature_modules: string[];
    feature_clusters: string[];
    platforms: string[];
    primary_platforms: string[];
    has_mobile_app: boolean;
    has_web_platform: boolean;
  };

  audience_intelligence: {
    primary_segments: string[];
    secondary_segments: string[];
    experience_levels: string[];
    risk_profiles: string[];
    personas_detected: string[];
  };

  value_framework: {
    value_propositions: string[];
    differentiators: string[];
  };

  engagement_architecture: {
    engagement_drivers: string[];
    seasonal_triggers: string[];
    event_based_triggers: string[];
    urgency_patterns: string[];
  };

  lifecycle_signal_map: {
    key_user_actions: string[];
    key_user_events: string[];
    activation_events: string[];
    monetization_events: string[];
    churn_signals: string[];
    inactivity_markers: string[];
    lifecycle_markers: string[];
  };

  risk_compliance_layer: {
    regulatory_environment: string[];
    regulatory_flags: string[];
    compliance_intensity: string;
    risk_signals: string[];
    high_risk_behaviors: string[];
  };

  industry_signal_layer: {
    industry_kpis: string[];
    industry_vocabulary: string[];
    industry_signal_vocabulary: string[];
  };

  kpi_framework: {
    primary_kpis: string[];
    secondary_kpis: string[];
    risk_kpis: string[];
  };

  tech_scale_layer: {
    has_cdp: boolean;
    has_crm: boolean;
    supports_real_time_triggers: boolean;
    has_mobile_app: boolean;
    supports_primary_channels: boolean;
    supported_channels: string[];
    volume_indicators_found: string[];
    monthly_active_users_band: string;
  };

  extraction_metadata?: {
    source_mode: "url_only" | "url_plus_text" | "text_only";
    pages_crawled: string[];
    confidence_by_section: Record<string, "high" | "medium" | "low">;
    evidence_snippets: Array<{ section: string; snippet: string; confidence: string }>;
    missing_sections: string[];
    warnings: string[];
  };
}

export interface BrandInputs {
  websiteUrl: string;
  websiteText: string;
  additionalContext: {
    mauRange: string;
    productFocus: string;
    icpDetails: string;
    campaignChallenges: string;
  };
}

// Additional context fields configuration
export const additionalContextFields = [
  { key: "mauRange" as const, label: "Known MAU Range", placeholder: "e.g., 1M-5M monthly active users" },
  { key: "productFocus" as const, label: "Key Product Focus", placeholder: "e.g., SIP investments, mutual funds" },
  { key: "icpDetails" as const, label: "ICP Details", placeholder: "e.g., 25-40 age group, tier 1 cities, salaried professionals" },
  { key: "campaignChallenges" as const, label: "Known Campaign Challenges", placeholder: "e.g., low open rates on transactional emails, high unsubscribe in promotional" },
];

export const emptyBrandInputs: BrandInputs = {
  websiteUrl: "",
  websiteText: "",
  additionalContext: {
    mauRange: "",
    productFocus: "",
    icpDetails: "",
    campaignChallenges: "",
  },
};
