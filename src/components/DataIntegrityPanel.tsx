import React, { useState } from "react";
import { Info, ChevronDown, ChevronUp, AlertTriangle, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ProcessingSummary, ExcludedCampaign, DateIssueCampaign, ReconciliationResult } from "@/lib/csvAnalyzer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DataIntegrityPanelProps {
  processingSummary: ProcessingSummary;
}

// Format large numbers with commas
const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

export const DataIntegrityPanel: React.FC<DataIntegrityPanelProps> = ({ processingSummary }) => {
  // Auto-expand if there are exclusions, date issues, or reconciliation failures
  const hasExclusions = processingSummary.campaignsExcluded > 0;
  const hasDateIssues = processingSummary.dateIssueCampaigns.length > 0;
  const hasReconciliationFailure = processingSummary.reconciliation?.status === "FAIL";
  const [isExpanded, setIsExpanded] = useState(hasExclusions || hasDateIssues || hasReconciliationFailure);
  const [showExcludedDetails, setShowExcludedDetails] = useState(false);
  const [showDateIssueDetails, setShowDateIssueDetails] = useState(false);
  const [showReconciliationDetails, setShowReconciliationDetails] = useState(hasReconciliationFailure);

  const { 
    totalRowsInCSV, 
    campaignsIncluded, 
    campaignsExcluded, 
    exclusionBreakdown, 
    excludedCampaigns,
    dateIssueCampaigns,
    deliveredFallbackCount,
    reconciliation
  } = processingSummary;

  // Build exclusion reasons list
  const exclusionReasons: { reason: string; count: number }[] = [];
  if (exclusionBreakdown.channelMismatch > 0) {
    exclusionReasons.push({ reason: 'Channel not equal to "Email"', count: exclusionBreakdown.channelMismatch });
  }
  if (exclusionBreakdown.other > 0) {
    exclusionReasons.push({ reason: "Other processing constraints", count: exclusionBreakdown.other });
  }

  // Build date issue reasons list (these are NOT exclusions, campaigns are still included)
  const dateIssueReasons: { reason: string; count: number }[] = [];
  if (exclusionBreakdown.missingStartDate > 0) {
    dateIssueReasons.push({ reason: "Missing Start Date", count: exclusionBreakdown.missingStartDate });
  }
  if (exclusionBreakdown.invalidStartDateFormat > 0) {
    dateIssueReasons.push({ reason: "Invalid Start Date format (grouped in 'Unknown Date')", count: exclusionBreakdown.invalidStartDateFormat });
  }
  if (exclusionBreakdown.invalidStartDateCalendar > 0) {
    dateIssueReasons.push({ reason: "Invalid calendar date (grouped in 'Unknown Date')", count: exclusionBreakdown.invalidStartDateCalendar });
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
                {totalDateIssues} date issues (included in Unknown Date)
              </span>
            )}
            {reconciliation && (
              <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${
                reconciliation.status === "PASS" 
                  ? "bg-emerald-500/10 text-emerald-600" 
                  : "bg-red-500/10 text-red-600"
              }`}>
                {reconciliation.status === "PASS" ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <XCircle className="w-3 h-3" />
                )}
                Reconciliation: {reconciliation.status}
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

              {/* D. Reconciliation Status (MANDATORY) */}
              {reconciliation && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowReconciliationDetails(!showReconciliationDetails)}
                    className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide hover:text-foreground transition-colors ${
                      reconciliation.status === "PASS" ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {showReconciliationDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {reconciliation.status === "PASS" ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Metric Reconciliation: {reconciliation.status}
                  </button>
                  
                  <AnimatePresence>
                    {showReconciliationDetails && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-3">
                          {/* Reconciliation Summary Table */}
                          <div className="bg-background/50 rounded-lg border border-border/50 overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/30">
                                <tr className="border-b border-border/50">
                                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Metric</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Source CSV</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Aggregate</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Monthly Sum</th>
                                  <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {reconciliation.checks.map((check, idx) => (
                                  <tr key={idx} className="border-b border-border/30 last:border-0">
                                    <td className="px-3 py-2 text-xs text-foreground font-medium">{check.metric}</td>
                                    <td className="px-3 py-2 text-xs text-right text-muted-foreground font-mono">
                                      {formatNumber(check.sourceTotal)}
                                    </td>
                                    <td className={`px-3 py-2 text-xs text-right font-mono ${
                                      check.aggregateDelta !== 0 ? "text-red-600" : "text-muted-foreground"
                                    }`}>
                                      {formatNumber(check.aggregateTotal)}
                                      {check.aggregateDelta !== 0 && (
                                        <span className="ml-1">
                                          ({check.aggregateDelta > 0 ? "+" : ""}{formatNumber(check.aggregateDelta)})
                                        </span>
                                      )}
                                    </td>
                                    <td className={`px-3 py-2 text-xs text-right font-mono ${
                                      check.monthlyDelta !== 0 ? "text-red-600" : "text-muted-foreground"
                                    }`}>
                                      {formatNumber(check.monthlyTotal)}
                                      {check.monthlyDelta !== 0 && (
                                        <span className="ml-1">
                                          ({check.monthlyDelta > 0 ? "+" : ""}{formatNumber(check.monthlyDelta)})
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      {check.passed ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                                      ) : (
                                        <XCircle className="w-4 h-4 text-red-600 inline" />
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          
                          {/* Error Rows Detail (if any) */}
                          {reconciliation.errorRows.length > 0 && (
                            <div className="space-y-2">
                              <h5 className="text-xs font-medium text-red-600">
                                ⚠️ Rows Contributing to Discrepancy ({reconciliation.errorRows.length})
                              </h5>
                              <div className="bg-red-500/5 rounded-lg border border-red-500/20 overflow-hidden max-h-48 overflow-y-auto">
                                <table className="w-full text-sm">
                                  <thead className="sticky top-0 bg-red-500/10">
                                    <tr className="border-b border-red-500/20">
                                      <th className="px-3 py-2 text-left text-xs font-medium text-red-600">Campaign ID</th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-red-600">Campaign Name</th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-red-600">Start Date</th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-red-600">Reason</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {reconciliation.errorRows.map((row, idx) => (
                                      <tr key={idx} className="border-b border-red-500/10 last:border-0">
                                        <td className="px-3 py-2 text-xs text-foreground font-mono">{row.campaignId}</td>
                                        <td className="px-3 py-2 text-xs text-foreground max-w-[200px] truncate">{row.campaignName}</td>
                                        <td className="px-3 py-2 text-xs text-muted-foreground">{row.startDate}</td>
                                        <td className="px-3 py-2 text-xs text-red-600">{row.reason}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          
                          <p className="text-xs text-muted-foreground/70 italic">
                            Validation: Source CSV = Aggregate = Sum(Monthly). All rows must be counted exactly once.
                          </p>
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
                      <li>• Invalid dates: included in "Unknown Date" bucket in Monthly View</li>
                      <li>• 1,000 user minimum only for Best/Worst lists</li>
                    </ul>
                  </div>

                  {/* Date Handling */}
                  <div className="space-y-1">
                    <h5 className="text-xs font-medium text-muted-foreground">Date Handling</h5>
                    <ul className="text-xs text-muted-foreground/80 space-y-0.5">
                      <li>• Date Format: D/M/YY or DD/MM/YYYY accepted (permissive)</li>
                      <li>• No locale inference, format guessing, or auto-correction</li>
                      <li>• Invalid dates grouped in "Unknown Date" - never excluded</li>
                      <li>• All rows counted exactly once in both Aggregate and Monthly</li>
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
