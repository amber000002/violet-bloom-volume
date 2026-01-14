// Framework-specific journey and campaign mappings for AIDA, 4P, and 7P frameworks

export interface JourneyMapping {
  name: string;
  triggerType: "event" | "segment" | "schedule" | "api";
  description: string;
  applicableStages: string[];
}

export interface CampaignMapping {
  name: string;
  purpose: string;
  timing: string;
  suppression: string;
  applicableStages: string[];
}

// AIDA Framework Mappings
export const aidaJourneys: JourneyMapping[] = [
  // Attention Stage
  {
    name: "First Impression Welcome",
    triggerType: "event",
    description: "Triggered on first app open to capture attention with brand value proposition",
    applicableStages: ["attention"],
  },
  {
    name: "Social Proof Showcase",
    triggerType: "segment",
    description: "Highlight reviews, ratings, and testimonials to new visitors",
    applicableStages: ["attention"],
  },
  {
    name: "Category Discovery",
    triggerType: "event",
    description: "Surface trending categories based on browse behavior",
    applicableStages: ["attention"],
  },
  // Interest Stage
  {
    name: "Personalized Recommendations",
    triggerType: "event",
    description: "Serve curated content based on browsing patterns",
    applicableStages: ["interest"],
  },
  {
    name: "Content Deep Dive",
    triggerType: "segment",
    description: "Deliver detailed content to users showing sustained interest",
    applicableStages: ["interest"],
  },
  {
    name: "Comparison Enabler",
    triggerType: "event",
    description: "Provide comparison tools when multiple items are viewed",
    applicableStages: ["interest"],
  },
  // Desire Stage
  {
    name: "Scarcity Trigger",
    triggerType: "event",
    description: "Alert users when viewed items have limited availability",
    applicableStages: ["desire"],
  },
  {
    name: "Exclusive Access",
    triggerType: "segment",
    description: "Offer early or exclusive access to engaged prospects",
    applicableStages: ["desire"],
  },
  {
    name: "Benefit Reinforcement",
    triggerType: "schedule",
    description: "Remind users of key benefits for items in consideration",
    applicableStages: ["desire"],
  },
  // Action Stage
  {
    name: "Conversion Nudge",
    triggerType: "event",
    description: "Time-sensitive push when user shows high purchase intent",
    applicableStages: ["action"],
  },
  {
    name: "Friction Reducer",
    triggerType: "event",
    description: "Address common objections at checkout stage",
    applicableStages: ["action"],
  },
  {
    name: "Urgency Creator",
    triggerType: "segment",
    description: "Create time-bound offers for hesitant converters",
    applicableStages: ["action"],
  },
];

export const aidaCampaigns: CampaignMapping[] = [
  // Attention Stage
  {
    name: "Brand Launch Campaign",
    purpose: "Introduce brand story and unique value proposition",
    timing: "First 24 hours after install",
    suppression: "Already converted users",
    applicableStages: ["attention"],
  },
  {
    name: "Viral Content Push",
    purpose: "Share trending or viral content to capture attention",
    timing: "Peak engagement hours",
    suppression: "Users who engaged in last 2 hours",
    applicableStages: ["attention"],
  },
  // Interest Stage
  {
    name: "Educational Series",
    purpose: "Multi-part content building product/service understanding",
    timing: "Spaced over 5-7 days",
    suppression: "Users who already converted",
    applicableStages: ["interest"],
  },
  {
    name: "Feature Spotlight",
    purpose: "Highlight key features relevant to user interests",
    timing: "Based on last interaction",
    suppression: "Heavy users already familiar",
    applicableStages: ["interest"],
  },
  // Desire Stage
  {
    name: "Limited Time Offer",
    purpose: "Create urgency with time-bound deals",
    timing: "Based on browsing recency",
    suppression: "Recent purchasers",
    applicableStages: ["desire"],
  },
  {
    name: "Social Proof Blast",
    purpose: "Showcase reviews and success stories",
    timing: "After multiple product views",
    suppression: "Already converted",
    applicableStages: ["desire"],
  },
  // Action Stage
  {
    name: "Last Chance Alert",
    purpose: "Final reminder before offer/stock expiry",
    timing: "24 hours before expiry",
    suppression: "Already purchased",
    applicableStages: ["action"],
  },
  {
    name: "Checkout Recovery",
    purpose: "Recover abandoned checkouts with incentive",
    timing: "1-4 hours post-abandonment",
    suppression: "Completed purchase",
    applicableStages: ["action"],
  },
];

