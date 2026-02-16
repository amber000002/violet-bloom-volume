import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, TrendingUp, Shield, Lightbulb, BarChart3, Layers, Brain,
  ChevronDown, ChevronUp, Zap, Users, AlertTriangle, Calendar, ArrowRight,
  CheckCircle2, Clock
} from "lucide-react";
import {
  StrategicInsightsOutput,
  ConfidenceLevel,
  EffortLevel,
  CoverageStrength,
  SophisticationTier,
} from "@/lib/strategicInsightsEngine";

interface StrategicInsightsProps {
  data: StrategicInsightsOutput;
}

// Collapsible section for the strategic view
const StrategySection: React.FC<{
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, icon, defaultOpen = true, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <motion.div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.4)",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.04)",
        borderTop: "2px solid transparent",
        borderImage: "linear-gradient(to right, #A855F7, #FB7185) 1",
        borderImageSlice: "1 1 0 0",
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 hover:bg-muted/10 transition-colors"
      >
        <h3 className="font-display text-lg font-bold text-gradient-magic flex items-center gap-2">
          {icon}
          {title}
        </h3>
        {isOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 pb-6"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const CoverageBadge: React.FC<{ coverage: CoverageStrength }> = ({ coverage }) => {
  const colors: Record<CoverageStrength, string> = {
    Strong: "bg-green-100 text-green-700",
    Partial: "bg-amber-100 text-amber-700",
    Weak: "bg-orange-100 text-orange-700",
    Missing: "bg-red-100 text-red-700",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[coverage]}`}>{coverage}</span>;
};

const ConfidenceBadge: React.FC<{ level: ConfidenceLevel }> = ({ level }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${level === "High" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
    {level}
  </span>
);

const EffortBadge: React.FC<{ level: EffortLevel }> = ({ level }) => {
  const colors: Record<EffortLevel, string> = {
    Low: "bg-green-50 text-green-600",
    Moderate: "bg-blue-50 text-blue-600",
    High: "bg-purple-50 text-purple-600",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[level]}`}>{level} Effort</span>;
};

const SeverityBadge: React.FC<{ severity: "High" | "Medium" | "Low" }> = ({ severity }) => {
  const colors = { High: "bg-red-100 text-red-700", Medium: "bg-amber-100 text-amber-700", Low: "bg-green-100 text-green-700" };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[severity]}`}>{severity}</span>;
};

const TierBadge: React.FC<{ tier: SophisticationTier }> = ({ tier }) => {
  const colors: Record<SophisticationTier, string> = {
    Foundational: "bg-red-100 text-red-700",
    Structured: "bg-amber-100 text-amber-700",
    Advanced: "bg-blue-100 text-blue-700",
    Orchestrated: "bg-green-100 text-green-700",
  };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colors[tier]}`}>{tier}</span>;
};

const ModeLabel: React.FC<{ mode: string }> = ({ mode }) => {
  const labels: Record<string, string> = {
    "website-only": "Website Intelligence Only",
    "website-csv": "Website + Campaign Analysis",
    "website-csv-segmentation": "Website + Campaign + Segmentation",
  };
  return (
    <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
      {labels[mode] || mode}
    </span>
  );
};

