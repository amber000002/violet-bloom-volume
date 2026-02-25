// ============= STRATEGIC INSIGHTS EXTENDED ANALYSIS ENGINE =============
// Generates data for Send Mix Maturity + Event Schema Health sections

import { CampaignRow } from "./csvAnalyzer";
import { 
  EventSchemaRow, UserPropertyRow, 
  analyzeEventSchemaHealth,
  EventSchemaHealth,
} from "./schemaAnalyzer";

// ===== TYPES =====

export interface SendMixEntry {
  deliveryType: string;
  count: number;
  percentShare: number;
  maturityInterpretation: string;
}

export interface CoverageDataForRevenue {
  useCaseName: string;
  stage: string;
  status: "active" | "missing" | "review-needed";
  campaignCount: number;
}

export interface ExtendedInsightsData {
  sendMix: SendMixEntry[];
  eventSchemaHealth: EventSchemaHealth | null;
}

// ===== Send Mix Maturity =====

function generateSendMix(campaigns: CampaignRow[]): SendMixEntry[] {
  const significant = campaigns.filter(c => c.totalSentUsers >= 1000);
  const deliveryMap = new Map<string, number>();
  
  significant.forEach(c => {
    const dt = (c as any).deliveryType || "Unknown";
    deliveryMap.set(dt, (deliveryMap.get(dt) || 0) + 1);
  });

  const total = significant.length;
  const entries: SendMixEntry[] = [...deliveryMap.entries()].map(([type, count]) => {
    const pct = total > 0 ? (count / total) * 100 : 0;
    let interpretation = "";
    
    if (type.toLowerCase().includes("one time") && pct >= 70) interpretation = "Batch Heavy — over-reliance on one-time sends";
    else if ((type.toLowerCase().includes("action") || type.toLowerCase().includes("trigger") || type.toLowerCase().includes("external trigger")) && pct >= 30) interpretation = "Automation Mature — strong trigger-based engagement";
    else if ((type.toLowerCase().includes("action") || type.toLowerCase().includes("trigger") || type.toLowerCase().includes("external trigger")) && pct < 10) interpretation = "Automation Gap — minimal behavioral triggers";
    else if (type.toLowerCase().includes("recurring")) interpretation = pct > 30 ? "Cadence Driven" : "Supplementary recurring";
    else interpretation = pct > 40 ? "Significant share" : "Minor share";

    return { deliveryType: type, count, percentShare: pct, maturityInterpretation: interpretation };
  });

  return entries.sort((a, b) => b.count - a.count);
}

// ===== MAIN GENERATOR =====

export function generateExtendedInsights(
  campaigns: CampaignRow[],
  _coverageData: CoverageDataForRevenue[],
  eventSchemaRows: EventSchemaRow[] | null,
  _userPropertyRows: UserPropertyRow[] | null,
  _brandName: string,
): ExtendedInsightsData {
  const sendMix = generateSendMix(campaigns);
  const eventSchemaHealth = eventSchemaRows ? analyzeEventSchemaHealth(eventSchemaRows) : null;

  return {
    sendMix,
    eventSchemaHealth,
  };
}
