// Journey CSV analyzer for Inbox Diagnostics — Phase 1.
//
// Mirrors the campaign pipeline (parse → coerce → derive per-row rates →
// aggregate by provider/month with a "sum then recompute" weighted policy)
// but is scoped to the journey export shape.
//
// Phase 1 covers:
//   - parseJourneyCSV(text) → { isValid, errors, warnings, data, filterSummary }
//   - generateJourneyAnalysisReport(rows) → { providerAggregates, monthlyOverview }
//   - combineProviderAggregates / combineMonthlyOverview helpers for the
//     Combined sub-tables when both campaign + journey data are present.
//
// Filters applied at parse time per the PRD (FR-2):
//   * keep nodeType === "message" (case-insensitive)
//   * keep channelType === "Email"  (case-insensitive)
//   * discard rows where totalSent is null/"N/A"/0
// Excluded rows are silently counted in `filterSummary`.
//
// Date handling (FR-3): journey rows carry "MMM D, h:MM AM/PM" without a
// year. We parse month + day only and never fabricate a year.

import { ProviderAggregate, MonthlyOverview } from "./csvAnalyzer";

// ============= TYPES =============

export interface JourneyRow {
  // Identity / grouping
  journeyStartTime: string; // raw "MMM D, h:MM AM/PM"
  journeyName: string;
  journeyId: string;
  versionNumber: string;
  nodeType: string;
  nodeId: string;
  nodeName: string;
  channelType: string;
  campaignType: string;
  campaignTitle: string;
  providerName: string;
  templateName: string;

  // Volumes
  totalSent: number;
  totalDelivered: number;
  totalViewed: number;
  totalClicked: number;
  errors: number;
  uniqueSent: number;
  uniqueViewed: number;
  uniqueClicked: number;
  uniqueConverted: number;
  totalUnsubscribes: number;

  // Derived (FR-4)
  baseForRates: number;
  openRate: number;
  clickRate: number;
  uniqueCTR: number;
  errorRate: number;
  unsubscribeRate: number;
  // Bounces are not present in journey exports — kept null for layout parity.
  hardBounces: null;
  softBounces: null;
  hardBounceRate: null;
  softBounceRate: null;

  // Date parts (FR-3) — month name + day, NEVER a year
  monthName: string | null;
  monthIndex: number | null; // 0-11 for sort
  dayOfMonth: number | null;
  dayKey: string | null; // raw "MMM D" used as chart x-axis key
}

export interface JourneyFilterSummary {
  excludedByNodeType: number;
  excludedByChannel: number;
  excludedByZeroVolume: number;
}

export interface JourneyValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data: JourneyRow[];
  filterSummary: JourneyFilterSummary;
}

export interface JourneyProviderAggregate {
  providerName: string;
  totalSent: number;
  totalDelivered: number;
  uniqueViewed: number;
  uniqueClicked: number;
  uniqueConverted: number;
  unsubscribes: number;
  errors: number;
  rowCount: number;
  useDeliveredAsDenominator: boolean;
  viewPercent: number;
  clickPercent: number;
  uniqueCTR: number;
  unsubscribePercent: number;
  errorPercent: number;
}

export interface JourneyMonthlyOverview {
  month: string; // month name only (e.g. "May")
  monthSortKey: string; // numeric "00".."11"
  provider: string;
  totalSent: number;
  totalDelivered: number;
  uniqueSent: number;
  uniqueViewed: number;
  uniqueClicked: number;
  uniqueConverted: number;
  unsubscribes: number;
  errors: number;
  rowCount: number;
  useDeliveredAsDenominator: boolean;
  viewPercent: number;
  clickPercent: number;
  uniqueCTR: number;
  unsubscribePercent: number;
  errorPercent: number;
}

export interface TopJourney {
  journeyKey: string; // `${journeyId}|${versionNumber}|${nodeId}`
  journeyId: string;
  versionNumber: string;
  nodeId: string;
  journeyName: string;
  nodeName: string;
  providerName: string;
  startLabel: string; // raw "MMM D" — never a year
  totalSent: number;
  totalDelivered: number;
  uniqueViewed: number;
  uniqueClicked: number;
  unsubscribes: number;
  errors: number;
  openRate: number;
  clickRate: number;
  uniqueCTR: number;
  unsubscribeRate: number;
  errorRate: number;
}

