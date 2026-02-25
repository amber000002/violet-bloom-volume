import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronUp, ChevronDown, TrendingUp, TrendingDown,
  BarChart3, Activity, Target, AlertTriangle, CheckCircle2,
  XCircle, Lightbulb, Layers, Zap, Calendar, FlaskConical,
  Users, Map, ArrowRight, Database, ShieldAlert,
} from "lucide-react";
import {
  ExtendedInsightsData,
  RevenuePerformanceSnapshot,
  SendMixEntry,
  UseCaseRevenueLens,
  StrategicPriority,
  RevenueSegment,
  RevenueJourney,
  RevenueCampaignIdea,
  ExperimentIdea,
  RoadmapItem,
} from "@/lib/strategicInsightsExtendedEngine";
import { EventSchemaHealth, UserPropertyReadiness, LifecycleStage } from "@/lib/schemaAnalyzer";

interface Props {
  data: ExtendedInsightsData;
}

// Reusable collapsible section
const Section: React.FC<{
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
        border: "1px solid rgba(255, 255, 255, 0.15)",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.04)",
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

const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const colors: Record<string, string> = {
    P0: "bg-red-100 text-red-700",
    P1: "bg-amber-100 text-amber-700",
    Monitor: "bg-green-100 text-green-700",
    High: "bg-red-100 text-red-700",
    Medium: "bg-amber-100 text-amber-700",
    Low: "bg-green-100 text-green-700",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[priority] || "bg-muted text-muted-foreground"}`}>{priority}</span>;
};

const SeverityBadge: React.FC<{ level: string }> = ({ level }) => {
  const colors: Record<string, string> = {
    High: "bg-red-100 text-red-700",
    Medium: "bg-amber-100 text-amber-700",
    Low: "bg-green-100 text-green-700",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[level] || "bg-muted text-muted-foreground"}`}>{level}</span>;
};

