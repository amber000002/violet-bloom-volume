// Client-side Brand JSON extraction engine
// Parses website text + industry + additional context to generate CoreBrandJSON

import { CoreBrandJSON, BrandInputs } from "@/types/brandProfile";
import { industryConfigs, getInferredBusinessModel, getBusinessModelLabel } from "@/data/industryConfig";

// ===== PATTERN DICTIONARIES =====

const regulatoryKeywords: Record<string, string[]> = {
  "SEBI": ["sebi", "securities and exchange board"],
  "RBI": ["rbi", "reserve bank of india"],
  "IRDAI": ["irdai", "insurance regulatory"],
  "GDPR": ["gdpr", "general data protection"],
  "HIPAA": ["hipaa", "health insurance portability"],
  "PCI-DSS": ["pci", "pci-dss", "payment card industry"],
  "SOC2": ["soc 2", "soc2"],
  "ISO 27001": ["iso 27001", "iso27001"],
};

const industryVocabularyPatterns: Record<string, string[]> = {
  financial: ["ipo", "demat", "derivatives", "sip", "aum", "nav", "mutual fund", "portfolio", "equity", "nse", "bse", "kyc", "pan", "aadhaar", "credit score", "emi", "neft", "imps", "upi", "forex", "nps", "ppf", "fd", "rd", "insurance premium", "policy", "claim", "maturity", "f&o", "futures", "options", "margin", "intraday", "delivery", "watchlist", "stock", "share", "dividend", "bonus"],
  transactional: ["cart", "checkout", "order", "delivery", "shipping", "return", "refund", "cod", "payment", "tracking", "wishlist", "catalog", "sku", "inventory", "coupon", "discount", "offer", "deal", "sale", "flash sale", "bundle"],
  subscription: ["subscribe", "subscription", "plan", "trial", "free trial", "premium", "upgrade", "renew", "renewal", "cancel", "streaming", "episodes", "season", "content", "library", "watch", "listen", "course", "module", "certification", "enrollment"],
  marketplace: ["listing", "seller", "buyer", "booking", "reservation", "availability", "host", "provider", "service", "gig", "freelance", "bid"],
  utility: ["appointment", "booking", "schedule", "service request", "complaint", "ticket", "resolution", "status"],
};

const platformKeywords = {
  mobile: ["mobile app", "android", "ios", "play store", "app store", "download app", "install app", "mobile"],
  web: ["website", "web app", "web platform", "dashboard", "portal", "browser"],
  api: ["api", "sdk", "integration", "webhook"],
};

const channelKeywords = {
  email: ["email", "mail", "inbox", "newsletter"],
  push: ["push notification", "push", "app notification"],
  sms: ["sms", "text message", "otp"],
  whatsapp: ["whatsapp", "wa"],
  in_app: ["in-app", "in app", "notification center"],
  web_push: ["web push", "browser notification"],
};

const monetizationPatterns = [
  { pattern: /subscription|monthly plan|annual plan|free tier|premium|pro plan/i, model: "Subscription" },
  { pattern: /commission|marketplace fee|platform fee|service fee/i, model: "Commission-based" },
  { pattern: /transaction fee|payment processing|interchange/i, model: "Transaction fee" },
  { pattern: /freemium|free.*premium|upgrade/i, model: "Freemium" },
  { pattern: /ad[- ]?supported|advertising|sponsor/i, model: "Ad-supported" },
  { pattern: /interest|lending|loan|emi|credit/i, model: "Interest/Lending" },
  { pattern: /brokerage|trading fee|per trade/i, model: "Brokerage" },
  { pattern: /aum|management fee|advisory fee/i, model: "AUM-based fee" },
];

const volumeBandPatterns = [
  { pattern: /(\d+)\s*\+?\s*(?:crore|cr)\s*(?:users|customers|downloads|installs)/i, multiplier: 10_000_000 },
  { pattern: /(\d+)\s*\+?\s*(?:million|mn|m)\s*(?:users|customers|downloads|installs)/i, multiplier: 1_000_000 },
  { pattern: /(\d+)\s*\+?\s*(?:lakh|lac)\s*(?:users|customers|downloads|installs)/i, multiplier: 100_000 },
  { pattern: /(\d+)\s*\+?\s*(?:thousand|k)\s*(?:users|customers|downloads|installs)/i, multiplier: 1_000 },
];

