// Campaign Segment Labeler
// -------------------------------------------------------------
// Derives brand-agnostic drill-down labels (region / segment / other
// recurring attributes) out of raw campaign names, so best/worst
// performing tables can be read at a granular level.
//
// Every brand encodes different attributes in its naming convention
// (e.g. "PROMO_IN_Dormant_Android_12Jun"), so instead of hardcoding a
// taxonomy we:
//   1. tokenize every campaign name in the dataset,
//   2. drop noise tokens (dates, pure numbers, ids, one-offs),
//   3. tag tokens against small region / segment dictionaries,
//   4. keep remaining tokens that recur across campaigns as generic
//      attributes (that's the brand's own convention emerging),
//   5. compose a short label per campaign.

export interface SegmentLabel {
  /** Short composed label, e.g. "IN · Dormant · Android" */
  label: string;
  /** Individual facet values in display order */
  parts: string[];
  region?: string;
  segment?: string;
}

const SPLIT_RE = /[_\-|/:>·,]+|\s{2,}/;

const REGION_TOKENS = new Set(
  [
    "in", "ind", "india", "us", "usa", "uk", "gb", "ca", "au", "nz", "sg", "my", "id", "ph", "th", "vn",
    "ae", "uae", "sa", "qa", "kw", "om", "bh", "za", "ng", "ke", "eg", "br", "mx", "ar", "cl", "co",
    "de", "fr", "es", "it", "nl", "se", "no", "dk", "fi", "pl", "pt", "tr", "ru", "jp", "kr", "cn", "hk", "tw",
    "apac", "emea", "latam", "anz", "mena", "north", "south", "east", "west", "central",
    "mumbai", "delhi", "ncr", "bangalore", "bengaluru", "hyderabad", "chennai", "kolkata", "pune",
    "ahmedabad", "jakarta", "manila", "dubai", "riyadh", "london", "paris", "berlin", "sydney",
    "tier1", "tier2", "tier3", "metro", "nonmetro", "urban", "rural",
  ].map((t) => t.toLowerCase()),
);

const SEGMENT_TOKENS = new Set(
  [
    "new", "newuser", "newusers", "signup", "signups", "onboarding", "onboard", "welcome",
    "active", "inactive", "dormant", "lapsed", "churn", "churned", "winback", "reactivation", "reactivate",
    "loyal", "vip", "premium", "plus", "pro", "gold", "silver", "platinum", "elite",
    "repeat", "returning", "firstpurchase", "firsttime", "highvalue", "lowvalue", "midvalue",
    "cart", "abandoned", "abandonedcart", "browse", "browseabandon", "wishlist",
    "subscriber", "subscribers", "nonbuyer", "buyer", "buyers", "prospect", "lead", "leads",
    "ios", "android", "web", "app", "mweb", "desktop", "mobile",
    "male", "female", "student", "family", "b2b", "b2c",
    "promo", "promotional", "transactional", "offer", "sale", "discount", "reminder", "nudge",
    "trial", "freemium", "paid", "renewal", "upsell", "crosssell", "referral", "loyalty",
  ].map((t) => t.toLowerCase()),
);

const MONTHS = new Set([
  "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec",
  "january", "february", "march", "april", "june", "july", "august", "september", "october", "november", "december",
]);

const STOPWORDS = new Set([
  "email", "mail", "campaign", "camp", "test", "copy", "final", "v1", "v2", "v3", "draft",
  "clevertap", "ct", "blast", "send", "batch", "auto", "journey", "flow", "day", "week", "month",
]);

function isNoiseToken(raw: string): boolean {
  const t = raw.toLowerCase();
  if (!t || t.length < 2) return true;
  if (STOPWORDS.has(t)) return true;
  if (/^\d+$/.test(t)) return true;                       // pure numbers
  if (/^\d{1,2}(st|nd|rd|th)$/.test(t)) return true;      // 1st, 2nd
  if (/^\d{1,4}[a-z]{0,3}\d{0,4}$/.test(t) && /\d/.test(t) && t.length <= 6) {
    // 12jun, 2024, 05th
    return true;
  }
  if (MONTHS.has(t.replace(/\d/g, ""))) return true;
  if (/^[0-9a-f]{8,}$/i.test(t)) return true;             // hashes / ids
  if (/^\d{1,2}[.\-/]\d{1,2}/.test(t)) return true;       // dates
  return false;
}

