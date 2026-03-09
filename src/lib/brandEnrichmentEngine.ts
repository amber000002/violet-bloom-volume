/**
 * Brand Profile Enrichment Merge Engine
 *
 * Merges a newly extracted brand profile into an existing one
 * following 7 merge rules from the PRD.
 */

import { CoreBrandJSON, BrandDesignProfile, BrandVisualAssets } from "@/types/brandProfile";

// ========== HELPERS ==========

/** Approximate colour distance (Euclidean in RGB). */
function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function colorDelta(a: string, b: string): number {
  const rgbA = hexToRgb(a);
  const rgbB = hexToRgb(b);
  if (!rgbA || !rgbB) return Infinity;
  return Math.sqrt(
    (rgbA[0] - rgbB[0]) ** 2 + (rgbA[1] - rgbB[1]) ** 2 + (rgbA[2] - rgbB[2]) ** 2
  );
}

const COLOR_SIMILARITY_THRESHOLD = 40; // treat as same if delta < 40

/** Merge two string arrays, keeping unique lowercase-normalised items. */
function mergeArrays(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing.map((s) => s.toLowerCase().trim()));
  const result = [...existing];
  for (const item of incoming) {
    const key = item.toLowerCase().trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

/** True if `text` is meaningfully longer / richer than `existing`. */
function isRicher(existing: string, incoming: string): boolean {
  if (!incoming.trim()) return false;
  if (!existing.trim()) return true;
  // Replace if incoming is at least 30% longer
  return incoming.trim().length > existing.trim().length * 1.3;
}

/** Confidence ranking. */
const CONF_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

function confScore(v: unknown): number {
  if (typeof v !== "string") return 0;
  return CONF_RANK[v.toLowerCase()] ?? 0;
}

// ========== COMPLETENESS SCORE ==========

const ALL_FIELDS: string[] = [
  // brand_identity (7)
  "brand_identity.brand_name",
  "brand_identity.website",
  "brand_identity.industry",
  "brand_identity.geography_focus",
  "brand_identity.tagline",
  "brand_identity.positioning",
  "brand_identity.tone_of_voice",
  // business_model (3)
  "business_model.business_model_description",
  "business_model.monetization_model",
  "business_model.pricing_tiers",
  // product_ecosystem (8)
  "product_ecosystem.core_products",
  "product_ecosystem.product_modules",
  "product_ecosystem.feature_modules",
  "product_ecosystem.feature_clusters",
  "product_ecosystem.platforms",
  "product_ecosystem.primary_platforms",
  "product_ecosystem.has_mobile_app",
  "product_ecosystem.has_web_platform",
  // audience_intelligence (5)
  "audience_intelligence.primary_segments",
  "audience_intelligence.secondary_segments",
  "audience_intelligence.experience_levels",
  "audience_intelligence.risk_profiles",
  "audience_intelligence.personas_detected",
  // value_framework (2)
  "value_framework.value_propositions",
  "value_framework.differentiators",
  // engagement_architecture (4)
  "engagement_architecture.engagement_drivers",
  "engagement_architecture.seasonal_triggers",
  "engagement_architecture.event_based_triggers",
  "engagement_architecture.urgency_patterns",
  // lifecycle_signal_map (7)
  "lifecycle_signal_map.key_user_actions",
  "lifecycle_signal_map.key_user_events",
  "lifecycle_signal_map.activation_events",
  "lifecycle_signal_map.monetization_events",
  "lifecycle_signal_map.churn_signals",
  "lifecycle_signal_map.inactivity_markers",
  "lifecycle_signal_map.lifecycle_markers",
  // risk_compliance_layer (5)
  "risk_compliance_layer.regulatory_environment",
  "risk_compliance_layer.regulatory_flags",
  "risk_compliance_layer.compliance_intensity",
  "risk_compliance_layer.risk_signals",
  "risk_compliance_layer.high_risk_behaviors",
  // industry_signal_layer (3)
  "industry_signal_layer.industry_kpis",
  "industry_signal_layer.industry_vocabulary",
  "industry_signal_layer.industry_signal_vocabulary",
  // kpi_framework (3)
  "kpi_framework.primary_kpis",
  "kpi_framework.secondary_kpis",
  "kpi_framework.risk_kpis",
  // tech_scale_layer (8)
  "tech_scale_layer.has_cdp",
  "tech_scale_layer.has_crm",
  "tech_scale_layer.supports_real_time_triggers",
  "tech_scale_layer.has_mobile_app",
  "tech_scale_layer.supports_primary_channels",
  "tech_scale_layer.supported_channels",
  "tech_scale_layer.volume_indicators_found",
  "tech_scale_layer.monthly_active_users_band",
  // brand_colors (7)
  "brand_colors.primary",
  "brand_colors.secondary",
  "brand_colors.accent",
  "brand_colors.background",
  "brand_colors.text_primary",
  "brand_colors.text_secondary",
  "brand_colors.additional_colors",
  // brand_design_profile (9)
  "brand_design_profile.colors",
  "brand_design_profile.fonts",
  "brand_design_profile.gradients",
  "brand_design_profile.icon_style",
  "brand_design_profile.visual_style",
  "brand_design_profile.design_density",
  "brand_design_profile.cta_style",
  "brand_design_profile.chart_palette",
  "brand_design_profile.logo",
];

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

function isPopulated(val: any): boolean {
  if (val === undefined || val === null) return false;
  if (typeof val === "string") return val.trim().length > 0;
  if (typeof val === "boolean") return true; // booleans are always "populated"
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "object") return Object.values(val).some((v) => isPopulated(v));
  return true;
}

