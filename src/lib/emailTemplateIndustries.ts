export interface IndustryOption {
  value: string;
  label: string;
}

export const EMAIL_TEMPLATE_INDUSTRIES: IndustryOption[] = [
  { value: "banking", label: "Banking" },
  { value: "nbfcs", label: "NBFCs" },
  { value: "amcs", label: "AMCs" },
  { value: "insurance", label: "Insurance" },
  { value: "travel-hospitality", label: "Travel & Hospitality" },
  { value: "aviation", label: "Aviation" },
  { value: "cab-aggregators", label: "Cab Aggregators" },
  { value: "food-tech", label: "Food Tech" },
  { value: "apparel-fashion", label: "Apparel & Fashion" },
  { value: "retail", label: "Retail" },
  { value: "quick-commerce", label: "Quick Commerce" },
  { value: "beauty", label: "Beauty" },
  { value: "edtech", label: "Ed-tech" },
  { value: "fintech", label: "FinTech" },
  { value: "ott", label: "OTT" },
  { value: "healthcare", label: "Healthcare" },
  { value: "gaming", label: "Gaming" },
  { value: "news-media", label: "News & Media" },
  { value: "telecom", label: "Telecom" },
  { value: "home-services", label: "Home Services" },
  { value: "ticket-booking", label: "Ticket Booking" },
  { value: "real-estate", label: "Real Estate" },
  { value: "job-portals", label: "Job Portals" },
  { value: "d2c-subscriptions", label: "D2C Subscriptions" },
  { value: "fitness-wellness", label: "Fitness & Wellness" },
  { value: "education-marketplace", label: "Education Marketplaces" },
  { value: "auto-mobility", label: "Auto & Mobility" },
  { value: "other", label: "Other" },
];

export function industryLabel(value: string | null | undefined): string {
  if (!value) return "";
  return EMAIL_TEMPLATE_INDUSTRIES.find((i) => i.value === value)?.label ?? value;
}
