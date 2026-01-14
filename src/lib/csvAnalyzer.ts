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
}

export interface MonthlyOverview {
  month: string;
  totalSentUsers: number;
  totalDeliveredUsers: number;
  uniqueViewed: number;
  uniqueClicked: number;
  conversions: number;
  unsubscribes: number;
  hardBounces: number;
  softBounces: number;
  campaignCount: number;
  openRate: number;
  clickRate: number;
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
}

export interface ReputationRepairReport {
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

const parseDateSafely = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  
  // Try various formats
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) return date;
  
  // Try DD/MM/YYYY or DD-MM-YYYY
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const parsedDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    if (!isNaN(parsedDate.getTime())) return parsedDate;
  }
  
  return null;
};

const getMonthKey = (dateStr: string): string => {
  const date = parseDateSafely(dateStr);
  if (!date) return "Unknown";
  return date.toLocaleString('default', { month: 'short', year: 'numeric' });
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

  const providerAggregates = Object.values(providerMap);

  // Report 1b: Monthly Overview
  const monthMap: Record<string, MonthlyOverview> = {};
  
  data.forEach(row => {
    const month = getMonthKey(row.startDate);
    if (!monthMap[month]) {
      monthMap[month] = {
        month,
        totalSentUsers: 0,
        totalDeliveredUsers: 0,
        uniqueViewed: 0,
        uniqueClicked: 0,
        conversions: 0,
        unsubscribes: 0,
        hardBounces: 0,
        softBounces: 0,
        campaignCount: 0,
        openRate: 0,
        clickRate: 0,
      };
    }
    const m = monthMap[month];
    m.totalSentUsers += row.totalSentUsers;
    m.totalDeliveredUsers += row.totalDeliveredUsers;
    m.uniqueViewed += row.uniqueViewedWithinConversion;
    m.uniqueClicked += row.uniqueClickedWithinConversion;
    m.conversions += row.clickThroughConversions;
    m.unsubscribes += row.totalUnsubscribes;
    m.hardBounces += row.hardBounces;
    m.softBounces += row.softBounces;
    m.campaignCount++;
  });

  const monthlyOverview = Object.values(monthMap)
    .map(m => {
      const base = m.totalDeliveredUsers > 0 ? m.totalDeliveredUsers : m.totalSentUsers;
      m.openRate = base > 0 ? (m.uniqueViewed / base) * 100 : 0;
      m.clickRate = base > 0 ? (m.uniqueClicked / base) * 100 : 0;
      return m;
    })
    .sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });

  // Filter campaigns with >= 1000 users for best/worst
  const eligibleCampaigns = data.filter(c => c.totalSentUsers >= 1000);

  // Report 2: Best Performing (by unique viewed)
  const sortedByViewed = [...eligibleCampaigns].sort(
    (a, b) => b.uniqueViewedWithinConversion - a.uniqueViewedWithinConversion
  );

  const bestCampaigns: TopCampaign[] = sortedByViewed.slice(0, 10).map(c => ({
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

  // Report 3: Worst Performing
  const worstCampaigns: TopCampaign[] = sortedByViewed.slice(-10).reverse().map(c => ({
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
      };

      // Determine root cause
      if (current.hardBounceRate > 0.5) {
        issue.rootCause = `Hard bounce rate of ${current.hardBounceRate.toFixed(2)}% exceeds 0.5% threshold`;
        issue.recommendation = "Clean email list immediately. Remove invalid addresses and implement double opt-in.";
      } else if (current.softBounceRate > 1) {
        issue.rootCause = `Soft bounce rate of ${current.softBounceRate.toFixed(2)}% exceeds 1% threshold`;
        issue.recommendation = "Check sending infrastructure. Review content for spam triggers and reduce email size.";
      } else if (current.unsubscribeRate > 0.2) {
        issue.rootCause = `Unsubscribe rate of ${current.unsubscribeRate.toFixed(2)}% indicates content dissatisfaction`;
        issue.recommendation = "Review content relevance and reduce send frequency. Consider preference center.";
      } else {
        issue.rootCause = "Possible spam folder placement or recipient fatigue";
        issue.recommendation = "Review subject lines for spam triggers. Check authentication (SPF/DKIM/DMARC).";
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
            }
            if (nearbyPostmaster.domainReputation === "Low" || nearbyPostmaster.domainReputation === "Bad") {
              issue.rootCause += `. Domain reputation: ${nearbyPostmaster.domainReputation}`;
              issue.recommendation += " Domain reputation is degraded - implement gradual warm-up.";
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
        observation: "User reported emails landing in spam",
        impact: "Reduced visibility and engagement, potential reputation damage",
        rootCause: "Could be content triggers, authentication issues, or reputation decline",
        recommendation: "1) Verify SPF/DKIM/DMARC setup. 2) Check content for spam triggers. 3) Review postmaster tools. 4) Warm up IP/domain if new.",
        metricValues: {},
      });
    }
    
    if (lowerContext.includes("clipped") || lowerContext.includes("scroll")) {
      issues.push({
        campaignId: "Context Note",
        sendDate: "User Reported",
        observation: "User reported emails getting clipped or long scroll issues",
        impact: "Content below fold not visible, reduced engagement",
        rootCause: "Email size exceeds Gmail's 102KB limit or design is too long",
        recommendation: "Keep HTML under 100KB. Move key CTA above fold. Use web-hosted version link.",
        metricValues: {},
      });
    }
  }

  // Sort issues by date
  issues.sort((a, b) => {
    const dateA = parseDateSafely(a.sendDate);
    const dateB = parseDateSafely(b.sendDate);
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateA.getTime() - dateB.getTime();
  });

  return {
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
