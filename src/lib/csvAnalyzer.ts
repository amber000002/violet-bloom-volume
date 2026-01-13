// CSV Parser and Analyzer for Inbox Diagnostics

export interface CampaignRow {
  campaign_name: string;
  subject_line: string;
  sent_date: string;
  emails_sent: number;
  open_rate: number;
  click_rate: number;
  // Optional fields
  campaign_type?: string;
  audience_segment?: string;
  unsubscribe_rate?: number;
  bounce_rate?: number;
  send_time?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data: CampaignRow[];
}

export interface PerformanceSnapshot {
  bestCampaign: CampaignRow | null;
  worstCampaign: CampaignRow | null;
  medianOpenRate: number;
  medianClickRate: number;
  totalCampaigns: number;
  totalEmailsSent: number;
}

export interface SubjectLineSignal {
  pattern: string;
  avgOpenRate: number;
  count: number;
  isTopPerformer: boolean;
}

export interface SubjectLineAnalysis {
  lengthInsight: string;
  topPatterns: SubjectLineSignal[];
  lowPatterns: SubjectLineSignal[];
  avgLengthTop: number;
  avgLengthBottom: number;
}

export interface TrendPoint {
  date: string;
  openRate: number;
  clickRate: number;
  volume: number;
}

export interface TrendAnalysis {
  dataPoints: TrendPoint[];
  openRateTrend: "improving" | "declining" | "stable";
  clickRateTrend: "improving" | "declining" | "stable";
  volumeVsEngagement: string;
}

export interface FatigueSignal {
  type: "declining_engagement" | "overused_pattern" | "high_send_low_click";
  severity: "low" | "medium" | "high";
  description: string;
  campaigns: string[];
}

export interface FatigueAnalysis {
  signals: FatigueSignal[];
  overallRisk: "low" | "medium" | "high";
}

export interface Recommendation {
  title: string;
  description: string;
  category: "lifecycle" | "journey" | "amp" | "frequency" | "content";
  priority: "high" | "medium" | "low";
}

export interface DiagnosticsData {
  rawData: CampaignRow[];
  performance: PerformanceSnapshot;
  subjectLines: SubjectLineAnalysis;
  trends: TrendAnalysis;
  fatigue: FatigueAnalysis;
  recommendations: Recommendation[];
}

const REQUIRED_HEADERS = [
  "campaign_name",
  "subject_line",
  "sent_date",
  "emails_sent",
  "open_rate",
  "click_rate",
];

const OPTIONAL_HEADERS = [
  "campaign_type",
  "audience_segment",
  "unsubscribe_rate",
  "bounce_rate",
  "send_time",
];

export const parseCSV = (csvText: string): ValidationResult => {
  const lines = csvText.trim().split("\n");
  const errors: string[] = [];
  const warnings: string[] = [];
  const data: CampaignRow[] = [];

  if (lines.length < 2) {
    return { isValid: false, errors: ["CSV file must have a header row and at least one data row"], warnings: [], data: [] };
  }

  // Parse headers (handle both comma and semicolon delimiters)
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].toLowerCase().split(delimiter).map((h) => h.trim().replace(/"/g, ""));

  // Validate required headers
  const missingHeaders = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    errors.push(`Missing required columns: ${missingHeaders.join(", ")}`);
    return { isValid: false, errors, warnings, data: [] };
  }

  // Check for optional headers
  const presentOptional = OPTIONAL_HEADERS.filter((h) => headers.includes(h));
  const missingOptional = OPTIONAL_HEADERS.filter((h) => !headers.includes(h));
  if (missingOptional.length > 0) {
    warnings.push(`Optional columns not found: ${missingOptional.join(", ")}`);
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line, delimiter);
    
    if (values.length !== headers.length) {
      warnings.push(`Row ${i + 1}: Column count mismatch, skipping`);
      continue;
    }

    const row: any = {};
    headers.forEach((header, idx) => {
      let value = values[idx]?.trim().replace(/"/g, "") || "";
      
      // Parse numeric fields
      if (["emails_sent", "open_rate", "click_rate", "unsubscribe_rate", "bounce_rate"].includes(header)) {
        row[header] = parseFloat(value.replace("%", "")) || 0;
      } else {
        row[header] = value;
      }
    });

    // Validate required fields have values
    if (!row.campaign_name || !row.subject_line || !row.sent_date) {
      warnings.push(`Row ${i + 1}: Missing required field values, skipping`);
      continue;
    }

    data.push(row as CampaignRow);
  }

  if (data.length === 0) {
    errors.push("No valid data rows found after parsing");
    return { isValid: false, errors, warnings, data: [] };
  }

  return { isValid: true, errors, warnings, data };
};

