import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Sparkles as SparklesIcon, Zap } from "lucide-react";
import { MagicSelect } from "./ui/MagicSelect";
import { Sparkles } from "./Sparkles";
import { InboxPotentialTab } from "./tabs/InboxPotentialTab";
import { UseCaseStudioTab } from "./tabs/UseCaseStudioTab";
import { AMPEmailStudioTab } from "./tabs/AMPEmailStudioTab";
import { industryConfigs, businessModels, BusinessModelId } from "@/data/industryConfig";

const industryOptions = Object.entries(industryConfigs).map(([key, config]) => ({
  value: key,
  label: config.name,
}));

const businessModelOptions = businessModels.map((model) => ({
  value: model.id,
  label: model.label,
}));

const tabs = [
  { id: "inbox-potential", label: "Inbox Potential", icon: Mail },
  { id: "use-case-studio", label: "Use Case Studio", icon: SparklesIcon },
  { id: "amp-email-studio", label: "AMP Email Studio", icon: Zap },
] as const;

type TabId = typeof tabs[number]["id"];

export const InboxAlchemy: React.FC = () => {
  const [industry, setIndustry] = useState("");
  const [businessModel, setBusinessModel] = useState<BusinessModelId | "">("");
  const [activeTab, setActiveTab] = useState<TabId>("inbox-potential");

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Sparkles count={40} />

      {/* Background Glow Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[120px]" />

      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-magic flex items-center justify-center shadow-magic float">
              <Mail className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-gradient-magic mb-3">
            Inbox Alchemy
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Design lifecycle-led emails your customers actually want to receive.
          </p>
        </motion.div>

        {/* Global Controls - Sticky Header */}
        <motion.div
          className="sticky top-4 z-20 bg-background/80 backdrop-blur-xl rounded-2xl border border-border p-4 md:p-6 mb-8 shadow-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Industry Vertical <span className="text-secondary">*</span>
              </label>
              <MagicSelect
                value={industry}
                onValueChange={setIndustry}
                placeholder="Choose your industry"
                options={industryOptions}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Choose the industry closest to your core customer behavior.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Business Model <span className="text-secondary">*</span>
              </label>
              <MagicSelect
                value={businessModel}
                onValueChange={(value) => setBusinessModel(value as BusinessModelId)}
                placeholder="Select your model"
                options={businessModelOptions}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                This helps tailor journeys and frequency realistically.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          className="flex flex-wrap justify-center gap-2 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === tab.id
                  ? "bg-gradient-magic text-primary-foreground shadow-magic"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </motion.button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-6xl mx-auto"
          >
            {activeTab === "inbox-potential" && (
              <InboxPotentialTab industry={industry} />
            )}
            {activeTab === "use-case-studio" && (
              <UseCaseStudioTab industry={industry} businessModel={businessModel} />
            )}
            {activeTab === "amp-email-studio" && (
              <AMPEmailStudioTab industry={industry} businessModel={businessModel} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <motion.p
          className="text-center text-sm text-muted-foreground mt-12 italic"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          "Inbox excellence is built on relevance, not volume."
        </motion.p>
      </div>
    </div>
  );
};
