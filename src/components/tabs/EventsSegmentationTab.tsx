import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  MousePointer,
  ShoppingCart,
  CreditCard,
  UserPlus,
  Bell,
  Eye,
  Search,
  Heart,
  Share2,
  Download,
  Filter,
  Users,
  Target,
  Layers,
} from "lucide-react";
import { EventsSegmentationSlides } from "@/components/presentation/EventsSegmentationSlides";

interface EventsSegmentationTabProps {
  industry: string;
  viewMode?: "app" | "presentation";
  onDataChange?: (data: any) => void;
}

type EventCategory = "engagement" | "transaction" | "lifecycle" | "content";

interface EventDefinition {
  name: string;
  description: string;
  category: EventCategory;
  icon: React.ReactNode;
  properties: string[];
  useCases: string[];
}

interface SegmentDefinition {
  name: string;
  description: string;
  events: string[];
  conditions: string[];
  targetingUse: string;
}

const getIndustryEvents = (industry: string): EventDefinition[] => {
  const baseEvents: EventDefinition[] = [
    {
      name: "App Opened",
      description: "User launches the application",
      category: "engagement",
      icon: <Activity className="w-4 h-4" />,
      properties: ["Session ID", "Device Type", "OS Version", "App Version"],
      useCases: ["Re-engagement", "Onboarding", "Feature adoption"],
    },
    {
      name: "Page Viewed",
      description: "User views a specific page or screen",
      category: "engagement",
      icon: <Eye className="w-4 h-4" />,
      properties: ["Page Name", "Page URL", "Referrer", "Time on Page"],
      useCases: ["Content affinity", "Navigation optimization", "Personalization"],
    },
    {
      name: "Search Performed",
      description: "User performs a search query",
      category: "engagement",
      icon: <Search className="w-4 h-4" />,
      properties: ["Search Query", "Results Count", "Category", "Filters Applied"],
      useCases: ["Intent detection", "Catalog gaps", "Recommendations"],
    },
    {
      name: "Push Permission",
      description: "User grants or denies push notification permission",
      category: "lifecycle",
      icon: <Bell className="w-4 h-4" />,
      properties: ["Permission Status", "Prompt Type", "Device Token"],
      useCases: ["Notification strategy", "Channel preference"],
    },
    {
      name: "User Registered",
      description: "User completes registration",
      category: "lifecycle",
      icon: <UserPlus className="w-4 h-4" />,
      properties: ["Registration Method", "Referral Source", "Profile Fields"],
      useCases: ["Onboarding flows", "Welcome series", "Profile completion"],
    },
  ];

  const industrySpecificEvents: Record<string, EventDefinition[]> = {
    ecommerce: [
      {
        name: "Product Viewed",
        description: "User views a product detail page",
        category: "engagement",
        icon: <Eye className="w-4 h-4" />,
        properties: ["Product ID", "Category", "Price", "Inventory Status"],
        useCases: ["Browse abandonment", "Recommendations", "Price drop alerts"],
      },
      {
        name: "Added to Cart",
        description: "User adds item to shopping cart",
        category: "transaction",
        icon: <ShoppingCart className="w-4 h-4" />,
        properties: ["Product ID", "Quantity", "Cart Value", "Variant"],
        useCases: ["Cart abandonment", "Cross-sell", "Inventory alerts"],
      },
      {
        name: "Checkout Started",
        description: "User initiates checkout process",
        category: "transaction",
        icon: <CreditCard className="w-4 h-4" />,
        properties: ["Cart Value", "Item Count", "Coupon Applied", "Payment Method"],
        useCases: ["Checkout abandonment", "Payment recovery", "Upsell"],
      },
      {
        name: "Purchase Completed",
        description: "User completes a transaction",
        category: "transaction",
        icon: <CreditCard className="w-4 h-4" />,
        properties: ["Order ID", "Order Value", "Items", "Payment Method", "Shipping"],
        useCases: ["Post-purchase flows", "Loyalty", "Reviews", "Cross-sell"],
      },
      {
        name: "Added to Wishlist",
        description: "User saves item for later",
        category: "engagement",
        icon: <Heart className="w-4 h-4" />,
        properties: ["Product ID", "Category", "Price"],
        useCases: ["Price drop alerts", "Back in stock", "Gift suggestions"],
      },
    ],
    banking: [
      {
        name: "Account Viewed",
        description: "User checks account balance or details",
        category: "engagement",
        icon: <Eye className="w-4 h-4" />,
        properties: ["Account Type", "Balance Range", "Last Transaction"],
        useCases: ["Financial health", "Product recommendations", "Alerts"],
      },
      {
        name: "Transaction Made",
        description: "User completes a financial transaction",
        category: "transaction",
        icon: <CreditCard className="w-4 h-4" />,
        properties: ["Transaction Type", "Amount", "Category", "Merchant"],
        useCases: ["Spending insights", "Fraud detection", "Budgeting"],
      },
      {
        name: "Bill Payment",
        description: "User pays a bill through the app",
        category: "transaction",
        icon: <CreditCard className="w-4 h-4" />,
        properties: ["Biller", "Amount", "Frequency", "Due Date"],
        useCases: ["Payment reminders", "Auto-pay suggestions", "Rewards"],
      },
      {
        name: "Loan Application Started",
        description: "User begins loan application process",
        category: "lifecycle",
        icon: <Activity className="w-4 h-4" />,
        properties: ["Loan Type", "Amount", "Term", "Stage"],
        useCases: ["Application nurture", "Document collection", "Approval updates"],
      },
    ],
    ott: [
      {
        name: "Content Played",
        description: "User starts playing content",
        category: "content",
        icon: <Activity className="w-4 h-4" />,
        properties: ["Content ID", "Genre", "Duration", "Quality", "Device"],
        useCases: ["Watch history", "Recommendations", "Resume watching"],
      },
      {
        name: "Content Completed",
        description: "User finishes watching content",
        category: "content",
        icon: <Eye className="w-4 h-4" />,
        properties: ["Content ID", "Watch Time", "Completion %", "Next Episode"],
        useCases: ["Binge watching", "Similar content", "Series updates"],
      },
      {
        name: "Added to Watchlist",
        description: "User saves content for later",
        category: "engagement",
        icon: <Heart className="w-4 h-4" />,
        properties: ["Content ID", "Genre", "Release Date"],
        useCases: ["New release alerts", "Personalized recommendations"],
      },
      {
        name: "Content Shared",
        description: "User shares content with others",
        category: "engagement",
        icon: <Share2 className="w-4 h-4" />,
        properties: ["Content ID", "Share Platform", "Recipient Type"],
        useCases: ["Viral content", "Referral programs", "Social proof"],
      },
    ],
    edtech: [
      {
        name: "Course Enrolled",
        description: "User enrolls in a course",
        category: "lifecycle",
        icon: <UserPlus className="w-4 h-4" />,
        properties: ["Course ID", "Category", "Price", "Duration"],
        useCases: ["Onboarding", "Learning path", "Completion incentives"],
      },
      {
        name: "Lesson Completed",
        description: "User completes a lesson or module",
        category: "content",
        icon: <Activity className="w-4 h-4" />,
        properties: ["Lesson ID", "Course ID", "Score", "Time Spent"],
        useCases: ["Progress tracking", "Streak maintenance", "Certificates"],
      },
      {
        name: "Quiz Attempted",
        description: "User takes a quiz or assessment",
        category: "content",
        icon: <Target className="w-4 h-4" />,
        properties: ["Quiz ID", "Score", "Attempts", "Time Taken"],
        useCases: ["Performance insights", "Remedial content", "Achievements"],
      },
      {
        name: "Certificate Earned",
        description: "User earns a completion certificate",
        category: "lifecycle",
        icon: <Download className="w-4 h-4" />,
        properties: ["Certificate ID", "Course", "Score", "Date"],
        useCases: ["Social sharing", "Career updates", "Upsell advanced courses"],
      },
    ],
  };

  const industryKey = industry.toLowerCase().replace(/[^a-z]/g, "");
  const matchedEvents = industrySpecificEvents[industryKey] || industrySpecificEvents.ecommerce;

  return [...baseEvents, ...matchedEvents];
};

