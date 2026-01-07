// Business Models
export const businessModels = [
  { id: "transactional", label: "Transactional / Commerce" },
  { id: "subscription", label: "Subscription" },
  { id: "marketplace", label: "Marketplace" },
  { id: "utility", label: "Utility / Services" },
  { id: "content", label: "Content / Media" },
  { id: "financial", label: "Financial / Regulated" },
  { id: "high-consideration", label: "High-consideration / Long-cycle" },
] as const;

export type BusinessModelId = typeof businessModels[number]["id"];

// Journey Use Case (Automated, behavior-led)
export interface JourneyUseCase {
  name: string;
  triggerType: "past-behavior" | "live-event" | "segment-change" | "time-based";
  trigger: string;
  whyItWorks: string;
  frequencyGuardrail: string;
}

// Campaign Use Case (One-time, contextual)
export interface CampaignUseCase {
  name: string;
  purpose: string;
  bestTiming: string;
  suppressionAdvice: string;
}

// Dynamic Lifecycle Stage
export interface DynamicStage {
  id: string;
  label: string;
}

// Framework types
export type FrameworkType = "lifecycle" | "aarrr";

// AARRR stages
export const aarrrStages: DynamicStage[] = [
  { id: "acquisition", label: "Acquisition" },
  { id: "activation", label: "Activation" },
  { id: "retention", label: "Retention" },
  { id: "revenue", label: "Revenue" },
  { id: "referral", label: "Referral" },
];

export interface AMPUseCase {
  id: string;
  name: string;
  supportsGamification?: boolean;
}

export interface IndustryConfig {
  name: string;
  activeUserPercent: number;
  activeFrequencyMin: number;
  activeFrequencyMax: number;
  inactiveFrequencyMin: number;
  inactiveFrequencyMax: number;
  lifecycleMultiplier: number;
  purchaseCycle: string;
  frequencyReason: string;
  fatigueRisk: string;
  // Dynamic stages based on industry
  lifecycleStages: DynamicStage[];
  aarrrStages: DynamicStage[];
  // Journeys and Campaigns by stage
  journeys: Record<string, JourneyUseCase[]>;
  campaigns: Record<string, CampaignUseCase[]>;
  ampUseCases: AMPUseCase[];
  // Industries that support gamification
  supportsGamification: boolean;
}

// Default journeys for fallback
const defaultJourneys: Record<string, JourneyUseCase[]> = {
  activation: [
    { name: "Welcome series", triggerType: "live-event", trigger: "Immediately after signup", whyItWorks: "Sets expectations and builds initial trust", frequencyGuardrail: "3-5 emails over 7-14 days" },
    { name: "Onboarding guide", triggerType: "time-based", trigger: "24-48 hours after signup", whyItWorks: "Helps users discover key features", frequencyGuardrail: "1 email per milestone" },
    { name: "First action nudge", triggerType: "segment-change", trigger: "3 days post-signup with no action", whyItWorks: "Re-engages before interest fades", frequencyGuardrail: "Max 2 reminder emails" },
  ],
  usage: [
    { name: "Feature adoption", triggerType: "past-behavior", trigger: "After using core feature", whyItWorks: "Deepens product engagement", frequencyGuardrail: "Per feature discovery" },
    { name: "Usage milestone", triggerType: "live-event", trigger: "On significant activity", whyItWorks: "Celebrates progress and builds habit", frequencyGuardrail: "Per major milestone" },
  ],
  retention: [
    { name: "Re-engagement nudge", triggerType: "segment-change", trigger: "7 days of inactivity", whyItWorks: "Catches users before they churn", frequencyGuardrail: "Max 2 in series" },
    { name: "Value reminder", triggerType: "time-based", trigger: "Monthly", whyItWorks: "Reinforces core value proposition", frequencyGuardrail: "Monthly max" },
  ],
};

const defaultCampaigns: Record<string, CampaignUseCase[]> = {
  activation: [
    { name: "Platform announcement", purpose: "Introduce major new features", bestTiming: "After feature stabilization", suppressionAdvice: "Exclude users who already discovered feature" },
  ],
  usage: [
    { name: "Tips & tricks digest", purpose: "Educate on advanced features", bestTiming: "Monthly", suppressionAdvice: "Exclude new users still onboarding" },
  ],
  retention: [
    { name: "Win-back offer", purpose: "Re-engage lapsed users", bestTiming: "After 30-60 days inactivity", suppressionAdvice: "Exclude active users; limit to 2 attempts" },
  ],
};