export function computeCompletenessScore(profile: CoreBrandJSON): number {
  let populated = 0;
  for (const field of ALL_FIELDS) {
    if (isPopulated(getNestedValue(profile, field))) populated++;
  }
  return Math.round((populated / ALL_FIELDS.length) * 100);
}

// ========== MERGE ENGINE ==========

export function mergeProfiles(
  existing: CoreBrandJSON,
  incoming: CoreBrandJSON
): CoreBrandJSON {
  const result = JSON.parse(JSON.stringify(existing)) as CoreBrandJSON;

  const existingConf = existing.extraction_metadata?.confidence_by_section || {};
  const incomingConf = incoming.extraction_metadata?.confidence_by_section || {};

  // Helper: should we update section based on confidence?
  const shouldUpdate = (section: string): boolean => {
    return confScore(incomingConf[section]) >= confScore(existingConf[section]);
  };

  // --- brand_identity (text fields — replace with richer) ---
  if (shouldUpdate("brand_identity")) {
    const bi = result.brand_identity;
    const ni = incoming.brand_identity;
    for (const key of ["brand_name", "website", "industry", "geography_focus", "tagline", "positioning", "tone_of_voice"] as const) {
      if (isRicher(bi[key] || "", ni[key] || "")) {
        (bi as any)[key] = ni[key];
      }
    }
  }

  // --- business_model ---
  if (shouldUpdate("business_model")) {
    const bm = result.business_model;
    const nm = incoming.business_model;
    if (isRicher(bm.business_model_description, nm.business_model_description))
      bm.business_model_description = nm.business_model_description;
    if (isRicher(bm.monetization_model, nm.monetization_model))
      bm.monetization_model = nm.monetization_model;
    bm.pricing_tiers = mergeArrays(bm.pricing_tiers, nm.pricing_tiers);
  }

  // --- product_ecosystem (arrays + booleans) ---
  if (shouldUpdate("product_ecosystem")) {
    const pe = result.product_ecosystem;
    const np = incoming.product_ecosystem;
    for (const key of ["core_products", "product_modules", "feature_modules", "feature_clusters", "platforms", "primary_platforms"] as const) {
      (pe as any)[key] = mergeArrays(pe[key] || [], np[key] || []);
    }
    if (np.has_mobile_app) pe.has_mobile_app = true;
    if (np.has_web_platform) pe.has_web_platform = true;
  }

  // --- audience_intelligence ---
  if (shouldUpdate("audience_intelligence")) {
    const ai = result.audience_intelligence;
    const na = incoming.audience_intelligence;
    for (const key of ["primary_segments", "secondary_segments", "experience_levels", "risk_profiles", "personas_detected"] as const) {
      (ai as any)[key] = mergeArrays(ai[key] || [], na[key] || []);
    }
  }

  // --- value_framework ---
  if (shouldUpdate("value_framework")) {
    const vf = result.value_framework;
    const nv = incoming.value_framework;
    vf.value_propositions = mergeArrays(vf.value_propositions, nv.value_propositions);
    vf.differentiators = mergeArrays(vf.differentiators, nv.differentiators);
  }

  // --- engagement_architecture ---
  if (shouldUpdate("engagement_architecture")) {
    const ea = result.engagement_architecture;
    const ne = incoming.engagement_architecture;
    for (const key of ["engagement_drivers", "seasonal_triggers", "event_based_triggers", "urgency_patterns"] as const) {
      (ea as any)[key] = mergeArrays(ea[key] || [], ne[key] || []);
    }
  }

  // --- lifecycle_signal_map ---
  if (shouldUpdate("lifecycle_signal_map")) {
    const ls = result.lifecycle_signal_map;
    const nl = incoming.lifecycle_signal_map;
    for (const key of ["key_user_actions", "key_user_events", "activation_events", "monetization_events", "churn_signals", "inactivity_markers", "lifecycle_markers"] as const) {
      (ls as any)[key] = mergeArrays(ls[key] || [], nl[key] || []);
    }
  }

  // --- risk_compliance_layer ---
  if (shouldUpdate("risk_compliance_layer")) {
    const rc = result.risk_compliance_layer;
    const nr = incoming.risk_compliance_layer;
    for (const key of ["regulatory_environment", "regulatory_flags", "risk_signals", "high_risk_behaviors"] as const) {
      (rc as any)[key] = mergeArrays(rc[key] || [], nr[key] || []);
    }
    if (isRicher(rc.compliance_intensity, nr.compliance_intensity))
      rc.compliance_intensity = nr.compliance_intensity;
  }

  // --- industry_signal_layer ---
  if (shouldUpdate("industry_signal_layer")) {
    const is_ = result.industry_signal_layer;
    const ni = incoming.industry_signal_layer;
    for (const key of ["industry_kpis", "industry_vocabulary", "industry_signal_vocabulary"] as const) {
      (is_ as any)[key] = mergeArrays(is_[key] || [], ni[key] || []);
    }
  }

  // --- kpi_framework ---
  if (shouldUpdate("kpi_framework")) {
    const kf = result.kpi_framework;
    const nk = incoming.kpi_framework;
    for (const key of ["primary_kpis", "secondary_kpis", "risk_kpis"] as const) {
      (kf as any)[key] = mergeArrays(kf[key] || [], nk[key] || []);
    }
  }

  // --- tech_scale_layer ---
  if (shouldUpdate("tech_scale_layer")) {
    const ts = result.tech_scale_layer;
    const nt = incoming.tech_scale_layer;
    for (const key of ["supported_channels", "volume_indicators_found"] as const) {
      (ts as any)[key] = mergeArrays(ts[key] || [], nt[key] || []);
    }
    if (nt.has_cdp) ts.has_cdp = true;
    if (nt.has_crm) ts.has_crm = true;
    if (nt.supports_real_time_triggers) ts.supports_real_time_triggers = true;
    if (nt.has_mobile_app) ts.has_mobile_app = true;
    if (nt.supports_primary_channels) ts.supports_primary_channels = true;
    if (isRicher(ts.monthly_active_users_band, nt.monthly_active_users_band))
      ts.monthly_active_users_band = nt.monthly_active_users_band;
  }

  // --- brand_colors (Rule 5: normalize design tokens) ---
  if (incoming.brand_colors && result.brand_colors) {
    const ec = result.brand_colors;
    const nc = incoming.brand_colors;
    for (const key of ["primary", "secondary", "accent", "background", "text_primary", "text_secondary"] as const) {
      if (!ec[key] && nc[key]) {
        (ec as any)[key] = nc[key]; // fill missing
      } else if (ec[key] && nc[key] && colorDelta(ec[key], nc[key]) >= COLOR_SIMILARITY_THRESHOLD) {
        // Keep existing — they differ significantly; existing takes priority
      }
    }
    if (nc.additional_colors) {
      ec.additional_colors = mergeArrays(ec.additional_colors || [], nc.additional_colors);
    }
  } else if (!result.brand_colors && incoming.brand_colors) {
    result.brand_colors = incoming.brand_colors;
  }

  // --- brand_design_profile (Rule 5 + Rule 1) ---
  if (incoming.brand_design_profile) {
    if (!result.brand_design_profile) {
      result.brand_design_profile = incoming.brand_design_profile;
    } else {
      const ed = result.brand_design_profile;
      const nd = incoming.brand_design_profile;
      // Fill missing sub-objects
      if (!ed.logo && nd.logo) ed.logo = nd.logo;
      if (!ed.fonts && nd.fonts) ed.fonts = nd.fonts;
      if (!ed.gradients && nd.gradients) ed.gradients = nd.gradients;
      if (!ed.cta_style && nd.cta_style) ed.cta_style = nd.cta_style;
      if (!ed.chart_palette && nd.chart_palette) ed.chart_palette = nd.chart_palette;
      if (!ed.colors && nd.colors) ed.colors = nd.colors;
      // Fill missing scalars
      if (!ed.icon_style && nd.icon_style) ed.icon_style = nd.icon_style;
      if (!ed.visual_style && nd.visual_style) ed.visual_style = nd.visual_style;
      if (!ed.design_density && nd.design_density) ed.design_density = nd.design_density;
    }
  }

  // --- extraction_metadata (Rule 6: always append evidence) ---
  if (incoming.extraction_metadata) {
    if (!result.extraction_metadata) {
      result.extraction_metadata = incoming.extraction_metadata;
    } else {
      // Merge evidence snippets
      const existingSnippets = result.extraction_metadata.evidence_snippets || [];
      const incomingSnippets = incoming.extraction_metadata.evidence_snippets || [];
      result.extraction_metadata.evidence_snippets = [...existingSnippets, ...incomingSnippets];

      // Merge pages crawled
      result.extraction_metadata.pages_crawled = mergeArrays(
        result.extraction_metadata.pages_crawled || [],
        incoming.extraction_metadata.pages_crawled || []
      );

      // Merge confidence — keep higher per section
      const merged = { ...result.extraction_metadata.confidence_by_section };
      for (const [sec, val] of Object.entries(incoming.extraction_metadata.confidence_by_section || {})) {
        if (confScore(val) > confScore(merged[sec])) {
          merged[sec] = val;
        }
      }
      result.extraction_metadata.confidence_by_section = merged;

      // Reduce missing_sections
      const stillMissing = (result.extraction_metadata.missing_sections || []).filter(
        (s) => !(incoming.extraction_metadata?.missing_sections || []).includes(s) === false
      );
      result.extraction_metadata.missing_sections = stillMissing;

      // Merge warnings
      result.extraction_metadata.warnings = mergeArrays(
        result.extraction_metadata.warnings || [],
        incoming.extraction_metadata.warnings || []
      );
    }
  }

  return result;
}
