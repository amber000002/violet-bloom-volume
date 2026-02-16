import React from "react";
import { motion } from "framer-motion";
import { Lightbulb, AlertTriangle, Clock, RefreshCw, CheckCircle2, BookOpen } from "lucide-react";
import { RootCauseEntry } from "./RootCauseCorrelation";
import { SignalHealth } from "./SignalHealthTable";

interface RepairActionsModuleProps {
  rootCauses: RootCauseEntry[];
  signalHealth: SignalHealth[];
}

export interface RepairAction {
  issue: string;
  action: string;
  bestPracticeRef: string;
  priority: "high" | "medium" | "low";
  category: string;
}

// Best Practice Categories from CleverTap documentation
const BEST_PRACTICE_CATEGORIES = {
  compliance: "Compliance & Authentication",
  audienceSelection: "Audience Selection",
  emailDataCollection: "Email Data Collection",
  content: "Campaign Content",
  sendingVolume: "Sending Volume",
  engagement: "Engagement Optimization",
  listHygiene: "List Hygiene",
};

// Mapping: Detected Issue → Best Practice Action
// Source of truth: CleverTap Email Best Practices
const ISSUE_TO_ACTION_MAP: Record<string, RepairAction> = {
  // Spam-related issues
  spam_high: {
    issue: "Spam Ratio Breach (>0.1%)",
    action: "Implement double opt-in, review content for spam triggers, add preference center. Check authentication (SPF/DKIM/DMARC).",
    bestPracticeRef: "Email Best Practices: Compliance, Audience Selection",
    priority: "high",
    category: BEST_PRACTICE_CATEGORIES.compliance,
  },
  spam_warning: {
    issue: "Spam Ratio Elevated",
    action: "Monitor closely. Review recent campaigns for spam trigger words (FREE, ACT NOW, etc.). Ensure unsubscribe link is prominent.",
    bestPracticeRef: "Email Best Practices: Campaign Content",
    priority: "medium",
    category: BEST_PRACTICE_CATEGORIES.content,
  },
  
  // Bounce-related issues
  bounce_high: {
    issue: "Bounce Rate Spike (>3%)",
    action: "Immediately clean email list. Implement real-time email verification for new signups. Remove addresses with consecutive bounces.",
    bestPracticeRef: "Email Best Practices: Email Data Collection",
    priority: "high",
    category: BEST_PRACTICE_CATEGORIES.emailDataCollection,
  },
  bounce_warning: {
    issue: "Bounce Rate Elevated (1-3%)",
    action: "Review list acquisition sources. Implement email validation at signup. Consider re-verification for old addresses.",
    bestPracticeRef: "Email Best Practices: Email Data Collection",
    priority: "medium",
    category: BEST_PRACTICE_CATEGORIES.listHygiene,
  },
  
  // Unsubscribe-related issues
  unsub_high: {
    issue: "High Unsubscribe Rate (>0.5%)",
    action: "Reduce send frequency. Implement preference center for content/frequency control. Review content relevance per segment.",
    bestPracticeRef: "Email Best Practices: Audience Selection",
    priority: "high",
    category: BEST_PRACTICE_CATEGORIES.audienceSelection,
  },
  unsub_warning: {
    issue: "Elevated Unsubscribe Rate",
    action: "Review send cadence for high-frequency segments. A/B test content personalization. Consider suppressing inactive users.",
    bestPracticeRef: "Email Best Practices: Audience Selection",
    priority: "medium",
    category: BEST_PRACTICE_CATEGORIES.engagement,
  },
  
  // Reputation issues
  reputation_low: {
    issue: "IP/Domain Reputation Below Medium",
    action: "Pause large sends. Focus on engaged subscribers only for 7-14 days. Implement gradual warm-up protocol.",
    bestPracticeRef: "Email Best Practices: Sending Volume",
    priority: "high",
    category: BEST_PRACTICE_CATEGORIES.sendingVolume,
  },
  reputation_bad: {
    issue: "IP/Domain Reputation BAD",
    action: "STOP all cold/promotional sends immediately. Send only transactional to highly engaged users. Begin formal warm-up over 4-6 weeks.",
    bestPracticeRef: "Email Best Practices: Sending Volume, Compliance",
    priority: "high",
    category: BEST_PRACTICE_CATEGORIES.sendingVolume,
  },
  
  // Engagement issues
  open_rate_low: {
    issue: "Open Rate Below Baseline",
    action: "A/B test subject lines. Optimize send times by segment. Review inbox placement with seed testing.",
    bestPracticeRef: "Email Best Practices: Campaign Content",
    priority: "medium",
    category: BEST_PRACTICE_CATEGORIES.content,
  },
  click_rate_low: {
    issue: "Click Rate Below Baseline",
    action: "Review CTA clarity and placement. Ensure mobile optimization. Test content relevance per lifecycle stage.",
    bestPracticeRef: "Email Best Practices: Campaign Content",
    priority: "low",
    category: BEST_PRACTICE_CATEGORIES.content,
  },
  
  // Error issues
  error_high: {
    issue: "Error Ratio Elevated",
    action: "Check email authentication setup. Review for infrastructure issues. Monitor for blocklist inclusions.",
    bestPracticeRef: "Email Best Practices: Compliance",
    priority: "high",
    category: BEST_PRACTICE_CATEGORIES.compliance,
  },
};

