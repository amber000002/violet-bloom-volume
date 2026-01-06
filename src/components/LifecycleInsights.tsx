import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Clock, AlertTriangle } from "lucide-react";
import { IndustryConfig } from "@/data/industryConfig";

interface LifecycleInsightsProps {
  industry: IndustryConfig | null;
}

export const LifecycleInsights: React.FC<LifecycleInsightsProps> = ({
  industry,
}) => {
  if (!industry) return null;

  const insights = [
    {
      icon: Clock,
      title: "Purchase Cycle",
      content: industry.purchaseCycle,
    },
    {
      icon: Sparkles,
      title: "Why This Works",
      content: industry.frequencyReason,
    },
    {
      icon: AlertTriangle,
      title: "Fatigue Risk",
      content: industry.fatigueRisk,
    },
  ];

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
    >
      <h3 className="font-display text-lg font-semibold text-foreground">
        Lifecycle Insights for {industry.name}
      </h3>
      <div className="space-y-3">
        {insights.map((insight, index) => (
          <motion.div
            key={insight.title}
            className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <insight.icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {insight.title}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {insight.content}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