export const StrategicInsights: React.FC<StrategicInsightsProps> = ({ data }) => {
  return (
    <div className="space-y-6">
      {/* Mode Indicator */}
      <div className="flex items-center gap-3">
        <ModeLabel mode={data.mode} />
        <span className="text-xs text-muted-foreground">
          {data.mode === "website-only" && "Add Campaign CSV for deeper empirical analysis"}
          {data.mode === "website-csv" && "Segmentation data detected will unlock additional intelligence"}
        </span>
      </div>

      {/* 6.1 Executive Strategic Snapshot */}
      <StrategySection title="Executive Strategic Snapshot" icon={<Target className="w-5 h-5" />}>
        <div className="space-y-5">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-600" /> Growth Architecture Strengths
            </h4>
            <ul className="space-y-1.5">
              {data.executiveSnapshot.strengths.map((s, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span> {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-600" /> Under-Monetized Areas
            </h4>
            <ul className="space-y-1.5">
              {data.executiveSnapshot.underMonetizedAreas.map((s, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span> {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-500" /> Competitive Advancement Gaps
            </h4>
            <ul className="space-y-1.5">
              {data.executiveSnapshot.competitiveGaps.map((s, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span> {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-primary" /> CleverTap Leverage Opportunities
            </h4>
            <ul className="space-y-1.5">
              {data.executiveSnapshot.cleverTapLeverageOpportunities.map((s, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span> {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-sm font-medium text-primary">{data.executiveSnapshot.strategicFocus}</p>
          </div>
        </div>
      </StrategySection>

      {/* 6.2 Lifecycle Architecture Assessment */}
      <StrategySection title="Lifecycle Architecture Assessment" icon={<Layers className="w-5 h-5" />}>
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Stage</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground">Coverage</th>
                  {data.mode !== "website-only" && (
                    <>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Campaigns</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Volume %</th>
                    </>
                  )}
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Assessment</th>
                </tr>
              </thead>
              <tbody>
                {data.lifecycleAssessment.stages.map((s, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 px-3 font-medium">{s.stage}</td>
                    <td className="py-2 px-3 text-center"><CoverageBadge coverage={s.coverage} /></td>
                    {data.mode !== "website-only" && (
                      <>
                        <td className="py-2 px-3 text-right">{s.campaignCount}</td>
                        <td className="py-2 px-3 text-right">{s.volumeShare.toFixed(1)}%</td>
                      </>
                    )}
                    <td className="py-2 px-3 text-muted-foreground text-xs">{s.assessment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground italic">{data.lifecycleAssessment.summary}</p>
        </div>
      </StrategySection>

      {/* 6.3 Engagement & Campaign Sophistication (CSV only) */}
      {data.engagementSophistication && (
        <StrategySection title="Engagement & Campaign Sophistication" icon={<BarChart3 className="w-5 h-5" />}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-medium text-foreground">Classification:</span>
              <TierBadge tier={data.engagementSophistication.tier} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Batch vs Trigger Ratio", value: data.engagementSophistication.batchVsTriggerRatio },
                { label: "Channel Diversification", value: data.engagementSophistication.channelDiversification },
                { label: "Campaign Cadence", value: data.engagementSophistication.cadenceIntensity },
                { label: "Subject Line Variation", value: data.engagementSophistication.subjectLineVariation },
                { label: "Automation Presence", value: data.engagementSophistication.automationPresence },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{item.label}</p>
                  <p className="text-sm font-medium text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
            {data.engagementSophistication.details.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {data.engagementSophistication.details.map((d, i) => (
                  <p key={i} className="text-xs text-amber-600 flex items-start gap-2">
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {d}
                  </p>
                ))}
              </div>
            )}
          </div>
        </StrategySection>
      )}

      {/* 6.4 Segmentation Intelligence (if data present) */}
      {data.segmentationIntelligence && data.mode === "website-csv-segmentation" && (
        <StrategySection title="Segmentation Intelligence" icon={<Users className="w-5 h-5" />}>
          <div className="space-y-3">
            {[
              { label: "Behavioral vs Broad Targeting", value: data.segmentationIntelligence.behavioralVsBroad },
              { label: "Lifecycle Segmentation Clarity", value: data.segmentationIntelligence.lifecycleClarity },
              { label: "High-Value Cohort Activation", value: data.segmentationIntelligence.highValueActivation },
              { label: "Inactive Cohort Recovery", value: data.segmentationIntelligence.inactiveRecovery },
              { label: "Segment Reuse Saturation", value: data.segmentationIntelligence.segmentReuse },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                <span className="text-xs font-semibold text-muted-foreground w-48 shrink-0 uppercase tracking-wide">{item.label}</span>
                <span className="text-sm text-foreground">{item.value}</span>
              </div>
            ))}
            <p className="text-sm text-muted-foreground italic mt-3">{data.segmentationIntelligence.assessment}</p>
          </div>
        </StrategySection>
      )}

      {/* 6.5 Competitive Acceleration View */}
      <StrategySection title="Competitive Acceleration View" icon={<TrendingUp className="w-5 h-5" />}>
        <div className="space-y-5">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Where Industry Leaders Are Advancing</h4>
            <div className="space-y-2">
              {data.competitiveAcceleration.whereLeadersAdvance.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" /> {item}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Strategic Implications</h4>
            <div className="space-y-2">
              {data.competitiveAcceleration.strategicImplications.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {item}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">CleverTap Capability Alignment</h4>
            <div className="flex flex-wrap gap-2">
              {data.competitiveAcceleration.cleverTapAlignment.map((item, i) => (
                <span key={i} className="px-3 py-1.5 rounded-lg bg-primary/5 text-primary text-xs font-medium border border-primary/10">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </StrategySection>

      {/* 6.6 High-Impact Strategic Initiatives */}
      <StrategySection title="High-Impact Strategic Initiatives" icon={<Lightbulb className="w-5 h-5" />}>
        <div className="space-y-4">
          {data.initiatives.map((init, i) => (
            <div key={i} className="p-4 rounded-xl bg-muted/20 border border-border/50 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-foreground text-sm">{init.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Stage: {init.lifecycleStage}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ConfidenceBadge level={init.confidence} />
                  <EffortBadge level={init.effort} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{init.businessRationale}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="font-medium text-foreground">Primary KPI Impact:</span>
                  <span className="text-muted-foreground ml-1">{init.primaryKpiImpact}</span>
                </div>
                <div>
                  <span className="font-medium text-foreground">Competitive Justification:</span>
                  <span className="text-muted-foreground ml-1">{init.competitiveJustification}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {init.cleverTapCapabilities.map((cap, j) => (
                  <span key={j} className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary font-medium">
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </StrategySection>

      {/* 6.7 Structural Risk Mapping */}
      <StrategySection title="Structural Risk Mapping" icon={<Shield className="w-5 h-5" />}>
        <div className="space-y-3">
          {data.riskMapping.risks.map((risk, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
              <SeverityBadge severity={risk.severity} />
              <div>
                <p className="text-sm font-medium text-foreground">{risk.risk}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{risk.evidence}</p>
              </div>
            </div>
          ))}
          <p className="text-sm text-muted-foreground italic mt-3">{data.riskMapping.summary}</p>
        </div>
      </StrategySection>

      {/* 6.8 90-Day Strategic Blueprint */}
      <StrategySection title="90-Day Strategic Blueprint" icon={<Calendar className="w-5 h-5" />}>
        <div className="space-y-6">
          {[
            { phase: "0–30 Days", subtitle: "Immediate Wins", actions: data.blueprint.phase1, color: "text-green-600", bg: "bg-green-50" },
            { phase: "30–60 Days", subtitle: "Lifecycle Expansion", actions: data.blueprint.phase2, color: "text-blue-600", bg: "bg-blue-50" },
            { phase: "60–90 Days", subtitle: "Predictive & AI Deployment", actions: data.blueprint.phase3, color: "text-purple-600", bg: "bg-purple-50" },
          ].map((phase, pi) => (
            <div key={pi}>
              <div className="flex items-center gap-2 mb-3">
                <Clock className={`w-4 h-4 ${phase.color}`} />
                <h4 className={`text-sm font-bold ${phase.color}`}>{phase.phase} → {phase.subtitle}</h4>
              </div>
              <div className="space-y-2 ml-6">
                {phase.actions.map((a, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${phase.bg} ${phase.color} font-medium shrink-0`}>
                      {a.cleverTapModule}
                    </span>
                    <p className="text-sm text-muted-foreground">{a.action}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </StrategySection>
    </div>
  );
};