const mauBands = [
  { max: 100_000, label: "Emerging (<100K)" },
  { max: 1_000_000, label: "Growth (100K-1M)" },
  { max: 10_000_000, label: "Large (1M-10M)" },
  { max: 100_000_000, label: "Enterprise (10M-100M)" },
  { max: Infinity, label: "Hyper-scale (100M+)" },
];

// ===== EXTRACTION FUNCTIONS =====

function extractMatches(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter(kw => lower.includes(kw.toLowerCase()));
}

function extractUniqueMatches(text: string, vocabularyList: string[]): string[] {
  const lower = text.toLowerCase();
  return vocabularyList.filter(term => {
    const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    return regex.test(lower);
  });
}

function detectRegulatory(text: string): string[] {
  const found: string[] = [];
  for (const [flag, patterns] of Object.entries(regulatoryKeywords)) {
    if (patterns.some(p => text.toLowerCase().includes(p))) {
      found.push(flag);
    }
  }
  return found;
}

function detectMonetization(text: string): string {
  for (const { pattern, model } of monetizationPatterns) {
    if (pattern.test(text)) return model;
  }
  return "Not detected";
}

function detectVolumeBand(text: string, mauInput?: string): string {
  // First check explicit MAU input
  if (mauInput) {
    const numMatch = mauInput.match(/(\d[\d,.]*)\s*(?:m|mn|million)?/i);
    if (numMatch) {
      const num = parseFloat(numMatch[1].replace(/,/g, ""));
      const multiplier = /m|mn|million/i.test(mauInput) ? 1_000_000 : 
                         /k|thousand/i.test(mauInput) ? 1_000 :
                         /cr|crore/i.test(mauInput) ? 10_000_000 :
                         /lakh|lac/i.test(mauInput) ? 100_000 : 1;
      const total = num * multiplier;
      return mauBands.find(b => total < b.max)?.label || "Hyper-scale (100M+)";
    }
  }

  // Then try to detect from text
  for (const { pattern, multiplier } of volumeBandPatterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseFloat(match[1]) * multiplier;
      return mauBands.find(b => num < b.max)?.label || "Hyper-scale (100M+)";
    }
  }

  return "Not detected";
}

function extractPricingTiers(text: string): string[] {
  const tiers: string[] = [];
  const patterns = [
    /free\s*(?:plan|tier|trial)/i,
    /basic\s*(?:plan|tier)?/i,
    /starter\s*(?:plan|tier)?/i,
    /pro(?:fessional)?\s*(?:plan|tier)?/i,
    /premium\s*(?:plan|tier)?/i,
    /enterprise\s*(?:plan|tier)?/i,
    /gold\s*(?:plan|tier)?/i,
    /silver\s*(?:plan|tier)?/i,
    /platinum\s*(?:plan|tier)?/i,
  ];
  for (const p of patterns) {
    const match = text.match(p);
    if (match) tiers.push(match[0].trim());
  }
  return [...new Set(tiers)];
}

function extractBrandName(text: string, url: string): string {
  // Try to extract from URL domain
  try {
    const hostname = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    const parts = hostname.replace("www.", "").split(".");
    if (parts.length > 0) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
  } catch {}
  
  // Fallback: first capitalized word in text
  const match = text.match(/^[A-Z][a-z]+/);
  return match ? match[0] : "Unknown Brand";
}

function detectChannels(text: string): string[] {
  const found: string[] = [];
  for (const [channel, keywords] of Object.entries(channelKeywords)) {
    if (keywords.some(kw => text.toLowerCase().includes(kw))) {
      found.push(channel);
    }
  }
  return found.length > 0 ? found : ["email"]; // default to email
}

function detectPlatforms(text: string): { platforms: string[]; hasMobile: boolean; hasWeb: boolean } {
  const platforms: string[] = [];
  let hasMobile = false;
  let hasWeb = false;

  for (const [platform, keywords] of Object.entries(platformKeywords)) {
    if (keywords.some(kw => text.toLowerCase().includes(kw))) {
      platforms.push(platform);
      if (platform === "mobile") hasMobile = true;
      if (platform === "web") hasWeb = true;
    }
  }

  // Default assumptions
  if (platforms.length === 0) {
    hasWeb = true;
    platforms.push("web");
  }

  return { platforms, hasMobile, hasWeb };
}