export interface JourneyAnalysisReport {
  providerAggregates: JourneyProviderAggregate[];
  monthlyOverview: JourneyMonthlyOverview[];
  monthlyOverviewByProvider: JourneyMonthlyOverview[];
  bestJourneys: TopJourney[];
  worstJourneys: TopJourney[];
}

// ============= CONSTANTS =============

const JOURNEY_HEADERS_MAP: Record<string, keyof JourneyRow | "_skip"> = {
  "journey start time": "journeyStartTime",
  "journey name": "journeyName",
  "journey id": "journeyId",
  "version number": "versionNumber",
  "node type": "nodeType",
  "node id": "nodeId",
  "campaign / segment / controller name": "nodeName",
  "channel / segment / controller type": "channelType",
  "campaign type": "campaignType",
  "campaign title": "campaignTitle",
  "total sent": "totalSent",
  "total delivered": "totalDelivered",
  "total viewed": "totalViewed",
  "total clicked": "totalClicked",
  "errors": "errors",
  "unique sent within conversion time": "uniqueSent",
  "unique viewed within conversion time": "uniqueViewed",
  "unique clicked within conversion time": "uniqueClicked",
  "unique converted within conversion time": "uniqueConverted",
  "total unsubscribes": "totalUnsubscribes",
  "provider name": "providerName",
  "template name": "templateName",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ============= HELPERS =============

const parseCSVLine = (line: string, delimiter: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
};

/**
 * Coerce a CSV cell to a number per FR-2. "N/A" (any case) and empty → 0.
 * Strips commas and percent signs to handle any human-formatted cells.
 */
const coerceNumeric = (raw: string): number => {
  if (!raw) return 0;
  const trimmed = raw.trim();
  if (!trimmed || /^n\/?a$/i.test(trimmed)) return 0;
  const cleaned = trimmed.replace(/,/g, "").replace(/%/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Parse "May 12, 2:30 PM" / "May 12,2:30 PM" / "May 12" into month + day.
 * Returns nulls for unparseable values — never fabricates a year.
 */
const parseJourneyDate = (raw: string): {
  monthName: string | null;
  monthIndex: number | null;
  dayOfMonth: number | null;
  dayKey: string | null;
} => {
  if (!raw) return { monthName: null, monthIndex: null, dayOfMonth: null, dayKey: null };
  const m = raw.trim().match(/^([A-Za-z]{3,9})\s+(\d{1,2})/);
  if (!m) return { monthName: null, monthIndex: null, dayOfMonth: null, dayKey: null };
  const monShort = m[1].slice(0, 3);
  const monthIndex = MONTHS.findIndex((mn) => mn.toLowerCase() === monShort.toLowerCase());
  if (monthIndex < 0) return { monthName: null, monthIndex: null, dayOfMonth: null, dayKey: null };
  const day = parseInt(m[2], 10);
  if (!Number.isFinite(day) || day < 1 || day > 31) {
    return { monthName: null, monthIndex: null, dayOfMonth: null, dayKey: null };
  }
  const monthName = MONTHS[monthIndex];
  return {
    monthName,
    monthIndex,
    dayOfMonth: day,
    dayKey: `${monthName} ${day}`,
  };
};

// ============= PARSER =============

export const parseJourneyCSV = (csvText: string): JourneyValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const filterSummary: JourneyFilterSummary = {
    excludedByNodeType: 0,
    excludedByChannel: 0,
    excludedByZeroVolume: 0,
  };

  if (!csvText || !csvText.trim()) {
    return { isValid: false, errors: ["Journey CSV is empty"], warnings, data: [], filterSummary };
  }

  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return {
      isValid: false,
      errors: ["Journey CSV must contain a header row and at least one data row"],
      warnings,
      data: [],
      filterSummary,
    };
  }

  const delimiter = lines[0].includes(";") ? ";" : ",";
  // Headers in the journey export sometimes carry leading/trailing spaces
  // (e.g. " Total HTML Viewed"). Normalise: strip quotes, trim, lowercase.
  const rawHeaders = parseCSVLine(lines[0], delimiter).map((h) =>
    h.replace(/"/g, "").trim().toLowerCase(),
  );

  const headerIndexMap: Record<string, number> = {};
  rawHeaders.forEach((h, i) => {
    if (h in JOURNEY_HEADERS_MAP) headerIndexMap[h] = i;
  });

  // Minimum viable headers — without these we cannot run the email pipeline.
  const minimal = ["node type", "channel / segment / controller type", "total sent", "provider name"];
  const missing = minimal.filter((k) => headerIndexMap[k] === undefined);
  if (missing.length > 0) {
    return {
      isValid: false,
      errors: [`Missing required journey columns: ${missing.join(", ")}`],
      warnings,
      data: [],
      filterSummary,
    };
  }

  const data: JourneyRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);
    const get = (key: string): string => {
      const idx = headerIndexMap[key];
      if (idx === undefined || idx >= values.length) return "";
      return values[idx].replace(/^"|"$/g, "").trim();
    };

    const nodeType = get("node type");
    if (nodeType.toLowerCase() !== "message") {
      filterSummary.excludedByNodeType++;
      continue;
    }
    const channelType = get("channel / segment / controller type");
    if (channelType.toLowerCase() !== "email") {
      filterSummary.excludedByChannel++;
      continue;
    }
    const totalSentRaw = get("total sent");
    const totalSent = coerceNumeric(totalSentRaw);
    if (!totalSent || totalSent <= 0) {
      filterSummary.excludedByZeroVolume++;
      continue;
    }

    const totalDelivered = coerceNumeric(get("total delivered"));
    const totalViewed = coerceNumeric(get("total viewed"));
    const totalClicked = coerceNumeric(get("total clicked"));
    const errorsCount = coerceNumeric(get("errors"));
    const uniqueSent = coerceNumeric(get("unique sent within conversion time"));
    const uniqueViewed = coerceNumeric(get("unique viewed within conversion time"));
    const uniqueClicked = coerceNumeric(get("unique clicked within conversion time"));
    const uniqueConverted = coerceNumeric(get("unique converted within conversion time"));
    const totalUnsubscribes = coerceNumeric(get("total unsubscribes"));

    // FR-4 denominator policy — mirrors the campaign pipeline exactly.
    const baseForRates = totalDelivered > 0 ? totalDelivered : totalSent;

    const journeyStartTime = get("journey start time");
    const dateParts = parseJourneyDate(journeyStartTime);

    const row: JourneyRow = {
      journeyStartTime,
      journeyName: get("journey name"),
      journeyId: get("journey id"),
      versionNumber: get("version number"),
      nodeType,
      nodeId: get("node id"),
      nodeName: get("campaign / segment / controller name"),
      channelType,
      campaignType: get("campaign type"),
      campaignTitle: get("campaign title"),
      providerName: get("provider name") || "Unknown",
      templateName: get("template name"),

      totalSent,
      totalDelivered,
      totalViewed,
      totalClicked,
      errors: errorsCount,
      uniqueSent,
      uniqueViewed,
      uniqueClicked,
      uniqueConverted,
      totalUnsubscribes,

      baseForRates,
      openRate: baseForRates > 0 ? (uniqueViewed / baseForRates) * 100 : 0,
      clickRate: baseForRates > 0 ? (uniqueClicked / baseForRates) * 100 : 0,
      uniqueCTR: uniqueViewed > 0 ? (uniqueClicked / uniqueViewed) * 100 : 0,
      errorRate: baseForRates > 0 ? (errorsCount / baseForRates) * 100 : 0,
      unsubscribeRate: baseForRates > 0 ? (totalUnsubscribes / baseForRates) * 100 : 0,
      hardBounces: null,
      softBounces: null,
      hardBounceRate: null,
      softBounceRate: null,

      monthName: dateParts.monthName,
      monthIndex: dateParts.monthIndex,
      dayOfMonth: dateParts.dayOfMonth,
      dayKey: dateParts.dayKey,
    };

    data.push(row);
  }

  if (data.length === 0) {
    warnings.push(
      "No email-channel message nodes with non-zero volume were found in the journey CSV.",
    );
  }

  return {
    isValid: data.length > 0,
    errors: data.length === 0 ? ["No usable journey rows after filtering"] : [],
    warnings,
    data,
    filterSummary,
  };
};

