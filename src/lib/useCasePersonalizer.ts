// Use Case Personalization Engine
// Generates brand-specific objectives, execution strategies, metrics, 
// and "Why This Fits Your Brand" explanations

import { CoreBrandJSON } from "@/types/brandProfile";

export interface PersonalizedUseCase {
  id: string;
  title: string;
  stage: string;
  objective: string;
  whyItMatters: string;
  channelsUsed: string[];
  executionStrategy: ChannelStrategy[];
  personalizationLayers: PersonalizationLayer[];
  campaignLogic: CampaignLogicStructure;
  metricsToImpact: string[];
  businessKPIs: string[];
  whyThisFitsYourBrand: string;
  source: "internal" | "native";
  sourceLabel?: string;
  triggerType?: string;
  originalData: any;
}

export interface ChannelStrategy {
  channel: string;
  direction: string;
}

export interface PersonalizationLayer {
  layer: string;
  value: string;
}

export interface CampaignLogicStructure {
  triggerEvent: string;
  segmentationRule: string;
  channelFlow: string;
  contentTheme: string;
}

const channelLabels: Record<string, string> = {
  email: "Email",
  push: "Push Notification",
  "in-app": "In-App",
  sms: "SMS",
  whatsapp: "WhatsApp",
  "web-push": "Web Push",
};

function getChannelStrategy(channel: string, brand: CoreBrandJSON | null, stage: string): ChannelStrategy {
  const brandName = brand?.brand_identity.brand_name || "your brand";
  const tone = brand?.brand_identity.tone_of_voice || "Professional";
  
  switch (channel) {
    case "email":
      return {
        channel: "Email",
        direction: `Subject line angle: ${stage}-relevant hook for ${brandName}. Preheader: reinforce value. Personalization: product modules, user segment. Frequency: respect fatigue guardrails based on ${tone.toLowerCase()} tone.`,
      };
    case "push":
      return {
        channel: "Push Notification",
        direction: `Short, action-oriented copy. Trigger timing aligned to ${stage} signals. Urgency mechanism: ${brand?.engagement_architecture.urgency_patterns[0] || "time-sensitive context"}.`,
      };
    case "sms":
      return {
        channel: "SMS",
        direction: `Concise transactional/alert copy. Compliance-first with opt-out. Personalization: name + key action variable.`,
      };
    case "whatsapp":
      return {
        channel: "WhatsApp",
        direction: `Conversational flow with quick replies. Rich media support. ${brand?.risk_compliance_layer.compliance_intensity === "High" ? "Include regulatory disclaimers." : "Focus on engagement and CTA clarity."}`,
      };
    case "in-app":
      return {
        channel: "In-App",
        direction: `Contextual notification triggered by in-session behavior. Deep-link to relevant ${stage} action within ${brandName}.`,
      };
    case "web-push":
      return {
        channel: "Web Push",
        direction: `Browser notification for re-engagement. Short headline + CTA. Respect frequency caps.`,
      };
    default:
      return { channel: channelLabels[channel] || channel, direction: "Standard messaging approach." };
  }
}

function generateObjective(title: string, brand: CoreBrandJSON | null, stage: string): string {
  if (!brand) return `Drive ${stage} engagement through ${title.toLowerCase()}.`;
  
  const positioning = brand.brand_identity.positioning || brand.brand_identity.tagline;
  const segment = brand.audience_intelligence.primary_segments[0] || "target users";
  
  return `Leverage ${brand.brand_identity.brand_name}'s ${positioning ? `positioning around "${positioning.slice(0, 60)}..."` : "core value proposition"} to drive ${stage} engagement among ${segment} through personalized ${title.toLowerCase()}.`;
}

function generateWhyItMatters(brand: CoreBrandJSON | null, stage: string): string {
  if (!brand) return `This use case aligns with standard ${stage} best practices for your industry.`;
  
  const model = brand.business_model.business_model_description;
  const scale = brand.tech_scale_layer.monthly_active_users_band;
  const risk = brand.risk_compliance_layer.compliance_intensity;
  
  return `For a ${model} model${scale !== "Not detected" ? ` at ${scale} scale` : ""}, ${stage} engagement directly impacts retention and LTV. ${risk === "High" ? "Regulatory compliance adds importance to precise, compliant messaging." : "Timely, relevant communication builds trust and repeat engagement."}`;
}

function generateWhyFits(brand: CoreBrandJSON | null, stage: string): string {
  if (!brand) return "Limited brand context available. Add website text for personalized fit analysis.";
  
  const parts: string[] = [];
  
  // Business model alignment
  parts.push(`Business model: ${brand.business_model.business_model_description} — ${stage} use cases directly support ${brand.business_model.monetization_model !== "Not detected" ? brand.business_model.monetization_model : "core revenue"} goals.`);
  
  // Audience match
  if (brand.audience_intelligence.primary_segments.length > 0) {
    parts.push(`Audience: Tailored for ${brand.audience_intelligence.primary_segments.slice(0, 2).join(", ")} segments detected from your brand profile.`);
  }
  
  // Risk sensitivity
  if (brand.risk_compliance_layer.compliance_intensity !== "Low") {
    parts.push(`Risk: ${brand.risk_compliance_layer.compliance_intensity} compliance intensity — messaging respects ${brand.risk_compliance_layer.regulatory_environment.join(", ") || "regulatory"} requirements.`);
  }
  
  // Scale suitability
  if (brand.tech_scale_layer.monthly_active_users_band !== "Not detected") {
    parts.push(`Scale: ${brand.tech_scale_layer.monthly_active_users_band} — segmentation depth and volume ramp logic adjusted accordingly.`);
  }
  
  return parts.join(" ");
}