function pretty(token: string): string {
  const t = token.trim();
  if (t.length <= 4 && t === t.toUpperCase()) return t;    // keep acronyms (IN, UAE, VIP)
  if (/^[a-z]+$/.test(t)) return t.charAt(0).toUpperCase() + t.slice(1);
  return t;
}

function tokenize(name: string): string[] {
  return (name || "")
    .split(SPLIT_RE)
    .flatMap((chunk) => chunk.split(/\s+/))
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Build a labeler from the full campaign-name corpus so recurring
 * (i.e. meaningful) tokens for THIS brand can be detected.
 */
export function buildSegmentLabeler(campaignNames: string[]): (name: string) => SegmentLabel {
  const freq = new Map<string, number>();
  campaignNames.forEach((name) => {
    const seen = new Set<string>();
    tokenize(name).forEach((tok) => {
      const key = tok.toLowerCase();
      if (isNoiseToken(key) || seen.has(key)) return;
      seen.add(key);
      freq.set(key, (freq.get(key) || 0) + 1);
    });
  });

  // A token is a brand attribute if it repeats across campaigns.
  const minRecurrence = campaignNames.length >= 20 ? 2 : 1;

  return (name: string): SegmentLabel => {
    const tokens = tokenize(name).filter((t) => !isNoiseToken(t.toLowerCase()));
    let region: string | undefined;
    let segment: string | undefined;
    const others: string[] = [];

    tokens.forEach((tok) => {
      const key = tok.toLowerCase();
      if (!region && REGION_TOKENS.has(key)) {
        region = pretty(tok);
        return;
      }
      if (!segment && SEGMENT_TOKENS.has(key)) {
        segment = pretty(tok);
        return;
      }
      if ((freq.get(key) || 0) >= minRecurrence) others.push(pretty(tok));
    });

    const parts: string[] = [];
    if (region) parts.push(region);
    if (segment) parts.push(segment);
    others.slice(0, 3 - parts.length).forEach((o) => {
      if (!parts.includes(o)) parts.push(o);
    });

    return {
      label: parts.length ? parts.join(" \u00b7 ") : "Unlabelled",
      parts,
      region,
      segment,
    };
  };
}

export interface SegmentPerformanceRow {
  label: string;
  campaigns: number;
  sent: number;
  viewed: number;
  clicked: number;
  unsubscribes: number;
  openRate: number;
  clickRate: number;
  uniqueCTR: number;
  unsubRate: number;
}

interface LabelableCampaign {
  campaignName: string;
  totalSentUsers: number;
  totalDeliveredUsers?: number;
  uniqueViewed: number;
  uniqueClicked: number;
  unsubscribes: number;
}

/** Aggregate performance per derived facet value (region / segment / attribute). */
export function buildSegmentPerformance(
  campaigns: LabelableCampaign[],
  labelFor: (name: string) => SegmentLabel,
  minSent = 1000,
): SegmentPerformanceRow[] {
  const map = new Map<string, SegmentPerformanceRow>();
  campaigns.forEach((c) => {
    const { parts } = labelFor(c.campaignName || "");
    const facets = parts.length ? parts : ["Unlabelled"];
    facets.forEach((facet) => {
      const row = map.get(facet) || {
        label: facet, campaigns: 0, sent: 0, viewed: 0, clicked: 0, unsubscribes: 0,
        openRate: 0, clickRate: 0, uniqueCTR: 0, unsubRate: 0,
      };
      row.campaigns += 1;
      row.sent += c.totalSentUsers || 0;
      row.viewed += c.uniqueViewed || 0;
      row.clicked += c.uniqueClicked || 0;
      row.unsubscribes += c.unsubscribes || 0;
      map.set(facet, row);
    });
  });

  return [...map.values()]
    .filter((r) => r.sent >= minSent && r.label !== "Unlabelled")
    .map((r) => ({
      ...r,
      openRate: r.sent > 0 ? (r.viewed / r.sent) * 100 : 0,
      clickRate: r.sent > 0 ? (r.clicked / r.sent) * 100 : 0,
      uniqueCTR: r.viewed > 0 ? (r.clicked / r.viewed) * 100 : 0,
      unsubRate: r.sent > 0 ? (r.unsubscribes / r.sent) * 100 : 0,
    }))
    .sort((a, b) => b.sent - a.sent);
}