// Ongoing monitoring recommendations (always included)
const ONGOING_ACTIONS: RepairAction[] = [
  {
    issue: "Continuous Monitoring",
    action: "Monitor hard bounce (<0.5%), soft bounce (<1%), unsubscribe (<0.2%) for every campaign. Set up automated alerts.",
    bestPracticeRef: "Email Best Practices: All Categories",
    priority: "low",
    category: BEST_PRACTICE_CATEGORIES.listHygiene,
  },
  {
    issue: "Postmaster Monitoring",
    action: "Review Google Postmaster Tools daily for 2 weeks post-issue. Track domain reputation, spam ratio, error ratio trends.",
    bestPracticeRef: "Email Best Practices: Compliance",
    priority: "low",
    category: BEST_PRACTICE_CATEGORIES.compliance,
  },
];

export const generateRepairActions = (
  rootCauses: RootCauseEntry[],
  signalHealth: SignalHealth[]
): RepairAction[] => {
  const actions: RepairAction[] = [];
  const addedIssues = new Set<string>();
  
  // Analyze signal health for issues
  signalHealth.forEach((signal) => {
    if (signal.status === "breached") {
      let issueKey = "";
      
      switch (signal.signal) {
        case "Spam Ratio":
          issueKey = "spam_high";
          break;
        case "Error Ratio":
          issueKey = "error_high";
          break;
        case "IP Reputation":
        case "Domain Reputation":
          const value = String(signal.latestValue);
          issueKey = value === "Bad" ? "reputation_bad" : "reputation_low";
          break;
        case "Bounce Rate":
          issueKey = "bounce_high";
          break;
        case "Unsubscribe Rate":
          issueKey = "unsub_high";
          break;
        case "Open Rate":
          issueKey = "open_rate_low";
          break;
      }
      
      if (issueKey && !addedIssues.has(issueKey)) {
        addedIssues.add(issueKey);
        const action = ISSUE_TO_ACTION_MAP[issueKey];
        if (action) actions.push(action);
      }
    } else if (signal.status === "warning") {
      let issueKey = "";
      
      switch (signal.signal) {
        case "Spam Ratio":
          issueKey = "spam_warning";
          break;
        case "Bounce Rate":
          issueKey = "bounce_warning";
          break;
        case "Unsubscribe Rate":
          issueKey = "unsub_warning";
          break;
      }
      
      if (issueKey && !addedIssues.has(issueKey)) {
        addedIssues.add(issueKey);
        const action = ISSUE_TO_ACTION_MAP[issueKey];
        if (action) actions.push(action);
      }
    }
    
    // Check for worsening trends
    if (signal.trend === "worsening" && signal.status !== "healthy") {
      // Already captured in breach/warning handling
    }
  });
  
  // Analyze root causes for additional issues
  rootCauses.forEach((cause) => {
    cause.negativeSignals.forEach((signal) => {
      let issueKey = "";
      
      if (signal.type.includes("Unsubscribe") && signal.severity === "high") {
        issueKey = "unsub_high";
      } else if (signal.type.includes("Bounce") && signal.severity === "high") {
        issueKey = "bounce_high";
      } else if (signal.type.includes("Open Rate") && !addedIssues.has("open_rate_low")) {
        issueKey = "open_rate_low";
      } else if (signal.type.includes("Click Rate") && !addedIssues.has("click_rate_low")) {
        issueKey = "click_rate_low";
      }
      
      if (issueKey && !addedIssues.has(issueKey)) {
        addedIssues.add(issueKey);
        const action = ISSUE_TO_ACTION_MAP[issueKey];
        if (action) actions.push(action);
      }
    });
  });
  
  // Add ongoing actions
  actions.push(...ONGOING_ACTIONS);
  
  // Sort by priority (high → medium → low)
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
};

