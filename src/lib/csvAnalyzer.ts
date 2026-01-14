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
  // Calculated rates
  openRate: number;
  clickRate: number;
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

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data: CampaignRow[];
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
  unsubscribePercent: number;
  hardBouncePercent: number;
  softBouncePercent: number;
}

export interface MonthlyOverview {
  month: string;
  monthSortKey: string;
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
  unsubscribePercent: number;
  hardBouncePercent: number;
  softBouncePercent: number;
}

export interface TopCampaign {
  campaignId: string;
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
  bestCampaigns: TopCampaign[];
  worstCampaigns: TopCampaign[];
  bestSummary: string;
  worstSummary: string;
  engagementTrends: TrendPoint[];
  keyLearnings: KeyLearning[];
}

// Reputation Repair Types
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

export interface ReputationRepairReport {
  diagnosticSummary: DeliverabilityDiagnosticSummary;
  issues: ReputationIssue[];
  hasPostmasterData: boolean;
  contextNotes: string | null;
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

export const parseCSV = (csvText: string): ValidationResult => {
  const lines = csvText.trim().split("\n");
  const errors: string[] = [];
  const warnings: string[] = [];
  const data: CampaignRow[] = [];

  if (lines.length < 2) {
    return { isValid: false, errors: ["CSV file must have a header row and at least one data row"], warnings: [], data: [] };
  }

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const rawHeaders = parseCSVLine(lines[0], delimiter).map(h => h.trim().replace(/"/g, "").toLowerCase());

  // Create header index map
  const headerIndexMap: Record<string, number> = {};
  rawHeaders.forEach((header, idx) => {
    headerIndexMap[header] = idx;
  });

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
      return { isValid: false, errors, warnings, data: [] };
    }
    warnings.push(`Optional columns not found: ${missingHeaders.join(", ")}`);
  }

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

    // Only process Email channel and Completed status
    const channel = getValue("channel");
    const status = getValue("status");
    
    if (channel.toLowerCase() !== "email" || status.toLowerCase() !== "completed") {
      continue;
    }

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

    const baseForRates = totalDelivered > 0 ? totalDelivered : totalSent;

    const row: CampaignRow = {
      campaignName: getValue("campaign name"),
      campaignId: getValue("campaign id"),
      channel,
      title: fullTitle,
      subjectLine,
      startDate: getValue("start date"),
      startTime: getValue("start time"),
      serviceProvider: getValue("service provider"),
      providerName: getValue("provider name"),
      status,
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
      openRate: baseForRates > 0 ? (uniqueViewed / baseForRates) * 100 : 0,
      clickRate: baseForRates > 0 ? (uniqueClicked / baseForRates) * 100 : 0,
      unsubscribeRate: baseForRates > 0 ? (unsubscribes / baseForRates) * 100 : 0,
      hardBounceRate: totalSent > 0 ? (hardBounces / totalSent) * 100 : 0,
      softBounceRate: totalSent > 0 ? (softBounces / totalSent) * 100 : 0,
    };

    data.push(row);
  }

  if (data.length === 0) {
    errors.push("No valid Email campaigns with Completed status found");
    return { isValid: false, errors, warnings, data: [] };
  }

  return { isValid: true, errors, warnings, data };
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

// CRITICAL: Parse DD/MM/YYYY format ONLY (day first, month second, year third)
// MANDATORY: Do NOT assume MM/DD/YYYY - all dates are DD/MM/YYYY
const parseDateDDMMYYYY = (dateStr: string): { date: Date | null; error: string | null } => {
  if (!dateStr) return { date: null, error: "Empty date string" };
  
  // Split by / or - delimiter
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length !== 3) {
    return { date: null, error: `Invalid date format: ${dateStr}` };
  }
  
  // MANDATORY: Day = first value, Month = second value, Year = third value
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  
  // Validate ranges
  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return { date: null, error: `Non-numeric date parts: ${dateStr}` };
  }
  
  if (day < 1 || day > 31) {
    return { date: null, error: `Invalid day value: ${day} in ${dateStr}` };
  }
  
  if (month < 1 || month > 12) {
    return { date: null, error: `Invalid month value: ${month} in ${dateStr}` };
  }
  
  if (year < 1900 || year > 2100) {
    return { date: null, error: `Invalid year value: ${year} in ${dateStr}` };
  }
  
  const parsedDate = new Date(year, month - 1, day);
  if (isNaN(parsedDate.getTime())) {
    return { date: null, error: `Failed to create date from: ${dateStr}` };
  }
  
  return { date: parsedDate, error: null };
};

