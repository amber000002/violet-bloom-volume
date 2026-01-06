import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Zap, Shield, Lightbulb } from "lucide-react";
import {
  industryConfigs,
  lifecycleStages,
  LifecycleStageId,
  LifecycleUseCase,
} from "@/data/industryConfig";

interface LifecycleUseCasesTabProps {
  industry: string;
}

export const LifecycleUseCasesTab: React.FC<LifecycleUseCasesTabProps> = ({
  industry,
}) => {
  const [selectedStage, setSelectedStage] = useState<LifecycleStageId>("newUser");

  const config = industry ? industryConfigs[industry] : null;
  const useCases: LifecycleUseCase[] = config
    ? config.lifecycleUseCases[selectedStage]
    : [];

  const getInsightBanner = (): string | null => {
    if (!industry) return null;

    const insights: Record<string, Record<LifecycleStageId, string>> = {
      beauty: {
        newUser: "First impressions matter—personalization from day one builds lasting loyalty.",
        browsing: "In beauty, education often converts better than discounts.",
        firstPurchase: "How-to content with purchases drives repurchases more than promotions.",
        repeatCustomer: "In replenishment-led categories, education often outperforms discounts.",
        lapsed: "A caring check-in works better than aggressive win-back offers.",
      },
      "food-tech": {
        newUser: "Speed to first order is everything in food delivery.",
        browsing: "Meal-time relevance beats generic discount emails.",
        firstPurchase: "Fresh feedback capture while taste memory is strong.",
        repeatCustomer: "Predictive suggestions based on past orders drive habitual ordering.",
        lapsed: "Short inactivity windows require quick, personalized re-engagement.",
      },
      "travel-hospitality": {
        newUser: "Dream-worthy inspiration converts browsers to planners.",
        browsing: "Travel intent windows are short—capture them quickly.",
        firstPurchase: "Pre-trip excitement emails have the highest engagement rates.",
        repeatCustomer: "Nostalgia-driven suggestions for past destinations drive rebooking.",
        lapsed: "Travel FOMO with trending destinations reignites wanderlust.",
      },
      edtech: {
        newUser: "Early momentum prevents the biggest drop-off point.",
        browsing: "Career outcome stories address the ROI question upfront.",
        firstPurchase: "Community and accountability prevent course abandonment.",
        repeatCustomer: "Completion celebrations and next-step suggestions maintain learning momentum.",
        lapsed: "Progress preservation messaging prevents restart friction.",
      },
    };

    const industryInsights = insights[industry];
    if (industryInsights) {
      return industryInsights[selectedStage];
    }

    // Default insights by stage
    const defaultInsights: Record<LifecycleStageId, string> = {
      newUser: "First impressions set the tone—make onboarding feel personal, not automated.",
      browsing: "Intent signals are precious—act on them thoughtfully, not aggressively.",
      firstPurchase: "Post-purchase is trust-building time, not upselling time.",
      repeatCustomer: "Loyal customers want recognition, not more sales pressure.",
      lapsed: "Win-back works best when it addresses why they left, not just offers discounts.",
    };

    return defaultInsights[selectedStage];
  };

  return (
    <div className="space-y-8">
      {/* Stage Selector */}
      <div className="flex flex-wrap gap-2 justify-center">
        {lifecycleStages.map((stage) => (
          <motion.button
            key={stage.id}
            onClick={() => setSelectedStage(stage.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
              selectedStage === stage.id
                ? "bg-gradient-magic text-primary-foreground shadow-magic"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
            }`}
          >
            {stage.label}
          </motion.button>
        ))}
      </div>

      {/* Use Case Cards */}
      {config ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedStage}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {useCases.map((useCase, index) => (
              <motion.div
                key={useCase.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="magic-card rounded-xl p-6 space-y-4"
              >
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {useCase.name}
                </h3>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Trigger / Timing
                      </p>
                      <p className="text-sm text-foreground">{useCase.trigger}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-secondary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Why It Works
                      </p>
                      <p className="text-sm text-foreground">{useCase.whyItWorks}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Frequency Guardrail
                      </p>
                      <p className="text-sm text-foreground">{useCase.frequencyGuardrail}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <span className="text-3xl">📧</span>
          </div>
          <p className="text-muted-foreground">
            Select an industry above to discover lifecycle use cases.
          </p>
        </div>
      )}

      {/* Insight Banner */}
      {config && getInsightBanner() && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-magic flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-primary-foreground" />
            </div>
            <p className="text-sm text-foreground italic">
              "{getInsightBanner()}"
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};