// ============= AGGREGATIONS (FR-6) =============

const recomputeJourneyProviderRates = (a: JourneyProviderAggregate): void => {
  const useDelivered = a.totalDelivered > 0;
  const denom = useDelivered ? a.totalDelivered : a.totalSent;
  a.useDeliveredAsDenominator = useDelivered;
  a.viewPercent = denom > 0 ? (a.uniqueViewed / denom) * 100 : 0;
  a.clickPercent = denom > 0 ? (a.uniqueClicked / denom) * 100 : 0;
  a.uniqueCTR = a.uniqueViewed > 0 ? (a.uniqueClicked / a.uniqueViewed) * 100 : 0;
  a.unsubscribePercent = denom > 0 ? (a.unsubscribes / denom) * 100 : 0;
  a.errorPercent = denom > 0 ? (a.errors / denom) * 100 : 0;
};

const recomputeJourneyMonthlyRates = (m: JourneyMonthlyOverview): void => {
  const useDelivered = m.totalDelivered > 0;
  const denom = useDelivered ? m.totalDelivered : m.totalSent;
  m.useDeliveredAsDenominator = useDelivered;
  m.viewPercent = denom > 0 ? (m.uniqueViewed / denom) * 100 : 0;
  m.clickPercent = denom > 0 ? (m.uniqueClicked / denom) * 100 : 0;
  m.uniqueCTR = m.uniqueViewed > 0 ? (m.uniqueClicked / m.uniqueViewed) * 100 : 0;
  m.unsubscribePercent = denom > 0 ? (m.unsubscribes / denom) * 100 : 0;
  m.errorPercent = denom > 0 ? (m.errors / denom) * 100 : 0;
};

