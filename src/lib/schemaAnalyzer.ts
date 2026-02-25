// ============= EVENT SCHEMA & USER PROPERTY SCHEMA PARSERS =============

// ===== EVENT SCHEMA =====

export interface EventSchemaRow {
  eventName: string;
  eventType?: string;
  description?: string;
  properties?: string;
  status?: string;
  // All raw fields preserved
  rawFields: Record<string, string>;
}

export interface EventSchemaValidation {
  isValid: boolean;
  errors: string[];
  data: EventSchemaRow[];
  totalEvents: number;
}

// ===== USER PROPERTY SCHEMA =====

export interface UserPropertyRow {
  propertyName: string;
  propertyType?: string;
  status?: string;
  description?: string;
  rawFields: Record<string, string>;
}

export interface UserPropertyValidation {
  isValid: boolean;
  errors: string[];
  data: UserPropertyRow[];
  totalProperties: number;
}

// ===== LIFECYCLE MAPPING =====

export type LifecycleStage = 
  | "Awareness" | "Acquisition" | "Activation" | "Engagement" 
  | "Monetization" | "Retention" | "Referral" | "Unmapped";

const LIFECYCLE_KEYWORDS: Record<LifecycleStage, string[]> = {
  Awareness: ["impression", "view_ad", "notification_impression", "campaign", "utm", "landing", "page_view", "click_ad"],
  Acquisition: ["install", "app_launch", "visit", "session_start", "first_open", "signup_start"],
  Activation: ["signup", "register", "login", "complete_profile", "first_action", "onboarding", "verify", "account_created"],
  Engagement: ["open", "view", "click", "search", "browse", "create", "upload", "apply", "watch", "listen", "use_feature", "interaction"],
  Monetization: ["subscribe", "purchase", "payment", "checkout", "plan_upgrade", "transaction", "billing", "deposit", "booking", "order"],
  Retention: ["renew", "reactivate", "return", "reopen", "streak", "loyalty", "repeat_action"],
  Referral: ["invite", "refer", "referral", "share_invite", "friend_join"],
  Unmapped: [],
};

export function classifyEventToStage(eventName: string): LifecycleStage {
  const normalized = eventName.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  
  for (const [stage, keywords] of Object.entries(LIFECYCLE_KEYWORDS)) {
    if (stage === "Unmapped") continue;
    for (const kw of keywords) {
      if (normalized.includes(kw)) {
        return stage as LifecycleStage;
      }
    }
  }
  return "Unmapped";
}

export interface EventLifecycleMapping {
  eventName: string;
  stage: LifecycleStage;
}

export interface EventSchemaHealth {
  totalEvents: number;
  mappedEvents: number;
  unmappedEvents: number;
  stageDistribution: Record<LifecycleStage, number>;
  signals: EventHealthSignal[];
}

export interface EventHealthSignal {
  signal: string;
  severity: "High" | "Medium" | "Low";
  detail: string;
}

// ===== USER PROPERTY READINESS =====

export interface UserPropertyReadiness {
  totalProperties: number;
  activeProperties: number;
  undefinedTypeProperties: number;
  assessments: PropertyAssessment[];
}

export interface PropertyAssessment {
  assessment: string;
  value: string;
  revenueImpact: string;
}

// ===== PARSERS =====

