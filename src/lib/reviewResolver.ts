/**
 * Review Resolver Engine
 * 
 * Applies ONLY to campaigns in "Unclassified / Under Review" bucket.
 * Never re-buckets already-classified campaigns.
 * Uses multi-field tokenized matching against internal resource use cases.
 */

import { CampaignRow } from "@/lib/csvAnalyzer";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────

export interface InternalUseCase {
  id: string;
  name: string;
  type: "journey" | "campaign";
  stage: string;
  framework: string;
  description: string;
  triggerType?: string;
  keywords: string[];
  events?: string[];
  segments?: string[];
  businessGoal?: string;
  channels?: string[];
}

export interface ResolvedCandidate {
  useCaseId: string;
  useCaseName: string;
  confidence: number;
  reasonCodes: string[];
  evidenceUsed: Record<string, string>;
}

export type ReviewReasonForReview = 
  | "insufficient_evidence" 
  | "ambiguous" 
  | "out_of_taxonomy";

export interface ReviewResolution {
  campaignFingerprint: string;
  campaignName: string;
  campaign: CampaignRow;
  status: "resolved" | "under_review";
  // Resolved fields
  matchedUseCaseId?: string;
  matchedUseCaseName?: string;
  matchedStage?: string;
  confidence?: number;
  marginOverSecond?: number;
  evidenceUsed?: Record<string, string>;
  reasonCodes?: string[];
  // Under review fields
  reasonForReview?: ReviewReasonForReview;
  topCandidates?: ResolvedCandidate[];
}

// ── Confidence thresholds ──────────────────────────────────────────────────

const AUTO_RESOLVE_CONFIDENCE = 0.85;
const MARGIN_THRESHOLD = 0.08;

// ── Helpers ────────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 2);
}

function campaignFingerprint(c: CampaignRow): string {
  return `${(c.campaignName || "").toLowerCase().trim()}::${(c.title || c.subjectLine || "").toLowerCase().trim().slice(0, 60)}`;
}

function extractCampaignFields(campaign: CampaignRow): Record<string, string> {
  return {
    campaign_name: (campaign.campaignName || "").toLowerCase(),
    title: (campaign.title || campaign.subjectLine || "").toLowerCase(),
    delivery_type: (campaign as any).deliveryType || (campaign as any).delivery_type || "",
    who_query: (campaign as any).whoQuery || (campaign as any).who_query || "",
    conversion_event: (campaign as any).conversionEvent || (campaign as any).conversion_event || "",
    labels: (campaign as any).labels || "",
  };
}

// ── Scoring Engine ─────────────────────────────────────────────────────────

function scoreCandidate(
  fields: Record<string, string>,
  useCase: InternalUseCase
): ResolvedCandidate {
  let score = 0;
  const reasonCodes: string[] = [];
  const evidenceUsed: Record<string, string> = {};

  const allFieldText = Object.values(fields).join(" ").toLowerCase();
  const allFieldTokens = tokenize(allFieldText);

  // 1. Use case name token overlap
  const ucNameTokens = tokenize(useCase.name);
  const nameOverlap = ucNameTokens.filter(t => allFieldTokens.includes(t));
  if (nameOverlap.length >= 2) {
    score += 0.3;
    reasonCodes.push("name_token_overlap");
    evidenceUsed["name_overlap"] = nameOverlap.join(", ");
  } else if (nameOverlap.length === 1 && ucNameTokens.length <= 2) {
    score += 0.15;
    reasonCodes.push("name_partial_overlap");
    evidenceUsed["name_overlap"] = nameOverlap.join(", ");
  }

  // 2. Keyword direct match
  for (const keyword of useCase.keywords) {
    if (keyword.length > 3 && allFieldText.includes(keyword)) {
      score += 0.25;
      reasonCodes.push("keyword_direct_match");
      evidenceUsed["keyword_match"] = keyword;
      break; // one keyword match is enough for this signal
    }
  }

  // 3. Event match in conversion_event or who_query
  if (useCase.events && useCase.events.length > 0) {
    for (const event of useCase.events) {
      const eventLower = event.toLowerCase();
      if (fields.conversion_event.includes(eventLower) || fields.who_query.includes(eventLower)) {
        score += 0.3;
        reasonCodes.push("event_field_match");
        evidenceUsed["event_match"] = `${event} found in ${fields.conversion_event.includes(eventLower) ? "conversion_event" : "who_query"}`;
        break;
      }
    }
  }

  // 4. Segment match in who_query
  if (useCase.segments && useCase.segments.length > 0) {
    for (const segment of useCase.segments) {
      const segLower = segment.toLowerCase();
      if (fields.who_query.includes(segLower) || fields.labels.includes(segLower)) {
        score += 0.2;
        reasonCodes.push("segment_field_match");
        evidenceUsed["segment_match"] = `${segment} found in who_query/labels`;
        break;
      }
    }
  }

  // 5. Description token overlap (weaker signal)
  if (useCase.description) {
    const descTokens = tokenize(useCase.description);
    const descOverlap = descTokens.filter(t => allFieldTokens.includes(t));
    const overlapRatio = descTokens.length > 0 ? descOverlap.length / descTokens.length : 0;
    if (overlapRatio > 0.3) {
      score += 0.1;
      reasonCodes.push("description_token_overlap");
      evidenceUsed["desc_overlap_ratio"] = overlapRatio.toFixed(2);
    }
  }

  // 6. Business goal match
  if (useCase.businessGoal) {
    const goalTokens = tokenize(useCase.businessGoal);
    const goalOverlap = goalTokens.filter(t => allFieldTokens.includes(t));
    if (goalOverlap.length >= 2) {
      score += 0.1;
      reasonCodes.push("business_goal_overlap");
      evidenceUsed["goal_overlap"] = goalOverlap.join(", ");
    }
  }

  // Cap at 1.0
  const confidence = Math.min(score, 1.0);

  return {
    useCaseId: useCase.id,
    useCaseName: useCase.name,
    confidence: Math.round(confidence * 1000) / 1000,
    reasonCodes,
    evidenceUsed,
  };
}

