// AI-Augmented Use Case types

export interface ExecutionDetail {
  channel: string;
  trigger: string;
  fields: Record<string, string>;
}

export interface AugmentedUseCase {
  use_case_title: string;
  lifecycle_stage: string;
  confidence_level: "High" | "Medium" | "Low";
  source: "Internal Resource (AI Augmented)" | "AI-Native Expansion" | "Internal" | "AI-Augmented Extension";
  channels: string[];
  why_it_matters: string;
  execution_strategy: string;
  execution_details?: ExecutionDetail[];
  trigger_logic: string;
  segmentation_logic: string;
  metrics_to_impact: string[];
  risk_overlay: string;
  why_this_fits_brand: string;
  personalization_layers: string[];
}

export interface AugmentedUseCaseResponse {
  augmented_use_cases: AugmentedUseCase[];
}