function extractSegments(text: string): { primary: string[]; secondary: string[] } {
  const segmentPatterns = [
    "millennials", "gen z", "gen x", "baby boomers", "working professionals",
    "students", "homemakers", "retirees", "high net worth", "hnwi", "hni",
    "retail investors", "institutional", "sme", "msme", "enterprise",
    "first-time", "beginners", "experienced", "advanced", "expert",
    "tier 1", "tier 2", "tier 3", "metro", "rural", "urban", "semi-urban",
    "salaried", "self-employed", "freelancer", "business owner",
  ];

  const found = extractMatches(text, segmentPatterns);
  return {
    primary: found.slice(0, 3),
    secondary: found.slice(3, 6),
  };
}

function extractProducts(text: string): string[] {
  // Extract capitalized multi-word phrases that look like product names
  const productPatterns = text.match(/(?:[A-Z][a-z]+(?:\s[A-Z][a-z]+)+)/g) || [];
  // Filter out common phrases
  const stopPhrases = ["Terms And", "Privacy Policy", "About Us", "Contact Us", "Sign Up", "Log In"];
  return [...new Set(productPatterns.filter(p => !stopPhrases.some(s => p.includes(s))))].slice(0, 10);
}

// ===== MAIN EXTRACTION =====

export function generateCoreBrandJSON(
  industry: string,
  inputs: BrandInputs
): CoreBrandJSON {
  const config = industryConfigs[industry];
  const industryName = config?.name || industry;
  const businessModel = getInferredBusinessModel(industry);
  const businessModelLabel = getBusinessModelLabel(businessModel);

  const text = `${inputs.websiteText} ${inputs.additionalContext.productFocus} ${inputs.additionalContext.icpDetails} ${inputs.additionalContext.campaignChallenges}`;
  
  const regulatory = detectRegulatory(text);
  const monetization = detectMonetization(text);
  const volumeBand = detectVolumeBand(text, inputs.additionalContext.mauRange);
  const { platforms, hasMobile, hasWeb } = detectPlatforms(text);
  const channels = detectChannels(text);
  const segments = extractSegments(text);
  const products = extractProducts(inputs.websiteText);
  const pricingTiers = extractPricingTiers(text);

  // Get industry-specific vocabulary
  const vocabCategory = businessModel;
  const vocabList = industryVocabularyPatterns[vocabCategory] || [];
  const detectedVocab = extractUniqueMatches(text, vocabList);

  // Also check all vocab lists for cross-industry detection
  const allVocab: string[] = [];
  for (const list of Object.values(industryVocabularyPatterns)) {
    allVocab.push(...extractUniqueMatches(text, list));
  }
  const uniqueVocab = [...new Set([...detectedVocab, ...allVocab])];

  return {
    brand_identity: {
      brand_name: extractBrandName(inputs.websiteText, inputs.websiteUrl),
      website: inputs.websiteUrl,
      industry: industryName,
      geography_focus: extractGeography(text),
      tagline: extractTagline(inputs.websiteText),
      positioning: extractPositioning(inputs.websiteText),
      tone_of_voice: detectTone(inputs.websiteText),
    },
    business_model: {
      business_model_description: businessModelLabel,
      monetization_model: monetization,
      pricing_tiers: pricingTiers,
    },
    product_ecosystem: {
      core_products: products.slice(0, 5),
      product_modules: products.slice(5, 10),
      feature_modules: extractFeatures(text),
      feature_clusters: [],
      platforms,
      primary_platforms: platforms.slice(0, 2),
      has_mobile_app: hasMobile,
      has_web_platform: hasWeb,
    },
    audience_intelligence: {
      primary_segments: segments.primary,
      secondary_segments: segments.secondary,
      experience_levels: extractMatches(text, ["beginner", "intermediate", "advanced", "expert", "first-time", "experienced"]),
      risk_profiles: extractMatches(text, ["conservative", "moderate", "aggressive", "risk-averse", "risk-tolerant", "high risk", "low risk"]),
      personas_detected: segments.primary.slice(0, 3),
    },
    value_framework: {
      value_propositions: extractValueProps(inputs.websiteText),
      differentiators: extractDifferentiators(inputs.websiteText),
    },
    engagement_architecture: {
      engagement_drivers: extractEngagementDrivers(text),
      seasonal_triggers: extractMatches(text, ["diwali", "christmas", "new year", "black friday", "republic day", "independence day", "holi", "eid", "navratri", "tax season", "financial year", "quarter end", "year end", "festive", "holiday", "summer", "winter", "monsoon"]),
      event_based_triggers: extractMatches(text, ["ipo", "nfo", "product launch", "flash sale", "limited time", "early access", "pre-order", "new arrival", "price drop", "back in stock", "expiry", "renewal", "milestone"]),
      urgency_patterns: extractMatches(text, ["limited", "hurry", "last chance", "ending soon", "expires", "deadline", "today only", "don't miss", "exclusive"]),
    },
    lifecycle_signal_map: {
      key_user_actions: extractMatches(text, ["sign up", "register", "login", "purchase", "subscribe", "add to cart", "wishlist", "search", "browse", "review", "rate", "share", "refer", "invest", "trade", "book", "order"]),
      key_user_events: extractMatches(text, ["first purchase", "first login", "profile complete", "kyc done", "payment", "transaction", "order placed", "subscription activated"]),
      activation_events: extractMatches(text, ["sign up", "register", "kyc", "first order", "first transaction", "onboarding", "verify", "activate"]),
      monetization_events: extractMatches(text, ["purchase", "subscribe", "upgrade", "invest", "deposit", "trade", "order", "checkout", "payment"]),
      churn_signals: extractMatches(text, ["unsubscribe", "cancel", "deactivate", "close account", "refund", "complaint", "negative feedback"]),
      inactivity_markers: extractMatches(text, ["inactive", "dormant", "lapsed", "no login", "no activity"]),
      lifecycle_markers: [],
    },
    risk_compliance_layer: {
      regulatory_environment: regulatory,
      regulatory_flags: regulatory,
      compliance_intensity: regulatory.length > 2 ? "High" : regulatory.length > 0 ? "Medium" : "Low",
      risk_signals: extractMatches(text, ["fraud", "risk", "security", "breach", "vulnerability", "compliance", "audit", "penalty"]),
      high_risk_behaviors: extractMatches(text, ["derivatives", "margin trading", "leverage", "high risk", "speculative", "gambling"]),
    },
    industry_signal_layer: {
      industry_kpis: extractIndustryKPIs(industry, text),
      industry_vocabulary: uniqueVocab,
      industry_signal_vocabulary: detectedVocab,
    },
    kpi_framework: {
      primary_kpis: extractIndustryKPIs(industry, text).slice(0, 3),
      secondary_kpis: extractIndustryKPIs(industry, text).slice(3, 6),
      risk_kpis: extractMatches(text, ["churn rate", "bounce rate", "complaint rate", "npa", "default rate", "refund rate", "return rate"]),
    },
    tech_scale_layer: {
      has_cdp: text.toLowerCase().includes("cdp") || text.toLowerCase().includes("customer data platform"),
      has_crm: text.toLowerCase().includes("crm") || text.toLowerCase().includes("salesforce") || text.toLowerCase().includes("hubspot"),
      supports_real_time_triggers: text.toLowerCase().includes("real-time") || text.toLowerCase().includes("real time") || text.toLowerCase().includes("instant"),
      has_mobile_app: hasMobile,
      supports_primary_channels: channels.length >= 2,
      supported_channels: channels,
      volume_indicators_found: extractVolumeIndicators(text),
      monthly_active_users_band: volumeBand,
    },
  };
}

