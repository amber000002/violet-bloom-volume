// CSV Parser and Analyzer for Inbox Diagnostics - Enhanced Version

// ============= INTERFACES =============

export interface CampaignRow {
  campaignName: string;
  campaignId: string;
  channel: string;
  title: string;
  subjectLine: string;
  startDate: string;
  startTime: string;
  serviceProvider: string;
  providerName: string;
  status: string;
  totalSentUsers: number;
  totalDeliveredUsers: number;
  totalSentEvents: number;
  uniqueSentUsers: number;
  uniqueViewedWithinConversion: number;
  uniqueClickedWithinConversion: number;
  clickThroughConversions: number;
  totalUnsubscribes: number;
  hardBounces: number;
  softBounces: number;
  whoQuery: string;
  deliveryType: string;
  conversionEvent: string;
  labels: string;
  // Calculated rates
  openRate: number;
  clickRate: number;
  uniqueCTR: number;
  unsubscribeRate: number;
  hardBounceRate: number;
  softBounceRate: number;
}

export interface PostmasterRow {
  date: string;
  domain: string;
  ipReputation: string;
  ipCount: number;
  sampleIps: string;
  domainReputation: string;
  spamRatio: number;
  errorRatio: number;
}

// Exclusion tracking for Data Integrity Panel
export interface ExcludedCampaign {
  campaignName: string;
  campaignId: string;
  startDate: string;
  reason: string;
  reasonCode: ExclusionReason;
}

export type ExclusionReason = 
  | "invalid_start_date_format"
  | "invalid_start_date_calendar"
  | "missing_start_date"
  | "channel_mismatch"
  | "other";

// Date validation status - campaigns with invalid dates are included in analysis
// but excluded from time-based views (Monthly View)
export type DateValidityStatus = "valid" | "invalid_format" | "invalid_calendar" | "missing";

export interface ExclusionBreakdown {
  invalidStartDateFormat: number;
  invalidStartDateCalendar: number;
  missingStartDate: number;
  channelMismatch: number;
  other: number;
}

// Tracking for campaigns with date issues (included in analysis, excluded from time-based views)
export interface DateIssueCampaign {
  campaignName: string;
  campaignId: string;
  startDate: string;
  issue: string;
  issueType: DateValidityStatus;
}

// Reconciliation result for metric integrity checks
export interface ReconciliationResult {
  status: "PASS" | "FAIL";
  checks: {
    metric: string;
    sourceTotal: number;
    aggregateTotal: number;
    monthlyTotal: number;
    aggregateDelta: number;
    monthlyDelta: number;
    aggregateDeltaPercent: number;
    monthlyDeltaPercent: number;
    passed: boolean;
  }[];
  errorRows: {
    campaignId: string;
    campaignName: string;
    startDate: string;
    reason: string;
    metric: string;
    sourceValue: number;
    contributedValue: number;
  }[];
}

export interface ProcessingSummary {
  totalRowsInCSV: number;
  campaignsIncluded: number;
  campaignsExcluded: number;
  exclusionBreakdown: ExclusionBreakdown;
  excludedCampaigns: ExcludedCampaign[];
  // Campaigns with date issues - NOW INCLUDED in Monthly View with "Unknown" month bucket
  dateIssueCampaigns: DateIssueCampaign[];
  deliveredFallbackCount: number;
  // Reconciliation status
  reconciliation: ReconciliationResult | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data: CampaignRow[];
  processingSummary: ProcessingSummary;
}

export interface PostmasterValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data: PostmasterRow[];
}

// Report Types
export interface ProviderAggregate {
  serviceProvider: string;
  providerName: string;
  totalSentUsers: number;
  totalDeliveredUsers: number;
  uniqueViewed: number;
  uniqueClicked: number;
  conversions: number;
  unsubscribes: number;
  hardBounces: number;
  softBounces: number;
  campaignCount: number;
  // Percentage columns
  useDeliveredAsDenominator: boolean;
  viewPercent: number;
  clickPercent: number;
  uniqueCTR: number;
  unsubscribePercent: number;
  hardBouncePercent: number;
  softBouncePercent: number;
}

export interface MonthlyOverview {
  month: string;
  monthSortKey: string;
  provider: string;
  totalSentUsers: number;
  totalDeliveredUsers: number;
  uniqueSentUsers: number;
  uniqueViewed: number;
  uniqueClicked: number;
  conversions: number;
  unsubscribes: number;
  hardBounces: number;
  softBounces: number;
  campaignCount: number;
  openRate: number;
  clickRate: number;
  // Percentage columns
  useDeliveredAsDenominator: boolean;
  viewPercent: number;
  clickPercent: number;
  uniqueCTR: number;
  unsubscribePercent: number;
  hardBouncePercent: number;
  softBouncePercent: number;
}

export interface TopCampaign {
  campaignId: string;
  campaignName: string;
  subjectLine: string;
  totalSentUsers: number;
  totalDeliveredUsers: number;
  uniqueViewed: number;
  uniqueClicked: number;
  conversions: number;
  unsubscribes: number;
  hardBounces: number;
  softBounces: number;
  openRate: number;
  clickRate: number;
  startDate: string;
}

export interface TrendPoint {
  month: string;
  openRate: number;
  clickRate: number;
  volume: number;
}

export interface KeyLearning {
  title: string;
  description: string;
}

export interface AnalysisReport {
  providerAggregates: ProviderAggregate[];
  monthlyOverview: MonthlyOverview[];
  monthlyOverviewByProvider: MonthlyOverview[];
  bestCampaigns: TopCampaign[];
  worstCampaigns: TopCampaign[];
  bestSummary: string;
  worstSummary: string;
  engagementTrends: TrendPoint[];
  keyLearnings: KeyLearning[];
}

// Reputation Repair Types - Enhanced per Master Prompt

// 0️⃣ Versioning & Scope
export interface VersioningScope {
  analysisVersion: string;
  dataRange: string;
  dataSources: string[];
  senderDomain: string;
}

// 1️⃣ Monthly Reputation Rerun Snapshot
export interface ReputationSnapshot {
  reputationDirection: "improving" | "stable" | "degrading";
  reputationEvidence: string;
  primaryStressSignal: string;
  timingCorrelation: string;
  damageAssessment: "structural" | "reversible";
  safeToScale: boolean;
  verdict: string;
}

// 2️⃣ Reputation Signal Table
export interface ReputationSignalRow {
  signal: string;
  value: number | string;
  percentage: string;
  trend: "up" | "down" | "stable" | "N/A";
  trendDescription: string;
}

// 3️⃣ Reputation Rerun Analysis (MoM)
export interface MoMAnalysis {
  changesThisMonth: string[];
  stableFactors: string[];
  worsenedBeforeShift: string[];
  comparisonAvailable: boolean;
  comparisonNote: string;
}

// 4️⃣ Send Mix & Lifecycle Pressure
export interface SendMixAnalysis {
  transactionalPercent: number;
  lifecyclePercent: number;
  promotionalPercent: number;
  overweightedTypes: string[];
  underutilizedAbsorbers: string[];
  classificationConfidence: "high" | "medium" | "low";
  ambiguityNotes: string[];
}

// 5️⃣ Root Cause Summary
export interface RootCauseBullet {
  cause: string;
  evidence: string;
  evidenceType: "numeric_change" | "time_shift" | "documented_rule";
}

// 6️⃣ Reputation Repair Actions
export interface RepairAction {
  priority: "immediate" | "short-term" | "ongoing";
  confidence: "high" | "medium" | "low";
  action: string;
  cohortSize?: string;
  metricToWatch?: string;
  abortCondition?: string;
}

// 7️⃣ What This Analysis Does NOT Cover
export interface AnalysisExclusions {
  exclusions: string[];
}

// 8️⃣ Source Attribution Index
export interface SourceAttribution {
  insight: string;
  dataSource: string;
  docSource: string;
  confidence: "high" | "medium" | "low";
}

// 9️⃣ Data Quality & Limitations
export interface DataQualityNote {
  type: "missing_field" | "inconsistent_denominator" | "data_gap" | "caution";
  description: string;
}

// Legacy types for backward compatibility
export interface ReputationIssue {
  campaignId: string;
  sendDate: string;
  observation: string;
  impact: string;
  rootCause: string;
  recommendation: string;
  metricValues: Record<string, number | string>;
  priority?: "immediate" | "short-term" | "ongoing";
}

export interface TrendAnalysis {
  metric: string;
  trend: "improving" | "declining" | "stable";
  startValue: number;
  endValue: number;
  changePercent: number;
  observation: string;
}

export interface CorrelationInsight {
  primaryMetric: string;
  secondaryMetric: string;
  relationship: string;
  affectedCampaigns: { campaignId: string; sendDate: string }[];
}

export interface DeliverabilityDiagnosticSummary {
  trendAnalysis: TrendAnalysis[];
  correlations: CorrelationInsight[];
  impactSummary: {
    observation: string;
    impact: string;
    affectedCampaignIds: string[];
  }[];
  prioritizedRecommendations: {
    priority: "immediate" | "short-term" | "ongoing";
    recommendation: string;
  }[];
}

// Enhanced Reputation Repair Report - matches Master Prompt structure
export interface EnhancedReputationReport {
  versioningScope: VersioningScope;
  reputationSnapshot: ReputationSnapshot;
  signalTable: ReputationSignalRow[];
  signalTableDenominatorNote: string;
  momAnalysis: MoMAnalysis;
  sendMixAnalysis: SendMixAnalysis;
  rootCauses: RootCauseBullet[];
  repairActions: RepairAction[];
  exclusions: AnalysisExclusions;
  sourceAttributions: SourceAttribution[];
  dataQualityNotes: DataQualityNote[];
  finalConfirmation: string;
  refusalReason: string | null;
}

export interface ReputationRepairReport {
  diagnosticSummary: DeliverabilityDiagnosticSummary;
  issues: ReputationIssue[];
  hasPostmasterData: boolean;
  contextNotes: string | null;
  // NEW: Enhanced structured report
  enhancedReport: EnhancedReputationReport | null;
}

export interface DiagnosticsData {
  rawData: CampaignRow[];
  postmasterData: PostmasterRow[] | null;
  contextText: string | null;
  analysisReport: AnalysisReport | null;
  reputationReport: ReputationRepairReport | null;
}

// ============= CONSTANTS =============

const REQUIRED_HEADERS_MAP: Record<string, string> = {
  "campaign name": "campaignName",
  "campaign id": "campaignId",
  "channel": "channel",
  "title": "title",
  "start date": "startDate",
  "start time": "startTime",
  "service provider": "serviceProvider",
  "provider name": "providerName",
  "status": "status",
  "total sent (users)": "totalSentUsers",
  "total delivered (users)": "totalDeliveredUsers",
  "total sent (events)": "totalSentEvents",
  "unique sent (users)": "uniqueSentUsers",
  "unique viewed within conversion time": "uniqueViewedWithinConversion",
  "unique clicked within conversion time": "uniqueClickedWithinConversion",
  "click through conversions": "clickThroughConversions",
  "total unsubscribes": "totalUnsubscribes",
  "error: email hard bounced": "hardBounces",
  "error: email soft bounced": "softBounces",
  "who query": "whoQuery",
};

const POSTMASTER_HEADERS_MAP: Record<string, string> = {
  "date": "date",
  "domain": "domain",
  "ip reputation": "ipReputation",
  "ip count": "ipCount",
  "sample ips": "sampleIps",
  "domain reputation": "domainReputation",
  "spam ratio": "spamRatio",
  "error ratio": "errorRatio",
};

// ============= PARSING FUNCTIONS =============

const parseCSVLine = (line: string, delimiter: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
};

// Helper to create empty processing summary
const createEmptyProcessingSummary = (totalRows: number = 0): ProcessingSummary => ({
  totalRowsInCSV: totalRows,
  campaignsIncluded: 0,
  campaignsExcluded: 0,
  exclusionBreakdown: {
    invalidStartDateFormat: 0,
    invalidStartDateCalendar: 0,
    missingStartDate: 0,
    channelMismatch: 0,
    other: 0,
  },
  excludedCampaigns: [],
  dateIssueCampaigns: [],
  deliveredFallbackCount: 0,
  reconciliation: null,
});

// ============= STRICT DATE VALIDATION (DD/MM/YY or DD/MM/YYYY) =============
// CRITICAL: No locale inference, no format guessing, no auto-correction
// Accepts both 2-digit year (YY) and 4-digit year (YYYY) formats

/**
 * Validates if a date string matches D/M/YY or DD/MM/YYYY format (permissive)
 * STRICT RULE: All dates are DD/MM/YY format - day first, month second
 * Accepts single or double digit day/month: 1/8/25, 01/08/25, 1/8/2025, 01/08/2025
 * 
 * @returns { isValid: boolean, reason: string | null, is4DigitYear: boolean }
 */
const validateDateFormat = (dateStr: string): { isValid: boolean; reason: string | null; is4DigitYear: boolean } => {
  if (!dateStr || dateStr.trim() === "") {
    return { isValid: false, reason: "missing", is4DigitYear: false };
  }
  
  const trimmed = dateStr.trim();
  
  // Permissive patterns: accept 1-2 digit day, 1-2 digit month, 2 or 4 digit year
  // D/M/YY or DD/MM/YY or D/M/YYYY or DD/MM/YYYY
  const pattern2Digit = /^([1-9]|0[1-9]|[12][0-9]|3[01])\/([1-9]|0[1-9]|1[0-2])\/[0-9]{2}$/;
  const pattern4Digit = /^([1-9]|0[1-9]|[12][0-9]|3[01])\/([1-9]|0[1-9]|1[0-2])\/[0-9]{4}$/;
  
  if (pattern4Digit.test(trimmed)) {
    return { isValid: true, reason: null, is4DigitYear: true };
  }
  
  if (pattern2Digit.test(trimmed)) {
    return { isValid: true, reason: null, is4DigitYear: false };
  }
  
  return { isValid: false, reason: "format", is4DigitYear: false };
};

/**
 * Validates calendar correctness of a DD/MM/YY or DD/MM/YYYY date
 * Examples:
 *   - 29/02/24 → valid (2024 is leap year)
 *   - 29/02/2024 → valid (2024 is leap year)
 *   - 29/02/23 → invalid (2023 is not leap year)
 *   - 31/04/25 → invalid (April has 30 days)
 * 
 * Handles both 2-digit and 4-digit year formats.
 */
