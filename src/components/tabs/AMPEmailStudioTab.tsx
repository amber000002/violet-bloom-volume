import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, RefreshCw, User, ArrowRight, Star, Gift,
  ChevronLeft, ChevronRight, Globe, Check, Percent, Trophy
} from "lucide-react";
import { MagicSelect } from "../ui/MagicSelect";
import { MagicInput } from "../ui/MagicInput";
import { industryConfigs, AMPUseCase, getInferredBusinessModel, FrameworkType } from "@/data/industryConfig";

import { ViewMode } from "@/hooks/usePresentationMode";
import { AMPStudioSlides } from "../presentation/AMPStudioSlides";

interface AMPEmailStudioTabProps {
  industry: string;
  viewMode?: ViewMode;
  onDataChange?: (data: any) => void;
}

type TemplateStyle = "brand-carousel" | "gamified";

const templateStyleOptions = [
  { id: "brand-carousel" as const, label: "Brand-led Carousel" },
  { id: "gamified" as const, label: "Gamified Interactive" },
];

// Industries that should never show gamification
const noGamificationIndustries = ["banking", "insurance", "healthcare", "nbfcs", "amcs"];

export const AMPEmailStudioTab: React.FC<AMPEmailStudioTabProps> = ({
  industry,
  viewMode = "app",
  onDataChange,
}) => {
  const [selectedUseCase, setSelectedUseCase] = useState("");
  const [templateStyle, setTemplateStyle] = useState<TemplateStyle>("brand-carousel");
  const [websiteUrl, setWebsiteUrl] = useState("");

  const config = industry ? industryConfigs[industry] : null;
  
  // Get inferred business model for template adaptation
  const inferredBusinessModel = useMemo(() => {
    if (!industry) return null;
    return getInferredBusinessModel(industry);
  }, [industry]);
  
  // Check if gamification is appropriate for this industry
  const supportsGamification = config?.supportsGamification ?? false;
  const showGamificationWarning = templateStyle === "gamified" && !supportsGamification;

  // Filter AMP use cases based on template style
  const useCaseOptions = useMemo(() => {
    if (!config) return [];
    
    if (templateStyle === "gamified") {
      // Only show use cases that support gamification
      return config.ampUseCases
        .filter(uc => uc.supportsGamification)
        .map(uc => ({ value: uc.id, label: uc.name }));
    }
    
    return config.ampUseCases.map(uc => ({ value: uc.id, label: uc.name }));
  }, [config, templateStyle]);

  const selectedUseCaseData = config?.ampUseCases.find((uc) => uc.id === selectedUseCase);

  // AMP benefits based on industry
  const ampBenefits = useMemo(() => {
    if (!config) return [];
    return [
      `Reduce app dependency for quick actions in ${config.name}`,
      "Increase engagement with in-email interactivity",
      "Provide real-time content updates",
      "Shorten user journeys from email to conversion",
    ];
  }, [config]);

  // Guardrails
  const guardrails = [
    "Ensure graceful fallback for non-AMP clients",
    "Keep interactions simple and purposeful",
    "Test across email clients thoroughly",
  ];

  // Report data changes for export
  useEffect(() => {
    if (onDataChange && config) {
      onDataChange({
        industry: config.name,
        ampBenefits,
        useCases: config.ampUseCases.map(uc => uc.name),
        guardrails,
        supportsGamification: config.supportsGamification,
        selectedUseCase: selectedUseCaseData?.name || "",
        templateStyle,
      });
    }
  }, [config, ampBenefits, selectedUseCaseData, templateStyle, onDataChange]);

  // Reset use case when template style changes
  React.useEffect(() => {
    if (useCaseOptions.length > 0 && !useCaseOptions.find(uc => uc.value === selectedUseCase)) {
      setSelectedUseCase(useCaseOptions[0].value);
    }
  }, [useCaseOptions, selectedUseCase]);

  // Get industry-specific content
  const getIndustryEmoji = () => {
    const emojis: Record<string, string> = {
      banking: "🏦",
      "travel-hospitality": "✈️",
      "food-tech": "🍔",
      beauty: "💄",
      "apparel-fashion": "👗",
      edtech: "📚",
      healthcare: "🏥",
      gaming: "🎮",
      ott: "🎬",
      fintech: "💳",
      "quick-commerce": "🛒",
      retail: "🛍️",
      "ticket-booking": "🎫",
      "fitness-wellness": "💪",
    };
    return emojis[industry] || "📧";
  };

  const getCarouselItems = () => {
    const items: Record<string, string[]> = {
      "quick-commerce": ["Fresh Produce", "Daily Essentials", "Snacks"],
      ott: ["Action Movie", "Comedy Series", "Documentary"],
      "travel-hospitality": ["Beach Resort", "Mountain Lodge", "City Hotel"],
      banking: ["Savings Plan", "Credit Card", "Investment"],
      "apparel-fashion": ["Summer Dress", "Casual Jacket", "Accessories"],
      beauty: ["Skincare Set", "Lipstick", "Face Serum"],
      "food-tech": ["Pizza", "Burgers", "Healthy Bowl"],
    };
    return items[industry] || ["Option 1", "Option 2", "Option 3"];
  };

  if (!industry) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <span className="text-3xl">⚡</span>
        </div>
        <p className="text-muted-foreground max-w-md">
          Select an industry above to explore AMP email templates.
        </p>
      </div>
    );
  }

  // Presentation view
  if (viewMode === "presentation") {
    return (
      <AMPStudioSlides
        industry={config?.name || ""}
        ampUseCases={config?.ampUseCases || []}
        supportsGamification={supportsGamification}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {/* Use Case Dropdown */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Use Case
          </label>
          <MagicSelect
            value={selectedUseCase}
            onValueChange={setSelectedUseCase}
            placeholder="Select a use case"
            options={useCaseOptions}
          />
        </div>

        {/* Template Style */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Template Layout
          </label>
          <div className="flex gap-2">
            {templateStyleOptions.map((option) => {
              const isDisabled = option.id === "gamified" && !supportsGamification;
              return (
                <motion.button
                  key={option.id}
                  whileHover={!isDisabled ? { scale: 1.02 } : undefined}
                  whileTap={!isDisabled ? { scale: 0.98 } : undefined}
                  onClick={() => !isDisabled && setTemplateStyle(option.id)}
                  disabled={isDisabled}
                  className={`flex-1 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                    templateStyle === option.id
                      ? "bg-gradient-magic text-primary-foreground shadow-magic"
                      : isDisabled
                      ? "bg-muted/30 text-muted-foreground/50 cursor-not-allowed"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border"
                  }`}
                >
                  {option.label}
                </motion.button>
              );
            })}
          </div>
          {!supportsGamification && (
            <p className="text-xs text-muted-foreground mt-1">
              Gamification not recommended for {config?.name}
            </p>
          )}
        </div>

        {/* Website URL */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Website URL <span className="text-muted-foreground">(optional)</span>
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yoursite.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Used to simulate relevant imagery.
          </p>
        </div>
      </div>

      {/* Email Preview */}
      {selectedUseCase && (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedUseCase}-${templateStyle}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-lg mx-auto"
          >
            {/* Email Frame */}
            <div className="magic-card rounded-2xl overflow-hidden">
              {/* Email Header */}
              <div className="bg-muted/50 px-4 py-3 border-b border-border flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/50" />
                  <div className="w-3 h-3 rounded-full bg-stardust/50" />
                  <div className="w-3 h-3 rounded-full bg-accent/50" />
                </div>
                <span className="text-xs text-muted-foreground">
                  AMP Email Preview — {templateStyle === "brand-carousel" ? "Brand-led Carousel" : "Gamified Interactive"}
                </span>
              </div>

              {/* Email Content */}
              <div className="p-6 space-y-6">
                {templateStyle === "brand-carousel" ? (
                  <BrandCarouselTemplate 
                    emoji={getIndustryEmoji()} 
                    industryName={config?.name || ""}
                    useCaseName={selectedUseCaseData?.name || ""}
                    carouselItems={getCarouselItems()}
                    websiteUrl={websiteUrl}
                  />
                ) : (
                  <GamifiedTemplate 
                    emoji={getIndustryEmoji()} 
                    industryName={config?.name || ""}
                    useCaseName={selectedUseCaseData?.name || ""}
                  />
                )}

                {/* Footer */}
                <div className="pt-4 border-t border-border">
                  <div className="flex justify-center gap-4 mb-3">
                    {["📘", "📸", "🐦", "💼"].map((icon, i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-sm">
                        {icon}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                    <span className="hover:text-foreground cursor-pointer">Preferences</span>
                    <span>•</span>
                    <span className="hover:text-foreground cursor-pointer">Unsubscribe</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Personalization Tags */}
      {selectedUseCase && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap justify-center gap-2"
        >
          {[
            { icon: User, label: "Personalized using past behavior" },
            { icon: RefreshCw, label: "Updated in real time" },
            { icon: Sparkles, label: "No app required" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/30 border border-border text-xs text-muted-foreground"
            >
              <Icon className="w-3 h-3" />
              {label}
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

// Brand-led Carousel Template Component
const BrandCarouselTemplate: React.FC<{
  emoji: string;
  industryName: string;
  useCaseName: string;
  carouselItems: string[];
  websiteUrl: string;
}> = ({ emoji, industryName, useCaseName, carouselItems, websiteUrl }) => {
  const [activeSlide, setActiveSlide] = useState(0);

  return (
    <>
      {/* Brand Logo */}
      <div className="flex justify-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-magic flex items-center justify-center">
          <span className="text-2xl">{emoji}</span>
        </div>
      </div>

      {/* Hero Carousel */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveSlide((prev) => (prev - 1 + carouselItems.length) % carouselItems.length)}
            className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex-1 overflow-hidden">
            <div className="flex gap-3 transition-transform duration-300" style={{ transform: `translateX(-${activeSlide * 110}%)` }}>
              {carouselItems.map((item, i) => (
                <motion.div
                  key={item}
                  className="flex-shrink-0 w-full rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10 border border-border"
                >
                  <div className="h-32 flex items-center justify-center">
                    <span className="text-4xl">{emoji}</span>
                  </div>
                  <div className="p-3 text-center">
                    <p className="text-sm font-medium text-foreground">{item}</p>
                    <div className="flex justify-center gap-0.5 mt-1">
                      {[...Array(5)].map((_, j) => (
                        <Star
                          key={j}
                          className={`w-3 h-3 ${j < 4 ? "text-stardust fill-stardust" : "text-muted-foreground"}`}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          <button 
            onClick={() => setActiveSlide((prev) => (prev + 1) % carouselItems.length)}
            className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        {/* Dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {carouselItems.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === activeSlide ? "bg-primary w-4" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Personalized Headline */}
      <div className="text-center space-y-2">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-xs text-primary">
          <User className="w-3 h-3" /> Personalized for you
        </span>
        <h3 className="font-display text-xl font-semibold text-foreground">
          {useCaseName}
        </h3>
        <p className="text-sm text-muted-foreground">
          Curated based on your preferences and history.
        </p>
      </div>

      {/* CTA Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-3 rounded-lg bg-gradient-magic text-primary-foreground font-medium flex items-center justify-center gap-2"
      >
        Explore Now <ArrowRight className="w-4 h-4" />
      </motion.button>

      {/* Supporting Text */}
      <p className="text-center text-xs text-muted-foreground">
        <RefreshCw className="w-3 h-3 inline mr-1" />
        Content updates in real time
      </p>
    </>
  );
};

// Gamified Interactive Template Component
const GamifiedTemplate: React.FC<{
  emoji: string;
  industryName: string;
  useCaseName: string;
}> = ({ emoji, industryName, useCaseName }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [spinAngle, setSpinAngle] = useState(0);

  const handleSpin = () => {
    setSpinAngle(prev => prev + 720 + Math.random() * 360);
    setTimeout(() => setIsRevealed(true), 2000);
  };

  return (
    <>
      {/* Contextual Hero */}
      <div className="h-32 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)]" />
        <span className="text-5xl relative z-10">{emoji}</span>
        <Gift className="absolute bottom-3 right-3 w-6 h-6 text-stardust animate-pulse" />
      </div>

      {/* Interactive Element - Spin Wheel */}
      <div className="text-center space-y-4">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Spin to Win!
        </h3>
        <p className="text-sm text-muted-foreground">
          Try your luck and unlock an exclusive reward.
        </p>

        {/* Spin Wheel Visual */}
        <div className="relative w-40 h-40 mx-auto">
          <motion.div
            className="w-full h-full rounded-full border-4 border-primary/30 relative overflow-hidden"
            style={{ rotate: spinAngle }}
            transition={{ duration: 2, ease: "easeOut" }}
          >
            {[0, 1, 2, 3, 4, 5].map((segment) => (
              <div
                key={segment}
                className="absolute inset-0"
                style={{
                  background: segment % 2 === 0 
                    ? "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%)"
                    : "linear-gradient(135deg, hsl(var(--secondary)) 0%, hsl(var(--secondary)) 100%)",
                  clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos((segment * 60 - 30) * Math.PI / 180)}% ${50 + 50 * Math.sin((segment * 60 - 30) * Math.PI / 180)}%, ${50 + 50 * Math.cos((segment * 60 + 30) * Math.PI / 180)}% ${50 + 50 * Math.sin((segment * 60 + 30) * Math.PI / 180)}%)`,
                }}
              />
            ))}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center">
                <Trophy className="w-4 h-4 text-stardust" />
              </div>
            </div>
          </motion.div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[16px] border-l-transparent border-r-transparent border-b-primary" />
        </div>

        {!isRevealed ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSpin}
            className="px-6 py-3 rounded-lg bg-gradient-magic text-primary-foreground font-medium"
          >
            Spin the Wheel!
          </motion.button>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-xl bg-gradient-to-br from-stardust/20 to-stardust/5 border border-stardust/30"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-stardust" />
              <span className="font-display font-semibold text-foreground">You won!</span>
            </div>
            <p className="text-2xl font-bold text-gradient-magic">20% OFF</p>
            <p className="text-xs text-muted-foreground mt-1">Your next purchase</p>
          </motion.div>
        )}
      </div>

      {/* CTA */}
      {isRevealed && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3 rounded-lg bg-gradient-magic text-primary-foreground font-medium flex items-center justify-center gap-2"
        >
          Claim Your Reward <ArrowRight className="w-4 h-4" />
        </motion.button>
      )}

      {/* Trust Badge */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Check className="w-4 h-4 text-accent" />
        <span>Reward applied instantly to your account</span>
      </div>
    </>
  );
};