// 4P Framework Mappings
export const fourPJourneys: JourneyMapping[] = [
  // Product
  {
    name: "New Product Launch",
    triggerType: "segment",
    description: "Announce new products to relevant audience segments",
    applicableStages: ["product"],
  },
  {
    name: "Product Education",
    triggerType: "event",
    description: "Educate users on product features and benefits",
    applicableStages: ["product"],
  },
  {
    name: "Product Update Notification",
    triggerType: "api",
    description: "Notify users of product improvements or changes",
    applicableStages: ["product"],
  },
  // Price
  {
    name: "Price Drop Alert",
    triggerType: "event",
    description: "Notify users when wishlisted items drop in price",
    applicableStages: ["price"],
  },
  {
    name: "Value Proposition",
    triggerType: "segment",
    description: "Communicate value and ROI to price-sensitive segments",
    applicableStages: ["price"],
  },
  {
    name: "Bundle Offers",
    triggerType: "event",
    description: "Suggest value bundles based on cart/browse behavior",
    applicableStages: ["price"],
  },
  // Place
  {
    name: "Channel Preference",
    triggerType: "segment",
    description: "Route messages through preferred channels",
    applicableStages: ["place"],
  },
  {
    name: "Location-Based Trigger",
    triggerType: "event",
    description: "Geo-fenced messages for physical store proximity",
    applicableStages: ["place"],
  },
  {
    name: "Omnichannel Sync",
    triggerType: "api",
    description: "Sync user state across all touchpoints",
    applicableStages: ["place"],
  },
  // Promotion
  {
    name: "Flash Sale Alert",
    triggerType: "schedule",
    description: "Time-bound promotional announcements",
    applicableStages: ["promotion"],
  },
  {
    name: "Referral Program",
    triggerType: "event",
    description: "Encourage referrals post-positive experience",
    applicableStages: ["promotion"],
  },
  {
    name: "Loyalty Rewards",
    triggerType: "segment",
    description: "Reward high-value customers with exclusive perks",
    applicableStages: ["promotion"],
  },
];

export const fourPCampaigns: CampaignMapping[] = [
  // Product
  {
    name: "Product Launch Blast",
    purpose: "Mass announcement of new product availability",
    timing: "Launch day + follow-ups",
    suppression: "Already purchased the product",
    applicableStages: ["product"],
  },
  {
    name: "Feature Education Series",
    purpose: "Educate users on key product features",
    timing: "Post-purchase or post-signup",
    suppression: "Power users",
    applicableStages: ["product"],
  },
  // Price
  {
    name: "Seasonal Sale",
    purpose: "Announce seasonal discounts and offers",
    timing: "Season-specific timing",
    suppression: "Recent full-price purchasers",
    applicableStages: ["price"],
  },
  {
    name: "Price Match Guarantee",
    purpose: "Communicate price match policies to build trust",
    timing: "During consideration phase",
    suppression: "Loyal repeat customers",
    applicableStages: ["price"],
  },
  // Place
  {
    name: "Store Opening Announcement",
    purpose: "Announce new store locations or channels",
    timing: "Pre and post opening",
    suppression: "Users far from location",
    applicableStages: ["place"],
  },
  {
    name: "App Download Push",
    purpose: "Encourage web users to download mobile app",
    timing: "After web engagement",
    suppression: "Existing app users",
    applicableStages: ["place"],
  },
  // Promotion
  {
    name: "Member Exclusive Sale",
    purpose: "Exclusive deals for loyalty members",
    timing: "Monthly or quarterly",
    suppression: "Non-members",
    applicableStages: ["promotion"],
  },
  {
    name: "Referral Bonus Campaign",
    purpose: "Incentivize referrals with bonuses",
    timing: "Post-purchase happy moment",
    suppression: "New or inactive users",
    applicableStages: ["promotion"],
  },
];