const PriorityBadge: React.FC<{ priority: RepairAction["priority"] }> = ({ priority }) => {
  const styles = {
    high: "bg-red-500/20 text-red-600",
    medium: "bg-amber-500/20 text-amber-600",
    low: "bg-blue-500/20 text-blue-600",
  };
  
  const labels = {
    high: "Immediate (0-7 days)",
    medium: "Short-term (7-21 days)",
    low: "Ongoing",
  };
  
  const icons = {
    high: <AlertTriangle className="w-3 h-3" />,
    medium: <Clock className="w-3 h-3" />,
    low: <RefreshCw className="w-3 h-3" />,
  };
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${styles[priority]}`}>
      {icons[priority]}
      {labels[priority]}
    </span>
  );
};

export const RepairActionsModule: React.FC<RepairActionsModuleProps> = ({
  rootCauses,
  signalHealth,
}) => {
  const actions = React.useMemo(
    () => generateRepairActions(rootCauses, signalHealth),
    [rootCauses, signalHealth]
  );
  
  // Group by priority
  const highPriority = actions.filter((a) => a.priority === "high");
  const mediumPriority = actions.filter((a) => a.priority === "medium");
  const lowPriority = actions.filter((a) => a.priority === "low");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Summary Header */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-primary" />
          <span className="font-medium">{actions.length} Repair Actions</span>
        </div>
        <div className="flex gap-2 text-xs">
          {highPriority.length > 0 && (
            <span className="text-red-600 font-medium">{highPriority.length} Immediate</span>
          )}
          {mediumPriority.length > 0 && (
            <span className="text-amber-600 font-medium">{mediumPriority.length} Short-term</span>
          )}
          {lowPriority.length > 0 && (
            <span className="text-blue-600 font-medium">{lowPriority.length} Ongoing</span>
          )}
        </div>
      </div>
      
      {/* Actions Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30">
              <th className="text-left py-3 px-4 font-semibold text-foreground">Issue Detected</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">Recommended Action</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">Best Practice Ref</th>
              <th className="text-center py-3 px-4 font-semibold text-foreground">Priority</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((action, i) => (
              <tr
                key={i}
                className={`border-b border-border/20 hover:bg-muted/10 ${
                  action.priority === "high" ? "bg-destructive/5" : ""
                }`}
              >
                <td className="py-3 px-4 font-medium">{action.issue}</td>
                <td className="py-3 px-4 text-muted-foreground max-w-md">{action.action}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1 text-xs text-primary">
                    <BookOpen className="w-3 h-3" />
                    <span>{action.bestPracticeRef}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <PriorityBadge priority={action.priority} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Guardrails Notice */}
      <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
        <p>
          <strong>Source of Truth:</strong> All recommendations are derived from CleverTap Email Best Practices documentation.
          No AI inference beyond available data. Every insight is traceable to detected signals.
        </p>
      </div>
    </motion.div>
  );
};