// Helper to parse CSV line respecting quoted values
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

const median = (arr: number[]): number => {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export const analyzePerformance = (data: CampaignRow[]): PerformanceSnapshot => {
  if (data.length === 0) {
    return {
      bestCampaign: null,
      worstCampaign: null,
      medianOpenRate: 0,
      medianClickRate: 0,
      totalCampaigns: 0,
      totalEmailsSent: 0,
    };
  }

  // Score campaigns by combined engagement (open + click weighted)
  const scored = data.map((c) => ({
    ...c,
    score: c.open_rate * 0.6 + c.click_rate * 0.4,
  }));

  const sorted = [...scored].sort((a, b) => b.score - a.score);

  return {
    bestCampaign: sorted[0],
    worstCampaign: sorted[sorted.length - 1],
    medianOpenRate: median(data.map((c) => c.open_rate)),
    medianClickRate: median(data.map((c) => c.click_rate)),
    totalCampaigns: data.length,
    totalEmailsSent: data.reduce((sum, c) => sum + c.emails_sent, 0),
  };
};

const extractPatterns = (subjectLine: string): string[] => {
  const patterns: string[] = [];
  
  // Check for common patterns
  if (/\d+%/.test(subjectLine)) patterns.push("Discount percentage");
  if (/free/i.test(subjectLine)) patterns.push("Free offer");
  if (/limited|expires|ending/i.test(subjectLine)) patterns.push("Urgency");
  if (/\?$/.test(subjectLine.trim())) patterns.push("Question");
  if (/!$/.test(subjectLine.trim())) patterns.push("Exclamation");
  if (/^re:|^fw:/i.test(subjectLine)) patterns.push("Reply/Forward");
  if (/you|your/i.test(subjectLine)) patterns.push("Personalization");
  if (/new|latest|just/i.test(subjectLine)) patterns.push("Newness");
  if (/exclusive|vip|special/i.test(subjectLine)) patterns.push("Exclusivity");
  if (/emoji|[^\x00-\x7F]/.test(subjectLine)) patterns.push("Emoji usage");
  
  return patterns.length > 0 ? patterns : ["Standard"];
};

export const analyzeSubjectLines = (data: CampaignRow[]): SubjectLineAnalysis => {
  if (data.length === 0) {
    return {
      lengthInsight: "No data available",
      topPatterns: [],
      lowPatterns: [],
      avgLengthTop: 0,
      avgLengthBottom: 0,
    };
  }

  const sorted = [...data].sort((a, b) => b.open_rate - a.open_rate);
  const topQuartile = sorted.slice(0, Math.max(1, Math.ceil(data.length * 0.25)));
  const bottomQuartile = sorted.slice(-Math.max(1, Math.ceil(data.length * 0.25)));

  const avgLengthTop = topQuartile.reduce((sum, c) => sum + c.subject_line.length, 0) / topQuartile.length;
  const avgLengthBottom = bottomQuartile.reduce((sum, c) => sum + c.subject_line.length, 0) / bottomQuartile.length;

  // Analyze patterns
  const patternStats: Record<string, { total: number; openSum: number; campaigns: CampaignRow[] }> = {};

  data.forEach((campaign) => {
    const patterns = extractPatterns(campaign.subject_line);
    patterns.forEach((pattern) => {
      if (!patternStats[pattern]) {
        patternStats[pattern] = { total: 0, openSum: 0, campaigns: [] };
      }
      patternStats[pattern].total++;
      patternStats[pattern].openSum += campaign.open_rate;
      patternStats[pattern].campaigns.push(campaign);
    });
  });

  const patternSignals: SubjectLineSignal[] = Object.entries(patternStats)
    .filter(([, stats]) => stats.total >= 2)
    .map(([pattern, stats]) => ({
      pattern,
      avgOpenRate: stats.openSum / stats.total,
      count: stats.total,
      isTopPerformer: false,
    }))
    .sort((a, b) => b.avgOpenRate - a.avgOpenRate);

  const medianRate = median(data.map((c) => c.open_rate));
  patternSignals.forEach((p) => {
    p.isTopPerformer = p.avgOpenRate > medianRate;
  });

  const topPatterns = patternSignals.filter((p) => p.isTopPerformer).slice(0, 3);
  const lowPatterns = patternSignals.filter((p) => !p.isTopPerformer).slice(-3);

  let lengthInsight: string;
  if (avgLengthTop < avgLengthBottom - 10) {
    lengthInsight = `Shorter subject lines perform better (avg ${Math.round(avgLengthTop)} vs ${Math.round(avgLengthBottom)} chars)`;
  } else if (avgLengthTop > avgLengthBottom + 10) {
    lengthInsight = `Longer subject lines perform better (avg ${Math.round(avgLengthTop)} vs ${Math.round(avgLengthBottom)} chars)`;
  } else {
    lengthInsight = `Subject line length has minimal impact (both avg ~${Math.round((avgLengthTop + avgLengthBottom) / 2)} chars)`;
  }

  return {
    lengthInsight,
    topPatterns,
    lowPatterns,
    avgLengthTop,
    avgLengthBottom,
  };
};

const parseDateSafely = (dateStr: string): Date | null => {
  // Try various date formats
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
    /^(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) return date;
    }
  }
  
  // Fallback to Date.parse
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