// ===== HELPER EXTRACTORS =====

function extractGeography(text: string): string {
  const geoPatterns = ["india", "global", "us", "usa", "uk", "southeast asia", "middle east", "europe", "asia pacific", "apac", "mena", "latam", "africa"];
  const found = extractMatches(text, geoPatterns);
  return found.length > 0 ? found.join(", ") : "Not detected";
}

function extractTagline(text: string): string {
  // Try to find a short impactful sentence (likely tagline)
  const sentences = text.split(/[.!]\s+/).filter(s => s.length > 10 && s.length < 80);
  return sentences[0]?.trim() || "";
}

function extractPositioning(text: string): string {
  const sentences = text.split(/[.!]\s+/).filter(s => s.length > 20 && s.length < 150);
  return sentences[0]?.trim() || "";
}

function detectTone(text: string): string {
  const lower = text.toLowerCase();
  if (/trusted|secure|reliable|safe|compliant/i.test(lower)) return "Trust-focused & Professional";
  if (/fun|exciting|adventure|thrill|enjoy/i.test(lower)) return "Energetic & Playful";
  if (/simple|easy|hassle-free|seamless|convenient/i.test(lower)) return "Simple & Accessible";
  if (/premium|luxury|exclusive|curated|bespoke/i.test(lower)) return "Premium & Aspirational";
  if (/innovative|cutting-edge|disrupt|transform|revolutionize/i.test(lower)) return "Innovative & Bold";
  return "Professional & Informative";
}

