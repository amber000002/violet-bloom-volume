import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Mail, Wand2 } from "lucide-react";
import { MagicSelect } from "./ui/MagicSelect";
import { MagicInput } from "./ui/MagicInput";
import { MagicRadio } from "./ui/MagicRadio";
import { VolumeDisplay } from "./VolumeDisplay";
import { LifecycleInsights } from "./LifecycleInsights";
import { GrowthInsight } from "./GrowthInsight";
import { Sparkles } from "./Sparkles";
import {
  industryConfigs,
  maturityModifiers,
  activeUserDefinitions,
} from "@/data/industryConfig";

const industryOptions = Object.entries(industryConfigs).map(([key, config]) => ({
  value: key,
  label: config.name,
}));

const maturityOptions = [
  {
    value: "early",
    label: "Early",
    description: "Mostly batch campaigns",
  },
  {
    value: "growing",
    label: "Growing",
    description: "Some lifecycle journeys",
  },
  {
    value: "mature",
    label: "Mature",
    description: "Behavior-led orchestration",
  },
];

const activeUserOptions = Object.entries(activeUserDefinitions).map(
  ([key, config]) => ({
    value: key,
    label: config.label,
  })
);

export const EmailBenchmark: React.FC = () => {
  const [industry, setIndustry] = useState("");
  const [databaseSize, setDatabaseSize] = useState("1,000,000");
  const [maturity, setMaturity] = useState("growing");
  const [activeUserDef, setActiveUserDef] = useState("30-days");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const calculation = useMemo(() => {
    if (!industry || !databaseSize) {
      return null;
    }

    const config = industryConfigs[industry];
    if (!config) return null;

    const dbSize = parseInt(databaseSize.replace(/,/g, ""), 10) || 0;
    const maturityMod = maturityModifiers[maturity as keyof typeof maturityModifiers] || 1;
    const activeDefMod = activeUserDefinitions[activeUserDef as keyof typeof activeUserDefinitions]?.multiplier || 1;

    const activeUsers = dbSize * config.activeUserPercent * activeDefMod;
    const inactiveUsers = dbSize * (1 - config.activeUserPercent * activeDefMod);

    const activeVolumeMin =
      activeUsers *
      config.activeFrequencyMin *
      config.lifecycleMultiplier *
      maturityMod;
    const activeVolumeMax =
      activeUsers *
      config.activeFrequencyMax *
      config.lifecycleMultiplier *
      maturityMod;

    const inactiveVolumeMin = inactiveUsers * config.inactiveFrequencyMin;
    const inactiveVolumeMax = inactiveUsers * config.inactiveFrequencyMax;

    const totalMin = activeVolumeMin + inactiveVolumeMin;
    const totalMax = activeVolumeMax + inactiveVolumeMax;

    const avgActiveVolume = (activeVolumeMin + activeVolumeMax) / 2;
    const avgInactiveVolume = (inactiveVolumeMin + inactiveVolumeMax) / 2;

    return {
      minVolume: Math.round(totalMin),
      maxVolume: Math.round(totalMax),
      activeVolume: Math.round(avgActiveVolume),
      inactiveVolume: Math.round(avgInactiveVolume),
      config,
    };
  }, [industry, databaseSize, maturity, activeUserDef]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Sparkles count={40} />

      {/* Background Glow Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[120px]" />

      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-magic flex items-center justify-center shadow-magic">
              <Mail className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-magic flex items-center justify-center shadow-magic float">
              <Wand2 className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-gradient-magic mb-3">
            Email Volume Enchanter
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover your responsible, lifecycle-led email volume—grounded in buyer behavior and sustainable scale.
          </p>
        </motion.div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Input Panel */}
          <motion.div
            className="magic-card rounded-2xl p-6 md:p-8"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="font-display text-2xl font-semibold text-foreground mb-6">
              Your Email Universe
            </h2>

            <div className="space-y-6">
              {/* Industry */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Industry Vertical <span className="text-secondary">*</span>
                </label>
                <MagicSelect
                  value={industry}
                  onValueChange={setIndustry}
                  placeholder="Select your industry"
                  options={industryOptions}
                />
              </div>

              {/* Database Size */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Database Size <span className="text-secondary">*</span>
                </label>
                <MagicInput
                  value={databaseSize}
                  onChange={setDatabaseSize}
                  placeholder="1,000,000"
                  type="number"
                  helperText="Total opted-in email users"
                />
              </div>

              {/* Maturity */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Program Maturity
                </label>
                <MagicRadio
                  value={maturity}
                  onValueChange={setMaturity}
                  options={maturityOptions}
                />
                <p className="text-xs text-muted-foreground mt-2 italic">
                  This helps fine-tune frequency safely.
                </p>
              </div>

              {/* Advanced Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <motion.div
                    animate={{ rotate: showAdvanced ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.div>
                  Advanced Options
                </button>

                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4">
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Active User Definition
                        </label>
                        <MagicSelect
                          value={activeUserDef}
                          onValueChange={setActiveUserDef}
                          placeholder="Select definition"
                          options={activeUserOptions}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Output Panel */}
          <motion.div
            className="magic-card rounded-2xl p-6 md:p-8 pulse-glow"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h2 className="font-display text-2xl font-semibold text-foreground mb-6">
              Your Enchanted Forecast
            </h2>

            {calculation ? (
              <div className="space-y-8">
                <VolumeDisplay
                  minVolume={calculation.minVolume}
                  maxVolume={calculation.maxVolume}
                  activeVolume={calculation.activeVolume}
                  inactiveVolume={calculation.inactiveVolume}
                />

                <LifecycleInsights industry={calculation.config} />

                <GrowthInsight />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Wand2 className="w-10 h-10 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  Select your industry and enter your database size to reveal your email forecast.
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Footer */}
        <motion.p
          className="text-center text-sm text-muted-foreground mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Crafted for sustainable, buyer-aligned email programs ✨
        </motion.p>
      </div>
    </div>
  );
};