const ReadyBadge: React.FC<{ ready: boolean | string }> = ({ ready }) => {
  const isReady = ready === true || ready === "Ready";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${isReady ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
      {isReady ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {isReady ? "Ready" : typeof ready === "string" ? ready : "Blocked"}
    </span>
  );
};

export const StrategicInsightsExtended: React.FC<Props> = ({ data }) => {
  return (
    <div className="space-y-6">
      {/* Divider */}
      <div className="flex items-center gap-4 py-2">
        <div className="flex-1 h-px bg-border" />
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Extended Revenue Intelligence</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* SECTION A: Revenue Performance Snapshot */}
      {data.revenuePerformance && data.revenuePerformance.qoqChanges.length > 0 && (
        <Section title="Revenue Performance Snapshot" icon={<TrendingUp className="w-5 h-5" />}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Metric</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Previous Quarter</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Current Quarter</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">QoQ %</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Revenue Impact Signal</th>
                </tr>
              </thead>
              <tbody>
                {data.revenuePerformance.qoqChanges.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 px-3 font-medium">{row.metric}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground">{row.previous}</td>
                    <td className="py-2 px-3 text-right font-medium">{row.current}</td>
                    <td className={`py-2 px-3 text-right font-medium ${row.qoqPercent.startsWith("+") ? "text-green-600" : row.qoqPercent.startsWith("-") ? "text-red-600" : ""}`}>
                      {row.qoqPercent}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        row.revenueImpactSignal.includes("Risk") || row.revenueImpactSignal.includes("Without") 
                          ? "bg-red-50 text-red-600" 
                          : row.revenueImpactSignal.includes("Improving") || row.revenueImpactSignal.includes("Growth") 
                            ? "bg-green-50 text-green-600" 
                            : "bg-muted text-muted-foreground"
                      }`}>
                        {row.revenueImpactSignal}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3 italic">
            Based on campaigns with ≥1,000 sends. Quarters derived from Start Date.
          </p>
        </Section>
      )}

      {/* SECTION B: Send Mix Maturity */}
      {data.sendMix.length > 0 && (
        <Section title="Send Mix Maturity" icon={<BarChart3 className="w-5 h-5" />}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Delivery Type</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Count</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">% Share</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Maturity Interpretation</th>
                </tr>
              </thead>
              <tbody>
                {data.sendMix.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 px-3 font-medium">{row.deliveryType}</td>
                    <td className="py-2 px-3 text-right">{row.count}</td>
                    <td className="py-2 px-3 text-right">{row.percentShare.toFixed(1)}%</td>
                    <td className="py-2 px-3">
                      <span className={`text-xs ${
                        row.maturityInterpretation.includes("Mature") ? "text-green-600" 
                        : row.maturityInterpretation.includes("Gap") || row.maturityInterpretation.includes("Heavy") ? "text-red-600" 
                        : "text-muted-foreground"
                      }`}>
                        {row.maturityInterpretation}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* SECTION C: Use Case Revenue Lens */}
      {data.useCaseRevenueLens.length > 0 && (
        <Section title="Use Case Coverage — Revenue Lens" icon={<Target className="w-5 h-5" />} defaultOpen={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Internal Use Case</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground">Coverage</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Campaigns</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground">Revenue Critical?</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground">Priority</th>
                </tr>
              </thead>
              <tbody>
                {data.useCaseRevenueLens.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 px-3 font-medium text-sm">{row.useCaseName}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.coverageStatus === "Active" ? "bg-green-100 text-green-700" 
                        : row.coverageStatus === "Missing" ? "bg-red-100 text-red-700" 
                        : "bg-amber-100 text-amber-700"
                      }`}>
                        {row.coverageStatus}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">{row.campaignCount}</td>
                    <td className="py-2 px-3 text-center">
                      {row.revenueCritical ? (
                        <span className="text-red-600 font-semibold text-xs">TRUE</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center"><PriorityBadge priority={row.priority} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* SECTION D: Event Schema Health */}
      {data.eventSchemaHealth ? (
        <Section title="Event Schema Health" icon={<Activity className="w-5 h-5" />}>
          <div className="space-y-4">
            {/* Stage distribution */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(Object.entries(data.eventSchemaHealth.stageDistribution) as [LifecycleStage, number][])
                .filter(([stage]) => stage !== "Unmapped")
                .map(([stage, count]) => (
                  <div key={stage} className={`p-3 rounded-lg ${count === 0 ? "bg-red-50 border border-red-200" : "bg-muted/30"}`}>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stage}</p>
                    <p className={`text-lg font-bold ${count === 0 ? "text-red-600" : "text-foreground"}`}>{count}</p>
                  </div>
                ))}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Total: {data.eventSchemaHealth.totalEvents}</span>
              <span>Mapped: {data.eventSchemaHealth.mappedEvents}</span>
              <span className={data.eventSchemaHealth.unmappedEvents > 0 ? "text-amber-600" : ""}>
                Unmapped: {data.eventSchemaHealth.unmappedEvents}
              </span>
            </div>

            {/* Health signals */}
            {data.eventSchemaHealth.signals.length > 0 && (
              <div className="space-y-2 mt-3">
                <h4 className="text-sm font-semibold text-foreground">Health Signals</h4>
                {data.eventSchemaHealth.signals.map((sig, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                    <SeverityBadge level={sig.severity} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{sig.signal}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{sig.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>
      ) : (
        <Section title="Event Schema Health" icon={<Activity className="w-5 h-5" />}>
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-center">
            <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-amber-700">Schema Not Uploaded — Insights Limited</p>
            <p className="text-xs text-amber-600 mt-1">Upload events_schema.csv to analyze lifecycle instrumentation and funnel health</p>
          </div>
        </Section>
      )}

      {/* SECTION E: User Property Readiness */}
      {data.userPropertyReadiness ? (
        <Section title="User Property Readiness" icon={<Database className="w-5 h-5" />}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Assessment</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground">Value</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Revenue Impact</th>
                </tr>
              </thead>
              <tbody>
                {data.userPropertyReadiness.assessments.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 px-3 font-medium">{row.assessment}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        row.value === "Missing" ? "bg-red-100 text-red-700" : "bg-muted text-foreground"
                      }`}>
                        {row.value}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{row.revenueImpact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : (
        <Section title="User Property Readiness" icon={<Database className="w-5 h-5" />}>
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-center">
            <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-amber-700">Schema Not Uploaded — Insights Limited</p>
            <p className="text-xs text-amber-600 mt-1">Upload user_properties_schema.csv to analyze segmentation and personalization readiness</p>
          </div>
        </Section>
      )}

      {/* SECTION F: Strategic Revenue Priorities */}
      {data.strategicPriorities.length > 0 && (
        <Section title="Strategic Revenue Priorities" icon={<Lightbulb className="w-5 h-5" />}>
          <div className="space-y-4">
            {data.strategicPriorities.map((p, i) => (
              <div key={i} className="p-4 rounded-xl bg-muted/20 border border-border/50 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-semibold text-foreground text-sm">Priority {i + 1}: {p.title}</h4>
                  <div className="flex items-center gap-2 shrink-0">
                    <SeverityBadge level={p.revenueImpactLevel} />
                    <ReadyBadge ready={p.readinessStatus} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-2 rounded bg-muted/30">
                    <span className="font-medium text-muted-foreground block mb-1">Campaign Evidence</span>
                    <span className="text-foreground">{p.campaignEvidence}</span>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <span className="font-medium text-muted-foreground block mb-1">Coverage Evidence</span>
                    <span className="text-foreground">{p.coverageEvidence}</span>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <span className="font-medium text-muted-foreground block mb-1">Event Evidence</span>
                    <span className="text-foreground">{p.eventEvidence}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* SECTION G: Revenue Segments */}
      {data.revenueSegments.length > 0 && (
        <Section title="Foundational Revenue Segments" icon={<Users className="w-5 h-5" />}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Segment Name</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Event Logic</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Property Dependencies</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Revenue Purpose</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground">Ready?</th>
                </tr>
              </thead>
              <tbody>
                {data.revenueSegments.map((seg, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 px-3 font-medium">{seg.segmentName}</td>
                    <td className="py-2 px-3 text-xs font-mono text-muted-foreground">{seg.eventLogic}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{seg.propertyDependencies}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{seg.revenuePurpose}</td>
                    <td className="py-2 px-3 text-center"><ReadyBadge ready={seg.ready} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* SECTION H: Revenue Journeys */}
      {data.revenueJourneys.length > 0 && (
        <Section title="High-Impact Revenue Journeys" icon={<Layers className="w-5 h-5" />}>
          <div className="space-y-4">
            {data.revenueJourneys.map((j, i) => (
              <div key={i} className="p-4 rounded-xl bg-muted/20 border border-border/50 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">{j.journeyName}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {j.internalUseCaseId} • Coverage: {j.coverageStatus}
                    </p>
                  </div>
                  <ReadyBadge ready={j.readinessStatus.includes("Ready") ? true : j.readinessStatus} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="font-medium text-muted-foreground">Trigger:</span>
                    <span className="ml-1 font-mono text-foreground">{j.triggerEvent}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Goal:</span>
                    <span className="ml-1 font-mono text-foreground">{j.goalEvent}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Channels:</span>
                    <span className="ml-1">{j.channels.join(", ")}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Revenue Metric:</span>
                    <span className="ml-1">{j.revenueMetricTarget}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {j.personalizationVariables.map((v, k) => (
                    <span key={k} className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary font-mono">{v}</span>
                  ))}
                </div>
                {j.aiAugmented && (
                  <div className="flex items-center gap-1.5 text-xs text-primary">
                    <Zap className="w-3 h-3" /> AI-Augmented • Brand Context Applied
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* SECTION I: Revenue Campaigns */}
      {data.revenueCampaigns.length > 0 && (
        <Section title="Revenue-Focused Campaign Ideas" icon={<Zap className="w-5 h-5" />}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Campaign Name</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground">Channel</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Target Segment</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Trigger</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Revenue Metric</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground">Impact</th>
                </tr>
              </thead>
              <tbody>
                {data.revenueCampaigns.map((c, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 px-3 font-medium text-sm">{c.campaignName}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-xs bg-muted font-medium">{c.channel}</span>
                    </td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{c.targetSegment}</td>
                    <td className="py-2 px-3 text-xs font-mono text-muted-foreground">{c.trigger}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{c.revenueMetric}</td>
                    <td className="py-2 px-3 text-center"><SeverityBadge level={c.revenueImpact} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* SECTION J: Experiments */}
      {data.experiments.length > 0 && (
        <Section title="Performance-Derived Experimentation" icon={<FlaskConical className="w-5 h-5" />}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Test Name</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Evidence Source</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Hypothesis</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Revenue Metric</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground">Priority</th>
                </tr>
              </thead>
              <tbody>
                {data.experiments.map((exp, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 px-3 font-medium">{exp.testName}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{exp.evidenceSource}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{exp.hypothesis}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{exp.revenueMetric}</td>
                    <td className="py-2 px-3 text-center"><PriorityBadge priority={exp.priority} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3 italic">
            All experiments derived from actual campaign performance data — top/worst performing campaigns by Unique CTR.
          </p>
        </Section>
      )}

      {/* SECTION K: Execution Roadmap */}
      {data.roadmap.length > 0 && (
        <Section title="Execution Roadmap" icon={<Map className="w-5 h-5" />}>
          <div className="space-y-6">
            {["0-30 Days", "60-90 Days", "90+ Days"].map((phase, pi) => {
              const items = data.roadmap.filter(r => r.phase === phase);
              if (items.length === 0) return null;
              
              const colors = [
                { label: "text-green-600", bg: "bg-green-50" },
                { label: "text-blue-600", bg: "bg-blue-50" },
                { label: "text-purple-600", bg: "bg-purple-50" },
              ];
              
              return (
                <div key={phase}>
                  <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${colors[pi]?.label}`}>
                    <Calendar className="w-4 h-4" />
                    {phase} {pi === 0 ? "— Ready Items" : pi === 1 ? "— Instrumentation + Automation" : "— Structural Lifecycle Automation"}
                  </h4>
                  <div className="space-y-2 ml-6">
                    {items.map((item, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/20 border border-border/50">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium text-foreground">{item.initiative}</p>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[pi]?.bg} ${colors[pi]?.label}`}>
                            {item.effort} Effort
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-xs text-muted-foreground">
                          <div><span className="font-medium">Revenue Objective:</span> {item.revenueObjective}</div>
                          <div><span className="font-medium">Dependency:</span> {item.dependency}</div>
                          <div><span className="font-medium">Expected Uplift:</span> {item.expectedUpliftType}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
};