// 7P Framework Mappings (extends 4P with People, Process, Physical Evidence)
export const sevenPJourneys: JourneyMapping[] = [
  ...fourPJourneys,
  // People
  {
    name: "Support Team Introduction",
    triggerType: "event",
    description: "Connect users with dedicated support representatives",
    applicableStages: ["people"],
  },
  {
    name: "Community Engagement",
    triggerType: "segment",
    description: "Invite users to community forums or groups",
    applicableStages: ["people"],
  },
  {
    name: "Expert Consultation",
    triggerType: "event",
    description: "Offer expert consultation for high-consideration decisions",
    applicableStages: ["people"],
  },
  // Process
  {
    name: "Onboarding Flow",
    triggerType: "event",
    description: "Step-by-step onboarding with progress tracking",
    applicableStages: ["process"],
  },
  {
    name: "Transaction Updates",
    triggerType: "api",
    description: "Real-time updates on order/service status",
    applicableStages: ["process"],
  },
  {
    name: "Feedback Collection",
    triggerType: "event",
    description: "Collect feedback at key process milestones",
    applicableStages: ["process"],
  },
  // Physical Evidence
  {
    name: "Review Request",
    triggerType: "event",
    description: "Request reviews post-delivery or service completion",
    applicableStages: ["physical_evidence"],
  },
  {
    name: "Case Study Share",
    triggerType: "segment",
    description: "Share relevant case studies and success stories",
    applicableStages: ["physical_evidence"],
  },
  {
    name: "Certification Display",
    triggerType: "schedule",
    description: "Highlight certifications, awards, and trust signals",
    applicableStages: ["physical_evidence"],
  },
];

export const sevenPCampaigns: CampaignMapping[] = [
  ...fourPCampaigns,
  // People
  {
    name: "Team Spotlight",
    purpose: "Humanize brand by showcasing team members",
    timing: "Monthly or quarterly",
    suppression: "None",
    applicableStages: ["people"],
  },
  {
    name: "Expert Webinar Invite",
    purpose: "Invite to webinars led by industry experts",
    timing: "2 weeks before event",
    suppression: "Already registered",
    applicableStages: ["people"],
  },
  // Process
  {
    name: "Process Improvement Update",
    purpose: "Communicate service/process improvements",
    timing: "After implementation",
    suppression: "New users unfamiliar with old process",
    applicableStages: ["process"],
  },
  {
    name: "Self-Service Guide",
    purpose: "Educate users on self-service options",
    timing: "After first support interaction",
    suppression: "Power users",
    applicableStages: ["process"],
  },
  // Physical Evidence
  {
    name: "Annual Report Share",
    purpose: "Share company achievements and milestones",
    timing: "Annually",
    suppression: "None",
    applicableStages: ["physical_evidence"],
  },
  {
    name: "User Success Stories",
    purpose: "Showcase customer success stories and testimonials",
    timing: "Monthly",
    suppression: "Featured customers",
    applicableStages: ["physical_evidence"],
  },
];

// Helper function to get journeys by framework and stage
export const getFrameworkJourneys = (
  framework: string,
  stage?: string
): JourneyMapping[] => {
  let journeys: JourneyMapping[];

  switch (framework) {
    case "aida":
      journeys = aidaJourneys;
      break;
    case "4p":
      journeys = fourPJourneys;
      break;
    case "7p":
      journeys = sevenPJourneys;
      break;
    default:
      return [];
  }

  if (stage) {
    return journeys.filter((j) => j.applicableStages.includes(stage));
  }

  return journeys;
};

// Helper function to get campaigns by framework and stage
export const getFrameworkCampaigns = (
  framework: string,
  stage?: string
): CampaignMapping[] => {
  let campaigns: CampaignMapping[];

  switch (framework) {
    case "aida":
      campaigns = aidaCampaigns;
      break;
    case "4p":
      campaigns = fourPCampaigns;
      break;
    case "7p":
      campaigns = sevenPCampaigns;
      break;
    default:
      return [];
  }

  if (stage) {
    return campaigns.filter((c) => c.applicableStages.includes(stage));
  }

  return campaigns;
};