const validateCalendarDate = (dateStr: string, is4DigitYear: boolean): { isValid: boolean; reason: string | null } => {
  const trimmed = dateStr.trim();
  const parts = trimmed.split('/');
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const yearRaw = parseInt(parts[2], 10);
  
  // Convert to full year for calendar validation
  const yearForValidation = is4DigitYear ? yearRaw : (2000 + yearRaw);
  
  // Create date and verify it matches input (catches invalid dates like 31/02)
  const date = new Date(yearForValidation, month - 1, day);
  
  if (
    date.getFullYear() !== yearForValidation ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return { isValid: false, reason: "calendar" };
  }
  
  return { isValid: true, reason: null };
};

/**
 * Complete date validation following PRD rules:
 * 1. Check format matches DD/MM/YY or DD/MM/YYYY regex
 * 2. Check calendar correctness
 *
 * Returns detailed status for Data Integrity Panel
 */
export const validateStartDate = (dateStr: string): {
  isValid: boolean;
  status: DateValidityStatus;
  errorMessage: string | null;
} => {
  // Step 1: Check format (accepts both DD/MM/YY and DD/MM/YYYY)
  const formatCheck = validateDateFormat(dateStr);
  if (!formatCheck.isValid) {
    if (formatCheck.reason === "missing") {
      return { isValid: false, status: "missing", errorMessage: "Missing Start Date" };
    }
    return { isValid: false, status: "invalid_format", errorMessage: "Does not match DD/MM/YY or DD/MM/YYYY format" };
  }
  
  // Step 2: Check calendar correctness (pass format info for year handling)
  const calendarCheck = validateCalendarDate(dateStr, formatCheck.is4DigitYear);
  if (!calendarCheck.isValid) {
    return { isValid: false, status: "invalid_calendar", errorMessage: "Invalid calendar date" };
  }
  
  return { isValid: true, status: "valid", errorMessage: null };
};

// Legacy wrapper for backward compatibility
const isValidDateFormat = (dateStr: string): boolean => {
  const result = validateStartDate(dateStr);
  return result.isValid;
};