function generatePersonalizationLayers(brand: CoreBrandJSON | null): PersonalizationLayer[] {
  if (!brand) return [{ layer: "Default", value: "Standard personalization — add brand context for deeper layers" }];
  
  const layers: PersonalizationLayer[] = [];
  
  if (brand.audience_intelligence.primary_segments.length > 0) {
    layers.push({ layer: "Audience Segment", value: brand.audience_intelligence.primary_segments.join(", ") });
  }
  if (brand.product_ecosystem.core_products.length > 0) {
    layers.push({ layer: "Product Module", value: brand.product_ecosystem.core_products.slice(0, 3).join(", ") });
  }
  if (brand.engagement_architecture.event_based_triggers.length > 0) {
    layers.push({ layer: "Trigger Event", value: brand.engagement_architecture.event_based_triggers.slice(0, 3).join(", ") });
  }
  if (brand.risk_compliance_layer.regulatory_environment.length > 0) {
    layers.push({ layer: "Risk Overlay", value: brand.risk_compliance_layer.regulatory_environment.join(", ") });
  }
  if (brand.engagement_architecture.seasonal_triggers.length > 0) {
    layers.push({ layer: "Engagement Timing", value: brand.engagement_architecture.seasonal_triggers.slice(0, 3).join(", ") });
  }
  if (brand.risk_compliance_layer.compliance_intensity !== "Low") {
    layers.push({ layer: "Regulatory Nuance", value: `${brand.risk_compliance_layer.compliance_intensity} compliance intensity` });
  }
  
  return layers.length > 0 ? layers : [{ layer: "Basic", value: "Name, segment-based personalization" }];
}

function generateCampaignLogic(brand: CoreBrandJSON | null, stage: string, triggerType?: string, channels?: string[]): CampaignLogicStructure {
  const brandName = brand?.brand_identity.brand_name || "Brand";
  
  return {
    triggerEvent: triggerType 
      ? `${triggerType} trigger — ${brand?.lifecycle_signal_map.key_user_events[0] || `${stage}-related user action`}`
      : `${stage} lifecycle signal detected`,
    segmentationRule: brand?.audience_intelligence.primary_segments.length 
      ? `Target: ${brand.audience_intelligence.primary_segments[0]} with ${stage} signals active`
      : `Users entering ${stage} stage with qualifying behavior`,
    channelFlow: channels && channels.length > 1 
      ? channels.map(c => channelLabels[c] || c).join(" → ")
      : channels?.[0] ? channelLabels[channels[0]] || channels[0] : "Email (primary)",
    contentTheme: `${brandName} ${stage} value reinforcement with ${brand?.brand_identity.tone_of_voice?.toLowerCase() || "professional"} tone`,
  };
}

function getMetricsForStage(brand: CoreBrandJSON | null, stage: string): string[] {
  const stageL = stage.toLowerCase();
  const baseMetrics: string[] = [];
  
  // Stage-specific metrics
  if (stageL.includes("activation") || stageL.includes("onboarding")) {
    baseMetrics.push("Activation rate", "Onboarding completion %", "Time to first action");
  } else if (stageL.includes("retention") || stageL.includes("win")) {
    baseMetrics.push("Retention rate", "Churn reduction %", "Re-engagement rate");
  } else if (stageL.includes("monetization") || stageL.includes("revenue")) {
    baseMetrics.push("Conversion rate", "Average order value", "Revenue per user");
  } else if (stageL.includes("usage") || stageL.includes("engagement")) {
    baseMetrics.push("DAU/MAU ratio", "Session frequency", "Feature adoption rate");
  } else {
    baseMetrics.push("Engagement rate", "Click-through rate", "Conversion rate");
  }
  
  // Brand-specific KPIs
  if (brand?.kpi_framework.primary_kpis.length) {
    baseMetrics.push(...brand.kpi_framework.primary_kpis.slice(0, 2));
  }
  
  return [...new Set(baseMetrics)].slice(0, 5);
}

export function personalizeUseCase(
  useCaseData: { name: string; stage: string; triggerType?: string; description?: string; source: "internal" | "native"; sourceLabel?: string; rawResourceData?: Record<string, any> },
  brand: CoreBrandJSON | null,
  selectedChannels: string[],
): PersonalizedUseCase {
  const applicableChannels = selectedChannels.length > 0 ? selectedChannels : ["email"];
  
  return {
    id: `uc_${useCaseData.name.replace(/\s+/g, "_").toLowerCase()}_${useCaseData.stage}`,
    title: useCaseData.name,
    stage: useCaseData.stage,
    objective: generateObjective(useCaseData.name, brand, useCaseData.stage),
    whyItMatters: generateWhyItMatters(brand, useCaseData.stage),
    channelsUsed: applicableChannels,
    executionStrategy: applicableChannels.map(ch => getChannelStrategy(ch, brand, useCaseData.stage)),
    personalizationLayers: generatePersonalizationLayers(brand),
    campaignLogic: generateCampaignLogic(brand, useCaseData.stage, useCaseData.triggerType, applicableChannels),
    metricsToImpact: getMetricsForStage(brand, useCaseData.stage),
    businessKPIs: brand?.kpi_framework.primary_kpis.slice(0, 3) || [],
    whyThisFitsYourBrand: generateWhyFits(brand, useCaseData.stage),
    source: useCaseData.source,
    sourceLabel: useCaseData.sourceLabel,
    triggerType: useCaseData.triggerType,
    originalData: useCaseData,
  };
}
