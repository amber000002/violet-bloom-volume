import React from "react";
import { motion } from "framer-motion";

interface VolumeDisplayProps {
  minVolume: number;
  maxVolume: number;
  activeVolume: number;
  inactiveVolume: number;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(0)}K`;
  }
  return num.toFixed(0);
};

export const VolumeDisplay: React.FC<VolumeDisplayProps> = ({
  minVolume,
  maxVolume,
  activeVolume,
  inactiveVolume,
}) => {
  const total = activeVolume + inactiveVolume;
  const activePercent = total > 0 ? (activeVolume / total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Primary Volume Display */}
      <div className="text-center">
        <motion.div
          className="inline-block"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sm text-muted-foreground mb-2 tracking-wide uppercase">
            Estimated Responsible Monthly Volume
          </p>
          <div className="relative">
            <motion.div
              className="text-5xl md:text-6xl font-display font-bold text-gradient-magic"
              key={`${minVolume}-${maxVolume}`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              ≈ {formatNumber(minVolume)} – {formatNumber(maxVolume)}
            </motion.div>
            <p className="text-muted-foreground mt-2">emails per month</p>
          </div>
        </motion.div>
      </div>

      {/* Volume Breakdown Bar */}
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <p className="text-sm font-medium text-foreground">Volume Breakdown</p>
        <div className="h-4 rounded-full overflow-hidden bg-muted/50 relative">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-magic rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${activePercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-magic" />
            <span className="text-foreground">
              Active users: <span className="font-semibold">{formatNumber(activeVolume)}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-muted-foreground/50" />
            <span className="text-muted-foreground">
              Re-engagement: <span className="font-semibold">{formatNumber(inactiveVolume)}</span>
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground italic">
          Most volume should come from active, high-intent users.
        </p>
      </motion.div>
    </div>
  );
};