export const industryConfigs: Record<string, IndustryConfig> = {
  banking: {
    name: "Banking",
    activeUserPercent: 0.35,
    activeFrequencyMin: 4,
    activeFrequencyMax: 6,
    inactiveFrequencyMin: 1,
    inactiveFrequencyMax: 2,
    lifecycleMultiplier: 0.9,
    purchaseCycle: "Banking relationships span years with monthly touchpoints around statements, offers, and financial insights.",
    frequencyReason: "Lower frequency builds trust without overwhelming users with financial messaging.",
    fatigueRisk: "Over-communication can feel intrusive given the sensitive nature of financial data.",
    supportsGamification: false,
    lifecycleStages: [
      { id: "activation", label: "Activation" },
      { id: "usage", label: "Active Usage" },
      { id: "retention", label: "Retention" },
      { id: "cross-sell", label: "Cross-sell" },
    ],
    aarrrStages: [
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
      { id: "revenue", label: "Revenue" },
    ],
    journeys: {
      activation: [
        { name: "Account activation welcome", triggerType: "live-event", trigger: "Immediately after account opening", whyItWorks: "Builds trust from day one", frequencyGuardrail: "3 emails over 14 days" },
        { name: "Digital banking onboarding", triggerType: "time-based", trigger: "24 hours post-activation", whyItWorks: "Drives app adoption and self-service", frequencyGuardrail: "1 email per feature set" },
        { name: "Security setup reminder", triggerType: "segment-change", trigger: "48 hours if security not configured", whyItWorks: "Protects customer and builds confidence", frequencyGuardrail: "Max 2 reminders" },
      ],
      usage: [
        { name: "Transaction insights", triggerType: "time-based", trigger: "Weekly summary", whyItWorks: "Adds value beyond basic banking", frequencyGuardrail: "Weekly" },
        { name: "Spend category alerts", triggerType: "live-event", trigger: "On unusual spending pattern", whyItWorks: "Proactive financial wellness", frequencyGuardrail: "As needed, max 2/week" },
      ],
      retention: [
        { name: "Dormancy prevention", triggerType: "segment-change", trigger: "90 days of minimal activity", whyItWorks: "Regulatory compliance and re-engagement", frequencyGuardrail: "Max 2 before escalation" },
        { name: "Relationship review", triggerType: "time-based", trigger: "Annual review period", whyItWorks: "Proactive service touch", frequencyGuardrail: "Annual" },
      ],
      "cross-sell": [
        { name: "Life event recommendations", triggerType: "past-behavior", trigger: "Based on life stage signals", whyItWorks: "Anticipates genuine needs", frequencyGuardrail: "Monthly max" },
        { name: "Pre-approved offers", triggerType: "segment-change", trigger: "On eligibility change", whyItWorks: "Reduces application friction", frequencyGuardrail: "Quarterly max" },
      ],
    },
    campaigns: {
      activation: [
        { name: "New feature announcement", purpose: "Introduce digital banking features", bestTiming: "Post-launch stabilization", suppressionAdvice: "Exclude users already using feature" },
      ],
      usage: [
        { name: "Financial wellness newsletter", purpose: "Educate on money management", bestTiming: "Monthly", suppressionAdvice: "Exclude unsubscribed users" },
      ],
      retention: [
        { name: "Regulatory update", purpose: "Communicate policy changes", bestTiming: "As required", suppressionAdvice: "Must reach all affected customers" },
      ],
      "cross-sell": [
        { name: "Seasonal product campaign", purpose: "Promote relevant products", bestTiming: "Tax season, year-end", suppressionAdvice: "Exclude recent purchasers" },
      ],
    },
    ampUseCases: [
      { id: "appointment-booking", name: "Branch appointment booking" },
      { id: "card-controls", name: "Card controls toggle" },
      { id: "spend-categorization", name: "Transaction categorization" },
      { id: "limit-adjustment", name: "Limit adjustment" },
    ],
  },
  nbfcs: {
    name: "NBFCs",
    activeUserPercent: 0.30,
    activeFrequencyMin: 5,
    activeFrequencyMax: 8,
    inactiveFrequencyMin: 1,
    inactiveFrequencyMax: 2,
    lifecycleMultiplier: 1.0,
    purchaseCycle: "Loan cycles vary from months to years, with repayment reminders and new offer windows.",
    frequencyReason: "Regular but measured communication supports repayment discipline and cross-sell timing.",
    fatigueRisk: "Aggressive lending offers may feel predatory if not timed with user intent signals.",
    supportsGamification: false,
    lifecycleStages: [
      { id: "activation", label: "Onboarding" },
      { id: "repayment", label: "Repayment" },
      { id: "retention", label: "Retention" },
      { id: "re-lending", label: "Re-lending" },
    ],
    aarrrStages: [
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
      { id: "revenue", label: "Revenue" },
    ],
    journeys: {
      activation: [
        { name: "Loan disbursement confirmation", triggerType: "live-event", trigger: "Upon disbursement", whyItWorks: "Confirms transaction and builds trust", frequencyGuardrail: "1 confirmation email" },
        { name: "Repayment schedule overview", triggerType: "time-based", trigger: "24 hours post-disbursement", whyItWorks: "Sets clear expectations", frequencyGuardrail: "One-time" },
      ],
      repayment: [
        { name: "EMI reminder", triggerType: "time-based", trigger: "3 days before due date", whyItWorks: "Prevents missed payments", frequencyGuardrail: "One per payment cycle" },
        { name: "Payment confirmation", triggerType: "live-event", trigger: "After successful payment", whyItWorks: "Positive reinforcement", frequencyGuardrail: "Per payment" },
      ],
      retention: [
        { name: "Credit score update", triggerType: "time-based", trigger: "Monthly", whyItWorks: "Adds value beyond lending", frequencyGuardrail: "Monthly max" },
      ],
      "re-lending": [
        { name: "Top-up loan offer", triggerType: "past-behavior", trigger: "After 6+ months of on-time payments", whyItWorks: "Rewards good behavior", frequencyGuardrail: "Quarterly max" },
      ],
    },
    campaigns: {
      activation: [
        { name: "Welcome kit", purpose: "Introduce all account features", bestTiming: "Within first week", suppressionAdvice: "None needed" },
      ],
      repayment: [
        { name: "Festive moratorium offer", purpose: "Offer payment flexibility", bestTiming: "Major festivals", suppressionAdvice: "Only for eligible accounts" },
      ],
      retention: [
        { name: "Loyalty benefits announcement", purpose: "Reward long-term customers", bestTiming: "Annual", suppressionAdvice: "Exclude defaulters" },
      ],
      "re-lending": [
        { name: "Pre-approved offer blast", purpose: "Drive new loan origination", bestTiming: "Quarterly", suppressionAdvice: "Exclude active loans, recent rejections" },
      ],
    },
    ampUseCases: [
      { id: "emi-calculator", name: "In-email EMI calculator" },
      { id: "payment-options", name: "Payment method selector" },
      { id: "document-upload", name: "Document upload" },
      { id: "appointment-booking", name: "Call-back scheduling" },
    ],
  },
  amcs: {
    name: "AMCs",
    activeUserPercent: 0.25,
    activeFrequencyMin: 3,
    activeFrequencyMax: 5,
    inactiveFrequencyMin: 1,
    inactiveFrequencyMax: 1,
    lifecycleMultiplier: 0.85,
    purchaseCycle: "Investment decisions are quarterly to annual, with market-driven engagement spikes.",
    frequencyReason: "Investors prefer thoughtful, insight-led communication over frequent selling.",
    fatigueRisk: "Too many market alerts can create anxiety rather than confidence.",
    supportsGamification: false,
    lifecycleStages: [
      { id: "activation", label: "Onboarding" },
      { id: "investing", label: "Active Investing" },
      { id: "retention", label: "Retention" },
    ],
    aarrrStages: [
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
      { id: "revenue", label: "Revenue" },
    ],
    journeys: {
      activation: [
        { name: "KYC completion", triggerType: "segment-change", trigger: "If KYC incomplete after 48h", whyItWorks: "Removes friction to first investment", frequencyGuardrail: "Max 3 reminders" },
        { name: "First investment guide", triggerType: "live-event", trigger: "Post-KYC completion", whyItWorks: "Builds confidence", frequencyGuardrail: "One-time" },
      ],
      investing: [
        { name: "SIP reminder", triggerType: "time-based", trigger: "Before SIP due date", whyItWorks: "Ensures sufficient balance", frequencyGuardrail: "Per SIP" },
        { name: "Portfolio rebalancing alert", triggerType: "segment-change", trigger: "On significant drift", whyItWorks: "Proactive wealth management", frequencyGuardrail: "Quarterly max" },
      ],
      retention: [
        { name: "Market insights", triggerType: "time-based", trigger: "Weekly digest", whyItWorks: "Positions as trusted advisor", frequencyGuardrail: "Weekly" },
      ],
    },
    campaigns: {
      activation: [
        { name: "NFO launch", purpose: "Announce new fund offerings", bestTiming: "NFO window", suppressionAdvice: "Match to risk profile" },
      ],
      investing: [
        { name: "Tax-saving reminder", purpose: "Drive ELSS investments", bestTiming: "Q4 (Jan-Mar)", suppressionAdvice: "Exclude those already maxed 80C" },
      ],
      retention: [
        { name: "Annual portfolio review", purpose: "Encourage review meeting", bestTiming: "Anniversary of first investment", suppressionAdvice: "Exclude very recent investors" },
      ],
    },
    ampUseCases: [
      { id: "sip-modification", name: "SIP amount modification" },
      { id: "fund-comparison", name: "Fund comparison tool" },
      { id: "goal-tracker", name: "Goal progress tracker" },
      { id: "redemption-request", name: "Quick redemption" },
    ],
  },
  insurance: {
    name: "Insurance",
    activeUserPercent: 0.20,
    activeFrequencyMin: 2,
    activeFrequencyMax: 4,
    inactiveFrequencyMin: 1,
    inactiveFrequencyMax: 1,
    lifecycleMultiplier: 0.75,
    purchaseCycle: "Policy renewals are annual, with claim-related touchpoints as needed.",
    frequencyReason: "Insurance is a low-frequency, high-trust category requiring gentle nurturing.",
    fatigueRisk: "Frequent reminders can feel pushy for a product people hope never to use.",
    supportsGamification: false,
    lifecycleStages: [
      { id: "activation", label: "Onboarding" },
      { id: "active-policy", label: "Active Policy" },
      { id: "renewal", label: "Renewal" },
      { id: "claims", label: "Claims" },
    ],
    aarrrStages: [
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
      { id: "revenue", label: "Revenue" },
    ],
    journeys: {
      activation: [
        { name: "Policy welcome kit", triggerType: "live-event", trigger: "Upon policy issuance", whyItWorks: "Demystifies coverage details", frequencyGuardrail: "2-3 emails over 7 days" },
        { name: "Claim process guide", triggerType: "time-based", trigger: "7 days post-purchase", whyItWorks: "Prepares for when it matters most", frequencyGuardrail: "One-time" },
      ],
      "active-policy": [
        { name: "Coverage utilization tips", triggerType: "time-based", trigger: "Quarterly", whyItWorks: "Maximizes policy value", frequencyGuardrail: "Quarterly" },
        { name: "Wellness benefits reminder", triggerType: "past-behavior", trigger: "If wellness benefits unused", whyItWorks: "Drives engagement with policy", frequencyGuardrail: "Bi-annual" },
      ],
      renewal: [
        { name: "Renewal reminder", triggerType: "time-based", trigger: "60, 30, 7 days before expiry", whyItWorks: "Prevents coverage gaps", frequencyGuardrail: "3 emails max per renewal" },
        { name: "Loyalty discount offer", triggerType: "segment-change", trigger: "At renewal eligibility", whyItWorks: "Rewards continued trust", frequencyGuardrail: "Annual" },
      ],
      claims: [
        { name: "Claim status update", triggerType: "live-event", trigger: "On status change", whyItWorks: "Reduces anxiety during claims", frequencyGuardrail: "Per status change" },
        { name: "Claim completion feedback", triggerType: "live-event", trigger: "Post-claim settlement", whyItWorks: "Captures experience for improvement", frequencyGuardrail: "One-time" },
      ],
    },
    campaigns: {
      activation: [
        { name: "Add-on coverage introduction", purpose: "Introduce additional coverage options", bestTiming: "30 days post-purchase", suppressionAdvice: "Exclude those with full coverage" },
      ],
      "active-policy": [
        { name: "Preventive health tips", purpose: "Wellness content to reduce claims", bestTiming: "Monthly", suppressionAdvice: "Match to policy type" },
      ],
      renewal: [
        { name: "Early bird renewal offer", purpose: "Incentivize early renewal", bestTiming: "90 days before expiry", suppressionAdvice: "Exclude auto-renewals" },
      ],
      claims: [
        { name: "Cashless network update", purpose: "Inform about expanded network", bestTiming: "On network expansion", suppressionAdvice: "Only health insurance holders" },
      ],
    },
    ampUseCases: [
      { id: "renewal-payment", name: "One-click renewal payment" },
      { id: "claim-status", name: "Claim status tracker" },
      { id: "hospital-finder", name: "Network hospital finder" },
      { id: "policy-download", name: "Policy document access" },
    ],
  },
  "travel-hospitality": {
    name: "Travel and Hospitality (OTA)",
    activeUserPercent: 0.40,
    activeFrequencyMin: 6,
    activeFrequencyMax: 10,
    inactiveFrequencyMin: 2,
    inactiveFrequencyMax: 3,
    lifecycleMultiplier: 1.2,
    purchaseCycle: "Travel planning happens seasonally with dream, plan, book, and post-trip phases.",
    frequencyReason: "Higher frequency works during planning windows; inspiration-led content performs well.",
    fatigueRisk: "Constant deal emails lose impact when users aren't in planning mode.",
    supportsGamification: true,
    lifecycleStages: [
      { id: "discovery", label: "Discovery" },
      { id: "planning", label: "Planning" },
      { id: "booking", label: "Booking" },
      { id: "pre-trip", label: "Pre-trip" },
      { id: "post-trip", label: "Post-trip" },
    ],
    aarrrStages: [
      { id: "acquisition", label: "Acquisition" },
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
      { id: "revenue", label: "Revenue" },
      { id: "referral", label: "Referral" },
    ],
    journeys: {
      discovery: [
        { name: "Inspiration series", triggerType: "time-based", trigger: "Weekly for new signups", whyItWorks: "Sparks travel dreaming", frequencyGuardrail: "Weekly during discovery phase" },
        { name: "Trending destinations", triggerType: "past-behavior", trigger: "Based on browse history", whyItWorks: "Personalizes discovery", frequencyGuardrail: "Weekly max" },
      ],
      planning: [
        { name: "Search abandonment", triggerType: "live-event", trigger: "1-4 hours after search", whyItWorks: "Captures planning intent", frequencyGuardrail: "Max 1 per search session" },
        { name: "Price drop alert", triggerType: "live-event", trigger: "On price decrease for viewed routes", whyItWorks: "Creates urgency with value", frequencyGuardrail: "Only significant drops" },
      ],
      booking: [
        { name: "Booking confirmation", triggerType: "live-event", trigger: "Immediately after booking", whyItWorks: "Confirms and excites", frequencyGuardrail: "One per booking" },
        { name: "Add-on suggestions", triggerType: "past-behavior", trigger: "Post-booking", whyItWorks: "Enhances trip value", frequencyGuardrail: "2-3 relevant suggestions" },
      ],
      "pre-trip": [
        { name: "Trip countdown", triggerType: "time-based", trigger: "7, 3, 1 day before travel", whyItWorks: "Builds anticipation", frequencyGuardrail: "3 emails per trip" },
        { name: "Check-in reminder", triggerType: "time-based", trigger: "24h before flight", whyItWorks: "Essential service touchpoint", frequencyGuardrail: "One per trip" },
      ],
      "post-trip": [
        { name: "Review request", triggerType: "time-based", trigger: "24-48h after return", whyItWorks: "Captures fresh experience", frequencyGuardrail: "One per trip" },
        { name: "Nostalgia re-booking", triggerType: "time-based", trigger: "Near anniversary of trip", whyItWorks: "Triggers emotional re-booking", frequencyGuardrail: "Annual per destination" },
      ],
    },
    campaigns: {
      discovery: [
        { name: "Seasonal destination guide", purpose: "Inspire seasonal travel", bestTiming: "Pre-season", suppressionAdvice: "Exclude active planners" },
      ],
      planning: [
        { name: "Flash sale", purpose: "Drive urgent bookings", bestTiming: "Low-demand periods", suppressionAdvice: "Exclude recent bookers" },
      ],
      booking: [
        { name: "Loyalty program promo", purpose: "Drive program enrollment", bestTiming: "Post first booking", suppressionAdvice: "Exclude existing members" },
      ],
      "post-trip": [
        { name: "Referral program push", purpose: "Drive word-of-mouth", bestTiming: "After positive review", suppressionAdvice: "Only promoter-score customers" },
      ],
    },
    ampUseCases: [
      { id: "seat-selection", name: "In-email seat selection" },
      { id: "hotel-gallery", name: "Hotel room carousel", supportsGamification: false },
      { id: "date-picker", name: "Travel date picker" },
      { id: "price-alert-setup", name: "Price alert configuration" },
      { id: "spin-wheel", name: "Travel voucher spin wheel", supportsGamification: true },
    ],
  },
  aviation: {
    name: "Aviation",
    activeUserPercent: 0.35,
    activeFrequencyMin: 4,
    activeFrequencyMax: 7,
    inactiveFrequencyMin: 1,
    inactiveFrequencyMax: 2,
    lifecycleMultiplier: 1.0,
    purchaseCycle: "Booking cycles span weeks to months, with loyalty program engagement ongoing.",
    frequencyReason: "Pre-flight and loyalty communications have high engagement; post-flight is key for retention.",
    fatigueRisk: "Generic fare alerts without personalization quickly become noise.",
    supportsGamification: false,
    lifecycleStages: [
      { id: "booking", label: "Booking" },
      { id: "pre-flight", label: "Pre-flight" },
      { id: "post-flight", label: "Post-flight" },
      { id: "loyalty", label: "Loyalty" },
    ],
    aarrrStages: [
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
      { id: "revenue", label: "Revenue" },
      { id: "referral", label: "Referral" },
    ],
    journeys: {
      booking: [
        { name: "Booking confirmation", triggerType: "live-event", trigger: "Immediately after booking", whyItWorks: "Essential confirmation", frequencyGuardrail: "One per booking" },
        { name: "Fare lock reminder", triggerType: "time-based", trigger: "Before fare lock expiry", whyItWorks: "Drives conversion", frequencyGuardrail: "Max 2 reminders" },
      ],
      "pre-flight": [
        { name: "Web check-in", triggerType: "time-based", trigger: "48-24h before flight", whyItWorks: "Essential service email", frequencyGuardrail: "One per flight" },
        { name: "Upgrade offer", triggerType: "segment-change", trigger: "When upgrade available", whyItWorks: "Revenue opportunity", frequencyGuardrail: "One per flight" },
      ],
      "post-flight": [
        { name: "Flight feedback", triggerType: "time-based", trigger: "24h after landing", whyItWorks: "Captures experience", frequencyGuardrail: "One per flight" },
        { name: "Miles credited", triggerType: "live-event", trigger: "After miles posting", whyItWorks: "Reinforces loyalty value", frequencyGuardrail: "Per flight" },
      ],
      loyalty: [
        { name: "Tier status update", triggerType: "segment-change", trigger: "On tier change", whyItWorks: "Recognition and motivation", frequencyGuardrail: "Per status change" },
        { name: "Miles expiry warning", triggerType: "time-based", trigger: "90, 30 days before expiry", whyItWorks: "Prevents loss of value", frequencyGuardrail: "2 reminders" },
      ],
    },
    campaigns: {
      booking: [
        { name: "Route launch", purpose: "Announce new routes", bestTiming: "Pre-launch", suppressionAdvice: "Target relevant geographies" },
      ],
      "pre-flight": [
        { name: "Lounge access promo", purpose: "Promote premium services", bestTiming: "24h before flight", suppressionAdvice: "Exclude lounge members" },
      ],
      loyalty: [
        { name: "Double miles promotion", purpose: "Drive bookings", bestTiming: "Low season", suppressionAdvice: "Exclude recent bookers" },
      ],
    },
    ampUseCases: [
      { id: "check-in", name: "In-email check-in" },
      { id: "seat-upgrade", name: "Seat upgrade selector" },
      { id: "meal-preference", name: "Meal preference picker" },
      { id: "boarding-pass", name: "Dynamic boarding pass" },
    ],
  },
  "cab-aggregators": {
    name: "Cab Aggregators",
    activeUserPercent: 0.55,
    activeFrequencyMin: 8,
    activeFrequencyMax: 12,
    inactiveFrequencyMin: 2,
    inactiveFrequencyMax: 4,
    lifecycleMultiplier: 1.3,
    purchaseCycle: "Daily to weekly usage with high-frequency micro-transactions.",
    frequencyReason: "Transactional and promotional emails can be frequent given habitual usage patterns.",
    fatigueRisk: "Ride receipts are expected; excessive promotional emails erode value perception.",
    supportsGamification: true,
    lifecycleStages: [
      { id: "activation", label: "First Ride" },
      { id: "habit-building", label: "Habit Building" },
      { id: "retention", label: "Retention" },
    ],
    aarrrStages: [
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
      { id: "revenue", label: "Revenue" },
      { id: "referral", label: "Referral" },
    ],
    journeys: {
      activation: [
        { name: "First ride incentive", triggerType: "segment-change", trigger: "If no ride in 48h", whyItWorks: "Drives first conversion", frequencyGuardrail: "Max 2 nudges" },
        { name: "App tutorial", triggerType: "live-event", trigger: "After signup", whyItWorks: "Reduces first-ride friction", frequencyGuardrail: "One-time" },
      ],
      "habit-building": [
        { name: "Ride receipt", triggerType: "live-event", trigger: "After each ride", whyItWorks: "Expected transactional email", frequencyGuardrail: "Per ride" },
        { name: "Commute time suggestion", triggerType: "past-behavior", trigger: "Based on ride patterns", whyItWorks: "Builds habitual usage", frequencyGuardrail: "Weekly" },
      ],
      retention: [
        { name: "Inactivity re-engagement", triggerType: "segment-change", trigger: "7 days no ride", whyItWorks: "Catches drop-off early", frequencyGuardrail: "Max 2 in series" },
        { name: "Pass/subscription upsell", triggerType: "past-behavior", trigger: "After 10+ rides/month", whyItWorks: "Value proposition for heavy users", frequencyGuardrail: "Monthly" },
      ],
    },
    campaigns: {
      activation: [
        { name: "Welcome offer", purpose: "Drive first ride", bestTiming: "Immediately after signup", suppressionAdvice: "Exclude users who already rode" },
      ],
      "habit-building": [
        { name: "Weekend getaway promo", purpose: "Drive off-peak usage", bestTiming: "Friday", suppressionAdvice: "Exclude very frequent users" },
      ],
      retention: [
        { name: "Win-back offer", purpose: "Re-engage churned users", bestTiming: "After 30 days inactivity", suppressionAdvice: "Limit to 2 attempts" },
      ],
    },
    ampUseCases: [
      { id: "ride-rating", name: "In-email ride rating" },
      { id: "tip-driver", name: "Driver tipping" },
      { id: "ride-booking", name: "Quick ride booking" },
      { id: "subscription-manage", name: "Pass management" },
      { id: "scratch-card", name: "Ride reward scratch card", supportsGamification: true },
    ],
  },
  "food-tech": {
    name: "Food Tech",
    activeUserPercent: 0.50,
    activeFrequencyMin: 10,
    activeFrequencyMax: 15,
    inactiveFrequencyMin: 3,
    inactiveFrequencyMax: 5,
    lifecycleMultiplier: 1.4,
    purchaseCycle: "Daily to weekly ordering habits with meal-time driven engagement windows.",
    frequencyReason: "High frequency is acceptable around meal times with relevant, timely offers.",
    fatigueRisk: "Blanket discounts train users to wait for deals rather than order naturally.",
    supportsGamification: true,
    lifecycleStages: [
      { id: "activation", label: "First Order" },
      { id: "habit-formation", label: "Habit Formation" },
      { id: "loyalty", label: "Loyal Customer" },
      { id: "reactivation", label: "Reactivation" },
    ],
    aarrrStages: [
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
      { id: "revenue", label: "Revenue" },
      { id: "referral", label: "Referral" },
    ],
    journeys: {
      activation: [
        { name: "Welcome + first order discount", triggerType: "live-event", trigger: "Immediately after signup", whyItWorks: "Drives first conversion quickly", frequencyGuardrail: "One-time" },
        { name: "Cuisine preference discovery", triggerType: "time-based", trigger: "24 hours post-signup", whyItWorks: "Enables personalization", frequencyGuardrail: "One-time" },
      ],
      "habit-formation": [
        { name: "Cart abandonment", triggerType: "live-event", trigger: "30 min - 1 hour after cart abandonment", whyItWorks: "Captures meal-time intent", frequencyGuardrail: "Max 1 per cart" },
        { name: "Reorder suggestion", triggerType: "time-based", trigger: "Same day next week", whyItWorks: "Builds habit", frequencyGuardrail: "Weekly per cuisine" },
      ],
      loyalty: [
        { name: "Personalized meal suggestions", triggerType: "past-behavior", trigger: "Based on order history + time", whyItWorks: "Predicts cravings", frequencyGuardrail: "Daily max during meal times" },
        { name: "Loyalty milestone", triggerType: "segment-change", trigger: "On points milestone", whyItWorks: "Gamifies ordering", frequencyGuardrail: "Per milestone" },
      ],
      reactivation: [
        { name: "We miss you", triggerType: "segment-change", trigger: "14 days of no order", whyItWorks: "Short cycle, quick re-engagement", frequencyGuardrail: "One-time" },
        { name: "Win-back discount", triggerType: "time-based", trigger: "30 days of inactivity", whyItWorks: "Last incentive push", frequencyGuardrail: "Final attempt" },
      ],
    },
    campaigns: {
      activation: [
        { name: "Restaurant partner spotlight", purpose: "Showcase popular options", bestTiming: "Week 1", suppressionAdvice: "Exclude those who already ordered" },
      ],
      "habit-formation": [
        { name: "Flash deal blast", purpose: "Drive orders during slow hours", bestTiming: "Off-peak meal times", suppressionAdvice: "Limit frequency, avoid discount dependency" },
      ],
      loyalty: [
        { name: "Loyalty program launch", purpose: "Drive program enrollment", bestTiming: "After 5+ orders", suppressionAdvice: "Exclude existing members" },
      ],
      reactivation: [
        { name: "New restaurant announcement", purpose: "Drive trial with new options", bestTiming: "On new partner launch", suppressionAdvice: "Target relevant cuisine preferences" },
      ],
    },
    ampUseCases: [
      { id: "reorder", name: "One-tap reorder" },
      { id: "menu-carousel", name: "Menu item carousel" },
      { id: "feedback-rating", name: "In-email rating" },
      { id: "coupon-reveal", name: "Scratch card coupon", supportsGamification: true },
    ],
  },
  "apparel-fashion": {
    name: "Apparel & Fashion",
    activeUserPercent: 0.35,
    activeFrequencyMin: 6,
    activeFrequencyMax: 10,
    inactiveFrequencyMin: 2,
    inactiveFrequencyMax: 3,
    lifecycleMultiplier: 1.1,
    purchaseCycle: "Seasonal shopping with trend-driven impulse purchases throughout the year.",
    frequencyReason: "Style inspiration and new arrivals drive engagement; sale events spike activity.",
    fatigueRisk: "Over-promoting sales can commoditize the brand and train discount dependency.",
    supportsGamification: true,
    lifecycleStages: [
      { id: "discovery", label: "Discovery" },
      { id: "first-purchase", label: "First Purchase" },
      { id: "repeat", label: "Repeat Buyer" },
      { id: "vip", label: "VIP Customer" },
    ],
    aarrrStages: [
      { id: "acquisition", label: "Acquisition" },
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
      { id: "revenue", label: "Revenue" },
      { id: "referral", label: "Referral" },
    ],
    journeys: {
      discovery: [
        { name: "Style profile builder", triggerType: "live-event", trigger: "After signup", whyItWorks: "Enables personalization from start", frequencyGuardrail: "One-time" },
        { name: "Browse abandonment", triggerType: "live-event", trigger: "2-4 hours after browsing", whyItWorks: "Captures style interest", frequencyGuardrail: "Max 1 per session" },
      ],
      "first-purchase": [
        { name: "Welcome discount nudge", triggerType: "time-based", trigger: "3 days if no purchase", whyItWorks: "Drives first conversion", frequencyGuardrail: "Max 2 nudges" },
        { name: "Order + styling tips", triggerType: "live-event", trigger: "Upon order confirmation", whyItWorks: "Adds value beyond transaction", frequencyGuardrail: "One per order" },
      ],
      repeat: [
        { name: "New arrivals based on style", triggerType: "time-based", trigger: "Weekly or on drops", whyItWorks: "Relevant discovery", frequencyGuardrail: "Weekly max" },
        { name: "Replenishment reminder", triggerType: "past-behavior", trigger: "Based on product lifecycle", whyItWorks: "Timely relevance for basics", frequencyGuardrail: "Per category" },
      ],
      vip: [
        { name: "Early sale access", triggerType: "segment-change", trigger: "Before public sales", whyItWorks: "Rewards loyalty", frequencyGuardrail: "Per sale event" },
        { name: "Personal shopper invite", triggerType: "segment-change", trigger: "On VIP tier entry", whyItWorks: "White-glove experience", frequencyGuardrail: "One-time" },
      ],
    },
    campaigns: {
      discovery: [
        { name: "Trend report", purpose: "Inspire with seasonal trends", bestTiming: "Season start", suppressionAdvice: "Exclude recent purchasers" },
      ],
      "first-purchase": [
        { name: "Category spotlight", purpose: "Drive trial in new categories", bestTiming: "Monthly", suppressionAdvice: "Match to style profile" },
      ],
      repeat: [
        { name: "Sale announcement", purpose: "Drive sale revenue", bestTiming: "Sale start", suppressionAdvice: "Consider full-price purchase history" },
      ],
      vip: [
        { name: "Exclusive collection preview", purpose: "Build anticipation", bestTiming: "Pre-launch", suppressionAdvice: "VIP segment only" },
      ],
    },
    ampUseCases: [
      { id: "product-carousel", name: "Shoppable product carousel" },
      { id: "size-selector", name: "Size selection" },
      { id: "color-picker", name: "Color variation picker" },
      { id: "wishlist-add", name: "Quick wishlist add" },
      { id: "spin-wheel", name: "Discount spin wheel", supportsGamification: true },
    ],
  },
  retail: {
    name: "Retail",
    activeUserPercent: 0.40,
    activeFrequencyMin: 6,
    activeFrequencyMax: 10,
    inactiveFrequencyMin: 2,
    inactiveFrequencyMax: 3,
    lifecycleMultiplier: 1.15,
    purchaseCycle: "Weekly to monthly shopping habits with seasonal and festival-driven peaks.",
    frequencyReason: "Consistent touchpoints work when value-driven; category relevance is key.",
    fatigueRisk: "Catalog-style emails without personalization get ignored quickly.",
    supportsGamification: true,
    lifecycleStages: [
      { id: "activation", label: "First Purchase" },
      { id: "engagement", label: "Regular Engagement" },
      { id: "loyalty", label: "Loyalty Program" },
    ],
    aarrrStages: [
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
      { id: "revenue", label: "Revenue" },
      { id: "referral", label: "Referral" },
    ],
    journeys: {
      ...defaultJourneys,
    },
    campaigns: {
      ...defaultCampaigns,
    },
    ampUseCases: [
      { id: "product-carousel", name: "Product carousel" },
      { id: "store-locator", name: "Nearest store finder" },
      { id: "quantity-selector", name: "Quantity picker" },
      { id: "cart-preview", name: "Cart preview & edit" },
      { id: "scratch-card", name: "Lucky draw scratch card", supportsGamification: true },
    ],
  },
  "quick-commerce": {
    name: "Quick Commerce",
    activeUserPercent: 0.60,
    activeFrequencyMin: 12,
    activeFrequencyMax: 18,
    inactiveFrequencyMin: 4,
    inactiveFrequencyMax: 6,
    lifecycleMultiplier: 1.5,
    purchaseCycle: "Multiple times per week for essentials with high retention among core users.",
    frequencyReason: "High frequency is natural given the convenience-first, repeat-purchase model.",
    fatigueRisk: "Users expect receipts but promotional fatigue sets in fast without relevance.",
    supportsGamification: true,
    lifecycleStages: [
      { id: "activation", label: "First Order" },
      { id: "habit", label: "Habit Formation" },
      { id: "replenishment", label: "Replenishment" },
    ],
    aarrrStages: [
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
      { id: "revenue", label: "Revenue" },
    ],
    journeys: {
      activation: [
        { name: "First order discount", triggerType: "live-event", trigger: "Immediately after signup", whyItWorks: "Drives first conversion", frequencyGuardrail: "One-time" },
      ],
      habit: [
        { name: "Order confirmation", triggerType: "live-event", trigger: "After each order", whyItWorks: "Expected transactional email", frequencyGuardrail: "Per order" },
        { name: "Weekly essentials reminder", triggerType: "time-based", trigger: "Weekly based on order patterns", whyItWorks: "Builds habitual ordering", frequencyGuardrail: "Weekly" },
      ],
      replenishment: [
        { name: "Auto-replenish suggestion", triggerType: "past-behavior", trigger: "Based on consumption patterns", whyItWorks: "Convenience-first value prop", frequencyGuardrail: "Per product category" },
      ],
    },
    campaigns: {
      activation: [
        { name: "Category discovery", purpose: "Introduce full range", bestTiming: "After first order", suppressionAdvice: "Exclude very active users" },
      ],
      habit: [
        { name: "Flash sale", purpose: "Drive incremental orders", bestTiming: "Off-peak hours", suppressionAdvice: "Limit frequency to avoid discount dependency" },
      ],
    },
    ampUseCases: [
      { id: "reorder", name: "One-tap essentials reorder" },
      { id: "quantity-selector", name: "Quantity adjuster" },
      { id: "delivery-slot", name: "Delivery slot picker" },
      { id: "subscription-setup", name: "Auto-replenish setup" },
    ],
  },
  beauty: {
    name: "Beauty",
    activeUserPercent: 0.35,
    activeFrequencyMin: 5,
    activeFrequencyMax: 8,
    inactiveFrequencyMin: 2,
    inactiveFrequencyMax: 3,
    lifecycleMultiplier: 1.1,
    purchaseCycle: "Monthly replenishment with discovery-driven exploration purchases.",
    frequencyReason: "Tutorials, reviews, and new launches drive engagement beyond transactions.",
    fatigueRisk: "Aggressive selling undermines the aspirational, editorial tone that works.",
    supportsGamification: true,
    lifecycleStages: [
      { id: "discovery", label: "Discovery" },
      { id: "first-purchase", label: "First Purchase" },
      { id: "replenishment", label: "Replenishment" },
      { id: "advocacy", label: "Advocacy" },
    ],
    aarrrStages: [
      { id: "acquisition", label: "Acquisition" },
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
      { id: "revenue", label: "Revenue" },
      { id: "referral", label: "Referral" },
    ],
    journeys: {
      discovery: [
        { name: "Skin/hair profile quiz", triggerType: "live-event", trigger: "After signup", whyItWorks: "Enables personalized recommendations", frequencyGuardrail: "One-time" },
        { name: "Ingredient spotlight", triggerType: "past-behavior", trigger: "After viewing products with key ingredients", whyItWorks: "Educates and builds confidence", frequencyGuardrail: "Weekly" },
      ],
      "first-purchase": [
        { name: "Welcome + samples info", triggerType: "live-event", trigger: "Immediately after signup", whyItWorks: "Drives first trial", frequencyGuardrail: "One-time" },
        { name: "How to use guide", triggerType: "live-event", trigger: "Upon delivery", whyItWorks: "Maximizes product value", frequencyGuardrail: "One per product type" },
      ],
      replenishment: [
        { name: "Replenishment reminder", triggerType: "past-behavior", trigger: "Based on product lifecycle", whyItWorks: "Prevents running out", frequencyGuardrail: "Per product, not overwhelming" },
        { name: "Routine upgrade suggestion", triggerType: "time-based", trigger: "Quarterly", whyItWorks: "Drives basket expansion", frequencyGuardrail: "Quarterly" },
      ],
      advocacy: [
        { name: "Review request", triggerType: "time-based", trigger: "21 days post-delivery", whyItWorks: "Captures informed feedback", frequencyGuardrail: "One per product" },
        { name: "Referral program nudge", triggerType: "segment-change", trigger: "After positive review", whyItWorks: "Converts satisfaction to advocacy", frequencyGuardrail: "One-time" },
      ],
    },
    campaigns: {
      discovery: [
        { name: "Trend report", purpose: "Inspire with beauty trends", bestTiming: "Seasonally", suppressionAdvice: "Match to profile preferences" },
      ],
      "first-purchase": [
        { name: "Welcome offer", purpose: "Drive first purchase", bestTiming: "Within first week", suppressionAdvice: "Exclude purchasers" },
      ],
      replenishment: [
        { name: "New launch announcement", purpose: "Drive trial of new products", bestTiming: "On product launch", suppressionAdvice: "Match to category preferences" },
      ],
      advocacy: [
        { name: "UGC campaign", purpose: "Collect user content", bestTiming: "Seasonal campaigns", suppressionAdvice: "Only engaged customers" },
      ],
    },
    ampUseCases: [
      { id: "shade-finder", name: "Shade finder carousel" },
      { id: "routine-builder", name: "Routine builder" },
      { id: "sample-selector", name: "Free sample picker" },
      { id: "subscription-manage", name: "Subscription management" },
      { id: "quiz", name: "Beauty quiz", supportsGamification: true },
    ],
  },
  edtech: {
    name: "Ed-tech",
    activeUserPercent: 0.30,
    activeFrequencyMin: 6,
    activeFrequencyMax: 10,
    inactiveFrequencyMin: 2,
    inactiveFrequencyMax: 3,
    lifecycleMultiplier: 1.0,
    purchaseCycle: "Enrollment cycles are seasonal; ongoing engagement supports course completion.",
    frequencyReason: "Progress nudges and learning streaks maintain momentum; enrollment windows need intensity.",
    fatigueRisk: "Over-selling courses to existing learners feels tone-deaf to their current journey.",
    supportsGamification: true,
    lifecycleStages: [
      { id: "activation", label: "Activation" },
      { id: "learning", label: "Active Learning" },
      { id: "completion", label: "Completion" },
      { id: "advancement", label: "Advancement" },
    ],
    aarrrStages: [
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
      { id: "revenue", label: "Revenue" },
      { id: "referral", label: "Referral" },
    ],
    journeys: {
      activation: [
        { name: "Learning path recommendation", triggerType: "live-event", trigger: "After signup/enrollment", whyItWorks: "Guides first steps", frequencyGuardrail: "One-time" },
        { name: "First lesson nudge", triggerType: "segment-change", trigger: "If no activity in 48 hours", whyItWorks: "Prevents early drop-off", frequencyGuardrail: "Max 2 nudges" },
      ],
      learning: [
        { name: "Progress celebration", triggerType: "live-event", trigger: "On milestone completion", whyItWorks: "Positive reinforcement", frequencyGuardrail: "Per milestone" },
        { name: "Learning streak", triggerType: "time-based", trigger: "Daily during active learning", whyItWorks: "Maintains momentum", frequencyGuardrail: "Daily" },
      ],
      completion: [
        { name: "Certification reminder", triggerType: "segment-change", trigger: "If eligible but not claimed", whyItWorks: "Ensures completion", frequencyGuardrail: "Max 2 reminders" },
        { name: "Share achievement", triggerType: "live-event", trigger: "On course completion", whyItWorks: "Drives social proof", frequencyGuardrail: "One-time" },
      ],
      advancement: [
        { name: "Next course recommendation", triggerType: "past-behavior", trigger: "Near course completion", whyItWorks: "Continues learning journey", frequencyGuardrail: "One per course completion" },
        { name: "Career outcome update", triggerType: "time-based", trigger: "6 months post-completion", whyItWorks: "Tracks long-term impact", frequencyGuardrail: "One-time" },
      ],
    },
    campaigns: {
      activation: [
        { name: "Enrollment window reminder", purpose: "Drive enrollments", bestTiming: "Before cohort closes", suppressionAdvice: "Exclude enrolled students" },
      ],
      learning: [
        { name: "Study tips newsletter", purpose: "Support learning success", bestTiming: "Weekly", suppressionAdvice: "Only active learners" },
      ],
      completion: [
        { name: "Alumni network invite", purpose: "Build community", bestTiming: "Post-completion", suppressionAdvice: "Only completers" },
      ],
      advancement: [
        { name: "New course launch", purpose: "Drive re-enrollment", bestTiming: "On launch", suppressionAdvice: "Match to completed subjects" },
      ],
    },
    ampUseCases: [
      { id: "course-progress", name: "Progress tracker", supportsGamification: true },
      { id: "quiz-preview", name: "In-email quiz", supportsGamification: true },
      { id: "schedule-picker", name: "Session scheduler" },
      { id: "course-carousel", name: "Recommended courses" },
    ],
  },
  fintech: {
    name: "FinTech",
    activeUserPercent: 0.45,
    activeFrequencyMin: 6,
    activeFrequencyMax: 10,
    inactiveFrequencyMin: 2,
    inactiveFrequencyMax: 3,
    lifecycleMultiplier: 1.15,
    purchaseCycle: "Continuous usage for payments with periodic engagement for new features.",
    frequencyReason: "Transactional emails are expected; feature announcements need strategic timing.",
    fatigueRisk: "Too many security or promotional emails can create alarm or apathy.",
    supportsGamification: false,
    lifecycleStages: [
      { id: "activation", label: "Activation" },
      { id: "usage", label: "Active Usage" },
      { id: "expansion", label: "Feature Expansion" },
    ],
    aarrrStages: [
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
      { id: "revenue", label: "Revenue" },
    ],
    journeys: {
      ...defaultJourneys,
    },
    campaigns: {
      ...defaultCampaigns,
    },
    ampUseCases: [
      { id: "bill-payment", name: "Quick bill payment" },
      { id: "transaction-categorize", name: "Transaction categorization" },
      { id: "budget-tracker", name: "Budget progress" },
      { id: "split-request", name: "Split payment request" },
    ],
  },
  ott: {
    name: "OTT",
    activeUserPercent: 0.50,
    activeFrequencyMin: 4,
    activeFrequencyMax: 6,
    inactiveFrequencyMin: 2,
    inactiveFrequencyMax: 3,
    lifecycleMultiplier: 1.0,
    purchaseCycle: "Content consumption is ongoing; renewal cycles are monthly to annual.",
    frequencyReason: "New release announcements and personalized recommendations maintain engagement.",
    fatigueRisk: "Generic content emails without viewing-history personalization feel irrelevant.",
    supportsGamification: false,
    lifecycleStages: [
      { id: "activation", label: "Onboarding" },
      { id: "engagement", label: "Active Viewing" },
      { id: "renewal", label: "Renewal" },
    ],
    aarrrStages: [
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
      { id: "revenue", label: "Revenue" },
    ],
    journeys: {
      activation: [
        { name: "Welcome + recommendations", triggerType: "live-event", trigger: "After signup", whyItWorks: "Immediate content discovery", frequencyGuardrail: "One-time" },
        { name: "Profile setup nudge", triggerType: "segment-change", trigger: "If profile incomplete", whyItWorks: "Enables personalization", frequencyGuardrail: "Max 2" },
      ],
      engagement: [
        { name: "New release alert", triggerType: "past-behavior", trigger: "Based on watch history", whyItWorks: "Relevant content discovery", frequencyGuardrail: "Weekly max" },
        { name: "Continue watching", triggerType: "time-based", trigger: "24h after stopping mid-content", whyItWorks: "Easy re-engagement", frequencyGuardrail: "Per incomplete content" },
      ],
      renewal: [
        { name: "Renewal reminder", triggerType: "time-based", trigger: "7, 3, 1 days before expiry", whyItWorks: "Prevents service interruption", frequencyGuardrail: "3 max per cycle" },
        { name: "Upgrade offer", triggerType: "past-behavior", trigger: "For heavy users", whyItWorks: "Value-based upsell", frequencyGuardrail: "Once per billing cycle" },
      ],
    },
    campaigns: {
      activation: [
        { name: "Content spotlight", purpose: "Highlight top content", bestTiming: "First week", suppressionAdvice: "Exclude active viewers" },
      ],
      engagement: [
        { name: "Original series launch", purpose: "Drive viewership", bestTiming: "Launch day", suppressionAdvice: "Match to genre preferences" },
      ],
      renewal: [
        { name: "Annual plan promo", purpose: "Upgrade to annual", bestTiming: "Before monthly renewal", suppressionAdvice: "Exclude annual subscribers" },
      ],
    },
    ampUseCases: [
      { id: "content-carousel", name: "Watchlist carousel" },
      { id: "continue-watching", name: "Continue watching" },
      { id: "rating-picker", name: "Content rating" },
      { id: "profile-switch", name: "Profile selector" },
    ],
  },
  healthcare: {
    name: "Healthcare",
    activeUserPercent: 0.25,
    activeFrequencyMin: 2,
    activeFrequencyMax: 4,
    inactiveFrequencyMin: 1,
    inactiveFrequencyMax: 1,
    lifecycleMultiplier: 0.8,
    purchaseCycle: "Appointment-driven with preventive care reminders and prescription refills.",
    frequencyReason: "Less is more in healthcare; respect privacy and avoid anxiety-inducing frequency.",
    fatigueRisk: "Over-communication on health topics can create unnecessary worry.",
    supportsGamification: false,
    lifecycleStages: [
      { id: "activation", label: "Onboarding" },
      { id: "care", label: "Active Care" },
      { id: "preventive", label: "Preventive Care" },
    ],
    aarrrStages: [
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
    ],
    journeys: {
      activation: [
        { name: "Welcome + profile completion", triggerType: "live-event", trigger: "After signup", whyItWorks: "Enables personalized care", frequencyGuardrail: "2-3 emails over first week" },
      ],
      care: [
        { name: "Appointment reminder", triggerType: "time-based", trigger: "48h, 24h, 2h before", whyItWorks: "Reduces no-shows", frequencyGuardrail: "3 per appointment" },
        { name: "Prescription refill", triggerType: "time-based", trigger: "7 days before running out", whyItWorks: "Ensures medication continuity", frequencyGuardrail: "Per prescription" },
      ],
      preventive: [
        { name: "Annual checkup reminder", triggerType: "time-based", trigger: "Annual", whyItWorks: "Drives preventive care", frequencyGuardrail: "Annual" },
        { name: "Vaccination reminder", triggerType: "time-based", trigger: "Per vaccination schedule", whyItWorks: "Health outcomes", frequencyGuardrail: "As needed" },
      ],
    },
    campaigns: {
      activation: [
        { name: "Services overview", purpose: "Introduce available services", bestTiming: "First month", suppressionAdvice: "None" },
      ],
      care: [
        { name: "Seasonal health tips", purpose: "Preventive education", bestTiming: "Seasonal", suppressionAdvice: "Match to health profile" },
      ],
      preventive: [
        { name: "Health awareness campaign", purpose: "Drive checkups", bestTiming: "Health awareness months", suppressionAdvice: "Exclude recent checkups" },
      ],
    },
    ampUseCases: [
      { id: "appointment-booking", name: "Appointment scheduler" },
      { id: "prescription-refill", name: "Refill request" },
      { id: "symptom-checker", name: "Symptom checker" },
      { id: "doctor-rating", name: "Doctor rating" },
    ],
  },
  gaming: {
    name: "Gaming",
    activeUserPercent: 0.55,
    activeFrequencyMin: 8,
    activeFrequencyMax: 14,
    inactiveFrequencyMin: 3,
    inactiveFrequencyMax: 5,
    lifecycleMultiplier: 1.3,
    purchaseCycle: "Daily engagement with in-app purchases and event-driven spikes.",
    frequencyReason: "Gamers expect high-frequency updates for events, rewards, and social features.",
    fatigueRisk: "Pay-to-win messaging can alienate players; balance with content updates.",
    supportsGamification: true,
    lifecycleStages: [
      { id: "activation", label: "Onboarding" },
      { id: "engagement", label: "Active Play" },
      { id: "monetization", label: "Monetization" },
      { id: "reactivation", label: "Reactivation" },
    ],
    aarrrStages: [
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
      { id: "revenue", label: "Revenue" },
      { id: "referral", label: "Referral" },
    ],
    journeys: {
      activation: [
        { name: "Tutorial completion reward", triggerType: "live-event", trigger: "After tutorial", whyItWorks: "Rewards early engagement", frequencyGuardrail: "One-time" },
        { name: "First achievement", triggerType: "live-event", trigger: "On first achievement", whyItWorks: "Celebrates progress", frequencyGuardrail: "Per achievement" },
      ],
      engagement: [
        { name: "Daily login reward", triggerType: "time-based", trigger: "Daily", whyItWorks: "Builds habit", frequencyGuardrail: "Daily" },
        { name: "Event notification", triggerType: "live-event", trigger: "On event start", whyItWorks: "Drives participation", frequencyGuardrail: "Per event" },
      ],
      monetization: [
        { name: "Limited offer", triggerType: "past-behavior", trigger: "Based on play patterns", whyItWorks: "Contextual monetization", frequencyGuardrail: "Weekly max" },
        { name: "Battle pass reminder", triggerType: "time-based", trigger: "Before season end", whyItWorks: "Urgency for completion", frequencyGuardrail: "2-3 per season" },
      ],
      reactivation: [
        { name: "Comeback rewards", triggerType: "segment-change", trigger: "7 days of inactivity", whyItWorks: "Incentivizes return", frequencyGuardrail: "One-time" },
        { name: "What you missed", triggerType: "time-based", trigger: "After 14 days", whyItWorks: "FOMO on updates", frequencyGuardrail: "One-time" },
      ],
    },
    campaigns: {
      activation: [
        { name: "New player event", purpose: "Drive activation", bestTiming: "First week", suppressionAdvice: "Only new players" },
      ],
      engagement: [
        { name: "Major update announcement", purpose: "Drive re-engagement", bestTiming: "On update", suppressionAdvice: "All players" },
      ],
      monetization: [
        { name: "Sale event", purpose: "Drive purchases", bestTiming: "Holidays", suppressionAdvice: "Consider spending history" },
      ],
      reactivation: [
        { name: "Anniversary celebration", purpose: "Celebrate game anniversary", bestTiming: "Annual", suppressionAdvice: "All players including churned" },
      ],
    },
    ampUseCases: [
      { id: "daily-reward", name: "Daily reward claim", supportsGamification: true },
      { id: "leaderboard", name: "Leaderboard preview" },
      { id: "event-register", name: "Event registration" },
      { id: "spin-wheel", name: "Prize wheel spin", supportsGamification: true },
    ],
  },
  "news-media": {
    name: "News and Media",
    activeUserPercent: 0.40,
    activeFrequencyMin: 8,
    activeFrequencyMax: 15,
    inactiveFrequencyMin: 3,
    inactiveFrequencyMax: 5,
    lifecycleMultiplier: 1.2,
    purchaseCycle: "Daily consumption with subscription renewals monthly to annual.",
    frequencyReason: "News is time-sensitive; frequency should match reader preferences.",
    fatigueRisk: "Too many alerts can overwhelm; allow preference management.",
    supportsGamification: false,
    lifecycleStages: [
      { id: "activation", label: "Onboarding" },
      { id: "engagement", label: "Regular Reading" },
      { id: "subscription", label: "Subscription" },
    ],
    aarrrStages: [
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
      { id: "revenue", label: "Revenue" },
    ],
    journeys: {
      activation: [
        { name: "Welcome + preference setup", triggerType: "live-event", trigger: "After signup", whyItWorks: "Enables personalization", frequencyGuardrail: "One-time" },
        { name: "Newsletter sample", triggerType: "time-based", trigger: "Within first week", whyItWorks: "Shows content value", frequencyGuardrail: "2-3 samples" },
      ],
      engagement: [
        { name: "Breaking news alert", triggerType: "live-event", trigger: "On major news", whyItWorks: "Time-sensitive value", frequencyGuardrail: "As news warrants" },
        { name: "Daily/weekly digest", triggerType: "time-based", trigger: "Based on preference", whyItWorks: "Consistent engagement", frequencyGuardrail: "Per preference" },
      ],
      subscription: [
        { name: "Paywall conversion", triggerType: "segment-change", trigger: "After hitting article limit", whyItWorks: "Demonstrated interest", frequencyGuardrail: "Max 3 in series" },
        { name: "Renewal reminder", triggerType: "time-based", trigger: "Before expiry", whyItWorks: "Prevents churn", frequencyGuardrail: "3 max" },
      ],
    },
    campaigns: {
      activation: [
        { name: "Content highlight", purpose: "Showcase best content", bestTiming: "First week", suppressionAdvice: "Only new signups" },
      ],
      engagement: [
        { name: "Special report", purpose: "Drive engagement with series", bestTiming: "On publication", suppressionAdvice: "Match to interests" },
      ],
      subscription: [
        { name: "Annual discount", purpose: "Upgrade to annual", bestTiming: "Before monthly renewal", suppressionAdvice: "Exclude annual subscribers" },
      ],
    },
    ampUseCases: [
      { id: "article-save", name: "Save for later" },
      { id: "topic-follow", name: "Follow topic" },
      { id: "newsletter-preferences", name: "Preference selector" },
      { id: "quick-poll", name: "Reader poll" },
    ],
  },
  telecom: {
    name: "Telecom",
    activeUserPercent: 0.60,
    activeFrequencyMin: 4,
    activeFrequencyMax: 8,
    inactiveFrequencyMin: 2,
    inactiveFrequencyMax: 3,
    lifecycleMultiplier: 1.0,
    purchaseCycle: "Monthly billing with prepaid top-ups and postpaid renewals.",
    frequencyReason: "Billing and usage alerts are expected; upsell carefully.",
    fatigueRisk: "Too many plan change suggestions feel salesy.",
    supportsGamification: false,
    lifecycleStages: [
      { id: "activation", label: "Onboarding" },
      { id: "usage", label: "Active Usage" },
      { id: "retention", label: "Retention" },
    ],
    aarrrStages: [
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
      { id: "revenue", label: "Revenue" },
    ],
    journeys: {
      ...defaultJourneys,
    },
    campaigns: {
      ...defaultCampaigns,
    },
    ampUseCases: [
      { id: "recharge", name: "Quick recharge" },
      { id: "usage-summary", name: "Usage breakdown" },
      { id: "plan-comparison", name: "Plan comparison" },
      { id: "bill-payment", name: "Bill payment" },
    ],
  },
  "home-services": {
    name: "Home Services",
    activeUserPercent: 0.25,
    activeFrequencyMin: 2,
    activeFrequencyMax: 4,
    inactiveFrequencyMin: 1,
    inactiveFrequencyMax: 2,
    lifecycleMultiplier: 0.9,
    purchaseCycle: "Project-based or seasonal with recurring maintenance needs.",
    frequencyReason: "Low-frequency category; focus on service quality over volume.",
    fatigueRisk: "Frequent emails feel irrelevant when no home need exists.",
    supportsGamification: false,
    lifecycleStages: [
      { id: "activation", label: "First Service" },
      { id: "service", label: "Active Service" },
      { id: "maintenance", label: "Recurring Maintenance" },
    ],
    aarrrStages: [
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
      { id: "referral", label: "Referral" },
    ],
    journeys: {
      ...defaultJourneys,
    },
    campaigns: {
      ...defaultCampaigns,
    },
    ampUseCases: [
      { id: "service-booking", name: "Service booking" },
      { id: "professional-rating", name: "Professional rating" },
      { id: "time-slot", name: "Time slot picker" },
      { id: "service-history", name: "Service history" },
    ],
  },
  "ticket-booking": {
    name: "Ticket Booking",
    activeUserPercent: 0.35,
    activeFrequencyMin: 4,
    activeFrequencyMax: 8,
    inactiveFrequencyMin: 2,
    inactiveFrequencyMax: 3,
    lifecycleMultiplier: 1.1,
    purchaseCycle: "Event-driven with seasonal peaks and artist/genre preferences.",
    frequencyReason: "Alert-based model; frequency should match event availability.",
    fatigueRisk: "Irrelevant event suggestions waste inbox space.",
    supportsGamification: true,
    lifecycleStages: [
      { id: "discovery", label: "Discovery" },
      { id: "booking", label: "Booking" },
      { id: "post-event", label: "Post-event" },
    ],
    aarrrStages: [
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
      { id: "revenue", label: "Revenue" },
    ],
    journeys: {
      discovery: [
        { name: "Interest-based alerts", triggerType: "past-behavior", trigger: "Based on browsing/booking history", whyItWorks: "Relevant discovery", frequencyGuardrail: "Weekly max" },
        { name: "Artist alert", triggerType: "live-event", trigger: "When followed artist has event", whyItWorks: "High-intent notification", frequencyGuardrail: "Per artist event" },
      ],
      booking: [
        { name: "Booking confirmation", triggerType: "live-event", trigger: "Immediately after booking", whyItWorks: "Essential confirmation", frequencyGuardrail: "Per booking" },
        { name: "Event reminder", triggerType: "time-based", trigger: "24h before event", whyItWorks: "Preparation reminder", frequencyGuardrail: "One per event" },
      ],
      "post-event": [
        { name: "Review request", triggerType: "time-based", trigger: "24h after event", whyItWorks: "Captures fresh experience", frequencyGuardrail: "One per event" },
        { name: "Similar events", triggerType: "past-behavior", trigger: "Based on attended events", whyItWorks: "Drives repeat booking", frequencyGuardrail: "Weekly max" },
      ],
    },
    campaigns: {
      discovery: [
        { name: "Major event announcement", purpose: "Drive awareness", bestTiming: "On announcement", suppressionAdvice: "Match to preferences" },
      ],
      booking: [
        { name: "Early bird sale", purpose: "Drive early bookings", bestTiming: "Pre-sale window", suppressionAdvice: "Target interested audiences" },
      ],
      "post-event": [
        { name: "Season calendar", purpose: "Preview upcoming events", bestTiming: "Seasonally", suppressionAdvice: "Match to past attendance" },
      ],
    },
    ampUseCases: [
      { id: "seat-selection", name: "Seat selection" },
      { id: "event-carousel", name: "Event carousel" },
      { id: "calendar-add", name: "Add to calendar" },
      { id: "scratch-card", name: "Mystery discount", supportsGamification: true },
    ],
  },
  "real-estate": {
    name: "Real Estate Platforms",
    activeUserPercent: 0.20,
    activeFrequencyMin: 2,
    activeFrequencyMax: 5,
    inactiveFrequencyMin: 1,
    inactiveFrequencyMax: 2,
    lifecycleMultiplier: 0.8,
    purchaseCycle: "Long sales cycle (months to years) with high consideration.",
    frequencyReason: "Quality over quantity; each email must add value to the search.",
    fatigueRisk: "Generic listings without preference matching feel spammy.",
    supportsGamification: false,
    lifecycleStages: [
      { id: "search", label: "Property Search" },
      { id: "shortlist", label: "Shortlisting" },
      { id: "transaction", label: "Transaction" },
      { id: "post-transaction", label: "Post-transaction" },
    ],
    aarrrStages: [
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
      { id: "revenue", label: "Revenue" },
    ],
    journeys: {
      search: [
        { name: "Search preference setup", triggerType: "live-event", trigger: "After signup", whyItWorks: "Enables relevant alerts", frequencyGuardrail: "One-time" },
        { name: "New listing alert", triggerType: "live-event", trigger: "On matching listing", whyItWorks: "Time-sensitive opportunity", frequencyGuardrail: "Daily digest or instant" },
      ],
      shortlist: [
        { name: "Price change alert", triggerType: "live-event", trigger: "On price change for saved property", whyItWorks: "Decision-relevant information", frequencyGuardrail: "Per price change" },
        { name: "Similar properties", triggerType: "past-behavior", trigger: "Based on viewed properties", whyItWorks: "Expands options", frequencyGuardrail: "Weekly max" },
      ],
      transaction: [
        { name: "Document checklist", triggerType: "live-event", trigger: "On transaction initiation", whyItWorks: "Guides complex process", frequencyGuardrail: "Per milestone" },
        { name: "Timeline update", triggerType: "live-event", trigger: "On status change", whyItWorks: "Reduces anxiety", frequencyGuardrail: "Per update" },
      ],
      "post-transaction": [
        { name: "Move-in checklist", triggerType: "time-based", trigger: "Post-closing", whyItWorks: "Adds value beyond transaction", frequencyGuardrail: "One-time" },
        { name: "Home services introduction", triggerType: "time-based", trigger: "Post-move-in", whyItWorks: "Relevant cross-sell", frequencyGuardrail: "One-time" },
      ],
    },
    campaigns: {
      search: [
        { name: "Market insights", purpose: "Position as advisor", bestTiming: "Monthly", suppressionAdvice: "Only active searchers" },
      ],
      shortlist: [
        { name: "Open house invitation", purpose: "Drive site visits", bestTiming: "Weekend before", suppressionAdvice: "Match to saved areas" },
      ],
      "post-transaction": [
        { name: "Referral program", purpose: "Drive referrals", bestTiming: "3 months post-transaction", suppressionAdvice: "Only satisfied customers" },
      ],
    },
    ampUseCases: [
      { id: "property-carousel", name: "Property carousel" },
      { id: "schedule-visit", name: "Schedule visit" },
      { id: "mortgage-calculator", name: "Mortgage calculator" },
      { id: "save-property", name: "Save property" },
    ],
  },
  "job-portals": {
    name: "Job Portals / Recruitment",
    activeUserPercent: 0.35,
    activeFrequencyMin: 5,
    activeFrequencyMax: 10,
    inactiveFrequencyMin: 2,
    inactiveFrequencyMax: 3,
    lifecycleMultiplier: 1.0,
    purchaseCycle: "Active job search periods are intense but episodic; passive candidates need nurturing.",
    frequencyReason: "High frequency is acceptable during active search; taper for passive candidates.",
    fatigueRisk: "Irrelevant job matches erode trust quickly.",
    supportsGamification: false,
    lifecycleStages: [
      { id: "activation", label: "Profile Activation" },
      { id: "matching", label: "Job Matching" },
      { id: "application", label: "Application" },
      { id: "placement", label: "Placement" },
    ],
    aarrrStages: [
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
      { id: "revenue", label: "Revenue" },
    ],
    journeys: {
      activation: [
        { name: "Profile completion", triggerType: "segment-change", trigger: "If profile incomplete", whyItWorks: "Improves match quality", frequencyGuardrail: "Max 3 reminders" },
        { name: "Search alert setup", triggerType: "live-event", trigger: "After first search", whyItWorks: "Enables relevant alerts", frequencyGuardrail: "One-time" },
      ],
      matching: [
        { name: "Job match alert", triggerType: "live-event", trigger: "On matching job posting", whyItWorks: "Core value proposition", frequencyGuardrail: "Daily digest or instant" },
        { name: "Company following alert", triggerType: "live-event", trigger: "On followed company posting", whyItWorks: "High-intent match", frequencyGuardrail: "Per posting" },
      ],
      application: [
        { name: "Application confirmation", triggerType: "live-event", trigger: "After application", whyItWorks: "Confirmation and tracking", frequencyGuardrail: "Per application" },
        { name: "Application status update", triggerType: "live-event", trigger: "On status change", whyItWorks: "Reduces anxiety", frequencyGuardrail: "Per update" },
      ],
      placement: [
        { name: "Placement congratulations", triggerType: "live-event", trigger: "On successful placement", whyItWorks: "Relationship moment", frequencyGuardrail: "One-time" },
        { name: "Referral program invite", triggerType: "time-based", trigger: "30 days post-placement", whyItWorks: "Drives referrals", frequencyGuardrail: "One-time" },
      ],
    },
    campaigns: {
      activation: [
        { name: "Resume tips", purpose: "Improve profile quality", bestTiming: "First week", suppressionAdvice: "Exclude completed profiles" },
      ],
      matching: [
        { name: "Industry hiring report", purpose: "Position as authority", bestTiming: "Monthly", suppressionAdvice: "Match to industries" },
      ],
      placement: [
        { name: "Career advancement resources", purpose: "Long-term relationship", bestTiming: "Quarterly", suppressionAdvice: "Only placed candidates" },
      ],
    },
    ampUseCases: [
      { id: "job-carousel", name: "Job carousel" },
      { id: "quick-apply", name: "Quick apply" },
      { id: "salary-calculator", name: "Salary calculator" },
      { id: "interview-scheduler", name: "Interview scheduler" },
    ],
  },
  "d2c-subscriptions": {
    name: "D2C Subscriptions",
    activeUserPercent: 0.50,
    activeFrequencyMin: 4,
    activeFrequencyMax: 8,
    inactiveFrequencyMin: 2,
    inactiveFrequencyMax: 3,
    lifecycleMultiplier: 1.0,
    purchaseCycle: "Recurring delivery with customization options between shipments.",
    frequencyReason: "Pre-shipment and customization windows are key touchpoints.",
    fatigueRisk: "Too many emails between shipments can feel like noise.",
    supportsGamification: true,
    lifecycleStages: [
      { id: "activation", label: "First Box" },
      { id: "customization", label: "Customization" },
      { id: "retention", label: "Retention" },
      { id: "advocacy", label: "Advocacy" },
    ],
    aarrrStages: [
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
      { id: "revenue", label: "Revenue" },
      { id: "referral", label: "Referral" },
    ],
    journeys: {
      activation: [
        { name: "Subscription welcome", triggerType: "live-event", trigger: "After signup", whyItWorks: "Sets expectations", frequencyGuardrail: "One-time" },
        { name: "First box shipped", triggerType: "live-event", trigger: "On shipment", whyItWorks: "Builds anticipation", frequencyGuardrail: "Per shipment" },
      ],
      customization: [
        { name: "Customization window open", triggerType: "time-based", trigger: "Before billing/shipping", whyItWorks: "Enables personalization", frequencyGuardrail: "Per cycle" },
        { name: "Preference update reminder", triggerType: "time-based", trigger: "Before window closes", whyItWorks: "Prevents unwanted items", frequencyGuardrail: "Max 2 per cycle" },
      ],
      retention: [
        { name: "Shipment confirmation", triggerType: "live-event", trigger: "On shipment", whyItWorks: "Expected communication", frequencyGuardrail: "Per shipment" },
        { name: "Pause option reminder", triggerType: "segment-change", trigger: "On billing issue or pause intent", whyItWorks: "Reduces churn", frequencyGuardrail: "One-time" },
      ],
      advocacy: [
        { name: "Unboxing experience prompt", triggerType: "time-based", trigger: "After delivery", whyItWorks: "Drives social sharing", frequencyGuardrail: "Per box" },
        { name: "Referral program", triggerType: "segment-change", trigger: "After 3+ boxes", whyItWorks: "Leverage loyal customers", frequencyGuardrail: "One-time" },
      ],
    },
    campaigns: {
      activation: [
        { name: "Add-on introduction", purpose: "Increase order value", bestTiming: "After second box", suppressionAdvice: "Exclude those who already added" },
      ],
      customization: [
        { name: "New product preview", purpose: "Drive customization", bestTiming: "During customization window", suppressionAdvice: "Only active subscribers" },
      ],
      advocacy: [
        { name: "Community spotlight", purpose: "Build brand community", bestTiming: "Monthly", suppressionAdvice: "Engaged subscribers only" },
      ],
    },
    ampUseCases: [
      { id: "product-swap", name: "Product swap selector" },
      { id: "delivery-reschedule", name: "Delivery reschedule" },
      { id: "add-on-selector", name: "Add-on picker" },
      { id: "pause-options", name: "Pause/skip selector" },
      { id: "mystery-reveal", name: "Mystery item reveal", supportsGamification: true },
    ],
  },
  "fitness-wellness": {
    name: "Fitness & Wellness Apps",
    activeUserPercent: 0.35,
    activeFrequencyMin: 6,
    activeFrequencyMax: 10,
    inactiveFrequencyMin: 2,
    inactiveFrequencyMax: 4,
    lifecycleMultiplier: 1.1,
    purchaseCycle: "Daily/weekly engagement with monthly subscription renewals.",
    frequencyReason: "Motivation and streak maintenance need consistent touchpoints.",
    fatigueRisk: "Guilt-tripping about missed workouts can backfire.",
    supportsGamification: true,
    lifecycleStages: [
      { id: "activation", label: "Getting Started" },
      { id: "habit", label: "Habit Building" },
      { id: "achievement", label: "Achievement" },
      { id: "reactivation", label: "Reactivation" },
    ],
    aarrrStages: [
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
      { id: "revenue", label: "Revenue" },
      { id: "referral", label: "Referral" },
    ],
    journeys: {
      activation: [
        { name: "Fitness goal setup", triggerType: "live-event", trigger: "After signup", whyItWorks: "Enables personalization", frequencyGuardrail: "One-time" },
        { name: "First workout nudge", triggerType: "segment-change", trigger: "If no activity in 48h", whyItWorks: "Drives first engagement", frequencyGuardrail: "Max 2" },
      ],
      habit: [
        { name: "Workout reminder", triggerType: "time-based", trigger: "Based on preferred schedule", whyItWorks: "Builds routine", frequencyGuardrail: "Per scheduled workout" },
        { name: "Streak maintenance", triggerType: "segment-change", trigger: "Before streak breaks", whyItWorks: "Motivates consistency", frequencyGuardrail: "One per day max" },
      ],
      achievement: [
        { name: "Goal milestone", triggerType: "live-event", trigger: "On goal progress", whyItWorks: "Celebrates progress", frequencyGuardrail: "Per milestone" },
        { name: "Personal record", triggerType: "live-event", trigger: "On new PR", whyItWorks: "Positive reinforcement", frequencyGuardrail: "Per achievement" },
      ],
      reactivation: [
        { name: "Gentle comeback", triggerType: "segment-change", trigger: "7 days of inactivity", whyItWorks: "Non-judgmental re-engagement", frequencyGuardrail: "One-time" },
        { name: "Fresh start program", triggerType: "time-based", trigger: "After 14 days", whyItWorks: "New beginning psychology", frequencyGuardrail: "One-time" },
      ],
    },
    campaigns: {
      activation: [
        { name: "Quick-start challenge", purpose: "Drive early engagement", bestTiming: "First week", suppressionAdvice: "Exclude active users" },
      ],
      habit: [
        { name: "New program launch", purpose: "Drive engagement", bestTiming: "On launch", suppressionAdvice: "Match to fitness level" },
      ],
      achievement: [
        { name: "Challenge invitation", purpose: "Community engagement", bestTiming: "Monthly", suppressionAdvice: "Exclude inactive users" },
      ],
      reactivation: [
        { name: "New year fresh start", purpose: "Capitalize on resolution season", bestTiming: "January", suppressionAdvice: "Target inactive users" },
      ],
    },
    ampUseCases: [
      { id: "workout-selector", name: "Workout picker" },
      { id: "progress-tracker", name: "Progress tracker", supportsGamification: true },
      { id: "schedule-session", name: "Session scheduler" },
      { id: "achievement-claim", name: "Achievement claim", supportsGamification: true },
    ],
  },
  "education-marketplace": {
    name: "Education Marketplaces",
    activeUserPercent: 0.30,
    activeFrequencyMin: 4,
    activeFrequencyMax: 8,
    inactiveFrequencyMin: 2,
    inactiveFrequencyMax: 3,
    lifecycleMultiplier: 0.95,
    purchaseCycle: "Course discovery and enrollment cycles with learning engagement ongoing.",
    frequencyReason: "Balance discovery with active learning support.",
    fatigueRisk: "Constant course suggestions during active learning feel pushy.",
    supportsGamification: true,
    lifecycleStages: [
      { id: "discovery", label: "Discovery" },
      { id: "enrollment", label: "Enrollment" },
      { id: "learning", label: "Active Learning" },
      { id: "completion", label: "Completion" },
    ],
    aarrrStages: [
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
      { id: "revenue", label: "Revenue" },
      { id: "referral", label: "Referral" },
    ],
    journeys: {
      discovery: [
        { name: "Interest-based recommendations", triggerType: "past-behavior", trigger: "Based on browsing", whyItWorks: "Personalized discovery", frequencyGuardrail: "Weekly" },
        { name: "Sale alert", triggerType: "live-event", trigger: "On wishlist course sale", whyItWorks: "High-intent conversion", frequencyGuardrail: "Per sale" },
      ],
      enrollment: [
        { name: "Enrollment confirmation", triggerType: "live-event", trigger: "After enrollment", whyItWorks: "Getting started guide", frequencyGuardrail: "Per enrollment" },
        { name: "Instructor introduction", triggerType: "time-based", trigger: "24h after enrollment", whyItWorks: "Builds connection", frequencyGuardrail: "One-time" },
      ],
      learning: [
        { name: "Progress nudge", triggerType: "segment-change", trigger: "No activity in 7 days", whyItWorks: "Prevents abandonment", frequencyGuardrail: "Max 2 per week" },
        { name: "Section completion", triggerType: "live-event", trigger: "On section complete", whyItWorks: "Celebrates progress", frequencyGuardrail: "Per section" },
      ],
      completion: [
        { name: "Certificate ready", triggerType: "live-event", trigger: "On course completion", whyItWorks: "Delivers value", frequencyGuardrail: "Per course" },
        { name: "Review request", triggerType: "time-based", trigger: "7 days after completion", whyItWorks: "Builds social proof", frequencyGuardrail: "One-time" },
      ],
    },
    campaigns: {
      discovery: [
        { name: "Flash sale", purpose: "Drive enrollments", bestTiming: "Quarterly", suppressionAdvice: "Exclude active learners" },
      ],
      enrollment: [
        { name: "Bundle offer", purpose: "Increase order value", bestTiming: "Post first enrollment", suppressionAdvice: "Match to interests" },
      ],
      completion: [
        { name: "Learning path suggestion", purpose: "Drive re-enrollment", bestTiming: "Post completion", suppressionAdvice: "Match to completed subject" },
      ],
    },
    ampUseCases: [
      { id: "course-carousel", name: "Course carousel" },
      { id: "quick-quiz", name: "Quick quiz", supportsGamification: true },
      { id: "progress-bar", name: "Progress tracker", supportsGamification: true },
      { id: "certificate-preview", name: "Certificate preview" },
    ],
  },
  "auto-mobility": {
    name: "Auto & Mobility (EV, Servicing)",
    activeUserPercent: 0.30,
    activeFrequencyMin: 2,
    activeFrequencyMax: 4,
    inactiveFrequencyMin: 1,
    inactiveFrequencyMax: 2,
    lifecycleMultiplier: 0.85,
    purchaseCycle: "High-value purchase with ongoing service and charging needs (EV).",
    frequencyReason: "Low-frequency category; service reminders and updates are key.",
    fatigueRisk: "Frequent emails feel irrelevant between service needs.",
    supportsGamification: false,
    lifecycleStages: [
      { id: "purchase", label: "Purchase" },
      { id: "ownership", label: "Ownership" },
      { id: "service", label: "Service" },
      { id: "upgrade", label: "Upgrade" },
    ],
    aarrrStages: [
      { id: "activation", label: "Activation" },
      { id: "retention", label: "Retention" },
      { id: "revenue", label: "Revenue" },
      { id: "referral", label: "Referral" },
    ],
    journeys: {
      purchase: [
        { name: "Delivery confirmation", triggerType: "live-event", trigger: "On vehicle delivery", whyItWorks: "Celebrates milestone", frequencyGuardrail: "One-time" },
        { name: "Getting started guide", triggerType: "time-based", trigger: "Post-delivery", whyItWorks: "Maximizes value", frequencyGuardrail: "3-5 emails over first month" },
      ],
      ownership: [
        { name: "Usage insights", triggerType: "time-based", trigger: "Monthly", whyItWorks: "Adds value", frequencyGuardrail: "Monthly" },
        { name: "Charging tips (EV)", triggerType: "past-behavior", trigger: "Based on charging patterns", whyItWorks: "Optimizes experience", frequencyGuardrail: "Monthly" },
      ],
      service: [
        { name: "Service reminder", triggerType: "time-based", trigger: "Based on mileage/time", whyItWorks: "Proactive maintenance", frequencyGuardrail: "Per service interval" },
        { name: "Appointment confirmation", triggerType: "live-event", trigger: "On booking", whyItWorks: "Reduces no-shows", frequencyGuardrail: "Per booking" },
      ],
      upgrade: [
        { name: "Trade-in offer", triggerType: "time-based", trigger: "Based on ownership tenure", whyItWorks: "Captures upgrade intent", frequencyGuardrail: "Annually" },
        { name: "New model launch", triggerType: "live-event", trigger: "On new model release", whyItWorks: "Builds excitement", frequencyGuardrail: "Per launch" },
      ],
    },
    campaigns: {
      purchase: [
        { name: "Accessories upsell", purpose: "Drive accessory sales", bestTiming: "Post-delivery", suppressionAdvice: "Exclude those who already purchased" },
      ],
      ownership: [
        { name: "Owner community invite", purpose: "Build community", bestTiming: "Month 2", suppressionAdvice: "Exclude inactive users" },
      ],
      service: [
        { name: "Seasonal checkup", purpose: "Drive service bookings", bestTiming: "Seasonally", suppressionAdvice: "Exclude recent service" },
      ],
      upgrade: [
        { name: "Loyalty upgrade program", purpose: "Drive upgrades", bestTiming: "Annually", suppressionAdvice: "Only eligible owners" },
      ],
    },
    ampUseCases: [
      { id: "service-booking", name: "Service booking" },
      { id: "charging-map", name: "Charging station finder" },
      { id: "vehicle-status", name: "Vehicle status check" },
      { id: "test-drive-booking", name: "Test drive booking" },
    ],
  },
};