export const generateJourneyAnalysisReport = (
  data: JourneyRow[],
): JourneyAnalysisReport => {
  // ---- Provider aggregates (key = providerName, exact-match per PRD) ----
  const providerMap: Record<string, JourneyProviderAggregate> = {};
  data.forEach((row) => {
    const key = row.providerName || "Unknown";
    if (!providerMap[key]) {
      providerMap[key] = {
        providerName: key,
        totalSent: 0,
        totalDelivered: 0,
        uniqueViewed: 0,
        uniqueClicked: 0,
        uniqueConverted: 0,
        unsubscribes: 0,
        errors: 0,
        rowCount: 0,
        useDeliveredAsDenominator: true,
        viewPercent: 0,
        clickPercent: 0,
        uniqueCTR: 0,
        unsubscribePercent: 0,
        errorPercent: 0,
      };
    }
    const a = providerMap[key];
    a.totalSent += row.totalSent;
    a.totalDelivered += row.totalDelivered;
    a.uniqueViewed += row.uniqueViewed;
    a.uniqueClicked += row.uniqueClicked;
    a.uniqueConverted += row.uniqueConverted;
    a.unsubscribes += row.totalUnsubscribes;
    a.errors += row.errors;
    a.rowCount++;
  });
  const providerAggregates = Object.values(providerMap);
  providerAggregates.forEach(recomputeJourneyProviderRates);
  providerAggregates.sort((a, b) => b.totalSent - a.totalSent);

  // ---- Monthly overview (month name only) ----
  const buildEmptyMonthly = (month: string, monthIndex: number, provider: string): JourneyMonthlyOverview => ({
    month,
    monthSortKey: String(monthIndex).padStart(2, "0"),
    provider,
    totalSent: 0,
    totalDelivered: 0,
    uniqueSent: 0,
    uniqueViewed: 0,
    uniqueClicked: 0,
    uniqueConverted: 0,
    unsubscribes: 0,
    errors: 0,
    rowCount: 0,
    useDeliveredAsDenominator: true,
    viewPercent: 0,
    clickPercent: 0,
    uniqueCTR: 0,
    unsubscribePercent: 0,
    errorPercent: 0,
  });

  const monthMap: Record<string, JourneyMonthlyOverview> = {};
  const monthProviderMap: Record<string, JourneyMonthlyOverview> = {};
  data.forEach((row) => {
    const monthName = row.monthName || "Unknown";
    const monthIndex = row.monthIndex ?? 99;
    if (!monthMap[monthName]) monthMap[monthName] = buildEmptyMonthly(monthName, monthIndex, "All");
    const m = monthMap[monthName];
    m.totalSent += row.totalSent;
    m.totalDelivered += row.totalDelivered;
    m.uniqueSent += row.uniqueSent;
    m.uniqueViewed += row.uniqueViewed;
    m.uniqueClicked += row.uniqueClicked;
    m.uniqueConverted += row.uniqueConverted;
    m.unsubscribes += row.totalUnsubscribes;
    m.errors += row.errors;
    m.rowCount++;

    const provider = row.providerName || "Unknown";
    const pKey = `${monthName}|${provider}`;
    if (!monthProviderMap[pKey]) monthProviderMap[pKey] = buildEmptyMonthly(monthName, monthIndex, provider);
    const mp = monthProviderMap[pKey];
    mp.totalSent += row.totalSent;
    mp.totalDelivered += row.totalDelivered;
    mp.uniqueSent += row.uniqueSent;
    mp.uniqueViewed += row.uniqueViewed;
    mp.uniqueClicked += row.uniqueClicked;
    mp.uniqueConverted += row.uniqueConverted;
    mp.unsubscribes += row.totalUnsubscribes;
    mp.errors += row.errors;
    mp.rowCount++;
  });
  const monthlyOverview = Object.values(monthMap).sort((a, b) => a.monthSortKey.localeCompare(b.monthSortKey));
  const monthlyOverviewByProvider = Object.values(monthProviderMap).sort((a, b) => {
    const k = a.monthSortKey.localeCompare(b.monthSortKey);
    return k !== 0 ? k : a.provider.localeCompare(b.provider);
  });
  monthlyOverview.forEach(recomputeJourneyMonthlyRates);
  monthlyOverviewByProvider.forEach(recomputeJourneyMonthlyRates);

  return { providerAggregates, monthlyOverview, monthlyOverviewByProvider };
};