const getIndustrySegments = (industry: string): SegmentDefinition[] => {
  const baseSegments: SegmentDefinition[] = [
    {
      name: "New Users",
      description: "Users who registered in the last 7 days",
      events: ["User Registered"],
      conditions: ["Registration Date within 7 days"],
      targetingUse: "Welcome series, onboarding nudges, feature education",
    },
    {
      name: "Dormant Users",
      description: "Users inactive for 30+ days",
      events: ["App Opened", "Page Viewed"],
      conditions: ["Last activity > 30 days ago"],
      targetingUse: "Win-back campaigns, special offers, feedback requests",
    },
    {
      name: "Power Users",
      description: "Highly engaged users with frequent activity",
      events: ["App Opened", "Multiple engagement events"],
      conditions: ["Sessions > 10 in last 30 days", "Multiple feature usage"],
      targetingUse: "Loyalty programs, beta features, referral requests",
    },
  ];

  const industrySegments: Record<string, SegmentDefinition[]> = {
    ecommerce: [
      {
        name: "Cart Abandoners",
        description: "Users who added to cart but didn't purchase",
        events: ["Added to Cart", "Checkout Started"],
        conditions: ["No Purchase in 24 hours", "Cart Value > 0"],
        targetingUse: "Abandonment recovery, incentive offers, payment support",
      },
      {
        name: "High-Value Customers",
        description: "Customers with significant purchase history",
        events: ["Purchase Completed"],
        conditions: ["Total spend > threshold", "Orders > 3"],
        targetingUse: "VIP perks, early access, premium support",
      },
      {
        name: "Wishlist Watchers",
        description: "Users with active wishlist items",
        events: ["Added to Wishlist"],
        conditions: ["Wishlist items > 0", "No recent purchase"],
        targetingUse: "Price drop alerts, stock updates, gift reminders",
      },
    ],
    banking: [
      {
        name: "High Transactors",
        description: "Users with frequent transaction activity",
        events: ["Transaction Made"],
        conditions: ["Transactions > 20/month"],
        targetingUse: "Premium accounts, cashback offers, expense tools",
      },
      {
        name: "Loan Prospects",
        description: "Users showing loan interest signals",
        events: ["Loan Application Started", "Page Viewed (Loans)"],
        conditions: ["Viewed loan pages", "Application incomplete"],
        targetingUse: "Rate offers, application assistance, pre-approval",
      },
    ],
    ott: [
      {
        name: "Binge Watchers",
        description: "Users who watch multiple episodes in a session",
        events: ["Content Played", "Content Completed"],
        conditions: ["Episodes watched > 3 in session"],
        targetingUse: "New season alerts, similar shows, premium content",
      },
      {
        name: "Genre Enthusiasts",
        description: "Users with strong genre preferences",
        events: ["Content Played"],
        conditions: ["80%+ content from single genre"],
        targetingUse: "Genre-specific recommendations, new releases",
      },
    ],
    edtech: [
      {
        name: "Struggling Learners",
        description: "Users with low quiz scores or slow progress",
        events: ["Quiz Attempted", "Lesson Completed"],
        conditions: ["Average score < 60%", "Completion rate < 50%"],
        targetingUse: "Support resources, tutoring, easier content",
      },
      {
        name: "Completion Champions",
        description: "Users who complete courses consistently",
        events: ["Certificate Earned", "Lesson Completed"],
        conditions: ["Completion rate > 90%"],
        targetingUse: "Advanced courses, mentorship, testimonials",
      },
    ],
  };

  const industryKey = industry.toLowerCase().replace(/[^a-z]/g, "");
  const matchedSegments = industrySegments[industryKey] || industrySegments.ecommerce;

  return [...baseSegments, ...matchedSegments];
};