export const maturityModifiers = {
  early: 0.8,
  growing: 1.0,
  mature: 1.15,
};

export const activeUserDefinitions = {
  "30-days": { label: "Active in last 30 days", multiplier: 1.0 },
  "60-days": { label: "Active in last 60 days", multiplier: 0.85 },
  "90-days": { label: "Active in last 90 days", multiplier: 0.7 },
};

// Helper function to get trigger type label
export const getTriggerTypeLabel = (triggerType: JourneyUseCase['triggerType']): string => {
  const labels: Record<JourneyUseCase['triggerType'], string> = {
    "past-behavior": "Past Behavior",
    "live-event": "Live Event",
    "segment-change": "Segment Change",
    "time-based": "Time-based",
  };
  return labels[triggerType];
};

// Get insight for stage
export const getStageInsight = (industry: string, stage: string, framework: FrameworkType): string => {
  const insights: Record<string, string> = {
    // General insights
    activation: "Early engagement sets the foundation—make onboarding feel personal, not automated.",
    usage: "Active users are your most valuable segment—nurture them with relevant, timely content.",
    retention: "Retention is cheaper than acquisition—invest in keeping users engaged.",
    "cross-sell": "Cross-sell thoughtfully based on real needs, not just revenue targets.",
    discovery: "Discovery phase is about inspiration—let users explore without pressure.",
    replenishment: "Replenishment timing is key—too early feels pushy, too late loses the sale.",
    advocacy: "Happy customers are your best marketers—make sharing easy and rewarding.",
    // AARRR specific
    acquisition: "Acquisition is just the start—focus on quality over quantity.",
    revenue: "Revenue follows value—prioritize customer success over short-term gains.",
    referral: "Referrals work when the product delivers—earn them, don't beg for them.",
  };

  return insights[stage] || "Mature programs rely more on journeys than campaigns.";
};
