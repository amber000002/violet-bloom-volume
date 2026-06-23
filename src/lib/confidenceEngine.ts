// Confidence Scoring Engine for Use Case Studio
// Weighted scoring: Brand clarity (25%), Lifecycle alignment (25%), 
// Trigger-event match (20%), Regulatory consistency (10%), 
// Industry vocabulary density (10%), Volume scale detection (10%)

import { CoreBrandJSON } from "@/types/brandProfile";

export type ConfidenceLevel = "high" | "medium" | "exploratory";

export interface ConfidenceResult {
  level: ConfidenceLevel;
  score: number; // 0-100
  reasons: string[];
  breakdown: {
    brandClarity: number;
    lifecycleAlignment: number;
    triggerEventMatch: number;
    regulatoryConsistency: number;
    vocabularyDensity: number;
    volumeScale: number;
  };
}

interface ScoringContext {
  brandProfile: CoreBrandJSON | null;
  stage: string;
  hasInternalContent: boolean;
  triggerType?: string;
  channels?: string[];
  selectedChannels?: string[];
}

function scoreBrandClarity(profile: CoreBrandJSON | null): number {
  if (!profile) return 0;
  let score = 0;
  const bi = profile.brand_identity;
  if (bi?.brand_name && bi.brand_name !== "Unknown Brand") score += 15;
  if (bi?.tagline) score += 10;
  if (bi?.positioning) score += 15;
  if (bi?.tone_of_voice) score += 10;
  if (profile.business_model?.monetization_model && profile.business_model.monetization_model !== "Not detected") score += 15;
  if ((profile.product_ecosystem?.core_products?.length ?? 0) > 0) score += 15;
  if ((profile.audience_intelligence?.primary_segments?.length ?? 0) > 0) score += 10;
  if ((profile.value_framework?.value_propositions?.length ?? 0) > 0) score += 10;
  return Math.min(score, 100);
}

function scoreLifecycleAlignment(profile: CoreBrandJSON | null, stage: string, hasInternal: boolean): number {
  if (hasInternal) return 90;
  if (!profile) return 20;
  
  let score = 30;
  const lsm = profile.lifecycle_signal_map;
  if (!lsm) return score;
  
  const stageL = stage.toLowerCase();
  if (stageL.includes("activation") || stageL.includes("onboarding")) {
    if ((lsm.activation_events?.length ?? 0) > 0) score += 30;
    if ((lsm.key_user_actions?.length ?? 0) > 0) score += 20;
  } else if (stageL.includes("retention") || stageL.includes("win")) {
    if ((lsm.churn_signals?.length ?? 0) > 0) score += 30;
    if ((lsm.inactivity_markers?.length ?? 0) > 0) score += 20;
  } else if (stageL.includes("monetization") || stageL.includes("revenue")) {
    if ((lsm.monetization_events?.length ?? 0) > 0) score += 30;
  } else {
    if ((lsm.key_user_events?.length ?? 0) > 0) score += 20;
  }
  
  return Math.min(score, 100);
}

function scoreTriggerEventMatch(profile: CoreBrandJSON | null, triggerType?: string): number {
  if (!profile) return 20;
  let score = 30;
  
  const lsm = profile.lifecycle_signal_map;
  const ea = profile.engagement_architecture;
  
  if (triggerType === "live-event" || triggerType === "event") {
    if ((ea?.event_based_triggers?.length ?? 0) > 0) score += 40;
    if ((lsm?.key_user_events?.length ?? 0) > 0) score += 20;
  } else if (triggerType === "time-based" || triggerType === "schedule") {
    if ((ea?.seasonal_triggers?.length ?? 0) > 0) score += 30;
    score += 20;
  } else if (triggerType === "segment-change" || triggerType === "segment") {
    if ((profile.audience_intelligence?.primary_segments?.length ?? 0) > 0) score += 40;
  } else if (triggerType === "past-behavior") {
    if ((lsm?.key_user_actions?.length ?? 0) > 0) score += 40;
  }
  
  return Math.min(score, 100);
}

function scoreRegulatoryConsistency(profile: CoreBrandJSON | null): number {
  if (!profile) return 50;
  const rcl = profile.risk_compliance_layer;
  if (!rcl) return 50;
  if ((rcl.regulatory_environment?.length ?? 0) > 0) return 80;
  if (rcl.compliance_intensity === "High") return 90;
  if (rcl.compliance_intensity === "Medium") return 70;
  return 40;
}

function scoreVocabularyDensity(profile: CoreBrandJSON | null): number {
  if (!profile) return 0;
  const vocab = profile.industry_signal_layer?.industry_vocabulary ?? [];
  if (vocab.length >= 10) return 100;
  if (vocab.length >= 5) return 70;
  if (vocab.length >= 2) return 40;
  return 10;
}

function scoreVolumeScale(profile: CoreBrandJSON | null): number {
  if (!profile) return 30;
  const band = profile.tech_scale_layer?.monthly_active_users_band ?? "";
  if (band.includes("Hyper-scale")) return 100;
  if (band.includes("Enterprise")) return 90;
  if (band.includes("Large")) return 75;
  if (band.includes("Growth")) return 60;
  if (band.includes("Emerging")) return 40;
  return 20;
}

export function calculateConfidence(ctx: ScoringContext): ConfidenceResult {
  const brandClarity = scoreBrandClarity(ctx.brandProfile);
  const lifecycleAlignment = scoreLifecycleAlignment(ctx.brandProfile, ctx.stage, ctx.hasInternalContent);
  const triggerEventMatch = scoreTriggerEventMatch(ctx.brandProfile, ctx.triggerType);
  const regulatoryConsistency = scoreRegulatoryConsistency(ctx.brandProfile);
  const vocabularyDensity = scoreVocabularyDensity(ctx.brandProfile);
  const volumeScale = scoreVolumeScale(ctx.brandProfile);

  const weightedScore = 
    brandClarity * 0.25 +
    lifecycleAlignment * 0.25 +
    triggerEventMatch * 0.20 +
    regulatoryConsistency * 0.10 +
    vocabularyDensity * 0.10 +
    volumeScale * 0.10;

  const reasons: string[] = [];
  
  if (brandClarity >= 60) reasons.push("Strong brand signals detected from website");
  else if (brandClarity >= 30) reasons.push("Partial brand context available");
  else reasons.push("Limited brand context — add more website text for better personalization");

  if (lifecycleAlignment >= 70) reasons.push("Strong lifecycle alignment with internal resources");
  else if (ctx.hasInternalContent) reasons.push("Internal resource data supports this stage");
  
  if (vocabularyDensity >= 50) reasons.push("Industry-specific vocabulary confirmed");
  if (volumeScale >= 60) reasons.push("Volume scale detected for tailored recommendations");

  let level: ConfidenceLevel;
  if (weightedScore >= 60) level = "high";
  else if (weightedScore >= 35) level = "medium";
  else level = "exploratory";

  return {
    level,
    score: Math.round(weightedScore),
    reasons,
    breakdown: {
      brandClarity,
      lifecycleAlignment,
      triggerEventMatch,
      regulatoryConsistency,
      vocabularyDensity,
      volumeScale,
    },
  };
}

export function getConfidenceColor(level: ConfidenceLevel): string {
  switch (level) {
    case "high": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    case "medium": return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
    case "exploratory": return "text-muted-foreground bg-muted/30 border-border";
  }
}

export function getConfidenceLabel(level: ConfidenceLevel): string {
  switch (level) {
    case "high": return "High Confidence";
    case "medium": return "Medium Confidence";
    case "exploratory": return "Exploratory";
  }
}