// ============= COMBINED VIEWS =============
//
// "Combined" sub-tables sum campaign + journey contributions for the same
// provider. Hard / soft bounce columns stay campaign-only since journey
// rows have no bounce data. Per PRD: exact-match providerName.

export interface CombinedProviderAggregate {
  providerName: string;
  totalSent: number;
  totalDelivered: number;
  uniqueViewed: number;
  uniqueClicked: number;
  unsubscribes: number;
  hardBounces: number; // campaign-only contributions
  softBounces: number; // campaign-only contributions
  campaignRowCount: number;
  journeyRowCount: number;
  useDeliveredAsDenominator: boolean;
  viewPercent: number;
  clickPercent: number;
  uniqueCTR: number;
  unsubscribePercent: number;
  hardBouncePercent: number;
  softBouncePercent: number;
}

export const combineProviderAggregates = (
  campaignAggs: ProviderAggregate[],
  journeyAggs: JourneyProviderAggregate[],
): CombinedProviderAggregate[] => {
  const map: Record<string, CombinedProviderAggregate> = {};

  const ensure = (provider: string): CombinedProviderAggregate => {
    if (!map[provider]) {
      map[provider] = {
        providerName: provider,
        totalSent: 0,
        totalDelivered: 0,
        uniqueViewed: 0,
        uniqueClicked: 0,
        unsubscribes: 0,
        hardBounces: 0,
        softBounces: 0,
        campaignRowCount: 0,
        journeyRowCount: 0,
        useDeliveredAsDenominator: true,
        viewPercent: 0,
        clickPercent: 0,
        uniqueCTR: 0,
        unsubscribePercent: 0,
        hardBouncePercent: 0,
        softBouncePercent: 0,
      };
    }
    return map[provider];
  };

  campaignAggs.forEach((c) => {
    const row = ensure(c.providerName || "Unknown");
    row.totalSent += c.totalSentUsers;
    row.totalDelivered += c.totalDeliveredUsers;
    row.uniqueViewed += c.uniqueViewed;
    row.uniqueClicked += c.uniqueClicked;
    row.unsubscribes += c.unsubscribes;
    row.hardBounces += c.hardBounces;
    row.softBounces += c.softBounces;
    row.campaignRowCount += c.campaignCount;
  });
  journeyAggs.forEach((j) => {
    const row = ensure(j.providerName || "Unknown");
    row.totalSent += j.totalSent;
    row.totalDelivered += j.totalDelivered;
    row.uniqueViewed += j.uniqueViewed;
    row.uniqueClicked += j.uniqueClicked;
    row.unsubscribes += j.unsubscribes;
    // intentionally NOT adding bounces — journey has none
    row.journeyRowCount += j.rowCount;
  });

  Object.values(map).forEach((row) => {
    const useDelivered = row.totalDelivered > 0;
    const denom = useDelivered ? row.totalDelivered : row.totalSent;
    // Bounce % stays campaign-only: numerator already campaign-only;
    // denominator should also be campaign-only to be apples-to-apples.
    const campaignSent = campaignAggs
      .filter((c) => (c.providerName || "Unknown") === row.providerName)
      .reduce((s, c) => s + c.totalSentUsers, 0);
    const campaignDelivered = campaignAggs
      .filter((c) => (c.providerName || "Unknown") === row.providerName)
      .reduce((s, c) => s + c.totalDeliveredUsers, 0);
    const bounceDenom = campaignDelivered > 0 ? campaignDelivered : campaignSent;

    row.useDeliveredAsDenominator = useDelivered;
    row.viewPercent = denom > 0 ? (row.uniqueViewed / denom) * 100 : 0;
    row.clickPercent = denom > 0 ? (row.uniqueClicked / denom) * 100 : 0;
    row.uniqueCTR = row.uniqueViewed > 0 ? (row.uniqueClicked / row.uniqueViewed) * 100 : 0;
    row.unsubscribePercent = denom > 0 ? (row.unsubscribes / denom) * 100 : 0;
    row.hardBouncePercent = bounceDenom > 0 ? (row.hardBounces / bounceDenom) * 100 : 0;
    row.softBouncePercent = bounceDenom > 0 ? (row.softBounces / bounceDenom) * 100 : 0;
  });

  return Object.values(map).sort((a, b) => b.totalSent - a.totalSent);
};

