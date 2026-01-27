import React, { useState, useMemo } from "react";
import { Info, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CampaignRow } from "@/lib/csvAnalyzer";

interface DataIntegrityPanelProps {
  campaignData: CampaignRow[];
}

interface DataIntegrityWarnings {
  deliveredFallbackCount: number;
  excludedStatusCount: number;
  totalCampaignsAnalyzed: number;
}

export const DataIntegrityPanel: React.FC<DataIntegrityPanelProps> = ({ campaignData }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate dynamic warnings from the campaign data
  const warnings = useMemo<DataIntegrityWarnings>(() => {
    let deliveredFallbackCount = 0;
    let excludedStatusCount = 0;

    // Count campaigns where Delivered was 0/missing (Sent used as denominator)
    campaignData.forEach((row) => {
      if (row.totalDeliveredUsers === 0 || row.totalDeliveredUsers === undefined) {
        deliveredFallbackCount++;
      }
    });

    // Note: excludedStatusCount would come from raw CSV parsing, 
    // but since we only have valid data here, we show 0
    // In production, this would be passed from the parser

    return {
      deliveredFallbackCount,
      excludedStatusCount,
      totalCampaignsAnalyzed: campaignData.length,
    };
  }, [campaignData]);

  const hasActiveWarnings = warnings.deliveredFallbackCount > 0 || warnings.excludedStatusCount > 0;

  return (
    <div className="bg-muted/30 border border-border rounded-xl overflow-hidden">
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Data Integrity & Calculation Rules</span>
          {hasActiveWarnings && (
            <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-600 rounded-full">
              {warnings.deliveredFallbackCount + warnings.excludedStatusCount} notes
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Collapsible Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
              {/* Static Rules */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Metric Scope */}
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    🔒 Metric Scope
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    <li>• Only user-level metrics are used across all reports</li>
                    <li className="pl-2 text-muted-foreground/70">(Sent(users), Viewed(users), Clicked(users), Unsubscribes, Bounces)</li>
                    <li>• Event-level metrics (HTML/AMP views, clicks, events) are excluded</li>
                  </ul>
                </div>

                {/* Denominator Logic */}
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    📐 Denominator Logic
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    <li>• If Delivered(users) {">"} 0, rates use Delivered(users)</li>
                    <li>• If Delivered(users) = 0 or missing, Sent(users) is used</li>
                    <li>• Campaigns are never excluded due to missing Delivered data</li>
                  </ul>
                </div>

                {/* Campaign Inclusion Rules */}
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    🧮 Campaign Inclusion Rules
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    <li>• Included if: Channel = Email, Status = Completed</li>
                    <li>• Minimum 1,000 users applies only to:</li>
                    <li className="pl-2 text-muted-foreground/70">Best Performing & Worst Performing lists</li>
                    <li>• Aggregate and trend reports include all valid campaigns</li>
                  </ul>
                </div>

                {/* Date Handling */}
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    📅 Date Handling
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    <li>• Start Date parsed strictly in dd/mm/yyyy format</li>
                    <li>• Monthly reports generated from all months in data</li>
                    <li>• No automatic date inference or locale guessing</li>
                  </ul>
                </div>
              </div>

              {/* Common Reasons Section */}
              <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  ⚠️ Common Reasons Numbers May Differ from Raw CSV
                </h4>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  <li>• Event-level metrics are ignored to prevent double counting</li>
                  <li>• Delivered(users) fallback logic applied</li>
                  <li>• Incomplete or zero Delivered values handled safely</li>
                  <li>• Campaigns with invalid status excluded</li>
                </ul>
              </div>

              {/* Dynamic Warnings */}
              {hasActiveWarnings && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wide flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" />
                    Active Data Notes
                  </h4>
                  <div className="space-y-1">
                    {warnings.deliveredFallbackCount > 0 && (
                      <p className="text-xs text-amber-600 bg-amber-500/10 px-2 py-1 rounded">
                        ⚠️ {warnings.deliveredFallbackCount} campaign{warnings.deliveredFallbackCount !== 1 ? 's' : ''} had Delivered(users) = 0. Sent(users) used as denominator.
                      </p>
                    )}
                    {warnings.excludedStatusCount > 0 && (
                      <p className="text-xs text-amber-600 bg-amber-500/10 px-2 py-1 rounded">
                        ⚠️ {warnings.excludedStatusCount} campaign{warnings.excludedStatusCount !== 1 ? 's' : ''} excluded due to non-Completed status.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Summary */}
              <p className="text-xs text-muted-foreground/70 italic border-t border-border/50 pt-3">
                This panel is informational only and does not consume AI credits. {warnings.totalCampaignsAnalyzed} campaigns analyzed.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