function extractFeatures(text: string): string[] {
  const featureIndicators = text.match(/(?:features?|offering|provides?|includes?|supports?)\s*:?\s*([^.]+)/gi) || [];
  return featureIndicators.slice(0, 5).map(f => f.replace(/features?:?\s*/i, "").trim());
}

function extractValueProps(text: string): string[] {
  const sentences = text.split(/[.!]\s+/);
  return sentences
    .filter(s => /(?:benefit|advantage|why choose|value|offers?|provides?|helps?|enables?)/i.test(s))
    .slice(0, 3)
    .map(s => s.trim());
}

function extractDifferentiators(text: string): string[] {
  const sentences = text.split(/[.!]\s+/);
  return sentences
    .filter(s => /(?:only|first|unique|unlike|differ|exclusive|patented|proprietary)/i.test(s))
    .slice(0, 3)
    .map(s => s.trim());
}

function extractEngagementDrivers(text: string): string[] {
  return extractMatches(text, [
    "gamification", "rewards", "loyalty", "points", "cashback", "referral", "leaderboard",
    "streak", "challenge", "badge", "achievement", "milestone", "level", "community",
    "social", "share", "contest", "quiz", "poll", "notification", "alert", "reminder",
  ]);
}

function extractIndustryKPIs(industry: string, text: string): string[] {
  const kpisByIndustry: Record<string, string[]> = {
    banking: ["account activation rate", "digital adoption rate", "cross-sell ratio", "npa ratio", "customer lifetime value"],
    fintech: ["kyc completion rate", "fund addition rate", "transaction volume", "arpu", "dau/mau ratio"],
    broking: ["kyc completion rate", "first trade rate", "trading volume", "margin utilization", "client acquisition cost"],
    ott: ["watch time", "subscription retention", "content completion rate", "free-to-paid conversion", "monthly active viewers"],
    "food-tech": ["order frequency", "aov", "repeat order rate", "delivery nps", "restaurant activation rate"],
    "quick-commerce": ["order frequency", "basket size", "delivery time", "repeat rate", "customer acquisition cost"],
    retail: ["aov", "repeat purchase rate", "cart conversion rate", "return rate", "customer lifetime value"],
    "apparel-fashion": ["aov", "return rate", "repeat purchase rate", "category penetration", "wishlist conversion"],
    edtech: ["course completion rate", "enrollment rate", "learner engagement", "certification rate", "renewal rate"],
    insurance: ["policy renewal rate", "claims ratio", "persistency ratio", "cross-sell rate", "premium growth"],
    "travel-hospitality": ["booking conversion", "repeat booking rate", "average booking value", "cancellation rate", "nps"],
    gaming: ["dau/mau", "session length", "retention d1/d7/d30", "arpdau", "in-app purchase rate"],
  };

  const industryKpis = kpisByIndustry[industry] || [];
  // Also detect any KPI-like terms in text
  const textKpis = extractMatches(text, ["conversion rate", "retention rate", "churn rate", "ltv", "cac", "arpu", "aov", "nps", "csat"]);
  return [...new Set([...industryKpis, ...textKpis])];
}

function extractVolumeIndicators(text: string): string[] {
  const matches = text.match(/\d+[\d,]*\s*(?:\+?\s*)?(?:million|mn|m|crore|cr|lakh|lac|thousand|k)\s*(?:users?|customers?|downloads?|installs?|subscribers?|traders?|investors?)/gi) || [];
  return matches.map(m => m.trim());
}
