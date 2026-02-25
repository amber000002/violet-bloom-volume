import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronUp, ChevronDown,
  BarChart3, Activity, AlertTriangle,
} from "lucide-react";
import {
  ExtendedInsightsData,
} from "@/lib/strategicInsightsExtendedEngine";
import { LifecycleStage } from "@/lib/schemaAnalyzer";

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

const SeverityBadge: React.FC<{ level: string }> = ({ level }) => {
  const colors: Record<string, string> = {
    High: "bg-red-100 text-red-700",
    Medium: "bg-amber-100 text-amber-700",
    Low: "bg-green-100 text-green-700",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[level] || "bg-muted text-muted-foreground"}`}>{level}</span>;
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
    </div>
  );
};