const parseCSVLineGeneric = (line: string, delimiter: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

export function parseEventSchemaCSV(csvText: string): EventSchemaValidation {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) {
    return { isValid: false, errors: ["CSV must have at least a header row and one data row"], data: [], totalEvents: 0 };
  }

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = parseCSVLineGeneric(lines[0], delimiter).map(h => h.toLowerCase().replace(/"/g, "").trim());

  // Find event name column - try common names
  const nameColCandidates = ["event name", "event_name", "name", "event", "eventname"];
  const nameColIdx = headers.findIndex(h => nameColCandidates.includes(h));
  
  if (nameColIdx === -1) {
    return { isValid: false, errors: [`Could not find event name column. Found columns: ${headers.join(", ")}`], data: [], totalEvents: 0 };
  }

  const data: EventSchemaRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLineGeneric(line, delimiter);
    const eventName = values[nameColIdx]?.replace(/"/g, "").trim();
    if (!eventName) continue;

    const rawFields: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rawFields[h] = values[idx]?.replace(/"/g, "").trim() || "";
    });

    data.push({
      eventName,
      eventType: rawFields["event type"] || rawFields["event_type"] || rawFields["type"] || undefined,
      description: rawFields["description"] || rawFields["desc"] || undefined,
      properties: rawFields["properties"] || rawFields["event properties"] || undefined,
      status: rawFields["status"] || undefined,
      rawFields,
    });
  }

  return { isValid: true, errors: [], data, totalEvents: data.length };
}

export function parseUserPropertyCSV(csvText: string): UserPropertyValidation {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) {
    return { isValid: false, errors: ["CSV must have at least a header row and one data row"], data: [], totalProperties: 0 };
  }

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = parseCSVLineGeneric(lines[0], delimiter).map(h => h.toLowerCase().replace(/"/g, "").trim());

  const nameColCandidates = ["property name", "property_name", "name", "property", "user property", "user_property"];
  const nameColIdx = headers.findIndex(h => nameColCandidates.includes(h));
  
  if (nameColIdx === -1) {
    return { isValid: false, errors: [`Could not find property name column. Found columns: ${headers.join(", ")}`], data: [], totalProperties: 0 };
  }

  const data: UserPropertyRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLineGeneric(line, delimiter);
    const propertyName = values[nameColIdx]?.replace(/"/g, "").trim();
    if (!propertyName) continue;

    const rawFields: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rawFields[h] = values[idx]?.replace(/"/g, "").trim() || "";
    });

    data.push({
      propertyName,
      propertyType: rawFields["type"] || rawFields["property type"] || rawFields["property_type"] || rawFields["data type"] || undefined,
      status: rawFields["status"] || undefined,
      description: rawFields["description"] || rawFields["desc"] || undefined,
      rawFields,
    });
  }

  return { isValid: true, errors: [], data, totalProperties: data.length };
}

// ===== ANALYSIS FUNCTIONS =====

export function analyzeEventSchemaHealth(events: EventSchemaRow[]): EventSchemaHealth {
  const stageDistribution: Record<LifecycleStage, number> = {
    Awareness: 0, Acquisition: 0, Activation: 0, Engagement: 0,
    Monetization: 0, Retention: 0, Referral: 0, Unmapped: 0,
  };

  const mappings: EventLifecycleMapping[] = events.map(e => {
    const stage = classifyEventToStage(e.eventName);
    stageDistribution[stage]++;
    return { eventName: e.eventName, stage };
  });

  const mappedEvents = events.length - stageDistribution.Unmapped;
  const signals: EventHealthSignal[] = [];

  // Check for missing critical stages
  if (stageDistribution.Monetization === 0) {
    signals.push({ signal: "Revenue Instrumentation Gap", severity: "High", detail: "No monetization/revenue events detected (purchase, payment, checkout, subscription)" });
  }
  if (stageDistribution.Retention === 0) {
    signals.push({ signal: "Lifecycle Weakness", severity: "High", detail: "No retention events detected (renew, reactivate, return, loyalty)" });
  }
  if (stageDistribution.Referral === 0) {
    signals.push({ signal: "Growth Loop Missing", severity: "Medium", detail: "No referral/viral events detected (invite, refer, share)" });
  }
  
  // Check for imbalance
  const totalMapped = mappedEvents;
  if (totalMapped > 0 && stageDistribution.Engagement / totalMapped > 0.7) {
    signals.push({ signal: "Lifecycle Imbalance", severity: "Medium", detail: `${Math.round(stageDistribution.Engagement / totalMapped * 100)}% of events concentrated in Engagement stage` });
  }

  if (stageDistribution.Acquisition === 0 && stageDistribution.Activation === 0) {
    signals.push({ signal: "Onboarding Blind Spot", severity: "Medium", detail: "No acquisition or activation events detected — unable to track funnel top" });
  }

  return { totalEvents: events.length, mappedEvents, unmappedEvents: stageDistribution.Unmapped, stageDistribution, signals };
}

export function analyzeUserPropertyReadiness(properties: UserPropertyRow[]): UserPropertyReadiness {
  const totalProperties = properties.length;
  const activeProperties = properties.filter(p => !p.status || p.status.toLowerCase() === "active").length;
  const undefinedTypeProperties = properties.filter(p => !p.propertyType || p.propertyType.toLowerCase() === "undefined").length;

  const assessments: PropertyAssessment[] = [];

  // Check for plan/tier property
  const hasPlanTier = properties.some(p => {
    const n = p.propertyName.toLowerCase();
    return n.includes("plan") || n.includes("tier") || n.includes("subscription") || n.includes("membership");
  });
  if (!hasPlanTier) {
    assessments.push({ assessment: "No plan/tier property", value: "Missing", revenueImpact: "Upsell Limitation — cannot segment by subscription level" });
  }

  // Check for trial property
  const hasTrialProp = properties.some(p => {
    const n = p.propertyName.toLowerCase();
    return n.includes("trial") || n.includes("free_trial") || n.includes("trial_status") || n.includes("trial_end");
  });
  if (!hasTrialProp) {
    assessments.push({ assessment: "No trial status/date property", value: "Missing", revenueImpact: "Trial Automation Blocked — cannot trigger trial-to-paid journeys" });
  }

  // Check undefined types
  if (undefinedTypeProperties > totalProperties * 0.3) {
    assessments.push({ assessment: "High undefined type ratio", value: `${undefinedTypeProperties}/${totalProperties} undefined`, revenueImpact: "Segmentation Risk — unreliable property types limit targeting accuracy" });
  }

  // Check for revenue/LTV properties
  const hasRevenueProp = properties.some(p => {
    const n = p.propertyName.toLowerCase();
    return n.includes("revenue") || n.includes("ltv") || n.includes("lifetime_value") || n.includes("arpu") || n.includes("total_spend");
  });
  if (!hasRevenueProp) {
    assessments.push({ assessment: "No revenue/LTV property", value: "Missing", revenueImpact: "Revenue Segmentation Gap — cannot identify high-value users" });
  }

  // Check for engagement score
  const hasEngagementScore = properties.some(p => {
    const n = p.propertyName.toLowerCase();
    return n.includes("engagement_score") || n.includes("activity_score") || n.includes("rfm") || n.includes("health_score");
  });
  if (!hasEngagementScore) {
    assessments.push({ assessment: "No engagement/health score", value: "Missing", revenueImpact: "Churn Prediction Limitation — no composite engagement metric" });
  }

  // Summary
  assessments.push({ 
    assessment: "Overall Property Readiness", 
    value: `${activeProperties}/${totalProperties} active`, 
    revenueImpact: activeProperties / totalProperties > 0.8 ? "Healthy — good property coverage" : "Needs Attention — many inactive or undefined properties" 
  });

  return { totalProperties, activeProperties, undefinedTypeProperties, assessments };
}
