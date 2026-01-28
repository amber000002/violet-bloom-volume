import React, { useState } from "react";
import { Info, ChevronDown, ChevronUp, AlertTriangle, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ProcessingSummary, ExcludedCampaign, DateIssueCampaign } from "@/lib/csvAnalyzer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DataIntegrityPanelProps {
  processingSummary: ProcessingSummary;
}

export const DataIntegrityPanel: React.FC<DataIntegrityPanelProps> = ({ processingSummary }) => {
  // Auto-expand if there are exclusions or date issues
  const hasExclusions = processingSummary.campaignsExcluded > 0;
  const hasDateIssues = processingSummary.dateIssueCampaigns.length > 0;
  const [isExpanded, setIsExpanded] = useState(hasExclusions || hasDateIssues);
  const [showExcludedDetails, setShowExcludedDetails] = useState(false);
  const [showDateIssueDetails, setShowDateIssueDetails] = useState(false);

  const { 
    totalRowsInCSV, 
    campaignsIncluded, 
    campaignsExcluded, 
    exclusionBreakdown, 
    excludedCampaigns,
    dateIssueCampaigns,
    deliveredFallbackCount 
  } = processingSummary;

  // Build exclusion reasons list
  const exclusionReasons: { reason: string; count: number }[] = [];
  if (exclusionBreakdown.channelMismatch > 0) {
    exclusionReasons.push({ reason: 'Channel not equal to "Email"', count: exclusionBreakdown.channelMismatch });
  }
  if (exclusionBreakdown.other > 0) {
    exclusionReasons.push({ reason: "Other processing constraints", count: exclusionBreakdown.other });
  }

  // Build date issue reasons list (these are NOT exclusions, just tracked separately)
  const dateIssueReasons: { reason: string; count: number }[] = [];
  if (exclusionBreakdown.missingStartDate > 0) {
    dateIssueReasons.push({ reason: "Missing Start Date", count: exclusionBreakdown.missingStartDate });
  }
  if (exclusionBreakdown.invalidStartDateFormat > 0) {
    dateIssueReasons.push({ reason: "Invalid Start Date format (not DD/MM/YY)", count: exclusionBreakdown.invalidStartDateFormat });
  }
  if (exclusionBreakdown.invalidStartDateCalendar > 0) {
    dateIssueReasons.push({ reason: "Invalid calendar date (e.g., 31/02/2024)", count: exclusionBreakdown.invalidStartDateCalendar });
  }

  const totalDateIssues = dateIssueCampaigns.length;

  return (
    <div className="bg-muted/30 border border-border rounded-xl overflow-hidden">
      {/* Header - Always Visible */}
      <TooltipProvider>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-xs">This section explains how campaign data was processed. No data has been removed without explanation.</p>
              </TooltipContent>
            </Tooltip>
            <span className="text-sm font-medium text-foreground">Data Integrity</span>
            <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
              {campaignsIncluded} of {totalRowsInCSV} rows analyzed
            </span>
            {hasExclusions && (
              <span className="px-2 py-0.5 text-xs bg-amber-500/10 text-amber-600 rounded-full">
                {campaignsExcluded} excluded
              </span>
            )}
            {hasDateIssues && (
              <span className="px-2 py-0.5 text-xs bg-blue-500/10 text-blue-600 rounded-full">
                {totalDateIssues} date issues
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </TooltipProvider>

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
              {/* A. Processing Summary */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  📊 Processing Summary
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-background/50 rounded-lg p-3 border border-border/50 text-center">
                    <p className="text-2xl font-bold text-foreground">{totalRowsInCSV}</p>
                    <p className="text-xs text-muted-foreground">Total rows in CSV</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3 border border-border/50 text-center">
                    <p className="text-2xl font-bold text-primary">{campaignsIncluded}</p>
                    <p className="text-xs text-muted-foreground">Campaigns included</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3 border border-border/50 text-center">
                    <p className={`text-2xl font-bold ${hasExclusions ? 'text-amber-600' : 'text-muted-foreground'}`}>
                      {campaignsExcluded}
                    </p>
                    <p className="text-xs text-muted-foreground">Campaigns excluded</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground/70 italic">
                  Included + Excluded = {campaignsIncluded + campaignsExcluded} (must equal Total rows: {totalRowsInCSV})
                </p>
              </div>

              {/* B. Exclusion Reason Breakdown */}
              {hasExclusions && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    ⚠️ Exclusion Reason Breakdown
                  </h4>
                  <div className="bg-background/50 rounded-lg border border-border/50 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/30">
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Exclusion Reason</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Campaign Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exclusionReasons.map((item, idx) => (
                          <tr key={idx} className="border-b border-border/30 last:border-0">
                            <td className="px-3 py-2 text-xs text-foreground">{item.reason}</td>
                            <td className="px-3 py-2 text-xs text-right text-amber-600 font-medium">{item.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground/70 italic">
                    Reasons are mutually exclusive — each excluded row maps to exactly one reason.
                  </p>
                </div>
              )}

              {/* C. Excluded Campaigns Detail (Expandable) */}
              {hasExclusions && excludedCampaigns.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowExcludedDetails(!showExcludedDetails)}
                    className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                  >
                    {showExcludedDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    📋 Excluded Campaigns Detail ({excludedCampaigns.length})
                  </button>
                  
                  <AnimatePresence>
                    {showExcludedDetails && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-background/50 rounded-lg border border-border/50 overflow-hidden max-h-64 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-muted/50">
                              <tr className="border-b border-border/50">
                                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Campaign Name</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Campaign ID</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Start Date</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Reason Excluded</th>
                              </tr>
                            </thead>
                            <tbody>
                              {excludedCampaigns.map((campaign, idx) => (
                                <tr key={idx} className="border-b border-border/30 last:border-0">
                                  <td className="px-3 py-2 text-xs text-foreground whitespace-normal break-words max-w-[200px]">
                                    {campaign.campaignName || "—"}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-muted-foreground font-mono">
                                    {campaign.campaignId || "—"}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-muted-foreground">
                                    {campaign.startDate}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-amber-600">
                                    {campaign.reason}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Delivered Fallback Warning */}
              {deliveredFallbackCount > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-amber-600 font-medium">Delivered Fallback Applied</p>
                    <p className="text-xs text-amber-600/80 mt-0.5">
                      {deliveredFallbackCount} campaign{deliveredFallbackCount !== 1 ? 's' : ''} had Delivered(users) = 0. 
                      Sent(users) was used as the denominator for rate calculations.
                    </p>
                  </div>
                </div>
              )}

              {/* Static Calculation Rules (collapsible) */}
              <details className="group">
                <summary className="text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground flex items-center gap-1">
                  <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                  📐 Calculation Rules Reference
                </summary>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Metric Scope */}
                  <div className="space-y-1">
                    <h5 className="text-xs font-medium text-muted-foreground">Metric Scope</h5>
                    <ul className="text-xs text-muted-foreground/80 space-y-0.5">
                      <li>• Only user-level metrics used across all reports</li>
                      <li>• Event-level metrics excluded to prevent double counting</li>
                    </ul>
                  </div>

                  {/* Denominator Logic */}
                  <div className="space-y-1">
                    <h5 className="text-xs font-medium text-muted-foreground">Denominator Logic</h5>
                    <ul className="text-xs text-muted-foreground/80 space-y-0.5">
                      <li>• If Delivered(users) {">"} 0, rates use Delivered(users)</li>
                      <li>• If Delivered(users) = 0, Sent(users) is used</li>
                    </ul>
                  </div>

                  {/* Campaign Inclusion */}
                  <div className="space-y-1">
                    <h5 className="text-xs font-medium text-muted-foreground">Campaign Inclusion</h5>
                    <ul className="text-xs text-muted-foreground/80 space-y-0.5">
                      <li>• Channel = Email (all status values included)</li>
                      <li>• Each CSV row = unique analytical unit (no Campaign ID aggregation)</li>
                      <li>• Invalid dates: included in analysis, excluded from Monthly View</li>
                      <li>• 1,000 user minimum only for Best/Worst lists</li>
                    </ul>
                  </div>

                  {/* Date Handling */}
                  <div className="space-y-1">
                    <h5 className="text-xs font-medium text-muted-foreground">Date Handling</h5>
                    <ul className="text-xs text-muted-foreground/80 space-y-0.5">
                      <li>• Date Format: Strictly DD/MM/YY only</li>
                      <li>• No locale inference, format guessing, or auto-correction</li>
                      <li>• Invalid dates flagged, not excluded from analysis</li>
                    </ul>
                  </div>
                </div>
              </details>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