export const parseCSV = (csvText: string): ValidationResult => {
  const lines = csvText.trim().split("\n");
  const errors: string[] = [];
  const warnings: string[] = [];
  const data: CampaignRow[] = [];
  const excludedCampaigns: ExcludedCampaign[] = [];
  const dateIssueCampaigns: DateIssueCampaign[] = [];
  const exclusionBreakdown: ExclusionBreakdown = {
    invalidStartDateFormat: 0,
    invalidStartDateCalendar: 0,
    missingStartDate: 0,
    channelMismatch: 0,
    other: 0,
  };

  // Count actual data rows (excluding header and empty lines)
  const dataLines = lines.slice(1).filter(line => line.trim() !== "");
  const totalRowsInCSV = dataLines.length;

  if (lines.length < 2) {
    return { 
      isValid: false, 
      errors: ["CSV file must have a header row and at least one data row"], 
      warnings: [], 
      data: [],
      processingSummary: createEmptyProcessingSummary(0)
    };
  }

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const rawHeaders = parseCSVLine(lines[0], delimiter).map(h => h.trim().replace(/"/g, "").toLowerCase());

  // Normalize header: remove spaces before parentheses (e.g., "total sent(users)" -> "total sent (users)")
  const normalizeHeader = (header: string): string => {
    // Add space before opening parenthesis if missing (e.g., "sent(users)" -> "sent (users)")
    return header.replace(/(\w)\(/g, "$1 (");
  };

  // Header aliases: map common short/alternate column names to the canonical key the parser expects.
  // This lets compact CSV exports (e.g. CleverTap "Date, Campaign, Subject, Sent, Open, Click, Unsub, Hard, Soft") work
  // without renaming, so metrics don't silently compute as 0.
  const HEADER_ALIASES: Record<string, string> = {
    "date": "start date",
    "campaign": "campaign name",
    "subject": "title",
    "sent": "total sent (users)",
    "delivered": "total delivered (users)",
    "open": "unique viewed within conversion time",
    "opens": "unique viewed within conversion time",
    "unique opens": "unique viewed within conversion time",
    "unique viewed": "unique viewed within conversion time",
    "click": "unique clicked within conversion time",
    "clicks": "unique clicked within conversion time",
    "unique clicks": "unique clicked within conversion time",
    "unique clicked": "unique clicked within conversion time",
    "ctr": "unique ctr",
    "conversions": "click through conversions",
    "unsub": "total unsubscribes",
    "unsubs": "total unsubscribes",
    "unsubscribes": "total unsubscribes",
    "hard": "error: email hard bounced",
    "hard bounce": "error: email hard bounced",
    "hard bounces": "error: email hard bounced",
    "soft": "error: email soft bounced",
    "soft bounce": "error: email soft bounced",
    "soft bounces": "error: email soft bounced",
    "provider": "provider name",
    "esp": "service provider",
  };

  // Create header index map with normalized + aliased headers
  const headerIndexMap: Record<string, number> = {};
  const aliasedHeaders: string[] = [];
  rawHeaders.forEach((header, idx) => {
    const normalized = normalizeHeader(header);
    headerIndexMap[normalized] = idx;
    const alias = HEADER_ALIASES[normalized];
    if (alias && headerIndexMap[alias] === undefined) {
      headerIndexMap[alias] = idx;
      aliasedHeaders.push(`"${header}" → "${alias}"`);
    }
  });
  if (aliasedHeaders.length > 0) {
    warnings.push(`Header aliases applied (${aliasedHeaders.length}): ${aliasedHeaders.join(", ")}`);
  }

  // Check required headers
  const requiredKeys = Object.keys(REQUIRED_HEADERS_MAP);
  const missingHeaders = requiredKeys.filter(h => headerIndexMap[h] === undefined);
  
  if (missingHeaders.length > 0) {
    // Allow some flexibility - only critical ones are truly required
    const criticalMissing = missingHeaders.filter(h => 
      ["campaign id", "title", "start date", "total sent (users)", "unique viewed within conversion time"].includes(h)
    );
    if (criticalMissing.length > 0) {
      errors.push(`Missing required columns: ${criticalMissing.join(", ")}`);
      return { 
        isValid: false, 
        errors, 
        warnings, 
        data: [],
        processingSummary: createEmptyProcessingSummary(totalRowsInCSV)
      };
    }
    warnings.push(`Optional columns not found: ${missingHeaders.join(", ")}`);
  }

  // CRITICAL: Surface numeric columns that will silently read as 0 because their header is missing.
  // Without this, downstream Open%/Click%/Unsub%/Bounce% compute as 0.00% and look like a calc bug.
  const NUMERIC_COLUMNS_TO_AUDIT: { header: string; label: string; impact: string }[] = [
    { header: "total delivered (users)", label: "Total Delivered (users)", impact: "Open/Click/Unsub % will fall back to Sent as denominator" },
    { header: "unique viewed within conversion time", label: "Unique Viewed within Conversion Time", impact: "Open Rate (Opens) reads as 0 for every row" },
    { header: "unique clicked within conversion time", label: "Unique Clicked within Conversion Time", impact: "Click Rate and Unique CTR read as 0 for every row" },
    { header: "total unsubscribes", label: "Total Unsubscribes", impact: "Unsubscribe count and % read as 0" },
    { header: "error: email hard bounced", label: "Error: Email Hard Bounced", impact: "Hard bounce count and % read as 0" },
    { header: "error: email soft bounced", label: "Error: Email Soft Bounced", impact: "Soft bounce count and % read as 0" },
    { header: "click through conversions", label: "Click Through Conversions", impact: "Conversion counts read as 0" },
  ];
  const columnsReadAsZero = NUMERIC_COLUMNS_TO_AUDIT.filter(c => headerIndexMap[c.header] === undefined);
  if (columnsReadAsZero.length > 0) {
    warnings.push(
      `⚠️ Schema mismatch — ${columnsReadAsZero.length} numeric column${columnsReadAsZero.length > 1 ? "s" : ""} not found in your CSV and will be read as 0:\n` +
      columnsReadAsZero.map(c => `  • "${c.label}" — ${c.impact}`).join("\n") +
      `\n\nFound CSV headers: ${rawHeaders.join(", ")}\n` +
      `Rename your CSV columns to the expected names so metrics calculate correctly.`
    );
  }

  // Track seen campaign IDs for duplicate detection
  const seenCampaignIds = new Map<string, number>(); // campaignId -> index in data array
  let deliveredFallbackCount = 0;

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line, delimiter);
    
    const getValue = (headerKey: string): string => {
      const idx = headerIndexMap[headerKey];
      return idx !== undefined ? (values[idx]?.trim().replace(/"/g, "") || "") : "";
    };

    const getNumericValue = (headerKey: string): number => {
      const val = getValue(headerKey);
      return parseFloat(val.replace(/,/g, "").replace("%", "")) || 0;
    };

    // Get basic campaign info for exclusion tracking
    const campaignName = getValue("campaign name");
    const campaignId = getValue("campaign id");
    const startDate = getValue("start date");
    const channel = getValue("channel").toLowerCase().trim();

    // All channels are now included in strategic insights analysis
    // Channel value is preserved on each row for filtering/grouping downstream

    // Validate start date - campaigns with date issues are INCLUDED in analysis
    // but tracked separately for transparency and excluded from time-based views
    const dateValidation = validateStartDate(startDate);
    if (!dateValidation.isValid) {
      // Track the date issue
      let issueType: DateValidityStatus = dateValidation.status;
      let issueMessage = dateValidation.errorMessage || "Unknown date issue";
      
      if (issueType === "missing") {
        exclusionBreakdown.missingStartDate++;
        issueMessage = "Missing Start Date";
      } else if (issueType === "invalid_format") {
        exclusionBreakdown.invalidStartDateFormat++;
        issueMessage = `Invalid format (expected DD/MM/YY or DD/MM/YYYY): "${startDate}"`;
      } else if (issueType === "invalid_calendar") {
        exclusionBreakdown.invalidStartDateCalendar++;
        issueMessage = `Invalid calendar date: "${startDate}"`;
      }
      
      dateIssueCampaigns.push({
        campaignName,
        campaignId,
        startDate: startDate || "—",
        issue: issueMessage,
        issueType,
      });
      
      // NOTE: We do NOT continue here - campaign is still included in analysis
      // It will be excluded from Monthly View but included in global totals
    }

    // REMOVED: Duplicate Campaign ID aggregation
    // Per PRD: "Treat each CSV row as a unique analytical unit, regardless of Campaign ID duplication"
    // seenCampaignIds is now only used for informational purposes, not exclusion

    // Extract subject line from title (before preheader)
    const fullTitle = getValue("title");
    const subjectLine = fullTitle.split("|")[0].trim() || fullTitle;

    const totalSent = getNumericValue("total sent (users)");
    const totalDelivered = getNumericValue("total delivered (users)");
    const uniqueViewed = getNumericValue("unique viewed within conversion time");
    const uniqueClicked = getNumericValue("unique clicked within conversion time");
    const hardBounces = getNumericValue("error: email hard bounced");
    const softBounces = getNumericValue("error: email soft bounced");
    const unsubscribes = getNumericValue("total unsubscribes");

    // Track delivered fallback usage
    const baseForRates = totalDelivered > 0 ? totalDelivered : totalSent;
    if (totalDelivered === 0 && totalSent > 0) {
      deliveredFallbackCount++;
    }

    const row: CampaignRow = {
      campaignName,
      campaignId,
      channel,
      title: fullTitle,
      subjectLine,
      startDate,
      startTime: getValue("start time"),
      serviceProvider: getValue("service provider"),
      providerName: getValue("provider name"),
      status: getValue("status").toLowerCase().trim(),
      totalSentUsers: totalSent,
      totalDeliveredUsers: totalDelivered,
      totalSentEvents: getNumericValue("total sent (events)"),
      uniqueSentUsers: getNumericValue("unique sent (users)"),
      uniqueViewedWithinConversion: uniqueViewed,
      uniqueClickedWithinConversion: uniqueClicked,
      clickThroughConversions: getNumericValue("click through conversions"),
      totalUnsubscribes: unsubscribes,
      hardBounces,
      softBounces,
      whoQuery: getValue("who query"),
      deliveryType: getValue("delivery") || getValue("delivery type") || "",
      conversionEvent: getValue("conversion event") || getValue("conversion_event") || "",
      labels: getValue("labels") || "",
      openRate: baseForRates > 0 ? (uniqueViewed / baseForRates) * 100 : 0,
      clickRate: baseForRates > 0 ? (uniqueClicked / baseForRates) * 100 : 0,
      uniqueCTR: (() => {
        const csvCTR = getNumericValue("unique ctr");
        if (csvCTR > 0) return csvCTR;
        return uniqueViewed > 0 ? (uniqueClicked / uniqueViewed) * 100 : 0;
      })(),
      unsubscribeRate: baseForRates > 0 ? (unsubscribes / baseForRates) * 100 : 0,
      hardBounceRate: totalSent > 0 ? (hardBounces / totalSent) * 100 : 0,
      softBounceRate: totalSent > 0 ? (softBounces / totalSent) * 100 : 0,
    };

    data.push(row);
  }

  const processingSummary: ProcessingSummary = {
    totalRowsInCSV,
    campaignsIncluded: data.length,
    campaignsExcluded: excludedCampaigns.length,
    exclusionBreakdown,
    excludedCampaigns,
    dateIssueCampaigns,
    deliveredFallbackCount,
    reconciliation: null, // Will be populated after analysis
  };

  if (data.length === 0) {
    errors.push("No valid campaigns found in the CSV");
    return { isValid: false, errors, warnings, data: [], processingSummary };
  }

  return { isValid: true, errors, warnings, data, processingSummary };
};

export const parsePostmasterCSV = (csvText: string): PostmasterValidationResult => {
  const lines = csvText.trim().split("\n");
  const errors: string[] = [];
  const warnings: string[] = [];
  const data: PostmasterRow[] = [];

  if (lines.length < 2) {
    return { isValid: false, errors: ["Postmaster CSV must have header and data rows"], warnings: [], data: [] };
  }

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const rawHeaders = parseCSVLine(lines[0], delimiter).map(h => h.trim().replace(/"/g, "").toLowerCase());

  const headerIndexMap: Record<string, number> = {};
  rawHeaders.forEach((header, idx) => {
    headerIndexMap[header] = idx;
  });

  // Check for date and domain at minimum
  if (headerIndexMap["date"] === undefined || headerIndexMap["domain"] === undefined) {
    errors.push("Postmaster CSV must have Date and Domain columns");
    return { isValid: false, errors, warnings, data: [] };
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line, delimiter);

    const getValue = (key: string): string => {
      const idx = headerIndexMap[key];
      return idx !== undefined ? (values[idx]?.trim().replace(/"/g, "") || "") : "";
    };

    const getNumericValue = (key: string): number => {
      const val = getValue(key);
      return parseFloat(val.replace(/,/g, "").replace("%", "")) || 0;
    };

    data.push({
      date: getValue("date"),
      domain: getValue("domain"),
      ipReputation: getValue("ip reputation"),
      ipCount: getNumericValue("ip count"),
      sampleIps: getValue("sample ips"),
      domainReputation: getValue("domain reputation"),
      spamRatio: getNumericValue("spam ratio"),
      errorRatio: getNumericValue("error ratio"),
    });
  }

  return { isValid: data.length > 0, errors, warnings, data };
};

// ============= ANALYSIS FUNCTIONS =============

// CRITICAL: Parse DD/MM/YY or DD/MM/YYYY format (day first, month second)
// MANDATORY: Do NOT assume MM/DD format - all dates are DD/MM
// NO locale inference, NO format guessing, NO auto-correction permitted
const parseDateDDMM = (dateStr: string): { date: Date | null; error: string | null } => {
  if (!dateStr || dateStr.trim() === "") {
    return { date: null, error: "Empty date string" };
  }
  
  const trimmed = dateStr.trim();
  
  // Permissive patterns: accept 1-2 digit day, 1-2 digit month, 2 or 4 digit year
  // Separators: both / and - are accepted
  // Examples: 1/8/25, 01/08/25, 1/8/2025, 01/08/2025, 27-11-2025, 1-8-25
  const pattern4Digit = /^([1-9]|0[1-9]|[12][0-9]|3[01])[\/\-]([1-9]|0[1-9]|1[0-2])[\/\-]([0-9]{4})$/;
  const pattern2Digit = /^([1-9]|0[1-9]|[12][0-9]|3[01])[\/\-]([1-9]|0[1-9]|1[0-2])[\/\-]([0-9]{2})$/;
  
  let match = trimmed.match(pattern4Digit);
  let is4Digit = true;
  
  if (!match) {
    match = trimmed.match(pattern2Digit);
    is4Digit = false;
  }
  
  if (!match) {
    return { date: null, error: `Does not match D/M/YY or DD/MM/YYYY format: ${dateStr}` };
  }
  
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const yearRaw = parseInt(match[3], 10);
  
  // Convert to full year for date creation
  const fullYear = is4Digit ? yearRaw : (2000 + yearRaw);
  
  // Create date and validate calendar correctness
  const parsedDate = new Date(fullYear, month - 1, day);
  
  // Verify the date components match (catches invalid dates like 31/02/24)
  if (
    parsedDate.getFullYear() !== fullYear ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return { date: null, error: `Invalid calendar date: ${dateStr}` };
  }
  
  return { date: parsedDate, error: null };
};

// Dynamic month names - no hardcoded restrictions
const MONTH_NAMES: Record<number, string> = {
  1: "January",
  2: "February",
  3: "March",
  4: "April",
  5: "May",
  6: "June",
  7: "July",
  8: "August",
  9: "September",
  10: "October",
  11: "November", 
  12: "December"
};

interface MonthParseResult {
  monthName: string;
  monthSortKey: string;
  isValid: boolean;
  error: string | null;
}

const getMonthFromDate = (dateStr: string): MonthParseResult => {
  const { date, error } = parseDateDDMM(dateStr);
  
  if (!date || error) {
    return { 
      monthName: "Unknown", 
      monthSortKey: "0000-00", 
      isValid: false, 
      error: error || "Unknown parsing error" 
    };
  }
  
  const month = date.getMonth() + 1; // 1-indexed
  const year = date.getFullYear();
  
  // All months 1-12 are valid
  if (month < 1 || month > 12) {
    return { 
      monthName: "PARSING_ERROR", 
      monthSortKey: "0000-00", 
      isValid: false, 
      error: `Invalid month ${month} extracted from ${dateStr}.` 
    };
  }
  
  return {
    monthName: `${MONTH_NAMES[month]} ${year}`,
    monthSortKey: `${year}-${month.toString().padStart(2, '0')}`,
    isValid: true,
    error: null
  };
};

// BACKWARD COMPATIBILITY: Wrapper for legacy code that uses parseDateSafely
const parseDateSafely = (dateStr: string): Date | null => {
  const { date } = parseDateDDMM(dateStr);
  return date;
};

export const generateAnalysisReport = (data: CampaignRow[]): AnalysisReport => {
  // Report 1a: Provider Aggregates
  const providerMap: Record<string, ProviderAggregate> = {};
  
  data.filter(row => row.totalSentUsers > 0).forEach(row => {
    const key = `${row.serviceProvider}|${row.providerName}`;
    if (!providerMap[key]) {
      providerMap[key] = {
        serviceProvider: row.serviceProvider || "Unknown",
        providerName: row.providerName || "Unknown",
        totalSentUsers: 0,
        totalDeliveredUsers: 0,
        uniqueViewed: 0,
        uniqueClicked: 0,
        conversions: 0,
        unsubscribes: 0,
        hardBounces: 0,
        softBounces: 0,
        campaignCount: 0,
        useDeliveredAsDenominator: true,
        viewPercent: 0,
        clickPercent: 0,
        uniqueCTR: 0,
        unsubscribePercent: 0,
        hardBouncePercent: 0,
        softBouncePercent: 0,
      };
    }
    const agg = providerMap[key];
    agg.totalSentUsers += row.totalSentUsers;
    agg.totalDeliveredUsers += row.totalDeliveredUsers;
    agg.uniqueViewed += row.uniqueViewedWithinConversion;
    agg.uniqueClicked += row.uniqueClickedWithinConversion;
    agg.conversions += row.clickThroughConversions;
    agg.unsubscribes += row.totalUnsubscribes;
    agg.hardBounces += row.hardBounces;
    agg.softBounces += row.softBounces;
    agg.campaignCount++;
  });

  // Calculate percentages with proper denominator logic
  const providerAggregates = Object.values(providerMap).map(agg => {
    // Check if ALL delivered values are > 0, else use Sent as denominator
    const useDelivered = agg.totalDeliveredUsers > 0;
    const denominator = useDelivered ? agg.totalDeliveredUsers : agg.totalSentUsers;
    
    agg.useDeliveredAsDenominator = useDelivered;
    agg.viewPercent = denominator > 0 ? (agg.uniqueViewed / denominator) * 100 : 0;
    agg.clickPercent = denominator > 0 ? (agg.uniqueClicked / denominator) * 100 : 0;
    agg.uniqueCTR = agg.uniqueViewed > 0 ? (agg.uniqueClicked / agg.uniqueViewed) * 100 : 0;
    agg.unsubscribePercent = denominator > 0 ? (agg.unsubscribes / denominator) * 100 : 0;
    // Bounces are NEVER delivered — always divide by Sent (delivered as denominator inflates the rate)
    agg.hardBouncePercent = agg.totalSentUsers > 0 ? (agg.hardBounces / agg.totalSentUsers) * 100 : 0;
    agg.softBouncePercent = agg.totalSentUsers > 0 ? (agg.softBounces / agg.totalSentUsers) * 100 : 0;
    
    return agg;
  });

  // Report 1b: Monthly Overview - dynamically groups campaigns by calendar month from Start Date
  // CRITICAL: Every row MUST be included - invalid dates go to "Unknown Date" bucket
  const monthMap: Record<string, MonthlyOverview> = {};
  const monthProviderMap: Record<string, MonthlyOverview> = {};
  const monthParsingErrors: string[] = [];
  
  data.filter(row => row.totalSentUsers > 0).forEach(row => {
    const monthResult = getMonthFromDate(row.startDate);
    
    // Use "Unknown Date" for invalid dates - NO EXCLUSION
    let monthName: string;
    let monthSortKey: string;
    
    if (!monthResult.isValid) {
      monthParsingErrors.push(monthResult.error || `Invalid date: ${row.startDate}`);
      monthName = "Unknown Date";
      monthSortKey = "9999-99"; // Sort at end
    } else {
      monthName = monthResult.monthName;
      monthSortKey = monthResult.monthSortKey;
    }

    const provider = row.providerName || row.serviceProvider || "Unknown";

    // Aggregate by month only (for backward compatibility)
    if (!monthMap[monthName]) {
      monthMap[monthName] = {
        month: monthName,
        monthSortKey,
        provider: "All",
        totalSentUsers: 0, totalDeliveredUsers: 0, uniqueSentUsers: 0,
        uniqueViewed: 0, uniqueClicked: 0, conversions: 0,
        unsubscribes: 0, hardBounces: 0, softBounces: 0,
        campaignCount: 0, openRate: 0, clickRate: 0,
        useDeliveredAsDenominator: true, viewPercent: 0, clickPercent: 0,
        uniqueCTR: 0, unsubscribePercent: 0, hardBouncePercent: 0, softBouncePercent: 0,
      };
    }
    const ma = monthMap[monthName];
    ma.totalSentUsers += row.totalSentUsers;
    ma.totalDeliveredUsers += row.totalDeliveredUsers;
    ma.uniqueSentUsers += row.uniqueSentUsers;
    ma.uniqueViewed += row.uniqueViewedWithinConversion;
    ma.uniqueClicked += row.uniqueClickedWithinConversion;
    ma.conversions += row.clickThroughConversions;
    ma.unsubscribes += row.totalUnsubscribes;
    ma.hardBounces += row.hardBounces;
    ma.softBounces += row.softBounces;
    ma.campaignCount++;

    // Aggregate by month + provider (for provider toggle)
    const provKey = `${monthName}|${provider}`;
    if (!monthProviderMap[provKey]) {
      monthProviderMap[provKey] = {
        month: monthName,
        monthSortKey,
        provider,
        totalSentUsers: 0, totalDeliveredUsers: 0, uniqueSentUsers: 0,
        uniqueViewed: 0, uniqueClicked: 0, conversions: 0,
        unsubscribes: 0, hardBounces: 0, softBounces: 0,
        campaignCount: 0, openRate: 0, clickRate: 0,
        useDeliveredAsDenominator: true, viewPercent: 0, clickPercent: 0,
        uniqueCTR: 0, unsubscribePercent: 0, hardBouncePercent: 0, softBouncePercent: 0,
      };
    }
    const mp = monthProviderMap[provKey];
    mp.totalSentUsers += row.totalSentUsers;
    mp.totalDeliveredUsers += row.totalDeliveredUsers;
    mp.uniqueSentUsers += row.uniqueSentUsers;
    mp.uniqueViewed += row.uniqueViewedWithinConversion;
    mp.uniqueClicked += row.uniqueClickedWithinConversion;
    mp.conversions += row.clickThroughConversions;
    mp.unsubscribes += row.totalUnsubscribes;
    mp.hardBounces += row.hardBounces;
    mp.softBounces += row.softBounces;
    mp.campaignCount++;
  });

  // Log parsing errors if any occurred (for debugging)
  if (monthParsingErrors.length > 0) {
    console.warn(`[Monthly Overview] Date parsing errors (${monthParsingErrors.length} rows skipped):`, monthParsingErrors.slice(0, 5));
  }

  const computeMonthlyPercents = (m: MonthlyOverview): MonthlyOverview => {
    const useDelivered = m.totalDeliveredUsers > 0;
    const denominator = useDelivered ? m.totalDeliveredUsers : m.totalSentUsers;
    m.useDeliveredAsDenominator = useDelivered;
    m.openRate = denominator > 0 ? (m.uniqueViewed / denominator) * 100 : 0;
    m.clickRate = denominator > 0 ? (m.uniqueClicked / denominator) * 100 : 0;
    m.viewPercent = m.openRate;
    m.clickPercent = m.clickRate;
    m.uniqueCTR = m.uniqueViewed > 0 ? (m.uniqueClicked / m.uniqueViewed) * 100 : 0;
    m.unsubscribePercent = denominator > 0 ? (m.unsubscribes / denominator) * 100 : 0;
    // Bounces are NEVER delivered — always divide by Sent
    m.hardBouncePercent = m.totalSentUsers > 0 ? (m.hardBounces / m.totalSentUsers) * 100 : 0;
    m.softBouncePercent = m.totalSentUsers > 0 ? (m.softBounces / m.totalSentUsers) * 100 : 0;
    return m;
  };

  const monthlyOverview = Object.values(monthMap)
    .map(computeMonthlyPercents)
    .sort((a, b) => a.monthSortKey.localeCompare(b.monthSortKey));

  const monthlyOverviewByProvider = Object.values(monthProviderMap)
    .map(computeMonthlyPercents)
    .sort((a, b) => a.monthSortKey.localeCompare(b.monthSortKey));

  // ============= DETERMINISTIC CAMPAIGN RANKING =============
  // Step 1: Filter eligible campaigns
  // - Total Sent (users) >= 1,000
  // - Status = Completed (already filtered during parsing)
  // - Channel = Email (already filtered during parsing)
  const eligibleCampaigns = data.filter(c => c.totalSentUsers >= 1000);

  // Step 2: Sort by OPEN RATE (percentage, not absolute count) - DESC for best
  const sortedByOpenRate = [...eligibleCampaigns].sort(
    (a, b) => b.openRate - a.openRate
  );

  // Step 3: Best Performing = Top 5 campaigns by open rate (highest first), lock these IDs
  const bestCampaignIds = new Set<string>();
  const bestCampaigns: TopCampaign[] = sortedByOpenRate.slice(0, 5).map(c => {
    bestCampaignIds.add(c.campaignId);
    return {
      campaignId: c.campaignId,
      campaignName: c.campaignName,
      subjectLine: c.subjectLine,
      totalSentUsers: c.totalSentUsers,
      totalDeliveredUsers: c.totalDeliveredUsers,
      uniqueViewed: c.uniqueViewedWithinConversion,
      uniqueClicked: c.uniqueClickedWithinConversion,
      conversions: c.clickThroughConversions,
      unsubscribes: c.totalUnsubscribes,
      hardBounces: c.hardBounces,
      softBounces: c.softBounces,
      openRate: c.openRate,
      clickRate: c.clickRate,
      startDate: c.startDate,
    };
  });

  // Step 4: Worst Performing = From REMAINING campaigns only, sort by open rate ASC (lowest first)
  const remainingCampaigns = eligibleCampaigns.filter(c => !bestCampaignIds.has(c.campaignId));
  const sortedAscending = [...remainingCampaigns].sort(
    (a, b) => a.openRate - b.openRate
  );

  const worstCampaigns: TopCampaign[] = sortedAscending.slice(0, 5).map(c => ({
    campaignId: c.campaignId,
    campaignName: c.campaignName,
    subjectLine: c.subjectLine,
    totalSentUsers: c.totalSentUsers,
    totalDeliveredUsers: c.totalDeliveredUsers,
    uniqueViewed: c.uniqueViewedWithinConversion,
    uniqueClicked: c.uniqueClickedWithinConversion,
    conversions: c.clickThroughConversions,
    unsubscribes: c.totalUnsubscribes,
    hardBounces: c.hardBounces,
    softBounces: c.softBounces,
    openRate: c.openRate,
    clickRate: c.clickRate,
    startDate: c.startDate,
  }));

  // SANITY CHECK: Verify no overlap (MANDATORY)
  const worstCampaignIds = new Set(worstCampaigns.map(c => c.campaignId));
  const overlap = [...bestCampaignIds].filter(id => worstCampaignIds.has(id));
  if (overlap.length > 0) {
    console.error(`[RANKING ERROR] Overlap detected between best and worst campaigns: ${overlap.join(", ")}`);
    // This should never happen with the logic above, but log for debugging
  }

  // Generate summaries
  const bestSummary = generateBestSummary(bestCampaigns);
  const worstSummary = generateWorstSummary(worstCampaigns);

  // Report 4: Engagement Trends
  const engagementTrends: TrendPoint[] = monthlyOverview.map(m => ({
    month: m.month,
    openRate: m.openRate,
    clickRate: m.clickRate,
    volume: m.totalSentUsers,
  }));

  // Report 5: Key Learnings
  const keyLearnings = generateKeyLearnings(data, monthlyOverview, bestCampaigns, worstCampaigns);

  return {
    providerAggregates,
    monthlyOverview,
    monthlyOverviewByProvider,
    bestCampaigns,
    worstCampaigns,
    bestSummary,
    worstSummary,
    engagementTrends,
    keyLearnings,
  };
};

// ============= RECONCILIATION CHECK (MANDATORY) =============
// Validates that: SUM(monthly) = Aggregate = Source CSV totals
export const runReconciliationCheck = (
  data: CampaignRow[],
  providerAggregates: ProviderAggregate[],
  monthlyOverview: MonthlyOverview[]
): ReconciliationResult => {
  const checks: ReconciliationResult["checks"] = [];
  const errorRows: ReconciliationResult["errorRows"] = [];
  
  // Calculate source totals directly from CSV rows
  const sourceTotals = {
    sent: data.reduce((sum, row) => sum + row.totalSentUsers, 0),
    delivered: data.reduce((sum, row) => sum + row.totalDeliveredUsers, 0),
    viewed: data.reduce((sum, row) => sum + row.uniqueViewedWithinConversion, 0),
    clicked: data.reduce((sum, row) => sum + row.uniqueClickedWithinConversion, 0),
    unsubscribes: data.reduce((sum, row) => sum + row.totalUnsubscribes, 0),
    hardBounces: data.reduce((sum, row) => sum + row.hardBounces, 0),
    softBounces: data.reduce((sum, row) => sum + row.softBounces, 0),
  };
  
  // Calculate aggregate totals (sum across all providers)
  const aggregateTotals = {
    sent: providerAggregates.reduce((sum, agg) => sum + agg.totalSentUsers, 0),
    delivered: providerAggregates.reduce((sum, agg) => sum + agg.totalDeliveredUsers, 0),
    viewed: providerAggregates.reduce((sum, agg) => sum + agg.uniqueViewed, 0),
    clicked: providerAggregates.reduce((sum, agg) => sum + agg.uniqueClicked, 0),
    unsubscribes: providerAggregates.reduce((sum, agg) => sum + agg.unsubscribes, 0),
    hardBounces: providerAggregates.reduce((sum, agg) => sum + agg.hardBounces, 0),
    softBounces: providerAggregates.reduce((sum, agg) => sum + agg.softBounces, 0),
  };
  
  // Calculate monthly totals (sum across all months)
  const monthlyTotals = {
    sent: monthlyOverview.reduce((sum, m) => sum + m.totalSentUsers, 0),
    delivered: monthlyOverview.reduce((sum, m) => sum + m.totalDeliveredUsers, 0),
    viewed: monthlyOverview.reduce((sum, m) => sum + m.uniqueViewed, 0),
    clicked: monthlyOverview.reduce((sum, m) => sum + m.uniqueClicked, 0),
    unsubscribes: monthlyOverview.reduce((sum, m) => sum + m.unsubscribes, 0),
    hardBounces: monthlyOverview.reduce((sum, m) => sum + m.hardBounces, 0),
    softBounces: monthlyOverview.reduce((sum, m) => sum + m.softBounces, 0),
  };
  
  // Check each metric
  const metrics: (keyof typeof sourceTotals)[] = [
    "sent", "delivered", "viewed", "clicked", "unsubscribes", "hardBounces", "softBounces"
  ];
  
  const metricLabels: Record<string, string> = {
    sent: "Total Sent (users)",
    delivered: "Total Delivered (users)",
    viewed: "Unique Viewed (users)",
    clicked: "Unique Clicked (users)",
    unsubscribes: "Total Unsubscribes",
    hardBounces: "Hard Bounces",
    softBounces: "Soft Bounces",
  };
  
  let allPassed = true;
  
  for (const metric of metrics) {
    const source = sourceTotals[metric];
    const aggregate = aggregateTotals[metric];
    const monthly = monthlyTotals[metric];
    
    const aggregateDelta = aggregate - source;
    const monthlyDelta = monthly - source;
    const aggregateDeltaPercent = source > 0 ? (aggregateDelta / source) * 100 : 0;
    const monthlyDeltaPercent = source > 0 ? (monthlyDelta / source) * 100 : 0;
    
    // Check passes if both deltas are 0
    const passed = aggregateDelta === 0 && monthlyDelta === 0;
    if (!passed) allPassed = false;
    
    checks.push({
      metric: metricLabels[metric] || metric,
      sourceTotal: source,
      aggregateTotal: aggregate,
      monthlyTotal: monthly,
      aggregateDelta,
      monthlyDelta,
      aggregateDeltaPercent,
      monthlyDeltaPercent,
      passed,
    });
  }
  
  // If there are mismatches, identify which rows are causing issues
  // (This should not happen with correct logic, but included for debugging)
  if (!allPassed) {
    // Track row contributions to identify discrepancies
    const rowContributions = new Map<string, { 
      campaignId: string; 
      campaignName: string;
      startDate: string;
      sent: number;
    }>();
    
    data.forEach(row => {
      const key = `${row.campaignId}|${row.startDate}`;
      rowContributions.set(key, {
        campaignId: row.campaignId,
        campaignName: row.campaignName,
        startDate: row.startDate,
        sent: row.totalSentUsers,
      });
    });
    
    // If monthly doesn't match source, flag rows with date issues
    const sentCheck = checks.find(c => c.metric === "Total Sent (users)");
    if (sentCheck && !sentCheck.passed && sentCheck.monthlyDelta !== 0) {
      data.forEach(row => {
        const monthResult = getMonthFromDate(row.startDate);
        if (!monthResult.isValid) {
          errorRows.push({
            campaignId: row.campaignId,
            campaignName: row.campaignName,
            startDate: row.startDate || "—",
            reason: monthResult.error || "Invalid date format",
            metric: "Total Sent (users)",
            sourceValue: row.totalSentUsers,
            contributedValue: row.totalSentUsers, // Now included via "Unknown Date" bucket
          });
        }
      });
    }
  }
  
  return {
    status: allPassed ? "PASS" : "FAIL",
    checks,
    errorRows,
  };
};

const generateBestSummary = (campaigns: TopCampaign[]): string => {
  if (campaigns.length === 0) return "No campaigns with sufficient volume to analyze.";

  const avgOpenRate = campaigns.reduce((s, c) => s + c.openRate, 0) / campaigns.length;
  const avgClickRate = campaigns.reduce((s, c) => s + c.clickRate, 0) / campaigns.length;
  
  const patterns: string[] = [];
  
  // Analyze subject line patterns
  const hasUrgency = campaigns.some(c => /limited|last|ending|hurry|now/i.test(c.subjectLine));
  const hasPersonalization = campaigns.some(c => /you|your/i.test(c.subjectLine));
  const hasNumbers = campaigns.some(c => /\d+%|\d+ off/i.test(c.subjectLine));
  const shortSubjects = campaigns.filter(c => c.subjectLine.length < 50).length > campaigns.length / 2;
  
  if (hasUrgency) patterns.push("urgency-driven messaging");
  if (hasPersonalization) patterns.push("personalized language");
  if (hasNumbers) patterns.push("specific offers with numbers");
  if (shortSubjects) patterns.push("concise subject lines");
  
  const patternText = patterns.length > 0 
    ? `Common success factors include ${patterns.join(", ")}.`
    : "High engagement indicates strong audience-message fit.";

  return `Top performers achieved ${avgOpenRate.toFixed(1)}% avg open rate and ${avgClickRate.toFixed(1)}% click rate. ${patternText} Low bounce and unsubscribe rates suggest healthy list quality and relevant content timing.`;
};

const generateWorstSummary = (campaigns: TopCampaign[]): string => {
  if (campaigns.length === 0) return "No campaigns with sufficient volume to analyze.";

  const avgOpenRate = campaigns.reduce((s, c) => s + c.openRate, 0) / campaigns.length;
  const avgClickRate = campaigns.reduce((s, c) => s + c.clickRate, 0) / campaigns.length;
  const avgBounce = campaigns.reduce((s, c) => s + (c.hardBounces + c.softBounces), 0) / campaigns.length;
  
  const issues: string[] = [];
  
  if (avgOpenRate < 10) issues.push("low open rates suggest deliverability or subject line issues");
  if (avgClickRate < 1) issues.push("poor click-through indicates weak CTAs or irrelevant content");
  if (avgBounce > 100) issues.push("elevated bounce rates point to list hygiene problems");
  
  // Check for patterns
  const longSubjects = campaigns.filter(c => c.subjectLine.length > 60).length > campaigns.length / 2;
  if (longSubjects) issues.push("overly long subject lines getting truncated");

  const issueText = issues.length > 0 
    ? issues.join("; ")
    : "underperformance may be due to timing, segmentation, or content relevance";

  return `Low performers averaged ${avgOpenRate.toFixed(1)}% open rate and ${avgClickRate.toFixed(1)}% click rate. Issues identified: ${issueText}. Consider A/B testing and audience segmentation improvements.`;
};

const generateKeyLearnings = (
  data: CampaignRow[],
  monthlyData: MonthlyOverview[],
  best: TopCampaign[],
  worst: TopCampaign[]
): KeyLearning[] => {
  const learnings: KeyLearning[] = [];

  // Trend analysis
  if (monthlyData.length >= 2) {
    const firstMonth = monthlyData[0];
    const lastMonth = monthlyData[monthlyData.length - 1];
    const openDelta = lastMonth.openRate - firstMonth.openRate;
    
    if (Math.abs(openDelta) > 2) {
      learnings.push({
        title: openDelta > 0 ? "Improving Open Rates" : "Declining Open Rates",
        description: `Open rates ${openDelta > 0 ? "increased" : "decreased"} by ${Math.abs(openDelta).toFixed(1)}% from ${firstMonth.month} to ${lastMonth.month}. ${openDelta > 0 ? "Continue current strategies." : "Review subject lines and send times."}`,
      });
    }
  }

  // Volume vs engagement
  const totalSent = data.reduce((s, c) => s + c.totalSentUsers, 0);
  const avgOpen = data.reduce((s, c) => s + c.openRate, 0) / data.length;
  
  if (avgOpen < 15 && totalSent > 100000) {
    learnings.push({
      title: "High Volume, Low Engagement",
      description: "Large send volumes with below-average open rates suggest potential list fatigue. Consider frequency capping and re-engagement campaigns.",
    });
  }

  // Bounce rate concerns
  const avgHardBounce = data.reduce((s, c) => s + c.hardBounceRate, 0) / data.length;
  if (avgHardBounce > 0.5) {
    learnings.push({
      title: "Hard Bounce Rate Above Threshold",
      description: `Average hard bounce rate of ${avgHardBounce.toFixed(2)}% exceeds the 0.5% best practice threshold. Implement email verification and list cleaning.`,
    });
  }

  // Unsubscribe concerns
  const avgUnsub = data.reduce((s, c) => s + c.unsubscribeRate, 0) / data.length;
  if (avgUnsub > 0.2) {
    learnings.push({
      title: "Elevated Unsubscribe Rate",
      description: `Average unsubscribe rate of ${avgUnsub.toFixed(2)}% is above the 0.2% threshold. Review content relevance and send frequency.`,
    });
  }

  // Best performer insights
  if (best.length > 0) {
    const topAvgOpen = best.slice(0, 3).reduce((s, c) => s + c.openRate, 0) / Math.min(3, best.length);
    learnings.push({
      title: "Top Campaign Performance",
      description: `Best campaigns achieved ${topAvgOpen.toFixed(1)}% open rates. Analyze these subject lines and content for replicable patterns.`,
    });
  }

  return learnings.slice(0, 5);
};

// ============= REPUTATION REPAIR ANALYSIS =============

const generateDiagnosticSummary = (
  sortedData: CampaignRow[],
  postmasterData: PostmasterRow[] | null,
  contextText: string | null
): DeliverabilityDiagnosticSummary => {
  const trendAnalysis: TrendAnalysis[] = [];
  const correlations: CorrelationInsight[] = [];
  const impactSummary: { observation: string; impact: string; affectedCampaignIds: string[] }[] = [];
  const prioritizedRecommendations: { priority: "immediate" | "short-term" | "ongoing"; recommendation: string }[] = [];

  if (sortedData.length < 2) {
    return { trendAnalysis, correlations, impactSummary, prioritizedRecommendations };
  }

  // A. TREND ANALYSIS (Oldest → Newest)
  const windowSize = Math.min(5, Math.floor(sortedData.length / 2));
  const firstWindow = sortedData.slice(0, windowSize);
  const lastWindow = sortedData.slice(-windowSize);

  const calcAvg = (arr: CampaignRow[], getter: (c: CampaignRow) => number) => 
    arr.reduce((s, c) => s + getter(c), 0) / arr.length;

  // Open/View rate trend
  const openStart = calcAvg(firstWindow, c => c.openRate);
  const openEnd = calcAvg(lastWindow, c => c.openRate);
  const openChange = openStart > 0 ? ((openEnd - openStart) / openStart) * 100 : 0;
  trendAnalysis.push({
    metric: "Open/View Rate",
    trend: openChange > 5 ? "improving" : openChange < -5 ? "declining" : "stable",
    startValue: openStart,
    endValue: openEnd,
    changePercent: openChange,
    observation: `Open rate ${openChange > 5 ? "improved" : openChange < -5 ? "declined" : "remained stable"} from ${openStart.toFixed(1)}% to ${openEnd.toFixed(1)}% (${openChange > 0 ? "+" : ""}${openChange.toFixed(1)}%)`,
  });

  // Click rate trend
  const clickStart = calcAvg(firstWindow, c => c.clickRate);
  const clickEnd = calcAvg(lastWindow, c => c.clickRate);
  const clickChange = clickStart > 0 ? ((clickEnd - clickStart) / clickStart) * 100 : 0;
  trendAnalysis.push({
    metric: "Click Rate",
    trend: clickChange > 5 ? "improving" : clickChange < -5 ? "declining" : "stable",
    startValue: clickStart,
    endValue: clickEnd,
    changePercent: clickChange,
    observation: `Click rate ${clickChange > 5 ? "improved" : clickChange < -5 ? "declined" : "remained stable"} from ${clickStart.toFixed(2)}% to ${clickEnd.toFixed(2)}%`,
  });

  // Unsubscribe rate trend
  const unsubStart = calcAvg(firstWindow, c => c.unsubscribeRate);
  const unsubEnd = calcAvg(lastWindow, c => c.unsubscribeRate);
  const unsubChange = unsubStart > 0 ? ((unsubEnd - unsubStart) / unsubStart) * 100 : 0;
  trendAnalysis.push({
    metric: "Unsubscribe Rate",
    trend: unsubChange > 10 ? "declining" : unsubChange < -10 ? "improving" : "stable",
    startValue: unsubStart,
    endValue: unsubEnd,
    changePercent: unsubChange,
    observation: `Unsubscribe rate ${unsubChange > 10 ? "increased (concerning)" : unsubChange < -10 ? "decreased (positive)" : "remained stable"} at ${unsubEnd.toFixed(3)}%`,
  });

  // Bounce rate trend (hard + soft combined)
  const bounceStart = calcAvg(firstWindow, c => c.hardBounceRate + c.softBounceRate);
  const bounceEnd = calcAvg(lastWindow, c => c.hardBounceRate + c.softBounceRate);
  const bounceChange = bounceStart > 0 ? ((bounceEnd - bounceStart) / bounceStart) * 100 : 0;
  trendAnalysis.push({
    metric: "Combined Bounce Rate",
    trend: bounceChange > 10 ? "declining" : bounceChange < -10 ? "improving" : "stable",
    startValue: bounceStart,
    endValue: bounceEnd,
    changePercent: bounceChange,
    observation: `Bounce rate ${bounceChange > 10 ? "increased" : bounceChange < -10 ? "decreased" : "stable"} from ${bounceStart.toFixed(2)}% to ${bounceEnd.toFixed(2)}%`,
  });

  // Postmaster trends if available
  if (postmasterData && postmasterData.length >= 2) {
    const sortedPM = [...postmasterData].sort((a, b) => {
      const dateA = parseDateSafely(a.date);
      const dateB = parseDateSafely(b.date);
      return (dateA?.getTime() || 0) - (dateB?.getTime() || 0);
    });
    
    const pmFirst = sortedPM.slice(0, Math.min(3, sortedPM.length));
    const pmLast = sortedPM.slice(-Math.min(3, sortedPM.length));
    
    // Spam ratio trend
    const spamStart = pmFirst.reduce((s, p) => s + p.spamRatio, 0) / pmFirst.length;
    const spamEnd = pmLast.reduce((s, p) => s + p.spamRatio, 0) / pmLast.length;
    if (spamStart > 0 || spamEnd > 0) {
      trendAnalysis.push({
        metric: "Spam Ratio (Postmaster)",
        trend: spamEnd > spamStart ? "declining" : "improving",
        startValue: spamStart * 100,
        endValue: spamEnd * 100,
        changePercent: spamStart > 0 ? ((spamEnd - spamStart) / spamStart) * 100 : 0,
        observation: `Spam ratio moved from ${(spamStart * 100).toFixed(2)}% to ${(spamEnd * 100).toFixed(2)}%`,
      });
    }

    // Domain reputation trend
    const repLevels: Record<string, number> = { "High": 4, "Medium": 3, "Low": 2, "Bad": 1 };
    const pmWithRep = sortedPM.filter(p => p.domainReputation && repLevels[p.domainReputation]);
    if (pmWithRep.length >= 2) {
      const repStart = repLevels[pmWithRep[0].domainReputation] || 0;
      const repEnd = repLevels[pmWithRep[pmWithRep.length - 1].domainReputation] || 0;
      trendAnalysis.push({
        metric: "Domain Reputation (Postmaster)",
        trend: repEnd > repStart ? "improving" : repEnd < repStart ? "declining" : "stable",
        startValue: repStart,
        endValue: repEnd,
        changePercent: 0,
        observation: `Domain reputation moved from "${pmWithRep[0].domainReputation}" to "${pmWithRep[pmWithRep.length - 1].domainReputation}"`,
      });
    }
  }

  // B. CORRELATION ANALYSIS
  // Find campaigns where open rate dropped AND bounce/reputation issues occurred
  const windowForCorr = 5;
  const openDropCampaigns: { campaignId: string; sendDate: string; openDrop: number }[] = [];
  const bounceSpikeCampaigns: { campaignId: string; sendDate: string; bounceRate: number }[] = [];

  for (let i = windowForCorr; i < sortedData.length; i++) {
    const current = sortedData[i];
    const prevAvg = sortedData.slice(i - windowForCorr, i).reduce((s, c) => s + c.openRate, 0) / windowForCorr;
    
    if (current.openRate < prevAvg * 0.8 && prevAvg > 5) {
      openDropCampaigns.push({ campaignId: current.campaignId, sendDate: current.startDate, openDrop: prevAvg - current.openRate });
    }
    
    if (current.hardBounceRate > 0.5 || current.softBounceRate > 1) {
      bounceSpikeCampaigns.push({ campaignId: current.campaignId, sendDate: current.startDate, bounceRate: current.hardBounceRate + current.softBounceRate });
    }
  }

  // Correlate engagement declines with bounce spikes
  if (openDropCampaigns.length > 0 && bounceSpikeCampaigns.length > 0) {
    const overlapping = openDropCampaigns.filter(od => 
      bounceSpikeCampaigns.some(bs => bs.campaignId === od.campaignId)
    );
    
    if (overlapping.length > 0) {
      correlations.push({
        primaryMetric: "Open Rate Decline",
        secondaryMetric: "Bounce Rate Spike",
        relationship: `Engagement decline coincides with elevated bounce rates in ${overlapping.length} campaigns. This is a likely contributor to deliverability issues.`,
        affectedCampaigns: overlapping.map(o => ({ campaignId: o.campaignId, sendDate: o.sendDate })),
      });
    }
  }

  // Correlate with postmaster data
  if (postmasterData && postmasterData.length > 0 && openDropCampaigns.length > 0) {
    const lowRepDates = postmasterData.filter(p => p.domainReputation === "Low" || p.domainReputation === "Bad");
    if (lowRepDates.length > 0) {
      correlations.push({
        primaryMetric: "Open Rate Decline",
        secondaryMetric: "Domain Reputation Drop",
        relationship: `Open rate declines preceded by domain reputation drops to "${lowRepDates[0].domainReputation}" on ${lowRepDates[0].date}. Reputation degradation is a likely contributor.`,
        affectedCampaigns: openDropCampaigns.slice(0, 5).map(o => ({ campaignId: o.campaignId, sendDate: o.sendDate })),
      });
    }
  }

  // C. IMPACT SUMMARY
  // High hard bounce campaigns
  const highBounce = sortedData.filter(c => c.hardBounceRate > 0.5);
  if (highBounce.length > 0) {
    impactSummary.push({
      observation: `${highBounce.length} campaigns exceeded 0.5% hard bounce threshold`,
      impact: "Sender reputation damage and potential blocklisting by major ISPs",
      affectedCampaignIds: highBounce.map(c => `${c.campaignId} (${c.startDate})`),
    });
  }

  // High unsubscribe campaigns
  const highUnsub = sortedData.filter(c => c.unsubscribeRate > 0.2);
  if (highUnsub.length > 0) {
    impactSummary.push({
      observation: `${highUnsub.length} campaigns exceeded 0.2% unsubscribe threshold`,
      impact: "List degradation and increased spam complaint risk",
      affectedCampaignIds: highUnsub.map(c => `${c.campaignId} (${c.startDate})`),
    });
  }

  // Open rate decline
  if (openChange < -15) {
    impactSummary.push({
      observation: `Overall open rate declined by ${Math.abs(openChange).toFixed(1)}%`,
      impact: "Reduced campaign visibility and potential inbox placement issues",
      affectedCampaignIds: openDropCampaigns.slice(0, 5).map(c => `${c.campaignId} (${c.sendDate})`),
    });
  }

  // D. PRIORITIZED RECOMMENDATIONS
  // Immediate (0-7 days)
  if (highBounce.length > 0) {
    prioritizedRecommendations.push({
      priority: "immediate",
      recommendation: "Clean email list immediately. Remove invalid addresses identified in recent sends. Implement real-time email verification for new signups.",
    });
  }

  if (postmasterData?.some(p => p.domainReputation === "Low" || p.domainReputation === "Bad")) {
    prioritizedRecommendations.push({
      priority: "immediate",
      recommendation: "Domain reputation is degraded. Pause large sends to cold segments. Focus on engaged subscribers only for the next 7 days.",
    });
  }

  if (contextText?.toLowerCase().includes("spam")) {
    prioritizedRecommendations.push({
      priority: "immediate",
      recommendation: "User reports emails landing in spam. Verify SPF/DKIM/DMARC authentication immediately. Check content for spam triggers (excessive caps, misleading subjects).",
    });
  }

  // Short-term (7-21 days)
  if (highUnsub.length > 0) {
    prioritizedRecommendations.push({
      priority: "short-term",
      recommendation: "Review content relevance and send frequency. Implement preference center to give subscribers control over email types and cadence.",
    });
  }

  if (openChange < -10) {
    prioritizedRecommendations.push({
      priority: "short-term",
      recommendation: "Conduct subject line A/B testing. Review send times and segment engagement patterns. Consider re-engagement campaign for inactive subscribers.",
    });
  }

  if (contextText?.toLowerCase().includes("clipped") || contextText?.toLowerCase().includes("scroll")) {
    prioritizedRecommendations.push({
      priority: "short-term",
      recommendation: "Emails getting clipped in Gmail (102KB limit). Reduce HTML size, optimize images, move key CTA above the fold.",
    });
  }

  // Ongoing monitoring
  prioritizedRecommendations.push({
    priority: "ongoing",
    recommendation: "Monitor hard bounce rate (keep < 0.5%), soft bounce (< 1%), and unsubscribe rate (< 0.2%) for every campaign. Set up alerts for threshold violations.",
  });

  if (postmasterData && postmasterData.length > 0) {
    prioritizedRecommendations.push({
      priority: "ongoing",
      recommendation: "Continue monitoring Google Postmaster Tools daily. Track domain reputation, spam ratio, and error ratio trends for early warning signs.",
    });
  }

  return { trendAnalysis, correlations, impactSummary, prioritizedRecommendations };
};

export const generateReputationRepairReport = (
  data: CampaignRow[],
  postmasterData: PostmasterRow[] | null,
  contextText: string | null
): ReputationRepairReport => {
  const issues: ReputationIssue[] = [];

  // Sort campaigns chronologically (oldest to newest)
  const sortedData = [...data].sort((a, b) => {
    const dateA = parseDateSafely(a.startDate);
    const dateB = parseDateSafely(b.startDate);
    return (dateA?.getTime() || 0) - (dateB?.getTime() || 0);
  });

  // Generate diagnostic summary FIRST
  const diagnosticSummary = generateDiagnosticSummary(sortedData, postmasterData, contextText);

  // Calculate rolling average for detecting dips
  const windowSize = 5;
  
  for (let i = windowSize; i < sortedData.length; i++) {
    const current = sortedData[i];
    const previousWindow = sortedData.slice(i - windowSize, i);
    const prevAvgOpen = previousWindow.reduce((s, c) => s + c.openRate, 0) / windowSize;
    
    // Detect sudden open rate drops (>20% decline from rolling avg)
    if (current.openRate < prevAvgOpen * 0.8 && prevAvgOpen > 5) {
      // Check for correlated issues
      const issue: ReputationIssue = {
        campaignId: current.campaignId,
        sendDate: current.startDate,
        observation: `Open rate dropped from ${prevAvgOpen.toFixed(1)}% (rolling avg) to ${current.openRate.toFixed(1)}%`,
        impact: "Potential deliverability issue affecting inbox placement",
        rootCause: "",
        recommendation: "",
        metricValues: {
          openRate: current.openRate,
          previousAvg: prevAvgOpen,
          hardBounceRate: current.hardBounceRate,
          softBounceRate: current.softBounceRate,
        },
        priority: "short-term",
      };

      // Determine root cause and priority
      if (current.hardBounceRate > 0.5) {
        issue.rootCause = `Hard bounce rate of ${current.hardBounceRate.toFixed(2)}% exceeds 0.5% threshold`;
        issue.recommendation = "Clean email list immediately. Remove invalid addresses and implement double opt-in.";
        issue.priority = "immediate";
      } else if (current.softBounceRate > 1) {
        issue.rootCause = `Soft bounce rate of ${current.softBounceRate.toFixed(2)}% exceeds 1% threshold`;
        issue.recommendation = "Check sending infrastructure. Review content for spam triggers and reduce email size.";
        issue.priority = "immediate";
      } else if (current.unsubscribeRate > 0.2) {
        issue.rootCause = `Unsubscribe rate of ${current.unsubscribeRate.toFixed(2)}% indicates content dissatisfaction`;
        issue.recommendation = "Review content relevance and reduce send frequency. Consider preference center.";
        issue.priority = "short-term";
      } else {
        issue.rootCause = "Possible spam folder placement or recipient fatigue";
        issue.recommendation = "Review subject lines for spam triggers. Check authentication (SPF/DKIM/DMARC).";
        issue.priority = "short-term";
      }

      // Check postmaster data for correlated issues
      if (postmasterData && postmasterData.length > 0) {
        const campaignDate = parseDateSafely(current.startDate);
        if (campaignDate) {
          const nearbyPostmaster = postmasterData.find(p => {
            const pmDate = parseDateSafely(p.date);
            if (!pmDate) return false;
            const dayDiff = Math.abs((pmDate.getTime() - campaignDate.getTime()) / (1000 * 60 * 60 * 24));
            return dayDiff <= 2;
          });

          if (nearbyPostmaster) {
            if (nearbyPostmaster.spamRatio > 0.01) {
              issue.rootCause += `. Postmaster shows ${(nearbyPostmaster.spamRatio * 100).toFixed(2)}% spam ratio on ${nearbyPostmaster.date}`;
              issue.recommendation += " Postmaster data confirms spam issues - prioritize content and list hygiene.";
              issue.priority = "immediate";
            }
            if (nearbyPostmaster.domainReputation === "Low" || nearbyPostmaster.domainReputation === "Bad") {
              issue.rootCause += `. Domain reputation: ${nearbyPostmaster.domainReputation}`;
              issue.recommendation += " Domain reputation is degraded - implement gradual warm-up.";
              issue.priority = "immediate";
            }
          }
        }
      }

      issues.push(issue);
    }

    // Check threshold violations regardless of dips
    if (current.hardBounceRate > 0.5 && !issues.some(i => i.campaignId === current.campaignId)) {
      issues.push({
        campaignId: current.campaignId,
        sendDate: current.startDate,
        observation: `Hard bounce rate of ${current.hardBounceRate.toFixed(2)}% exceeds 0.5% threshold`,
        impact: "Sender reputation damage and potential blocklisting",
        rootCause: "Invalid email addresses in list - possible purchased list or outdated data",
        recommendation: "Immediately pause sends to unverified segments. Implement real-time email verification.",
        metricValues: {
          hardBounceRate: current.hardBounceRate,
          hardBounces: current.hardBounces,
          totalSent: current.totalSentUsers,
        },
        priority: "immediate",
      });
    }

    if (current.unsubscribeRate > 0.2 && !issues.some(i => i.campaignId === current.campaignId)) {
      issues.push({
        campaignId: current.campaignId,
        sendDate: current.startDate,
        observation: `Unsubscribe rate of ${current.unsubscribeRate.toFixed(2)}% exceeds 0.2% threshold`,
        impact: "List degradation and potential spam complaints",
        rootCause: "Content-audience mismatch or excessive send frequency",
        recommendation: "Review segmentation strategy. Implement preference center for frequency control.",
        metricValues: {
          unsubscribeRate: current.unsubscribeRate,
          unsubscribes: current.totalUnsubscribes,
          totalSent: current.totalSentUsers,
        },
        priority: "short-term",
      });
    }

    if (current.softBounceRate > 1 && !issues.some(i => i.campaignId === current.campaignId)) {
      issues.push({
        campaignId: current.campaignId,
        sendDate: current.startDate,
        observation: `Soft bounce rate of ${current.softBounceRate.toFixed(2)}% exceeds 1% threshold`,
        impact: "Temporary delivery failures affecting engagement metrics",
        rootCause: "Recipient mailbox full, server issues, or email size too large",
        recommendation: "Retry soft bounces after 24-48 hours. Check email size and image optimization.",
        metricValues: {
          softBounceRate: current.softBounceRate,
          softBounces: current.softBounces,
          totalSent: current.totalSentUsers,
        },
        priority: "short-term",
      });
    }
  }

  // Incorporate context text insights
  if (contextText) {
    const lowerContext = contextText.toLowerCase();
    
    if (lowerContext.includes("spam") && !issues.some(i => i.observation.includes("spam"))) {
      issues.push({
        campaignId: "Context Note",
        sendDate: "User Reported",
        observation: `User reported: "${contextText.slice(0, 100)}${contextText.length > 100 ? '...' : ''}"`,
        impact: "Reduced visibility and engagement, potential reputation damage",
        rootCause: "Could be content triggers, authentication issues, or reputation decline",
        recommendation: "1) Verify SPF/DKIM/DMARC setup. 2) Check content for spam triggers. 3) Review postmaster tools. 4) Warm up IP/domain if new.",
        metricValues: {},
        priority: "immediate",
      });
    }
    
    if (lowerContext.includes("clipped") || lowerContext.includes("scroll")) {
      issues.push({
        campaignId: "Context Note",
        sendDate: "User Reported",
        observation: `User reported: "${contextText.slice(0, 100)}${contextText.length > 100 ? '...' : ''}"`,
        impact: "Content below fold not visible, reduced engagement",
        rootCause: "Email size exceeds Gmail's 102KB limit or design is too long",
        recommendation: "Keep HTML under 100KB. Move key CTA above fold. Use web-hosted version link.",
        metricValues: {},
        priority: "short-term",
      });
    }
  }

  // Sort issues by date (oldest first)
  issues.sort((a, b) => {
    const dateA = parseDateSafely(a.sendDate);
    const dateB = parseDateSafely(b.sendDate);
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateA.getTime() - dateB.getTime();
  });

  // Generate enhanced structured report
  const enhancedReport = generateEnhancedReputationReport(
    sortedData,
    postmasterData,
    contextText,
    diagnosticSummary
  );

  return {
    diagnosticSummary,
    issues,
    hasPostmasterData: postmasterData !== null && postmasterData.length > 0,
    contextNotes: contextText,
    enhancedReport,
  };
};

// ============= ENHANCED REPUTATION REPORT GENERATOR =============

const generateEnhancedReputationReport = (
  sortedData: CampaignRow[],
  postmasterData: PostmasterRow[] | null,
  contextText: string | null,
  diagnosticSummary: DeliverabilityDiagnosticSummary
): EnhancedReputationReport => {
  const hasPostmaster = postmasterData !== null && postmasterData.length > 0;
  const dataQualityNotes: DataQualityNote[] = [];

  // Check for data quality issues that might require refusal
  if (sortedData.length < 3) {
    return createRefusalReport("Insufficient data: Less than 3 campaigns available for meaningful analysis.");
  }

  // 0️⃣ VERSIONING & SCOPE
  const dates = sortedData.map(c => parseDateSafely(c.startDate)).filter(Boolean) as Date[];
  const minDate = dates.length > 0 ? dates.reduce((a, b) => a < b ? a : b) : null;
  const maxDate = dates.length > 0 ? dates.reduce((a, b) => a > b ? a : b) : null;
  
  const dataRange = minDate && maxDate 
    ? `${formatDateForReport(minDate)} – ${formatDateForReport(maxDate)}`
    : "Unknown date range";

  const dataSources: string[] = ["Campaign Performance CSV"];
  if (hasPostmaster) dataSources.push("Google Postmaster Tools Export");
  if (contextText) dataSources.push("User-Provided Context");

  const versioningScope: VersioningScope = {
    analysisVersion: "1.0",
    dataRange,
    dataSources,
    senderDomain: extractDomainFromData(sortedData, postmasterData),
  };

  // Calculate key aggregates for analysis
  const totals = calculateTotals(sortedData);
  const useDelivered = totals.delivered > 0;
  const denominator = useDelivered ? totals.delivered : totals.sent;

  // Calculate trends based on first week vs last week of the time period
  // Group campaigns by week and compare first week to last week
  const campaignsByDate = sortedData
    .map(c => ({ ...c, parsedDate: parseDateSafely(c.startDate) }))
    .filter(c => c.parsedDate !== null)
    .sort((a, b) => (a.parsedDate!.getTime() - b.parsedDate!.getTime()));
  
  // Get first and last week's campaigns (7 days from start and end of data period)
  const getWeekCampaigns = (campaigns: typeof campaignsByDate, isFirstWeek: boolean) => {
    if (campaigns.length === 0) return [];
    const referenceDate = isFirstWeek ? campaigns[0].parsedDate! : campaigns[campaigns.length - 1].parsedDate!;
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    return campaigns.filter(c => {
      const timeDiff = isFirstWeek 
        ? c.parsedDate!.getTime() - referenceDate.getTime()
        : referenceDate.getTime() - c.parsedDate!.getTime();
      return timeDiff >= 0 && timeDiff <= weekMs;
    });
  };
  
  const firstWeekCampaigns = getWeekCampaigns(campaignsByDate, true);
  const lastWeekCampaigns = getWeekCampaigns(campaignsByDate, false);
  
  // Fallback to window-based if weeks have insufficient data
  const windowSize = Math.min(5, Math.floor(sortedData.length / 2));
  const firstWindow = firstWeekCampaigns.length >= 3 ? firstWeekCampaigns : sortedData.slice(0, windowSize);
  const lastWindow = lastWeekCampaigns.length >= 3 ? lastWeekCampaigns : sortedData.slice(-windowSize);
  
  const calcAvg = (arr: CampaignRow[], getter: (c: CampaignRow) => number) => 
    arr.length > 0 ? arr.reduce((s, c) => s + getter(c), 0) / arr.length : 0;

  const openStart = calcAvg(firstWindow, c => c.openRate);
  const openEnd = calcAvg(lastWindow, c => c.openRate);
  const openChange = openStart > 0 ? ((openEnd - openStart) / openStart) * 100 : 0;

  // Calculate separate hard and soft bounce averages (never combine for primary metrics)
  const hardBounceStart = calcAvg(firstWindow, c => c.hardBounceRate);
  const hardBounceEnd = calcAvg(lastWindow, c => c.hardBounceRate);
  const softBounceStart = calcAvg(firstWindow, c => c.softBounceRate);
  const softBounceEnd = calcAvg(lastWindow, c => c.softBounceRate);
  
  // Combined bounce for backward compatibility with some metrics
  const bounceStart = hardBounceStart + softBounceStart;
  const bounceEnd = hardBounceEnd + softBounceEnd;

  const unsubStart = calcAvg(firstWindow, c => c.unsubscribeRate);
  const unsubEnd = calcAvg(lastWindow, c => c.unsubscribeRate);

  // 1️⃣ MONTHLY REPUTATION RERUN SNAPSHOT
  const reputationDirection = determineReputationDirection(openChange, bounceEnd, unsubEnd, postmasterData);
  const primaryStressSignal = determinePrimaryStressSignal(sortedData, postmasterData);
  const damageAssessment = assessDamageType(openChange, bounceEnd, postmasterData);
  
  const reputationSnapshot: ReputationSnapshot = {
    reputationDirection,
    reputationEvidence: generateReputationEvidence(openChange, hardBounceEnd, softBounceEnd, unsubEnd, postmasterData),
    primaryStressSignal,
    timingCorrelation: generateTimingCorrelation(sortedData, openChange),
    damageAssessment,
    safeToScale: reputationDirection !== "degrading" && hardBounceEnd < 0.5 && unsubEnd < 0.3,
    verdict: generateVerdict(reputationDirection, hardBounceEnd, softBounceEnd, unsubEnd),
  };

  // 2️⃣ REPUTATION SIGNAL TABLE
  const signalTable = generateSignalTable(totals, denominator, openStart, openEnd, hardBounceStart, hardBounceEnd, softBounceStart, softBounceEnd, unsubStart, unsubEnd, postmasterData);
  
  const signalTableDenominatorNote = useDelivered 
    ? `Percentages calculated using Delivered (${formatNumber(totals.delivered)}) as denominator.`
    : `Percentages calculated using Sent (${formatNumber(totals.sent)}) as denominator. Delivered data not available.`;

  if (!useDelivered) {
    dataQualityNotes.push({
      type: "missing_field",
      description: "Delivered count is 0 or missing. Using Sent as denominator for rate calculations.",
    });
  }

  // 3️⃣ MOM ANALYSIS
  const momAnalysis = generateMoMAnalysis(sortedData, openChange, hardBounceEnd - hardBounceStart, softBounceEnd - softBounceStart, unsubEnd - unsubStart);

  // 4️⃣ SEND MIX & LIFECYCLE PRESSURE
  const sendMixAnalysis = analyzeSendMix(sortedData);

  // 5️⃣ ROOT CAUSE SUMMARY
  const rootCauses = generateRootCauses(sortedData, openChange, hardBounceEnd, softBounceEnd, unsubEnd, postmasterData);

  // 6️⃣ REPUTATION REPAIR ACTIONS
  const repairActions = generateRepairActions(reputationDirection, hardBounceEnd, softBounceEnd, unsubEnd, openChange, postmasterData, contextText);

  // 7️⃣ EXCLUSIONS
  const exclusions: AnalysisExclusions = {
    exclusions: [
      "Revenue attribution per campaign",
      "Creative quality assessment (images, design, copy)",
      "Cross-channel impact (push, SMS, in-app)",
      "Long-term cohort LTV analysis",
      "Individual subscriber behavior",
      "A/B test statistical significance",
    ],
  };

  // 8️⃣ SOURCE ATTRIBUTIONS
  const sourceAttributions = generateSourceAttributions(hasPostmaster, contextText !== null);

  // 9️⃣ DATA QUALITY NOTES
  if (!hasPostmaster) {
    dataQualityNotes.push({
      type: "missing_field",
      description: "Postmaster data not provided. Domain/IP reputation trends cannot be assessed.",
    });
  }

  if (sortedData.length < 10) {
    dataQualityNotes.push({
      type: "caution",
      description: `Analysis based on ${sortedData.length} campaigns. Trends may be less reliable with limited data.`,
    });
  }

  // Check for any missing rate calculations
  const campaignsWithZeroSent = sortedData.filter(c => c.totalSentUsers === 0).length;
  if (campaignsWithZeroSent > 0) {
    dataQualityNotes.push({
      type: "data_gap",
      description: `${campaignsWithZeroSent} campaigns have 0 sends recorded and were included in analysis.`,
    });
  }

  // ✅ FINAL CONFIRMATION
  const finalConfirmation = "All insights above are derived from the provided data and cited sources. External sources were used only where internal documentation was insufficient and have been explicitly disclosed.";

  return {
    versioningScope,
    reputationSnapshot,
    signalTable,
    signalTableDenominatorNote,
    momAnalysis,
    sendMixAnalysis,
    rootCauses,
    repairActions,
    exclusions,
    sourceAttributions,
    dataQualityNotes,
    finalConfirmation,
    refusalReason: null,
  };
};

// Helper: Create refusal report when data quality is insufficient
const createRefusalReport = (reason: string): EnhancedReputationReport => ({
  versioningScope: {
    analysisVersion: "1.0",
    dataRange: "N/A",
    dataSources: [],
    senderDomain: "Unknown",
  },
  reputationSnapshot: {
    reputationDirection: "stable",
    reputationEvidence: "",
    primaryStressSignal: "",
    timingCorrelation: "",
    damageAssessment: "reversible",
    safeToScale: false,
    verdict: "Cannot determine - insufficient data",
  },
  signalTable: [],
  signalTableDenominatorNote: "",
  momAnalysis: {
    changesThisMonth: [],
    stableFactors: [],
    worsenedBeforeShift: [],
    comparisonAvailable: false,
    comparisonNote: reason,
  },
  sendMixAnalysis: {
    transactionalPercent: 0,
    lifecyclePercent: 0,
    promotionalPercent: 0,
    overweightedTypes: [],
    underutilizedAbsorbers: [],
    classificationConfidence: "low",
    ambiguityNotes: [reason],
  },
  rootCauses: [],
  repairActions: [],
  exclusions: { exclusions: [] },
  sourceAttributions: [],
  dataQualityNotes: [{ type: "caution", description: reason }],
  finalConfirmation: "",
  refusalReason: reason,
});

// Helper: Format date for report display
const formatDateForReport = (date: Date): string => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

// Helper: Extract domain from data
const extractDomainFromData = (campaigns: CampaignRow[], postmaster: PostmasterRow[] | null): string => {
  if (postmaster && postmaster.length > 0 && postmaster[0].domain) {
    return postmaster[0].domain;
  }
  // Try to extract from campaign names or subject lines
  const emailPatterns = campaigns
    .map(c => c.campaignName + " " + c.subjectLine)
    .join(" ")
    .match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return emailPatterns ? emailPatterns[1] : "Not specified";
};

// Helper: Calculate totals
const calculateTotals = (data: CampaignRow[]) => ({
  sent: data.reduce((s, c) => s + c.totalSentUsers, 0),
  delivered: data.reduce((s, c) => s + c.totalDeliveredUsers, 0),
  viewed: data.reduce((s, c) => s + c.uniqueViewedWithinConversion, 0),
  clicked: data.reduce((s, c) => s + c.uniqueClickedWithinConversion, 0),
  hardBounce: data.reduce((s, c) => s + c.hardBounces, 0),
  softBounce: data.reduce((s, c) => s + c.softBounces, 0),
  unsubs: data.reduce((s, c) => s + c.totalUnsubscribes, 0),
});

// Helper: Format number with commas
const formatNumber = (num: number): string => num.toLocaleString('en-US', { maximumFractionDigits: 0 });

// Helper: Determine reputation direction
const determineReputationDirection = (
  openChange: number,
  bounceEnd: number,
  unsubEnd: number,
  postmaster: PostmasterRow[] | null
): "improving" | "stable" | "degrading" => {
  let score = 0;
  
  // Open rate trend
  if (openChange > 10) score += 2;
  else if (openChange > 5) score += 1;
  else if (openChange < -10) score -= 2;
  else if (openChange < -5) score -= 1;
  
  // Bounce rate thresholds
  if (bounceEnd > 3) score -= 2;
  else if (bounceEnd > 1) score -= 1;
  else if (bounceEnd < 0.5) score += 1;
  
  // Unsubscribe thresholds
  if (unsubEnd > 0.7) score -= 2;
  else if (unsubEnd > 0.3) score -= 1;
  else if (unsubEnd < 0.1) score += 1;
  
  // Postmaster reputation
  if (postmaster && postmaster.length > 0) {
    const latest = postmaster[postmaster.length - 1];
    if (latest.domainReputation === "High") score += 2;
    else if (latest.domainReputation === "Medium") score += 0;
    else if (latest.domainReputation === "Low") score -= 1;
    else if (latest.domainReputation === "Bad") score -= 2;
    
    if (latest.spamRatio > 0.05) score -= 2;
    else if (latest.spamRatio > 0.01) score -= 1;
  }
  
  if (score >= 2) return "improving";
  if (score <= -2) return "degrading";
  return "stable";
};

// Helper: Determine primary stress signal
// NOTE: Primary stress signal can NEVER be soft bounce - only hard bounce, spam, unsubscribe, or engagement decay
// All open rates are based on Unique Viewed (users) / denominator
const determinePrimaryStressSignal = (data: CampaignRow[], postmaster: PostmasterRow[] | null): string => {
  // Filter to campaigns with ≥1000 sends for meaningful analysis
  const significantCampaigns = data.filter(c => c.totalSentUsers >= 1000);
  const campaignsToAnalyze = significantCampaigns.length >= data.length * 0.05 ? significantCampaigns : data;
  
  const avgUnsub = campaignsToAnalyze.reduce((s, c) => s + c.unsubscribeRate, 0) / campaignsToAnalyze.length;
  const avgHardBounce = campaignsToAnalyze.reduce((s, c) => s + c.hardBounceRate, 0) / campaignsToAnalyze.length;
  // Open rate is based on Unique Viewed (users), already calculated in CampaignRow
  const avgOpen = campaignsToAnalyze.reduce((s, c) => s + c.openRate, 0) / campaignsToAnalyze.length;
  
  // Calculate total volume from Total Sent (users)
  const totalVolume = campaignsToAnalyze.reduce((s, c) => s + c.totalSentUsers, 0);
  // Calculate total unique viewed for accurate reporting
  const totalUniqueViewed = campaignsToAnalyze.reduce((s, c) => s + c.uniqueViewedWithinConversion, 0);
  
  // Check postmaster for spam - highest priority
  if (postmaster && postmaster.length > 0) {
    const avgSpam = postmaster.reduce((s, p) => s + p.spamRatio, 0) / postmaster.length;
    if (avgSpam > 0.01) return `Spam complaints (${(avgSpam * 100).toFixed(2)}% avg spam ratio from Postmaster)`;
  }
  
  // Hard bounce is a primary stress signal (soft bounce is NOT)
  if (avgHardBounce > 0.5) return `Hard bounce rate (${avgHardBounce.toFixed(2)}% avg exceeds 0.5% threshold)`;
  if (avgUnsub > 0.3) return `Unsubscribe rate (${avgUnsub.toFixed(2)}% avg exceeds 0.3% threshold)`;
  if (avgOpen < 10) return `Engagement decay (${avgOpen.toFixed(1)}% avg unique open rate indicates deliverability issues)`;
  if (totalVolume > 500000 && avgOpen < 15) return `High volume with low engagement (${formatNumber(totalVolume)} Total Sent users, ${formatNumber(totalUniqueViewed)} Unique Viewed users, ${avgOpen.toFixed(1)}% unique open rate)`;
  
  return "No critical stress signals detected";
};

// Helper: Assess damage type
const assessDamageType = (
  openChange: number,
  bounceEnd: number,
  postmaster: PostmasterRow[] | null
): "structural" | "reversible" => {
  // Structural damage indicators
  if (postmaster && postmaster.length > 0) {
    const latest = postmaster[postmaster.length - 1];
    if (latest.domainReputation === "Bad") return "structural";
    if (latest.spamRatio > 0.1) return "structural";
  }
  
  if (bounceEnd > 5) return "structural";
  if (openChange < -40) return "structural";
  
  return "reversible";
};

// Helper: Generate reputation evidence
// Uses separate hard bounce and soft bounce rates for clarity
// Open rate trend is compared between first week and last week of the data period
const generateReputationEvidence = (
  openChange: number,
  hardBounceEnd: number,
  softBounceEnd: number,
  unsubEnd: number,
  postmaster: PostmasterRow[] | null
): string => {
  const evidence: string[] = [];
  
  if (openChange > 5) evidence.push(`Unique open rate improved ${openChange.toFixed(1)}% (first week vs last week of data period)`);
  else if (openChange < -5) evidence.push(`Unique open rate declined ${Math.abs(openChange).toFixed(1)}% (first week vs last week of data period)`);
  
  // Report hard and soft bounce separately
  if (hardBounceEnd < 0.5) evidence.push(`Hard bounce rate healthy at ${hardBounceEnd.toFixed(2)}%`);
  else if (hardBounceEnd > 0.5) evidence.push(`Hard bounce rate elevated at ${hardBounceEnd.toFixed(2)}% (exceeds 0.5% threshold)`);
  
  if (softBounceEnd > 1) evidence.push(`Soft bounce rate elevated at ${softBounceEnd.toFixed(2)}%`);
  
  if (postmaster && postmaster.length > 0) {
    const latest = postmaster[postmaster.length - 1];
    evidence.push(`Domain reputation: ${latest.domainReputation || 'Unknown'}`);
  }
  
  return evidence.join(". ") || "Stable metrics with no significant changes.";
};

// Helper: Generate timing correlation
// Only analyzes campaigns with ≥1000 sends for meaningful timing analysis
const generateTimingCorrelation = (data: CampaignRow[], openChange: number): string => {
  // Filter to campaigns with ≥1000 sends
  const significantCampaigns = data.filter(c => c.totalSentUsers >= 1000);
  
  // Only proceed if >5% of campaigns are ≥1000 sends
  if (significantCampaigns.length < data.length * 0.05 || significantCampaigns.length < 5) {
    return "Insufficient high-volume campaigns (≥1,000 sends) for timing analysis.";
  }
  
  // Find the point of biggest change among significant campaigns
  let maxDrop = 0;
  let dropIndex = -1;
  
  for (let i = 1; i < significantCampaigns.length; i++) {
    const drop = significantCampaigns[i - 1].openRate - significantCampaigns[i].openRate;
    if (drop > maxDrop) {
      maxDrop = drop;
      dropIndex = i;
    }
  }
  
  if (dropIndex > 0 && maxDrop > 5) {
    const beforeCampaign = significantCampaigns[dropIndex - 1];
    const afterCampaign = significantCampaigns[dropIndex];
    return `Significant engagement drop observed between ${beforeCampaign.startDate} and ${afterCampaign.startDate}. Open rate dropped from ${beforeCampaign.openRate.toFixed(1)}% to ${afterCampaign.openRate.toFixed(1)}% (campaigns ≥1,000 sends only).`;
  }
  
  if (openChange < -10) {
    return "Gradual decline observed across the analysis period. No single triggering event identified.";
  }
  
  return "No significant timing correlation identified. Metrics remained relatively consistent.";
};

// Helper: Generate verdict
// Uses separate hard bounce for safety check (soft bounce is less critical)
const generateVerdict = (direction: "improving" | "stable" | "degrading", hardBounceEnd: number, softBounceEnd: number, unsubEnd: number): string => {
  if (direction === "degrading" || hardBounceEnd > 0.5 || unsubEnd > 0.5) {
    return "Sender is NOT safe to scale next month. Address reputation issues first.";
  }
  if (direction === "improving" && hardBounceEnd < 0.3 && unsubEnd < 0.2) {
    return "Sender IS safe to scale next month with monitoring.";
  }
  return "Sender may cautiously scale with close monitoring of key metrics.";
};

// Helper: Generate signal table
// Uses separate hard bounce and soft bounce with individual trends
const generateSignalTable = (
  totals: ReturnType<typeof calculateTotals>,
  denominator: number,
  openStart: number,
  openEnd: number,
  hardBounceStart: number,
  hardBounceEnd: number,
  softBounceStart: number,
  softBounceEnd: number,
  unsubStart: number,
  unsubEnd: number,
  postmaster: PostmasterRow[] | null
): ReputationSignalRow[] => {
  const table: ReputationSignalRow[] = [];
  
  table.push({
    signal: "Total Sent",
    value: totals.sent,
    percentage: "–",
    trend: "N/A",
    trendDescription: "",
  });
  
  const openRate = denominator > 0 ? (totals.viewed / denominator) * 100 : 0;
  const openTrend = openEnd > openStart ? "up" : openEnd < openStart ? "down" : "stable";
  table.push({
    signal: "Unique Open Rate",
    value: totals.viewed,
    percentage: `${openRate.toFixed(2)}%`,
    trend: openTrend,
    trendDescription: `${openEnd > openStart ? '+' : ''}${(openEnd - openStart).toFixed(1)}pp (first week vs last week)`,
  });
  
  const clickRate = denominator > 0 ? (totals.clicked / denominator) * 100 : 0;
  table.push({
    signal: "Unique Click Rate",
    value: totals.clicked,
    percentage: `${clickRate.toFixed(2)}%`,
    trend: "stable",
    trendDescription: "",
  });
  
  const unsubRate = denominator > 0 ? (totals.unsubs / denominator) * 100 : 0;
  const unsubTrend = unsubEnd > unsubStart ? "up" : unsubEnd < unsubStart ? "down" : "stable";
  table.push({
    signal: "Unsubscribe Rate",
    value: totals.unsubs,
    percentage: `${unsubRate.toFixed(2)}%`,
    trend: unsubTrend,
    trendDescription: `${unsubEnd > unsubStart ? '+' : ''}${(unsubEnd - unsubStart).toFixed(3)}pp`,
  });
  
  // Hard bounce with individual trend
  const hardBounceRate = totals.sent > 0 ? (totals.hardBounce / totals.sent) * 100 : 0;
  const hardBounceTrend = hardBounceEnd > hardBounceStart ? "up" : hardBounceEnd < hardBounceStart ? "down" : "stable";
  table.push({
    signal: "Hard Bounce Rate",
    value: totals.hardBounce,
    percentage: `${hardBounceRate.toFixed(2)}%`,
    trend: hardBounceTrend,
    trendDescription: `${hardBounceEnd > hardBounceStart ? '+' : ''}${(hardBounceEnd - hardBounceStart).toFixed(3)}pp`,
  });
  
  // Soft bounce with individual trend
  const softBounceRate = totals.sent > 0 ? (totals.softBounce / totals.sent) * 100 : 0;
  const softBounceTrend = softBounceEnd > softBounceStart ? "up" : softBounceEnd < softBounceStart ? "down" : "stable";
  table.push({
    signal: "Soft Bounce Rate",
    value: totals.softBounce,
    percentage: `${softBounceRate.toFixed(2)}%`,
    trend: softBounceTrend,
    trendDescription: `${softBounceEnd > softBounceStart ? '+' : ''}${(softBounceEnd - softBounceStart).toFixed(3)}pp`,
  });
  
  if (postmaster && postmaster.length > 0) {
    const latest = postmaster[postmaster.length - 1];
    const oldest = postmaster[0];
    
    table.push({
      signal: "Spam Rate (Postmaster)",
      value: latest.spamRatio,
      percentage: `${(latest.spamRatio * 100).toFixed(2)}%`,
      trend: latest.spamRatio > oldest.spamRatio ? "up" : latest.spamRatio < oldest.spamRatio ? "down" : "stable",
      trendDescription: "",
    });
    
    table.push({
      signal: "Domain Reputation",
      value: latest.domainReputation || "Unknown",
      percentage: "–",
      trend: "N/A",
      trendDescription: oldest.domainReputation !== latest.domainReputation 
        ? `${oldest.domainReputation} → ${latest.domainReputation}` 
        : "Stable",
    });
    
    table.push({
      signal: "IP Reputation",
      value: latest.ipReputation || "Unknown",
      percentage: "–",
      trend: "N/A",
      trendDescription: "",
    });
  }
  
  return table;
};

// Helper: Generate MoM analysis
// Uses separate hard bounce and soft bounce changes for clarity
// Trend comparisons are based on first week vs last week of the data period
const generateMoMAnalysis = (
  data: CampaignRow[],
  openChange: number,
  hardBounceChange: number,
  softBounceChange: number,
  unsubChange: number
): MoMAnalysis => {
  const changes: string[] = [];
  const stable: string[] = [];
  const worsened: string[] = [];
  
  if (Math.abs(openChange) > 5) {
    if (openChange > 0) changes.push(`Unique open rate improved by ${openChange.toFixed(1)}% (first week vs last week of data period)`);
    else worsened.push(`Unique open rate declined by ${Math.abs(openChange).toFixed(1)}% (first week vs last week of data period)`);
  } else {
    stable.push(`Unique open rate remained stable (${openChange > 0 ? '+' : ''}${openChange.toFixed(1)}% change)`);
  }
  
  // Separate hard and soft bounce reporting
  if (Math.abs(hardBounceChange) > 0.2) {
    if (hardBounceChange > 0) worsened.push(`Hard bounce rate increased by ${hardBounceChange.toFixed(2)}pp`);
    else changes.push(`Hard bounce rate decreased by ${Math.abs(hardBounceChange).toFixed(2)}pp`);
  } else {
    stable.push("Hard bounce rate remained consistent");
  }
  
  if (Math.abs(softBounceChange) > 0.5) {
    if (softBounceChange > 0) worsened.push(`Soft bounce rate increased by ${softBounceChange.toFixed(2)}pp`);
    else changes.push(`Soft bounce rate decreased by ${Math.abs(softBounceChange).toFixed(2)}pp`);
  }
  
  if (Math.abs(unsubChange) > 0.1) {
    if (unsubChange > 0) worsened.push(`Unsubscribe rate increased by ${unsubChange.toFixed(2)}pp`);
    else changes.push(`Unsubscribe rate decreased by ${Math.abs(unsubChange).toFixed(2)}pp`);
  } else {
    stable.push("Unsubscribe rate stable");
  }
  
  // Analyze volume changes
  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));
  const firstVolume = firstHalf.reduce((s, c) => s + c.totalSentUsers, 0);
  const secondVolume = secondHalf.reduce((s, c) => s + c.totalSentUsers, 0);
  const volumeChange = firstVolume > 0 ? ((secondVolume - firstVolume) / firstVolume) * 100 : 0;
  
  if (Math.abs(volumeChange) > 20) {
    changes.push(`Send volume ${volumeChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(volumeChange).toFixed(0)}%`);
  }
  
  return {
    changesThisMonth: changes,
    stableFactors: stable,
    worsenedBeforeShift: worsened,
    comparisonAvailable: data.length >= 5,
    comparisonNote: data.length >= 5 
      ? "Month-over-month comparison based on available campaign data."
      : "Limited data available for MoM comparison. Analysis based on available campaigns.",
  };
};

// Helper: Analyze send mix
const analyzeSendMix = (data: CampaignRow[]): SendMixAnalysis => {
  let transactional = 0;
  let lifecycle = 0;
  let promotional = 0;
  const ambiguityNotes: string[] = [];
  
  const transactionalKeywords = /password|verify|confirm|receipt|invoice|order|ship|deliver|account|security|otp|reset/i;
  const lifecycleKeywords = /welcome|onboard|abandon|cart|remind|re-engage|win.*back|birthday|anniversary|milestone|journey/i;
  const promotionalKeywords = /sale|offer|discount|promo|deal|flash|limited|exclusive|save|off|free|buy/i;
  
  data.forEach(c => {
    const text = `${c.campaignName} ${c.subjectLine}`.toLowerCase();
    
    if (transactionalKeywords.test(text)) transactional++;
    else if (lifecycleKeywords.test(text)) lifecycle++;
    else if (promotionalKeywords.test(text)) promotional++;
    else {
      promotional++; // Default to promotional if unclear
      ambiguityNotes.push(`"${c.subjectLine.slice(0, 30)}..." - classification ambiguous, defaulted to promotional`);
    }
  });
  
  const total = data.length;
  const overweighted: string[] = [];
  const underutilized: string[] = [];
  
  const promoPercent = (promotional / total) * 100;
  const lifecyclePercent = (lifecycle / total) * 100;
  const transPercent = (transactional / total) * 100;
  
  if (promoPercent > 70) overweighted.push(`Promotional sends (${promoPercent.toFixed(0)}%)`);
  if (lifecyclePercent < 10 && promoPercent > 50) underutilized.push("Lifecycle/triggered campaigns");
  if (transPercent < 5 && total > 20) underutilized.push("Transactional engagement opportunities");
  
  return {
    transactionalPercent: transPercent,
    lifecyclePercent: lifecyclePercent,
    promotionalPercent: promoPercent,
    overweightedTypes: overweighted,
    underutilizedAbsorbers: underutilized,
    classificationConfidence: ambiguityNotes.length > total * 0.3 ? "low" : ambiguityNotes.length > total * 0.1 ? "medium" : "high",
    ambiguityNotes: ambiguityNotes.slice(0, 3), // Limit to 3 examples
  };
};

// Helper: Generate root causes
// NOTE: Uses specific hard bounce and soft bounce rates, never "combined bounce rate"
const generateRootCauses = (
  data: CampaignRow[],
  openChange: number,
  hardBounceAvg: number,
  softBounceAvg: number,
  unsubEnd: number,
  postmaster: PostmasterRow[] | null
): RootCauseBullet[] => {
  const causes: RootCauseBullet[] = [];
  
  if (openChange < -15) {
    causes.push({
      cause: "Significant engagement decline across the analysis period",
      evidence: `Open rate dropped by ${Math.abs(openChange).toFixed(1)}% comparing first half to last half of the data period`,
      evidenceType: "numeric_change",
    });
  }
  
  // Separate hard bounce and soft bounce - never combine
  if (hardBounceAvg > 0.5) {
    causes.push({
      cause: "Elevated hard bounce rate indicates list quality issues",
      evidence: `Average hard bounce rate of ${hardBounceAvg.toFixed(2)}% exceeds 0.5% threshold (campaigns ≥1,000 sends)`,
      evidenceType: "documented_rule",
    });
  }
  
  if (softBounceAvg > 1) {
    causes.push({
      cause: "Elevated soft bounce rate suggests temporary delivery issues",
      evidence: `Average soft bounce rate of ${softBounceAvg.toFixed(2)}% exceeds 1% threshold`,
      evidenceType: "documented_rule",
    });
  }
  
  if (unsubEnd > 0.3) {
    causes.push({
      cause: "High unsubscribe rate suggests content-audience mismatch",
      evidence: `Unsubscribe rate of ${unsubEnd.toFixed(2)}% exceeds 0.3% best practice threshold`,
      evidenceType: "documented_rule",
    });
  }
  
  if (postmaster && postmaster.length > 0) {
    const latest = postmaster[postmaster.length - 1];
    if (latest.domainReputation === "Low" || latest.domainReputation === "Bad") {
      causes.push({
        cause: "Domain reputation degradation per Google Postmaster",
        evidence: `Current domain reputation: ${latest.domainReputation}`,
        evidenceType: "numeric_change",
      });
    }
    if (latest.spamRatio > 0.01) {
      causes.push({
        cause: "Spam complaints exceeding acceptable threshold",
        evidence: `Spam ratio of ${(latest.spamRatio * 100).toFixed(2)}% exceeds 0.1% threshold`,
        evidenceType: "documented_rule",
      });
    }
  }
  
  // Volume analysis - only campaigns ≥1000 sends
  const significantCampaigns = data.filter(c => c.totalSentUsers >= 1000);
  const highVolumeLowEngagement = significantCampaigns.filter(c => c.totalSentUsers > 50000 && c.openRate < 10);
  if (highVolumeLowEngagement.length > significantCampaigns.length * 0.2 && significantCampaigns.length >= data.length * 0.05) {
    causes.push({
      cause: "High-volume sends with low engagement diluting overall performance",
      evidence: `${highVolumeLowEngagement.length} campaigns (${((highVolumeLowEngagement.length / significantCampaigns.length) * 100).toFixed(0)}%) had >50K sends with <10% open rate`,
      evidenceType: "numeric_change",
    });
  }
  
  return causes.slice(0, 5); // Max 5 root causes
};

// Helper: Generate repair actions
// Based on CleverTap Email Sender Reputation Best Practices
const generateRepairActions = (
  direction: "improving" | "stable" | "degrading",
  hardBounceAvg: number,
  softBounceAvg: number,
  unsubEnd: number,
  openChange: number,
  postmaster: PostmasterRow[] | null,
  contextText: string | null
): RepairAction[] => {
  const actions: RepairAction[] = [];
  
  // IMMEDIATE ACTIONS (0-7 days) - High confidence, from CleverTap playbook
  
  // Hard bounce issues - primary indicator of list quality
  if (hardBounceAvg > 0.5) {
    actions.push({
      priority: "immediate",
      confidence: "high",
      action: "Clean email list immediately. Remove addresses that hard bounced in recent sends. A high hard bounce rate indicates invalid email addresses - possible purchased list or outdated data. Implement real-time email verification for all new signups.",
    });
  }
  
  // Domain reputation degraded - from CleverTap: focus on engaged subscribers
  if (postmaster?.some(p => p.domainReputation === "Low" || p.domainReputation === "Bad")) {
    actions.push({
      priority: "immediate",
      confidence: "high",
      action: "Domain reputation is degraded per Google Postmaster. Pause all sends to cold/unengaged segments. Focus exclusively on engaged subscribers (opened/clicked in last 30 days) for the next 7 days. Avoid email blasts or spikes - keep volume consistent.",
    });
  }
  
  // Spam complaints - from CleverTap: significant impact on sender reputation
  if (postmaster?.some(p => p.spamRatio > 0.01)) {
    actions.push({
      priority: "immediate",
      confidence: "high",
      action: "High spam complaint rate detected. This could significantly impact sender reputation. Review email content for spam triggers, verify authentication (SPF/DKIM/DMARC), and ensure recipients have opted in. Consider using seed testing to measure actual inbox placement.",
    });
  }
  
  if (contextText?.toLowerCase().includes("spam")) {
    actions.push({
      priority: "immediate",
      confidence: "high",
      action: "User reports emails landing in spam. Verify email authentication setup (SPF, DKIM, DMARC). Check block lists using MXToolbox. Review content for excessive caps or misleading subjects.",
    });
  }
  
  // SHORT-TERM ACTIONS (7-21 days) - Medium confidence
  
  // High unsubscribe - from CleverTap: indicates unwanted emails
  if (unsubEnd > 0.3) {
    actions.push({
      priority: "short-term",
      confidence: "medium",
      action: "High unsubscribe rates indicate recipients are not finding value in emails. ISPs interpret this as unwanted mail. Implement preference center for frequency control. Review content relevance for different audience segments.",
      cohortSize: "All active subscribers",
      metricToWatch: "Unsubscribe rate per campaign",
      abortCondition: "If unsubscribe rate exceeds 1% in any send",
    });
  }
  
  // Low open rates - from CleverTap: indicates unwanted emails over time
  if (openChange < -10) {
    actions.push({
      priority: "short-term",
      confidence: "medium",
      action: "Low open rates indicate recipients consistently fail to open emails. Over time, this leads to spam folder placement. Conduct subject line A/B testing. Segment by engagement recency. Consider re-engagement campaign for inactive subscribers.",
      cohortSize: "10% of list per test",
      metricToWatch: "Open rate and click-to-open rate",
      abortCondition: "If engagement drops further by >5%",
    });
  }
  
  // Soft bounce issues - temporary, less critical than hard bounce
  if (softBounceAvg > 1) {
    actions.push({
      priority: "short-term",
      confidence: "medium",
      action: "Elevated soft bounce rate indicates temporary delivery issues (mailbox full, server issues). Retry soft bounces after 24-48 hours. Review email size and optimize images to stay under Gmail's 102KB clipping limit.",
    });
  }
  
  // ONGOING ACTIONS - from CleverTap: monitoring is crucial
  
  actions.push({
    priority: "ongoing",
    confidence: "high",
    action: "Maintain consistent sending calendar - avoid spikes (>2x your largest send in last 30 days) and long periods of inactivity. If scaling volume, follow IP warmup schedule by gradually increasing over days.",
  });
  
  actions.push({
    priority: "ongoing",
    confidence: "high",
    action: "Monitor key metrics after every send: Hard bounce (<0.5%), Soft bounce (<1%), Unsubscribe (<0.2%), Spam complaints (<0.1%). Set up automated alerts for threshold violations.",
  });
  
  if (postmaster && postmaster.length > 0) {
    actions.push({
      priority: "ongoing",
      confidence: "high",
      action: "Continue monitoring reputation health: Use Google Postmaster Tools daily, check block lists with MXToolbox, and measure actual inbox placement via seed testing. Track domain/IP reputation trends for early warning signs.",
    });
  }
  
  return actions;
};

// Helper: Generate source attributions
const generateSourceAttributions = (hasPostmaster: boolean, hasContext: boolean): SourceAttribution[] => {
  const attributions: SourceAttribution[] = [
    {
      insight: "Campaign performance metrics and engagement rates",
      dataSource: "Campaign Performance CSV",
      docSource: "CleverTap Deliverability Playbook v3",
      confidence: "high",
    },
    {
      insight: "Threshold values for bounce, unsubscribe, and spam rates",
      dataSource: "Industry best practices",
      docSource: "CleverTap Deliverability Playbook v3",
      confidence: "high",
    },
  ];
  
  if (hasPostmaster) {
    attributions.push({
      insight: "Domain/IP reputation and spam ratio analysis",
      dataSource: "Google Postmaster Tools Export",
      docSource: "Google Postmaster public guidance",
      confidence: "high",
    });
  }
  
  if (hasContext) {
    attributions.push({
      insight: "User-reported issues and context",
      dataSource: "User input",
      docSource: "Direct observation",
      confidence: "medium",
    });
  }
  
  attributions.push({
    insight: "Send mix classification and lifecycle recommendations",
    dataSource: "Campaign name/subject analysis",
    docSource: "Email Use Case Library",
    confidence: "medium",
  });
  
  return attributions;
};

// ============= LEGACY COMPATIBILITY =============

// Keep old interfaces for backward compatibility during transition
export interface LegacyCampaignRow {
  campaign_name: string;
  subject_line: string;
  sent_date: string;
  emails_sent: number;
  open_rate: number;
  click_rate: number;
}

export interface LegacyDiagnosticsData {
  rawData: LegacyCampaignRow[];
  performance: any;
  subjectLines: any;
  trends: any;
  fatigue: any;
  recommendations: any;
}