// ============= GRAND TOTALS (Section 1 KPI cards) =============

export interface CampaignGrandTotals {
  totalSent: number;
  totalDelivered: number;
  uniqueViewed: number;
  uniqueClicked: number;
  unsubscribes: number;
  hardBounces: number;
  softBounces: number;
}
export interface JourneyGrandTotals {
  totalSent: number;
  totalDelivered: number;
  uniqueViewed: number;
  uniqueClicked: number;
  unsubscribes: number;
  errors: number;
}

export const sumCampaignProviderAggregates = (
  aggs: ProviderAggregate[],
): CampaignGrandTotals => aggs.reduce(
  (acc, p) => ({
    totalSent: acc.totalSent + p.totalSentUsers,
    totalDelivered: acc.totalDelivered + p.totalDeliveredUsers,
    uniqueViewed: acc.uniqueViewed + p.uniqueViewed,
    uniqueClicked: acc.uniqueClicked + p.uniqueClicked,
    unsubscribes: acc.unsubscribes + p.unsubscribes,
    hardBounces: acc.hardBounces + p.hardBounces,
    softBounces: acc.softBounces + p.softBounces,
  }),
  { totalSent: 0, totalDelivered: 0, uniqueViewed: 0, uniqueClicked: 0, unsubscribes: 0, hardBounces: 0, softBounces: 0 },
);

export const sumJourneyProviderAggregates = (
  aggs: JourneyProviderAggregate[],
): JourneyGrandTotals => aggs.reduce(
  (acc, p) => ({
    totalSent: acc.totalSent + p.totalSent,
    totalDelivered: acc.totalDelivered + p.totalDelivered,
    uniqueViewed: acc.uniqueViewed + p.uniqueViewed,
    uniqueClicked: acc.uniqueClicked + p.uniqueClicked,
    unsubscribes: acc.unsubscribes + p.unsubscribes,
    errors: acc.errors + p.errors,
  }),
  { totalSent: 0, totalDelivered: 0, uniqueViewed: 0, uniqueClicked: 0, unsubscribes: 0, errors: 0 },
);