export const analyzeTrends = (data: CampaignRow[]): TrendAnalysis => {
  if (data.length < 3) {
    return {
      dataPoints: [],
      openRateTrend: "stable",
      clickRateTrend: "stable",
      volumeVsEngagement: "Insufficient data for trend analysis",
    };
  }

  // Group by date and aggregate
  const dateGroups: Record<string, { openSum: number; clickSum: number; volume: number; count: number }> = {};

  data.forEach((campaign) => {
    const date = parseDateSafely(campaign.sent_date);
    if (!date) return;
    
    const dateKey = date.toISOString().split("T")[0];
    if (!dateGroups[dateKey]) {
      dateGroups[dateKey] = { openSum: 0, clickSum: 0, volume: 0, count: 0 };
    }
    dateGroups[dateKey].openSum += campaign.open_rate;
    dateGroups[dateKey].clickSum += campaign.click_rate;
    dateGroups[dateKey].volume += campaign.emails_sent;
    dateGroups[dateKey].count++;
  });

  const dataPoints: TrendPoint[] = Object.entries(dateGroups)
    .map(([date, stats]) => ({
      date,
      openRate: stats.openSum / stats.count,
      clickRate: stats.clickSum / stats.count,
      volume: stats.volume,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Calculate trends (comparing first half to second half)
  const mid = Math.floor(dataPoints.length / 2);
  const firstHalf = dataPoints.slice(0, mid);
  const secondHalf = dataPoints.slice(mid);

  const avgOpenFirst = firstHalf.reduce((s, p) => s + p.openRate, 0) / (firstHalf.length || 1);
  const avgOpenSecond = secondHalf.reduce((s, p) => s + p.openRate, 0) / (secondHalf.length || 1);
  const avgClickFirst = firstHalf.reduce((s, p) => s + p.clickRate, 0) / (firstHalf.length || 1);
  const avgClickSecond = secondHalf.reduce((s, p) => s + p.clickRate, 0) / (secondHalf.length || 1);

  const openRateTrend: "improving" | "declining" | "stable" =
    avgOpenSecond > avgOpenFirst * 1.1 ? "improving" :
    avgOpenSecond < avgOpenFirst * 0.9 ? "declining" : "stable";

  const clickRateTrend: "improving" | "declining" | "stable" =
    avgClickSecond > avgClickFirst * 1.1 ? "improving" :
    avgClickSecond < avgClickFirst * 0.9 ? "declining" : "stable";

  // Analyze volume vs engagement correlation
  const highVolumeDays = dataPoints.filter((p) => p.volume > median(dataPoints.map((d) => d.volume)));
  const avgEngagementHigh = highVolumeDays.reduce((s, p) => s + p.openRate + p.clickRate, 0) / (highVolumeDays.length * 2 || 1);
  const avgEngagementAll = dataPoints.reduce((s, p) => s + p.openRate + p.clickRate, 0) / (dataPoints.length * 2 || 1);

  let volumeVsEngagement: string;
  if (avgEngagementHigh < avgEngagementAll * 0.85) {
    volumeVsEngagement = "Higher send volume correlates with lower engagement - consider pacing";
  } else if (avgEngagementHigh > avgEngagementAll * 1.15) {
    volumeVsEngagement = "Higher volume days show better engagement - timing may be optimal";
  } else {
    volumeVsEngagement = "Volume does not significantly impact engagement rates";
  }

  return {
    dataPoints,
    openRateTrend,
    clickRateTrend,
    volumeVsEngagement,
  };
};

export const analyzeFatigue = (data: CampaignRow[]): FatigueAnalysis => {
  const signals: FatigueSignal[] = [];

  if (data.length < 5) {
    return { signals: [], overallRisk: "low" };
  }

  // Sort by date
  const sorted = [...data].sort((a, b) => {
    const dateA = parseDateSafely(a.sent_date);
    const dateB = parseDateSafely(b.sent_date);
    return (dateA?.getTime() || 0) - (dateB?.getTime() || 0);
  });

  // Check for declining engagement
  const recentQuarter = sorted.slice(-Math.ceil(sorted.length * 0.25));
  const earlierData = sorted.slice(0, -Math.ceil(sorted.length * 0.25));
  
  const recentAvgOpen = recentQuarter.reduce((s, c) => s + c.open_rate, 0) / recentQuarter.length;
  const earlierAvgOpen = earlierData.reduce((s, c) => s + c.open_rate, 0) / (earlierData.length || 1);

  if (recentAvgOpen < earlierAvgOpen * 0.8) {
    signals.push({
      type: "declining_engagement",
      severity: recentAvgOpen < earlierAvgOpen * 0.6 ? "high" : "medium",
      description: `Open rates dropped ${Math.round((1 - recentAvgOpen / earlierAvgOpen) * 100)}% in recent campaigns`,
      campaigns: recentQuarter.map((c) => c.campaign_name),
    });
  }

  // Check for overused patterns
  const patternCounts: Record<string, string[]> = {};
  data.forEach((c) => {
    const patterns = extractPatterns(c.subject_line);
    patterns.forEach((p) => {
      if (!patternCounts[p]) patternCounts[p] = [];
      patternCounts[p].push(c.campaign_name);
    });
  });

  Object.entries(patternCounts).forEach(([pattern, campaigns]) => {
    if (campaigns.length > data.length * 0.5 && pattern !== "Standard") {
      signals.push({
        type: "overused_pattern",
        severity: campaigns.length > data.length * 0.7 ? "high" : "medium",
        description: `"${pattern}" used in ${campaigns.length} of ${data.length} campaigns`,
        campaigns: campaigns.slice(0, 5),
      });
    }
  });

  // Check for high send, low click
  const medianClick = median(data.map((c) => c.click_rate));
  const medianVolume = median(data.map((c) => c.emails_sent));
  
  const highSendLowClick = data.filter(
    (c) => c.emails_sent > medianVolume * 1.5 && c.click_rate < medianClick * 0.5
  );

  if (highSendLowClick.length >= 3) {
    signals.push({
      type: "high_send_low_click",
      severity: highSendLowClick.length > 5 ? "high" : "medium",
      description: `${highSendLowClick.length} campaigns with high volume but low clicks`,
      campaigns: highSendLowClick.map((c) => c.campaign_name),
    });
  }

  // Calculate overall risk
  const highSeverityCount = signals.filter((s) => s.severity === "high").length;
  const mediumSeverityCount = signals.filter((s) => s.severity === "medium").length;

  let overallRisk: "low" | "medium" | "high" = "low";
  if (highSeverityCount >= 2 || (highSeverityCount >= 1 && mediumSeverityCount >= 2)) {
    overallRisk = "high";
  } else if (highSeverityCount >= 1 || mediumSeverityCount >= 2) {
    overallRisk = "medium";
  }

  return { signals, overallRisk };
};

export const generateRecommendations = (
  performance: PerformanceSnapshot,
  subjectLines: SubjectLineAnalysis,
  trends: TrendAnalysis,
  fatigue: FatigueAnalysis
): Recommendation[] => {
  const recommendations: Recommendation[] = [];

  // Based on performance
  if (performance.medianClickRate < 2) {
    recommendations.push({
      title: "Strengthen Call-to-Actions",
      description: "Low click rates suggest CTAs may not be compelling. Test value-driven language and create urgency without being pushy.",
      category: "content",
      priority: "high",
    });
  }

  // Based on subject lines
  if (subjectLines.topPatterns.some((p) => p.pattern === "Personalization")) {
    recommendations.push({
      title: "Scale Personalization",
      description: "Personalized subject lines are performing well. Extend this to body content and consider behavioral triggers for journey automation.",
      category: "journey",
      priority: "high",
    });
  }

  if (subjectLines.lowPatterns.some((p) => p.pattern === "Urgency")) {
    recommendations.push({
      title: "Reconsider Urgency Tactics",
      description: "Urgency-based subject lines are underperforming. Your audience may prefer value-focused messaging over pressure.",
      category: "content",
      priority: "medium",
    });
  }

  // Based on trends
  if (trends.openRateTrend === "declining") {
    recommendations.push({
      title: "Implement Re-engagement Journeys",
      description: "Declining open rates indicate list fatigue. Set up automated re-engagement sequences and consider sunsetting unengaged subscribers.",
      category: "lifecycle",
      priority: "high",
    });
  }

  if (trends.volumeVsEngagement.includes("pacing")) {
    recommendations.push({
      title: "Optimize Send Frequency",
      description: "High volume is hurting engagement. Implement frequency capping and let user behavior determine send cadence.",
      category: "frequency",
      priority: "high",
    });
  }

  // Based on fatigue
  if (fatigue.overallRisk === "high") {
    recommendations.push({
      title: "Address List Fatigue Urgently",
      description: "Multiple fatigue signals detected. Pause promotional campaigns temporarily, focus on value-driven content, and clean your list.",
      category: "frequency",
      priority: "high",
    });
  }

  fatigue.signals.forEach((signal) => {
    if (signal.type === "overused_pattern" && !recommendations.some((r) => r.title.includes("Subject Line"))) {
      recommendations.push({
        title: "Diversify Subject Line Strategy",
        description: `Overuse of "${signal.description.split('"')[1]}" pattern. Test new approaches like curiosity, exclusivity, or question-based subjects.`,
        category: "content",
        priority: "medium",
      });
    }
  });

  // Always include AMP opportunity
  if (performance.medianOpenRate > 15 && performance.medianClickRate < 3) {
    recommendations.push({
      title: "Explore AMP for Interactivity",
      description: "Good opens but low clicks suggest interest without action. AMP emails can enable in-email actions, reducing friction to conversion.",
      category: "amp",
      priority: "medium",
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).slice(0, 5);
};

export const runFullAnalysis = (data: CampaignRow[]): DiagnosticsData => {
  const performance = analyzePerformance(data);
  const subjectLines = analyzeSubjectLines(data);
  const trends = analyzeTrends(data);
  const fatigue = analyzeFatigue(data);
  const recommendations = generateRecommendations(performance, subjectLines, trends, fatigue);

  return {
    rawData: data,
    performance,
    subjectLines,
    trends,
    fatigue,
    recommendations,
  };
};
