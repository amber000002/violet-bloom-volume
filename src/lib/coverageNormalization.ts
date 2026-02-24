// ===== PRD v2: Pre-Match Normalization for Use Case Coverage =====

// Stopwords safe to remove from matching context
const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "shall",
  "should", "may", "might", "must", "can", "could", "to", "of", "in",
  "for", "on", "with", "at", "by", "from", "as", "into", "through",
  "during", "before", "after", "above", "below", "between", "out",
  "off", "over", "under", "again", "further", "then", "once", "and",
  "but", "or", "nor", "not", "no", "so", "than", "too", "very",
  "just", "about", "up", "its", "it", "this", "that", "these", "those",
  "your", "our", "their", "my", "his", "her", "who", "whom", "which",
  "what", "where", "when", "how", "all", "each", "every", "both",
  "few", "more", "most", "other", "some", "such", "only", "own",
  "same", "also",
]);

// Version/test tokens to strip
const VERSION_TOKENS = /\b(v\d+|test|final|draft|copy|backup|old|new|revised|updated)\b/gi;

// Lifecycle variant standardization map
const LIFECYCLE_VARIANTS: Record<string, string> = {
  "onboarding": "onboarding",
  "on-boarding": "onboarding",
  "on boarding": "onboarding",
  "reengage": "re-engagement",
  "re-engage": "re-engagement",
  "reengagement": "re-engagement",
  "re-engagement": "re-engagement",
  "re engagement": "re-engagement",
  "winback": "win-back",
  "win-back": "win-back",
  "win back": "win-back",
  "trial ends": "trial-expiring",
  "trial expiring": "trial-expiring",
  "trial expiry": "trial-expiring",
  "trial expired": "trial-expiring",
  "cart abandon": "cart-abandonment",
  "cart abandonment": "cart-abandonment",
  "cart-abandonment": "cart-abandonment",
  "abandoned cart": "cart-abandonment",
  "browse abandon": "browse-abandonment",
  "browse abandonment": "browse-abandonment",
  "browse-abandonment": "browse-abandonment",
  "signup": "sign-up",
  "sign up": "sign-up",
  "sign-up": "sign-up",
};

/**
 * Split camelCase and snake_case tokens into individual words.
 * e.g. "paymentReminder" → "payment reminder"
 *      "payment_reminder" → "payment reminder"
 */
function splitCompoundTokens(text: string): string {
  return text
    // camelCase → space-separated
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    // snake_case → space-separated
    .replace(/_/g, " ");
}

/**
 * Full normalization pipeline per PRD v2:
 * 1. lowercase
 * 2. Split camelCase/snake_case
 * 3. Remove punctuation (keep spaces & hyphens)
 * 4. Remove version tokens
 * 5. Standardize lifecycle variants
 * 6. Collapse whitespace
 * 7. Strip stopwords
 */
export function normalizeForMatching(text: string): string {
  if (!text) return "";

  let result = text.toLowerCase();
  result = splitCompoundTokens(result);
  // Remove punctuation except hyphens and spaces
  result = result.replace(/[^\w\s-]/g, " ");
  // Remove version tokens
  result = result.replace(VERSION_TOKENS, "");
  // Standardize lifecycle variants
  for (const [variant, canonical] of Object.entries(LIFECYCLE_VARIANTS)) {
    // Use word-boundary-safe replacement
    const regex = new RegExp(`\\b${variant.replace(/-/g, "[\\s-]?")}\\b`, "gi");
    result = result.replace(regex, canonical);
  }
  // Collapse whitespace
  result = result.replace(/\s+/g, " ").trim();

  return result;
}

/**
 * Extract high-signal tokens from normalized text (stopwords removed).
 * Returns unique tokens of length > 2.
 */
export function extractSignalTokens(text: string): string[] {
  const normalized = normalizeForMatching(text);
  const tokens = normalized.split(/[\s-]+/);
  return [...new Set(tokens.filter(t => t.length > 2 && !STOPWORDS.has(t)))];
}

/**
 * Count overlapping high-signal tokens between two texts.
 */
export function countTokenOverlap(textA: string, textB: string): { count: number; overlapping: string[] } {
  const tokensA = extractSignalTokens(textA);
  const tokensB = new Set(extractSignalTokens(textB));
  const overlapping = tokensA.filter(t => tokensB.has(t));
  return { count: overlapping.length, overlapping };
}

/**
 * Map delivery_type to likely lifecycle stages for stage narrowing.
 * Returns possible stages (does NOT auto-assign use case).
 */
export function getDeliveryTypeStageBias(deliveryType: string): string[] {
  const dt = normalizeForMatching(deliveryType);
  if (dt.includes("external") || dt.includes("api")) {
    return ["transactional", "retention", "onboarding"];
  }
  if (dt.includes("action") || dt.includes("trigger")) {
    return ["onboarding", "engagement", "retention", "monetization"];
  }
  if (dt.includes("recurring")) {
    return ["engagement", "monetization", "retention"];
  }
  if (dt.includes("one-time") || dt.includes("one time")) {
    return ["monetization", "engagement", "advocacy"];
  }
  return [];
}

// ===== Match Reason Codes (for trace storage) =====

export type MatchReasonCode =
  | "keyword_hit_campaign_name"
  | "keyword_hit_title"
  | "keyword_hit_who_query"
  | "keyword_hit_conversion_event"
  | "keyword_hit_labels"
  | "delivery_type_narrowed_stage"
  | "token_overlap_threshold_met"
  | "conversion_event_direct_match"
  | "regex_rule_hit";

export interface MatchTrace {
  matchSource: "internal" | "inferred" | "unclassified";
  matchedUseCaseId: string | null;
  evidenceFieldsUsed: string[];
  matchReasonCodes: MatchReasonCode[];
}