// ── Main Resolver ──────────────────────────────────────────────────────────

export function resolveUnderReviewCampaigns(
  unclassifiedCampaigns: CampaignRow[],
  internalUseCases: InternalUseCase[],
  industry: string
): ReviewResolution[] {
  if (internalUseCases.length === 0 || unclassifiedCampaigns.length === 0) {
    return unclassifiedCampaigns.map(c => ({
      campaignFingerprint: campaignFingerprint(c),
      campaignName: c.campaignName || c.title || "Unnamed",
      campaign: c,
      status: "under_review" as const,
      reasonForReview: internalUseCases.length === 0 ? "out_of_taxonomy" as const : "insufficient_evidence" as const,
      topCandidates: [],
    }));
  }

  const results: ReviewResolution[] = [];

  for (const campaign of unclassifiedCampaigns) {
    const fields = extractCampaignFields(campaign);
    const fp = campaignFingerprint(campaign);
    const campName = campaign.campaignName || campaign.title || "Unnamed";

    // Score against all internal use cases
    const candidates = internalUseCases
      .map(uc => scoreCandidate(fields, uc))
      .filter(c => c.confidence > 0)
      .sort((a, b) => b.confidence - a.confidence);

    if (candidates.length === 0) {
      results.push({
        campaignFingerprint: fp,
        campaignName: campName,
        campaign,
        status: "under_review",
        reasonForReview: "insufficient_evidence",
        topCandidates: [],
      });
      continue;
    }

    const top = candidates[0];
    const second = candidates.length > 1 ? candidates[1] : null;
    const margin = second ? top.confidence - second.confidence : 1.0;

    // Auto-resolve only if thresholds met
    if (top.confidence >= AUTO_RESOLVE_CONFIDENCE && margin >= MARGIN_THRESHOLD) {
      const matchedUC = internalUseCases.find(uc => uc.id === top.useCaseId);
      results.push({
        campaignFingerprint: fp,
        campaignName: campName,
        campaign,
        status: "resolved",
        matchedUseCaseId: top.useCaseId,
        matchedUseCaseName: top.useCaseName,
        matchedStage: matchedUC?.stage,
        confidence: top.confidence,
        marginOverSecond: Math.round(margin * 1000) / 1000,
        evidenceUsed: top.evidenceUsed,
        reasonCodes: top.reasonCodes,
      });
    } else {
      // Determine reason
      let reason: ReviewReasonForReview = "insufficient_evidence";
      if (candidates.length >= 2 && margin < MARGIN_THRESHOLD) {
        reason = "ambiguous";
      } else if (top.confidence < 0.3) {
        reason = "out_of_taxonomy";
      }

      results.push({
        campaignFingerprint: fp,
        campaignName: campName,
        campaign,
        status: "under_review",
        reasonForReview: reason,
        topCandidates: candidates.slice(0, 3),
      });
    }
  }

  return results;
}

// ── Persistence ────────────────────────────────────────────────────────────

export async function persistResolutions(
  resolutions: ReviewResolution[],
  industry: string
): Promise<void> {
  if (resolutions.length === 0) return;

  const rows = resolutions.map(r => ({
    campaign_fingerprint: r.campaignFingerprint,
    campaign_name: r.campaignName,
    suggested_use_case_id: r.matchedUseCaseId || null,
    suggested_use_case_name: r.matchedUseCaseName || null,
    confidence: r.confidence || 0,
    margin_over_second: r.marginOverSecond || null,
    evidence_snapshot: r.evidenceUsed || (r.topCandidates ? { top_candidates: r.topCandidates } : {}),
    reason_codes: r.reasonCodes || [],
    resolution_status: r.status,
    reason_for_review: r.reasonForReview || null,
    top_candidates: r.topCandidates ? r.topCandidates : null,
    industry,
  }));

  // Insert in batches of 50
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    await supabase.from("review_resolution_attempts" as any).insert(batch as any);
  }
}
