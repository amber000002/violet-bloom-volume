import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MousePointer, RefreshCw, User, ArrowRight, Star, Check } from "lucide-react";
import { MagicSelect } from "../ui/MagicSelect";
import { industryConfigs } from "@/data/industryConfig";

interface AMPInspirationTabProps {
  industry: string;
}

type TemplateStyle = "action-first" | "exploration-first";

export const AMPInspirationTab: React.FC<AMPInspirationTabProps> = ({
  industry,
}) => {
  const [selectedUseCase, setSelectedUseCase] = useState("");
  const [templateStyle, setTemplateStyle] = useState<TemplateStyle>("action-first");

  const config = industry ? industryConfigs[industry] : null;

  const useCaseOptions = config
    ? config.ampUseCases.map((uc) => ({ value: uc.id, label: uc.name }))
    : [];

  const selectedUseCaseData = config?.ampUseCases.find((uc) => uc.id === selectedUseCase);

  // Get industry-specific preview content
  const getPreviewContent = () => {
    if (!config || !selectedUseCaseData) return null;

    const industryImages: Record<string, string> = {
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
    };

    return {
      emoji: industryImages[industry] || "📧",
      industryName: config.name,
      useCaseName: selectedUseCaseData.name,
    };
  };

  const previewContent = getPreviewContent();

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
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
            Template Style
          </label>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setTemplateStyle("action-first")}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                templateStyle === "action-first"
                  ? "bg-gradient-magic text-primary-foreground shadow-magic"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border"
              }`}
            >
              Action-first
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setTemplateStyle("exploration-first")}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                templateStyle === "exploration-first"
                  ? "bg-gradient-magic text-primary-foreground shadow-magic"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border"
              }`}
            >
              Exploration-first
            </motion.button>
          </div>
        </div>
      </div>

      {/* Email Preview */}
      {config && selectedUseCase && previewContent ? (
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
                  AMP Email Preview
                </span>
              </div>

              {/* Email Content */}
              <div className="p-6 space-y-6">
                {templateStyle === "action-first" ? (
                  <>
                    {/* Hero Image */}
                    <div className="h-40 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <span className="text-6xl">{previewContent.emoji}</span>
                    </div>

                    {/* Personalized Headline */}
                    <div className="text-center space-y-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-xs text-primary">
                        <User className="w-3 h-3" /> Personalized for you
                      </span>
                      <h3 className="font-display text-xl font-semibold text-foreground">
                        Complete your {previewContent.useCaseName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        We saved your progress—pick up right where you left off.
                      </p>
                    </div>

                    {/* AMP Interaction */}
                    <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          Quick Selection
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/20 text-xs text-secondary">
                          <RefreshCw className="w-3 h-3" /> Updated in real time
                        </span>
                      </div>

                      {/* Interactive Element Mock */}
                      <div className="grid grid-cols-3 gap-2">
                        {["Option A", "Option B", "Option C"].map((option, i) => (
                          <motion.div
                            key={option}
                            whileHover={{ scale: 1.05 }}
                            className={`p-3 rounded-lg text-center text-sm cursor-pointer transition-all ${
                              i === 0
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted/50 text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {option}
                          </motion.div>
                        ))}
                      </div>

                      {/* Dynamic CTA */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3 rounded-lg bg-gradient-magic text-primary-foreground font-medium flex items-center justify-center gap-2"
                      >
                        Confirm Selection <ArrowRight className="w-4 h-4" />
                      </motion.button>
                    </div>

                    {/* Confirmation State */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-accent" />
                      Inline confirmation updates without leaving inbox
                    </div>
                  </>
                ) : (
                  <>
                    {/* Product Carousel */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          Explore Options
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-xs text-primary">
                          <Sparkles className="w-3 h-3" /> Based on last purchase
                        </span>
                      </div>

                      {/* Carousel Mock */}
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {[1, 2, 3].map((item) => (
                          <motion.div
                            key={item}
                            whileHover={{ scale: 1.03 }}
                            className="flex-shrink-0 w-32 rounded-xl overflow-hidden bg-muted/30 border border-border"
                          >
                            <div className="h-24 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                              <span className="text-3xl">{previewContent.emoji}</span>
                            </div>
                            <div className="p-2 text-center">
                              <p className="text-xs font-medium text-foreground">
                                Option {item}
                              </p>
                              <div className="flex justify-center gap-0.5 mt-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3 h-3 ${
                                      i < 4 ? "text-stardust fill-stardust" : "text-muted-foreground"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* AMP Dropdown */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground">
                        What would you like to do?
                      </label>
                      <div className="p-3 rounded-lg bg-muted/50 border border-border flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Select an action...
                        </span>
                        <MousePointer className="w-4 h-4 text-primary" />
                      </div>
                    </div>

                    {/* Inline Actions */}
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        className="flex-1 py-2 rounded-lg bg-muted/50 text-foreground text-sm font-medium border border-border hover:border-primary/50"
                      >
                        💾 Save for later
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        className="flex-1 py-2 rounded-lg bg-muted/50 text-foreground text-sm font-medium border border-border hover:border-primary/50"
                      >
                        🔔 Notify me
                      </motion.button>
                    </div>

                    {/* Personalization Tag */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <RefreshCw className="w-4 h-4 text-secondary" />
                      Schedule and save directly from your inbox
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <span className="text-3xl">⚡</span>
          </div>
          <p className="text-muted-foreground max-w-md">
            {!config
              ? "Select an industry above to explore AMP email templates."
              : "Choose a use case to preview an interactive AMP email template."}
          </p>
        </div>
      )}

      {/* Feature Tags */}
      {config && selectedUseCase && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap justify-center gap-2"
        >
          {[
            { icon: User, label: "Personalized for you" },
            { icon: RefreshCw, label: "Updated in real time" },
            { icon: Sparkles, label: "Based on your history" },
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
