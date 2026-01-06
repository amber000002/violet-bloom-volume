import React from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

export const GrowthInsight: React.FC = () => {
  return (
    <motion.div
      className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-magic flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground mb-2">
            Growth Insight
          </p>
          <p className="text-sm text-muted-foreground">
            You could safely increase email impact by improving:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Lifecycle journeys
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Active user ratio
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Suppression hygiene
            </li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
};