// Valid months for this dataset: October (10), November (11), December (12)
const VALID_MONTHS = [10, 11, 12]; // Oct, Nov, Dec
const MONTH_NAMES: Record<number, string> = {
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
  const { date, error } = parseDateDDMMYYYY(dateStr);
  
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
  
  // VALIDATION RULE: Only Oct, Nov, Dec are valid
  if (!VALID_MONTHS.includes(month)) {
    return { 
      monthName: "PARSING_ERROR", 
      monthSortKey: "0000-00", 
      isValid: false, 
      error: `Month ${month} extracted from ${dateStr} is outside valid range (Oct-Dec). This indicates incorrect parsing.` 
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
  const { date } = parseDateDDMMYYYY(dateStr);
  return date;
};

export const generateAnalysisReport = (data: CampaignRow[]): AnalysisReport => {
  // Report 1a: Provider Aggregates
  const providerMap: Record<string, ProviderAggregate> = {};
  
  data.forEach(row => {
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
    agg.unsubscribePercent = denominator > 0 ? (agg.unsubscribes / denominator) * 100 : 0;
    agg.hardBouncePercent = denominator > 0 ? (agg.hardBounces / denominator) * 100 : 0;
    agg.softBouncePercent = denominator > 0 ? (agg.softBounces / denominator) * 100 : 0;
    
    return agg;
  });

  // Report 1b: Monthly Overview (with STRICT DD/MM/YYYY parsing → Oct/Nov/Dec only)
  const monthMap: Record<string, MonthlyOverview> = {};
  const monthParsingErrors: string[] = [];
  
  data.forEach(row => {
    const monthResult = getMonthFromDate(row.startDate);
    
    // Flag parsing errors but don't auto-correct
    if (!monthResult.isValid) {
      monthParsingErrors.push(monthResult.error || `Invalid date: ${row.startDate}`);
      return; // Skip this row for monthly aggregation
    }
    
    const { monthName, monthSortKey } = monthResult;
    
    if (!monthMap[monthName]) {
      monthMap[monthName] = {
        month: monthName,
        monthSortKey,
        totalSentUsers: 0,
        totalDeliveredUsers: 0,
        uniqueSentUsers: 0,
        uniqueViewed: 0,
        uniqueClicked: 0,
        conversions: 0,
        unsubscribes: 0,
        hardBounces: 0,
        softBounces: 0,
        campaignCount: 0,
        openRate: 0,
        clickRate: 0,
        useDeliveredAsDenominator: true,
        viewPercent: 0,
        clickPercent: 0,
        unsubscribePercent: 0,
        hardBouncePercent: 0,
        softBouncePercent: 0,
      };
    }
    const m = monthMap[monthName];
    m.totalSentUsers += row.totalSentUsers;
    m.totalDeliveredUsers += row.totalDeliveredUsers;
    m.uniqueSentUsers += row.uniqueSentUsers;
    m.uniqueViewed += row.uniqueViewedWithinConversion;
    m.uniqueClicked += row.uniqueClickedWithinConversion;
    m.conversions += row.clickThroughConversions;
    m.unsubscribes += row.totalUnsubscribes;
    m.hardBounces += row.hardBounces;
    m.softBounces += row.softBounces;
    m.campaignCount++;
  });

  // Log parsing errors if any occurred (for debugging)
  if (monthParsingErrors.length > 0) {
    console.warn(`[Monthly Overview] Date parsing errors (${monthParsingErrors.length} rows skipped):`, monthParsingErrors.slice(0, 5));
  }

  const monthlyOverview = Object.values(monthMap)
    .map(m => {
      const useDelivered = m.totalDeliveredUsers > 0;
      const denominator = useDelivered ? m.totalDeliveredUsers : m.totalSentUsers;
      
      m.useDeliveredAsDenominator = useDelivered;
      m.openRate = denominator > 0 ? (m.uniqueViewed / denominator) * 100 : 0;
      m.clickRate = denominator > 0 ? (m.uniqueClicked / denominator) * 100 : 0;
      m.viewPercent = m.openRate;
      m.clickPercent = m.clickRate;
      m.unsubscribePercent = denominator > 0 ? (m.unsubscribes / denominator) * 100 : 0;
      m.hardBouncePercent = denominator > 0 ? (m.hardBounces / denominator) * 100 : 0;
      m.softBouncePercent = denominator > 0 ? (m.softBounces / denominator) * 100 : 0;
      return m;
    })
    .sort((a, b) => a.monthSortKey.localeCompare(b.monthSortKey));

  // ============= DETERMINISTIC CAMPAIGN RANKING =============
  // Step 1: Filter eligible campaigns
  // - Total Sent (users) >= 1,000
  // - Status = Completed (already filtered during parsing)
  // - Channel = Email (already filtered during parsing)
  const eligibleCampaigns = data.filter(c => c.totalSentUsers >= 1000);

  // Step 2: Single sort by Unique Viewed Within Conversion Time (DESC)
  const sortedByViewed = [...eligibleCampaigns].sort(
    (a, b) => b.uniqueViewedWithinConversion - a.uniqueViewedWithinConversion
  );

  // Step 3: Best Performing = Top 5 campaigns, lock these IDs
  const bestCampaignIds = new Set<string>();
  const bestCampaigns: TopCampaign[] = sortedByViewed.slice(0, 5).map(c => {
    bestCampaignIds.add(c.campaignId);
    return {
      campaignId: c.campaignId,
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

  // Step 4: Worst Performing = From REMAINING campaigns only, sort ASC, take bottom 5
  const remainingCampaigns = eligibleCampaigns.filter(c => !bestCampaignIds.has(c.campaignId));
  const sortedAscending = [...remainingCampaigns].sort(
    (a, b) => a.uniqueViewedWithinConversion - b.uniqueViewedWithinConversion
  );

  const worstCampaigns: TopCampaign[] = sortedAscending.slice(0, 5).map(c => ({
    campaignId: c.campaignId,
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
    bestCampaigns,
    worstCampaigns,
    bestSummary,
    worstSummary,
    engagementTrends,
    keyLearnings,
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

  return {
    diagnosticSummary,
    issues,
    hasPostmasterData: postmasterData !== null && postmasterData.length > 0,
    contextNotes: contextText,
  };
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