const categoryColors: Record<EventCategory, string> = {
  engagement: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  transaction: "bg-green-500/10 text-green-600 border-green-500/20",
  lifecycle: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  content: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

export const EventsSegmentationTab: React.FC<EventsSegmentationTabProps> = ({
  industry,
  viewMode = "app",
  onDataChange,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | "all">("all");
  const [selectedEvent, setSelectedEvent] = useState<EventDefinition | null>(null);

  const events = useMemo(() => getIndustryEvents(industry), [industry]);
  const segments = useMemo(() => getIndustrySegments(industry), [industry]);

  const filteredEvents = useMemo(() => {
    if (selectedCategory === "all") return events;
    return events.filter((e) => e.category === selectedCategory);
  }, [events, selectedCategory]);

  useEffect(() => {
    if (onDataChange) {
      onDataChange({ events, segments });
    }
  }, [events, segments, onDataChange]);

  if (!industry) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Activity className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          Select an industry vertical to view recommended events and segments.
        </p>
      </div>
    );
  }

  if (viewMode === "presentation") {
    return <EventsSegmentationSlides events={events} segments={segments} industry={industry} />;
  }

  return (
    <div className="space-y-6">
      {/* Events Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Recommended Events
          </h3>

          {/* Category Filter */}
          <div className="flex gap-2">
            {(["all", "engagement", "transaction", "lifecycle", "content"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {filteredEvents.map((event) => (
              <motion.button
                key={event.name}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => setSelectedEvent(selectedEvent?.name === event.name ? null : event)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  selectedEvent?.name === event.name
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`p-2 rounded-lg ${categoryColors[event.category]}`}>
                    {event.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-foreground">{event.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {event.description}
                    </p>
                    <span
                      className={`inline-block mt-2 px-2 py-0.5 text-xs rounded-full border ${
                        categoryColors[event.category]
                      }`}
                    >
                      {event.category}
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* Event Detail Panel */}
        <AnimatePresence>
          {selectedEvent && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 overflow-hidden"
            >
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <h4 className="font-medium text-foreground mb-3">{selectedEvent.name}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Properties</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedEvent.properties.map((prop) => (
                        <span
                          key={prop}
                          className="px-2 py-1 bg-background rounded text-xs text-foreground"
                        >
                          {prop}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Use Cases</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedEvent.useCases.map((uc) => (
                        <span
                          key={uc}
                          className="px-2 py-1 bg-primary/10 rounded text-xs text-primary"
                        >
                          {uc}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Segments Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-xl border border-border p-6"
      >
        <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Recommended Segments
        </h3>

        <div className="space-y-3">
          {segments.map((segment, index) => (
            <motion.div
              key={segment.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    {segment.name}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">{segment.description}</p>

                  <div className="mt-3 flex flex-wrap gap-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Events Used</p>
                      <div className="flex flex-wrap gap-1">
                        {segment.events.map((event) => (
                          <span
                            key={event}
                            className="px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded text-xs"
                          >
                            {event}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Conditions</p>
                      <div className="flex flex-wrap gap-1">
                        {segment.conditions.map((cond) => (
                          <span
                            key={cond}
                            className="px-2 py-0.5 bg-muted rounded text-xs text-foreground"
                          >
                            {cond}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 max-w-[200px]">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Targeting Use</p>
                  <p className="text-xs text-foreground">{segment.targetingUse}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Helper Text */}
      <p className="text-xs text-muted-foreground text-center">
        Events and segments are tailored to your industry. Use these as a foundation for your
        CleverTap implementation.
      </p>
    </div>
  );
};
