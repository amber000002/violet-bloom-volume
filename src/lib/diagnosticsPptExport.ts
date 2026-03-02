// Inbox Diagnostics PPT Export - 12-Slide Executive Deck Blueprint
// Visual Enhancement Only — No Content AI / No Summarization
import pptxgen from "pptxgenjs";
import {
  DiagnosticsData,
  AnalysisReport,
  CampaignRow,
  PostmasterRow,
  MonthlyOverview,
  ProviderAggregate,
  TopCampaign,
} from "./csvAnalyzer";
import { CoreBrandJSON } from "@/types/brandProfile";

// ============= TYPES =============

interface IntelligentRecommendation {
  issue: string;
  recommendation: string;
  priority: "P0" | "P1" | "P2";
}

interface SignalHealthExport {
  metric: string;
  currentValue: string;
  status: string;
  trend: string;
}

interface RootCauseExport {
  cause: string;
  evidence: string;
  priority?: string;
}

interface InfrastructureDomain {
  domain: string;
  provider: string;
  reputation: string;
}

interface InfrastructureIP {
  ip: string;
  reputation: string;
}

export interface DiagnosticsDeckOptions {
  diagnostics: DiagnosticsData;
  brandName?: string;
  brandProfile?: CoreBrandJSON | null;
  signalHealthData?: SignalHealthExport[];
  rootCauseEntries?: RootCauseExport[];
  intelligentLearnings?: IntelligentRecommendation[];
  industry?: string;
}

// ============= BRAND COLOR ENGINE =============

interface BrandTheme {
  primary: string;        // hex without #
  secondary: string;
  accent: string;
  headerBg: string;       // gradient start for header rows
  headerBgEnd: string;    // gradient end
  altRowBg: string;       // alternating row shading
  slideBg: string;        // slide background
  bgAccent: string;       // radial accent glow
  titleColor: string;
  bodyColor: string;
  mutedColor: string;
  footerColor: string;
  // Signal colors (never brand-colored)
  green: string;
  amber: string;
  red: string;
}

const DEFAULT_THEME: BrandTheme = {
  primary: "4338CA",      // deep indigo
  secondary: "7C3AED",   // soft lavender
  accent: "A78BFA",
  headerBg: "EEF2FF",    // indigo-50
  headerBgEnd: "F5F3FF", // violet-50
  altRowBg: "FAFAFA",
  slideBg: "FFFFFF",
  bgAccent: "F5F3FF",
  titleColor: "1E1B4B",  // indigo-950
  bodyColor: "374151",
  mutedColor: "6B7280",
  footerColor: "9CA3AF",
  green: "059669",
  amber: "D97706",
  red: "DC2626",
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join("");
};

const lighten = (hex: string, factor: number): string => {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * factor,
    g + (255 - g) * factor,
    b + (255 - b) * factor
  );
};

const desaturate = (hex: string, factor: number): string => {
  const { r, g, b } = hexToRgb(hex);
  const avg = (r + g + b) / 3;
  return rgbToHex(
    r + (avg - r) * factor,
    g + (avg - g) * factor,
    b + (avg - b) * factor
  );
};

const luminance = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

const buildBrandTheme = (
  brandProfile?: CoreBrandJSON | null,
  industry?: string
): BrandTheme => {
  if (!brandProfile?.brand_colors?.primary) return DEFAULT_THEME;

  let primary = brandProfile.brand_colors.primary.replace("#", "");
  let secondary = (brandProfile.brand_colors.secondary || brandProfile.brand_colors.accent || "").replace("#", "") || lighten(primary, 0.3);
  const accent = (brandProfile.brand_colors.accent || "").replace("#", "") || lighten(primary, 0.5);

  // If primary is too bright (luminance > 0.75), desaturate 15%
  if (luminance(primary) > 0.75) {
    primary = desaturate(primary, 0.15);
  }

  // Industry-aware adjustments
  const ind = (industry || brandProfile.brand_identity?.industry || "").toLowerCase();
  const isFintech = ind.includes("fintech") || ind.includes("finance") || ind.includes("banking");
  const isConsumer = ind.includes("consumer") || ind.includes("creator") || ind.includes("lifestyle");

  const headerBg = lighten(primary, isFintech ? 0.88 : 0.92);
  const altRowBg = lighten(primary, 0.96);
  const titleColor = isFintech ? "0F172A" : lighten(primary, -0.4) || "1E1B4B";

  return {
    ...DEFAULT_THEME,
    primary,
    secondary,
    accent,
    headerBg,
    headerBgEnd: lighten(secondary, 0.92),
    altRowBg,
    bgAccent: lighten(secondary, 0.88),
    titleColor: luminance(primary) < 0.3 ? primary : titleColor,
    bodyColor: isFintech ? "1E293B" : "374151",
  };
};

// ============= STYLE CONSTANTS =============

const FONTS = {
  headline: "Calibri",
  body: "Calibri", // PPT-safe; "Poppins" rendered via system
};

// ============= HELPER FUNCTIONS =============

const formatNumber = (num: number): string =>
  num.toLocaleString("en-US", { maximumFractionDigits: 0 });

const formatPercent = (num: number): string => `${num.toFixed(2)}%`;

const cleanSubjectLine = (subject: string): string => {
  if (!subject) return "";
  return subject.replace(/^\{Subject:\s*/i, "").replace(/\}$/, "").trim();
};

type MetricType = "openRate" | "clickRate" | "bounceRate" | "unsubscribeRate";

const getMetricColor = (value: number, metricType: MetricType, theme: BrandTheme): string => {
  const v = Math.round(value * 100) / 100;
  switch (metricType) {
    case "openRate":
      return v > 25 ? theme.green : v > 10 ? theme.amber : theme.red;
    case "clickRate":
      return v > 3 ? theme.green : v > 1.5 ? theme.amber : theme.red;
    case "bounceRate":
      return v < 1 ? theme.green : v <= 3 ? theme.amber : theme.red;
    case "unsubscribeRate":
      return v < 0.3 ? theme.green : v <= 0.7 ? theme.amber : theme.red;
    default:
      return theme.bodyColor;
  }
};

const getMonthRange = (data: AnalysisReport | null): string => {
  if (!data || data.monthlyOverview.length === 0) return "";
  const months = data.monthlyOverview.map(m => m.month);
  if (months.length === 1) return months[0];
  return `${months[0]} – ${months[months.length - 1]}`;
};

const getReputationColor = (rep: string, theme: BrandTheme): string => {
  const r = rep.toLowerCase();
  if (r === "high" || r === "healthy") return theme.green;
  if (r === "medium" || r === "warning" || r === "moderate") return theme.amber;
  if (r === "low" || r === "bad" || r === "risk" || r === "critical") return theme.red;
  return theme.mutedColor;
};

// ============= SLIDE HELPERS =============

const addSlideBackground = (slide: pptxgen.Slide, theme: BrandTheme) => {
  slide.background = { color: theme.slideBg };
  // Subtle radial accent glow - approximated via a very light rect
  slide.addShape("rect" as pptxgen.SHAPE_NAME, {
    x: 0, y: 0, w: 10, h: 5.625,
    fill: { color: theme.bgAccent, transparency: 85 },
  });
};

const addSlideHeader = (
  slide: pptxgen.Slide,
  title: string,
  theme: BrandTheme,
  monthRange?: string,
  slideNumber?: number
) => {
  // Gradient accent underline
  slide.addShape("rect" as pptxgen.SHAPE_NAME, {
    x: 0.5, y: 0.95, w: 2.5, h: 0.04,
    fill: { color: theme.primary },
  });

  slide.addText(title, {
    x: 0.5, y: 0.3, w: monthRange ? 6.5 : 8.5, h: 0.65,
    fontSize: 26, bold: true,
    color: theme.titleColor,
    fontFace: FONTS.headline,
  });

  if (monthRange) {
    slide.addText(monthRange, {
      x: 7, y: 0.4, w: 2.5, h: 0.4,
      fontSize: 11, color: theme.mutedColor,
      fontFace: FONTS.body, align: "right",
    });
  }

  if (slideNumber) {
    slide.addText(`${slideNumber}`, {
      x: 9.3, y: 5.2, w: 0.4, h: 0.3,
      fontSize: 9, color: theme.mutedColor,
      fontFace: FONTS.body, align: "right",
    });
  }
};

const addSlideFooter = (slide: pptxgen.Slide, theme: BrandTheme, hasPostmasterData: boolean = true) => {
  const src = hasPostmasterData
    ? "Source: Campaign Performance + Postmaster Data | Generated via Inbox Diagnostics"
    : "Source: Campaign Performance Data | Generated via Inbox Diagnostics";
  slide.addText(src, {
    x: 0.5, y: 5.2, w: 8.5, h: 0.3,
    fontSize: 9, color: theme.footerColor, fontFace: FONTS.body,
  });
};

const headerCellOpts = (theme: BrandTheme, align: "left" | "right" | "center" = "left"): pptxgen.TableCellProps => ({
  bold: true,
  fill: { color: theme.headerBg },
  fontSize: 9,
  align,
  color: theme.titleColor,
  fontFace: FONTS.body,
});

const bodyCellOpts = (
  theme: BrandTheme,
  rowIdx: number,
  align: "left" | "right" | "center" = "left",
  color?: string
): pptxgen.TableCellProps => ({
  fontSize: 9,
  align,
  color: color || theme.bodyColor,
  fontFace: FONTS.body,
  fill: rowIdx % 2 === 1 ? { color: theme.altRowBg } : undefined,
});

// ============= INFRASTRUCTURE EXTRACTION =============

const extractInfrastructure = (
  campaignData: CampaignRow[],
  postmasterData: PostmasterRow[] | null
): { domains: InfrastructureDomain[]; ips: InfrastructureIP[] } => {
  const domainMap = new Map<string, InfrastructureDomain>();
  const ipMap = new Map<string, InfrastructureIP>();

  // Extract domains from campaign data
  campaignData.forEach(c => {
    const provider = c.providerName || c.serviceProvider || "";
    if (provider && !domainMap.has(provider)) {
      domainMap.set(provider, { domain: provider, provider: c.serviceProvider, reputation: "N/A" });
    }
  });

  // Enrich with postmaster data
  if (postmasterData) {
    postmasterData.forEach(p => {
      if (p.domain) {
        domainMap.set(p.domain, {
          domain: p.domain,
          provider: domainMap.get(p.domain)?.provider || "",
          reputation: p.domainReputation || "N/A",
        });
      }
      if (p.sampleIps) {
        p.sampleIps.split(",").map(ip => ip.trim()).filter(Boolean).forEach(ip => {
          ipMap.set(ip, { ip, reputation: p.ipReputation || "N/A" });
        });
      }
    });
  }

  return {
    domains: Array.from(domainMap.values()),
    ips: Array.from(ipMap.values()),
  };
};

// ============= MAIN EXPORT FUNCTION =============

export const exportDiagnosticsToPPT = async (opts: DiagnosticsDeckOptions) => {
  const {
    diagnostics,
    brandName = "Campaign",
    brandProfile,
    signalHealthData,
    rootCauseEntries,
    intelligentLearnings,
    industry,
  } = opts;

  const theme = buildBrandTheme(brandProfile, industry);
  const hasPostmasterData = !!diagnostics.postmasterData && diagnostics.postmasterData.length > 0;

  const pptx = new pptxgen();
  pptx.author = "Inbox Diagnostics";
  pptx.title = `${brandName} – Email Diagnostics Executive Deck`;
  pptx.subject = "Email Campaign Performance Analysis";
  pptx.company = brandProfile?.brand_identity?.brand_name || "Inbox Alchemy";
  pptx.defineLayout({ name: "WIDESCREEN", width: 10, height: 5.625 });
  pptx.layout = "WIDESCREEN";

  const report = diagnostics.analysisReport;
  if (!report) {
    // Fallback: empty deck
    const s = pptx.addSlide();
    s.addText("No analysis report data available", { x: 2, y: 2, w: 6, h: 1, fontSize: 20, color: theme.mutedColor });
    await pptx.writeFile({ fileName: `Inbox_Diagnostics_${brandName}_Report.pptx` });
    return;
  }

  const monthRange = getMonthRange(report);
  let slideNum = 0;

  // ==========================================
  // SLIDE 0: Cover Slide
  // ==========================================
  {
    const s0 = pptx.addSlide();
    // Gradient background using brand primary
    s0.background = { color: theme.primary };
    // Overlay for depth
    s0.addShape("rect" as pptxgen.SHAPE_NAME, {
      x: 0, y: 0, w: 10, h: 5.625,
      fill: { color: theme.secondary, transparency: 70 },
    });
    // Soft radial glow
    s0.addShape("ellipse" as pptxgen.SHAPE_NAME, {
      x: 5, y: 1.5, w: 8, h: 4,
      fill: { color: theme.accent, transparency: 85 },
    });

    // Brand logo placeholder (rounded rect)
    s0.addShape("roundRect" as pptxgen.SHAPE_NAME, {
      x: 3.75, y: 0.6, w: 2.5, h: 1.2,
      fill: { color: "FFFFFF", transparency: 80 },
      line: { color: "FFFFFF", width: 1.5, dashType: "dash" },
      rectRadius: 0.15,
    });
    s0.addText("LOGO", {
      x: 3.75, y: 0.6, w: 2.5, h: 1.2,
      fontSize: 14, color: "FFFFFF", fontFace: FONTS.body,
      align: "center", valign: "middle", transparency: 50,
    });

    // Deck title
    const deckBrandName = brandProfile?.brand_identity?.brand_name || brandName || "Email";
    s0.addText(`${deckBrandName}\nEmail Diagnostics`, {
      x: 0.5, y: 2.1, w: 9, h: 1.4,
      fontSize: 36, bold: true, color: "FFFFFF",
      fontFace: FONTS.headline, align: "center", valign: "middle",
      lineSpacingMultiple: 1.2,
    });

    // Subtitle
    s0.addText("Executive Performance Report", {
      x: 0.5, y: 3.4, w: 9, h: 0.5,
      fontSize: 16, color: "FFFFFF", fontFace: FONTS.body,
      align: "center", transparency: 20,
    });

    // Date range
    if (monthRange) {
      s0.addText(monthRange, {
        x: 0.5, y: 4.1, w: 9, h: 0.4,
        fontSize: 13, color: "FFFFFF", fontFace: FONTS.body,
        align: "center", transparency: 35,
      });
    }

    // Bottom accent line
    s0.addShape("rect" as pptxgen.SHAPE_NAME, {
      x: 3, y: 4.8, w: 4, h: 0.04,
      fill: { color: "FFFFFF", transparency: 50 },
    });

    // Footer
    s0.addText("Generated via Inbox Diagnostics", {
      x: 0.5, y: 5.0, w: 9, h: 0.3,
      fontSize: 9, color: "FFFFFF", fontFace: FONTS.body,
      align: "center", transparency: 50,
    });
  }

  // ==========================================
  // SLIDE 1: Campaign Overview by Provider
  // ==========================================
  slideNum++;
  const s1 = pptx.addSlide();
  addSlideBackground(s1, theme);
  addSlideHeader(s1, "Campaign Overview by Provider", theme, monthRange, slideNum);

  const useDelivered = report.providerAggregates[0]?.useDeliveredAsDenominator;

  // Build provider columns matching UI exactly
  const provHeaders: string[] = ["Provider", "Sent"];
  if (useDelivered) provHeaders.push("Delivered");
  provHeaders.push("Unique Open", "Open %", "Unique Clicked", "Click %", "Bounces", "Unsubs");

  const provHeaderRow: pptxgen.TableCell[] = provHeaders.map((h, i) => ({
    text: h,
    options: headerCellOpts(theme, i === 0 ? "left" : "right"),
  }));

  const provDataRows: pptxgen.TableRow[] = [provHeaderRow];
  const totals = { sent: 0, delivered: 0, viewed: 0, clicked: 0, bounces: 0, unsubs: 0 };

  report.providerAggregates.forEach((p, ri) => {
    totals.sent += p.totalSentUsers;
    totals.delivered += p.totalDeliveredUsers;
    totals.viewed += p.uniqueViewed;
    totals.clicked += p.uniqueClicked;
    totals.bounces += p.hardBounces + p.softBounces;
    totals.unsubs += p.unsubscribes;

    const row: pptxgen.TableCell[] = [
      { text: `${p.serviceProvider} / ${p.providerName}`, options: bodyCellOpts(theme, ri) },
      { text: formatNumber(p.totalSentUsers), options: bodyCellOpts(theme, ri, "right") },
    ];
    if (useDelivered) row.push({ text: formatNumber(p.totalDeliveredUsers), options: bodyCellOpts(theme, ri, "right") });
    row.push(
      { text: formatNumber(p.uniqueViewed), options: bodyCellOpts(theme, ri, "right") },
      { text: formatPercent(p.viewPercent), options: bodyCellOpts(theme, ri, "right", getMetricColor(p.viewPercent, "openRate", theme)) },
      { text: formatNumber(p.uniqueClicked), options: bodyCellOpts(theme, ri, "right") },
      { text: formatPercent(p.clickPercent), options: bodyCellOpts(theme, ri, "right", getMetricColor(p.clickPercent, "clickRate", theme)) },
      { text: formatNumber(p.hardBounces + p.softBounces), options: bodyCellOpts(theme, ri, "right") },
      { text: formatNumber(p.unsubscribes), options: bodyCellOpts(theme, ri, "right") },
    );
    provDataRows.push(row);
  });

  // Grand Total row
  const denom = useDelivered ? totals.delivered : totals.sent;
  const gtRow: pptxgen.TableCell[] = [
    { text: "Grand Total", options: { bold: true, fontSize: 9, fill: { color: theme.headerBg }, fontFace: FONTS.body } },
    { text: formatNumber(totals.sent), options: { bold: true, fontSize: 9, align: "right", fill: { color: theme.headerBg }, fontFace: FONTS.body } },
  ];
  if (useDelivered) gtRow.push({ text: formatNumber(totals.delivered), options: { bold: true, fontSize: 9, align: "right", fill: { color: theme.headerBg }, fontFace: FONTS.body } });
  gtRow.push(
    { text: formatNumber(totals.viewed), options: { bold: true, fontSize: 9, align: "right", fill: { color: theme.headerBg }, fontFace: FONTS.body } },
    { text: formatPercent(denom > 0 ? (totals.viewed / denom) * 100 : 0), options: { bold: true, fontSize: 9, align: "right", fill: { color: theme.headerBg }, color: getMetricColor(denom > 0 ? (totals.viewed / denom) * 100 : 0, "openRate", theme), fontFace: FONTS.body } },
    { text: formatNumber(totals.clicked), options: { bold: true, fontSize: 9, align: "right", fill: { color: theme.headerBg }, fontFace: FONTS.body } },
    { text: formatPercent(denom > 0 ? (totals.clicked / denom) * 100 : 0), options: { bold: true, fontSize: 9, align: "right", fill: { color: theme.headerBg }, color: getMetricColor(denom > 0 ? (totals.clicked / denom) * 100 : 0, "clickRate", theme), fontFace: FONTS.body } },
    { text: formatNumber(totals.bounces), options: { bold: true, fontSize: 9, align: "right", fill: { color: theme.headerBg }, fontFace: FONTS.body } },
    { text: formatNumber(totals.unsubs), options: { bold: true, fontSize: 9, align: "right", fill: { color: theme.headerBg }, fontFace: FONTS.body } },
  );
  provDataRows.push(gtRow);

  const baseCols = useDelivered ? 9 : 8;
  const colWidths1 = useDelivered
    ? [2.0, 0.85, 0.85, 0.85, 0.7, 0.85, 0.7, 0.7, 0.7]
    : [2.2, 0.95, 0.95, 0.8, 0.95, 0.8, 0.85, 0.85];

  s1.addTable(provDataRows, {
    x: 0.5, y: 1.15, w: 9,
    colW: colWidths1,
    border: { type: "solid", color: lighten(theme.primary, 0.85), pt: 0.5 },
    fontFace: FONTS.body,
  });

  s1.addText(`* Percentages use ${useDelivered ? "Delivered" : "Sent"} as denominator`, {
    x: 0.5, y: 4.9, w: 5, h: 0.2, fontSize: 8, italic: true, color: theme.mutedColor, fontFace: FONTS.body,
  });
  addSlideFooter(s1, theme, hasPostmasterData);

  // ==========================================
  // SLIDE 2: Monthly Overview
  // ==========================================
  slideNum++;
  const s2 = pptx.addSlide();
  addSlideBackground(s2, theme);
  addSlideHeader(s2, "Monthly Overview", theme, monthRange, slideNum);

  const monthlyData = report.monthlyOverview.filter(m => m.month !== "Unknown Date" || m.totalSentUsers > 0);
  const mUseDelivered = monthlyData[0]?.useDeliveredAsDenominator;

  const mHeaders: string[] = ["Month", "Campaigns", "Sent"];
  if (mUseDelivered) mHeaders.push("Delivered");
  mHeaders.push("Viewed", "View %", "Clicked", "Click %", "Unsubs", "Unsub %", "Hard %", "Soft %");

  const mHeaderRow: pptxgen.TableCell[] = mHeaders.map((h, i) => ({
    text: h,
    options: headerCellOpts(theme, i === 0 ? "left" : "right"),
  }));

  const mRows: pptxgen.TableRow[] = [mHeaderRow];
  monthlyData.forEach((m, ri) => {
    const row: pptxgen.TableCell[] = [
      { text: m.month, options: bodyCellOpts(theme, ri) },
      { text: String(m.campaignCount), options: bodyCellOpts(theme, ri, "right") },
      { text: formatNumber(m.totalSentUsers), options: bodyCellOpts(theme, ri, "right") },
    ];
    if (mUseDelivered) row.push({ text: formatNumber(m.totalDeliveredUsers), options: bodyCellOpts(theme, ri, "right") });
    row.push(
      { text: formatNumber(m.uniqueViewed), options: bodyCellOpts(theme, ri, "right") },
      { text: formatPercent(m.viewPercent), options: bodyCellOpts(theme, ri, "right", getMetricColor(m.viewPercent, "openRate", theme)) },
      { text: formatNumber(m.uniqueClicked), options: bodyCellOpts(theme, ri, "right") },
      { text: formatPercent(m.clickPercent), options: bodyCellOpts(theme, ri, "right", getMetricColor(m.clickPercent, "clickRate", theme)) },
      { text: formatNumber(m.unsubscribes), options: bodyCellOpts(theme, ri, "right") },
      { text: formatPercent(m.unsubscribePercent), options: bodyCellOpts(theme, ri, "right", getMetricColor(m.unsubscribePercent, "unsubscribeRate", theme)) },
      { text: formatPercent(m.hardBouncePercent), options: bodyCellOpts(theme, ri, "right", getMetricColor(m.hardBouncePercent, "bounceRate", theme)) },
      { text: formatPercent(m.softBouncePercent), options: bodyCellOpts(theme, ri, "right", getMetricColor(m.softBouncePercent, "bounceRate", theme)) },
    );
    mRows.push(row);
  });

  const numMCols = mHeaders.length;
  const mColW = mUseDelivered
    ? [1.1, 0.65, 0.7, 0.7, 0.65, 0.6, 0.65, 0.6, 0.55, 0.6, 0.55, 0.55]
    : [1.2, 0.7, 0.8, 0.75, 0.7, 0.75, 0.7, 0.65, 0.65, 0.65, 0.65];

  s2.addTable(mRows, {
    x: 0.5, y: 1.15, w: 9,
    colW: mColW,
    border: { type: "solid", color: lighten(theme.primary, 0.85), pt: 0.5 },
    fontFace: FONTS.body,
  });
  addSlideFooter(s2, theme, hasPostmasterData);

  // ==========================================
  // SLIDE 3: Email Metrics Trend (Chart)
  // ==========================================
  slideNum++;
  const s3 = pptx.addSlide();
  addSlideBackground(s3, theme);
  addSlideHeader(s3, "Email Metrics Trend", theme, monthRange, slideNum);

  // Build chart data from monthly overview
  const chartLabels = monthlyData.map(m => m.month);
  const openRateData = monthlyData.map(m => m.viewPercent);
  const clickRateData = monthlyData.map(m => m.clickPercent);
  const unsubRateData = monthlyData.map(m => m.unsubscribePercent);
  const bounceRateData = monthlyData.map(m => m.hardBouncePercent + m.softBouncePercent);

  if (chartLabels.length > 0) {
    s3.addChart("line" as pptxgen.CHART_NAME, [
      { name: "Open Rate %", labels: chartLabels, values: openRateData },
      { name: "Click Rate %", labels: chartLabels, values: clickRateData },
      { name: "Unsub Rate %", labels: chartLabels, values: unsubRateData },
      { name: "Bounce Rate %", labels: chartLabels, values: bounceRateData },
    ], {
      x: 0.5, y: 1.15, w: 9, h: 3.8,
      showLegend: true, legendPos: "b", legendFontSize: 9,
      lineSmooth: true,
      lineSize: 2,
      showValue: false,
      catAxisLabelFontSize: 8,
      valAxisLabelFontSize: 8,
      catGridLine: { style: "none" } as pptxgen.OptsChartGridLine,
      valGridLine: { color: lighten(theme.primary, 0.88), style: "dash" } as pptxgen.OptsChartGridLine,
      chartColors: [theme.primary, theme.secondary, theme.amber, theme.red],
    });
  } else {
    s3.addText("No monthly data available for trend chart", {
      x: 2, y: 2.5, w: 6, h: 0.5, fontSize: 14, color: theme.mutedColor, fontFace: FONTS.body, align: "center",
    });
  }
  addSlideFooter(s3, theme, hasPostmasterData);

  // ==========================================
  // SLIDE 4: Infrastructure Details
  // ==========================================
  slideNum++;
  const s4 = pptx.addSlide();
  addSlideBackground(s4, theme);
  addSlideHeader(s4, "Infrastructure Details", theme, undefined, slideNum);

  const infra = extractInfrastructure(diagnostics.rawData, diagnostics.postmasterData);

  // Domain Details table (left)
  if (infra.domains.length > 0) {
    s4.addText("Domain Details", {
      x: 0.5, y: 1.1, w: 4, h: 0.3,
      fontSize: 12, bold: true, color: theme.titleColor, fontFace: FONTS.headline,
    });

    const domRows: pptxgen.TableRow[] = [
      [
        { text: "Domain", options: headerCellOpts(theme) },
        { text: "Provider", options: headerCellOpts(theme) },
        { text: "Reputation", options: headerCellOpts(theme, "center") },
      ],
    ];
    infra.domains.slice(0, 6).forEach((d, ri) => {
      domRows.push([
        { text: d.domain, options: bodyCellOpts(theme, ri) },
        { text: d.provider, options: bodyCellOpts(theme, ri) },
        { text: d.reputation, options: bodyCellOpts(theme, ri, "center", getReputationColor(d.reputation, theme)) },
      ]);
    });

    // Glass-style card border
    s4.addShape("roundRect" as pptxgen.SHAPE_NAME, {
      x: 0.4, y: 1.45, w: 4.3, h: 0.35 * (domRows.length + 0.5),
      fill: { color: theme.slideBg, transparency: 60 },
      line: { color: lighten(theme.primary, 0.8), width: 0.75 },
      rectRadius: 0.1,
    });

    s4.addTable(domRows, {
      x: 0.5, y: 1.5, w: 4,
      colW: [1.6, 1.4, 1.0],
      border: { type: "solid", color: lighten(theme.primary, 0.85), pt: 0.5 },
      fontFace: FONTS.body,
    });
  }

  // IP Details table (right)
  if (infra.ips.length > 0) {
    s4.addText("IP Details", {
      x: 5.3, y: 1.1, w: 4, h: 0.3,
      fontSize: 12, bold: true, color: theme.titleColor, fontFace: FONTS.headline,
    });

    const ipRows: pptxgen.TableRow[] = [
      [
        { text: "IP Address", options: headerCellOpts(theme) },
        { text: "Reputation", options: headerCellOpts(theme, "center") },
      ],
    ];
    infra.ips.slice(0, 8).forEach((ip, ri) => {
      ipRows.push([
        { text: ip.ip, options: bodyCellOpts(theme, ri) },
        { text: ip.reputation, options: bodyCellOpts(theme, ri, "center", getReputationColor(ip.reputation, theme)) },
      ]);
    });

    s4.addShape("roundRect" as pptxgen.SHAPE_NAME, {
      x: 5.2, y: 1.45, w: 4.3, h: 0.35 * (ipRows.length + 0.5),
      fill: { color: theme.slideBg, transparency: 60 },
      line: { color: lighten(theme.primary, 0.8), width: 0.75 },
      rectRadius: 0.1,
    });

    s4.addTable(ipRows, {
      x: 5.3, y: 1.5, w: 4,
      colW: [2.5, 1.5],
      border: { type: "solid", color: lighten(theme.primary, 0.85), pt: 0.5 },
      fontFace: FONTS.body,
    });
  }

  if (infra.domains.length === 0 && infra.ips.length === 0) {
    s4.addText("No infrastructure data available. Upload Postmaster data for domain & IP details.", {
      x: 1, y: 2.5, w: 8, h: 0.5, fontSize: 12, color: theme.mutedColor, fontFace: FONTS.body, align: "center",
    });
  }
  addSlideFooter(s4, theme, hasPostmasterData);

  // ==========================================
  // SLIDE 5: Reputation Scorecard
  // ==========================================
  slideNum++;
  const s5 = pptx.addSlide();
  addSlideBackground(s5, theme);
  addSlideHeader(s5, "Reputation Scorecard", theme, undefined, slideNum);

  if (signalHealthData && signalHealthData.length > 0) {
    const shRows: pptxgen.TableRow[] = [
      [
        { text: "Signal", options: headerCellOpts(theme) },
        { text: "Current Value", options: headerCellOpts(theme, "center") },
        { text: "Status", options: headerCellOpts(theme, "center") },
      ],
    ];

    signalHealthData.forEach((s, ri) => {
      const statusColor = s.status === "healthy" ? theme.green
        : s.status === "warning" ? theme.amber
        : s.status === "risk" || s.status === "breached" || s.status === "critical" ? theme.red
        : theme.mutedColor;

      shRows.push([
        { text: s.metric, options: bodyCellOpts(theme, ri) },
        { text: s.currentValue, options: bodyCellOpts(theme, ri, "center") },
        { text: s.status.charAt(0).toUpperCase() + s.status.slice(1), options: bodyCellOpts(theme, ri, "center", statusColor) },
      ]);
    });

    s5.addTable(shRows, {
      x: 1.5, y: 1.15, w: 7,
      colW: [3.0, 2.0, 2.0],
      border: { type: "solid", color: lighten(theme.primary, 0.85), pt: 0.5 },
      fontFace: FONTS.body,
    });

    // RAG legend
    s5.addText("● Healthy  ● Warning  ● Risk", {
      x: 1.5, y: 4.6, w: 7, h: 0.25, fontSize: 9, color: theme.mutedColor, fontFace: FONTS.body,
    });
  } else {
    s5.addText("Signal health data not available. Generate from campaign + postmaster data.", {
      x: 1, y: 2.5, w: 8, h: 0.5, fontSize: 12, color: theme.mutedColor, fontFace: FONTS.body, align: "center",
    });
  }
  addSlideFooter(s5, theme, hasPostmasterData);

  // ==========================================
  // SLIDE 6: Reputation Trends (Charts)
  // ==========================================
  slideNum++;
  const s6 = pptx.addSlide();
  addSlideBackground(s6, theme);
  addSlideHeader(s6, "Reputation Trends", theme, undefined, slideNum);

  if (diagnostics.postmasterData && diagnostics.postmasterData.length > 0) {
    const pmData = diagnostics.postmasterData;
    const pmDates = pmData.map(p => p.date);
    const spamData = pmData.map(p => (p.spamRatio || 0) * 100);
    const errorData = pmData.map(p => (p.errorRatio || 0) * 100);

    // 2-chart layout
    // Chart 1: Spam & Error Ratios
    s6.addChart("line" as pptxgen.CHART_NAME, [
      { name: "Spam Ratio %", labels: pmDates, values: spamData },
      { name: "Error Ratio %", labels: pmDates, values: errorData },
    ], {
      x: 0.5, y: 1.15, w: 4.2, h: 3.5,
      showLegend: true, legendPos: "b", legendFontSize: 8,
      lineSmooth: true, lineSize: 2,
      catAxisLabelFontSize: 7,
      valAxisLabelFontSize: 7,
      catGridLine: { style: "none" } as pptxgen.OptsChartGridLine,
      valGridLine: { color: lighten(theme.primary, 0.88), style: "dash" } as pptxgen.OptsChartGridLine,
      chartColors: [theme.red, theme.amber],
      showTitle: true, title: "Spam & Error Ratios", titleFontSize: 10, titleColor: theme.titleColor,
    });

    // Chart 2: IP count trend
    const ipCounts = pmData.map(p => p.ipCount || 0);
    s6.addChart("bar" as pptxgen.CHART_NAME, [
      { name: "IP Count", labels: pmDates, values: ipCounts },
    ], {
      x: 5.3, y: 1.15, w: 4.2, h: 3.5,
      showLegend: true, legendPos: "b", legendFontSize: 8,
      catAxisLabelFontSize: 7,
      valAxisLabelFontSize: 7,
      catGridLine: { style: "none" } as pptxgen.OptsChartGridLine,
      valGridLine: { color: lighten(theme.primary, 0.88), style: "dash" } as pptxgen.OptsChartGridLine,
      chartColors: [theme.primary],
      showTitle: true, title: "IP Count Trend", titleFontSize: 10, titleColor: theme.titleColor,
    });
  } else {
    s6.addText("Postmaster data required for reputation trend charts.", {
      x: 1, y: 2.5, w: 8, h: 0.5, fontSize: 12, color: theme.mutedColor, fontFace: FONTS.body, align: "center",
    });
  }
  addSlideFooter(s6, theme, hasPostmasterData);

  // ==========================================
  // SLIDE 7: Root Cause Summary
  // ==========================================
  slideNum++;
  const s7 = pptx.addSlide();
  addSlideBackground(s7, theme);
  addSlideHeader(s7, "Root Cause Summary", theme, undefined, slideNum);

  if (rootCauseEntries && rootCauseEntries.length > 0) {
    const cardY = 1.3;
    const cardW = 4.2;
    const cardH = 1.8;

    rootCauseEntries.slice(0, 4).forEach((rc, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 0.5 + col * 4.7;
      const y = cardY + row * 2.0;

      // Card border with brand accent stripe
      s7.addShape("roundRect" as pptxgen.SHAPE_NAME, {
        x, y, w: cardW, h: cardH,
        fill: { color: theme.slideBg },
        line: { color: lighten(theme.primary, 0.75), width: 0.75 },
        rectRadius: 0.08,
      });

      // Left accent stripe
      s7.addShape("rect" as pptxgen.SHAPE_NAME, {
        x, y, w: 0.06, h: cardH,
        fill: { color: theme.primary },
      });

      // Priority badge
      const priority = rc.priority || "P1";
      const prioColor = priority === "P0" ? theme.red : priority === "P1" ? theme.amber : theme.green;
      s7.addText(priority, {
        x: x + 0.15, y: y + 0.08, w: 0.4, h: 0.25,
        fontSize: 8, bold: true, color: prioColor, fontFace: FONTS.body,
      });

      // Root cause text
      s7.addText(rc.cause, {
        x: x + 0.15, y: y + 0.35, w: cardW - 0.3, h: 0.6,
        fontSize: 10, bold: true, color: theme.titleColor, fontFace: FONTS.body,
        valign: "top",
      });

      // Evidence
      s7.addText(rc.evidence, {
        x: x + 0.15, y: y + 0.95, w: cardW - 0.3, h: 0.75,
        fontSize: 8, color: theme.mutedColor, fontFace: FONTS.body,
        valign: "top",
      });
    });
  } else {
    s7.addText("No root causes detected — signals within healthy thresholds.", {
      x: 1, y: 2.5, w: 8, h: 0.5, fontSize: 12, color: theme.green, fontFace: FONTS.body, align: "center",
    });
  }
  addSlideFooter(s7, theme, hasPostmasterData);

  // ==========================================
  // SLIDES 8 & 9: Best & Underperforming Campaigns
  // ==========================================
  const createCampaignHeader = (): pptxgen.TableRow =>
    ["Start Date", "Campaign Name", "Subject Line", "Sent", "Unique Open", "Open %", "Unique Clicked", "Click %", "Unique CTR"]
      .map((h, i) => ({
        text: h,
        options: headerCellOpts(theme, i < 3 ? "left" : "right"),
      }));

  const createCampaignRow = (c: TopCampaign, ri: number): pptxgen.TableRow => {
    const d = c.totalDeliveredUsers > 0 ? c.totalDeliveredUsers : c.totalSentUsers;
    const uniqueCTR = c.uniqueViewed > 0 ? (c.uniqueClicked / c.uniqueViewed) * 100 : 0;
    return [
      { text: c.startDate || "—", options: bodyCellOpts(theme, ri) },
      { text: c.campaignName || "", options: bodyCellOpts(theme, ri) },
      { text: cleanSubjectLine(c.subjectLine), options: bodyCellOpts(theme, ri) },
      { text: formatNumber(c.totalSentUsers), options: bodyCellOpts(theme, ri, "right") },
      { text: formatNumber(c.uniqueViewed), options: bodyCellOpts(theme, ri, "right") },
      { text: formatPercent(c.openRate), options: bodyCellOpts(theme, ri, "right", getMetricColor(c.openRate, "openRate", theme)) },
      { text: formatNumber(c.uniqueClicked), options: bodyCellOpts(theme, ri, "right") },
      { text: formatPercent(c.clickRate), options: bodyCellOpts(theme, ri, "right", getMetricColor(c.clickRate, "clickRate", theme)) },
      { text: formatPercent(uniqueCTR), options: bodyCellOpts(theme, ri, "right", getMetricColor(uniqueCTR, "clickRate", theme)) },
    ];
  };

  const campaignColW = [0.7, 1.6, 2.0, 0.6, 0.7, 0.6, 0.7, 0.6, 0.6];
  const MAX_CAMP_ROWS = 7;

  const addCampaignSlides = (
    campaigns: TopCampaign[],
    title: string,
    summaryText: string,
    accentColor: string,
    isUnderperform: boolean = false
  ) => {
    const totalSlides = Math.max(1, Math.ceil(campaigns.length / MAX_CAMP_ROWS));

    for (let si = 0; si < totalSlides; si++) {
      slideNum++;
      const slide = pptx.addSlide();
      addSlideBackground(slide, theme);

      const slideTitle = totalSlides > 1 ? `${title} (${si + 1}/${totalSlides})` : title;
      addSlideHeader(slide, slideTitle, theme, undefined, slideNum);

      // Amber outline for underperforming
      if (isUnderperform) {
        slide.addShape("roundRect" as pptxgen.SHAPE_NAME, {
          x: 0.4, y: 0.2, w: 9.2, h: 0.85,
          fill: { color: theme.slideBg, transparency: 100 },
          line: { color: theme.amber, width: 1 },
          rectRadius: 0.06,
        });
      }

      const startIdx = si * MAX_CAMP_ROWS;
      const slicedCamps = campaigns.slice(startIdx, startIdx + MAX_CAMP_ROWS);

      const rows: pptxgen.TableRow[] = [createCampaignHeader()];
      slicedCamps.forEach((c, ri) => rows.push(createCampaignRow(c, ri)));

      slide.addTable(rows, {
        x: 0.35, y: 1.1, w: 9.3,
        colW: campaignColW,
        border: { type: "solid", color: lighten(theme.primary, 0.85), pt: 0.5 },
        fontFace: FONTS.body,
        autoPage: false,
      });

      // Summary on last slide
      if (si === totalSlides - 1 && summaryText) {
        const tableH = 0.35 + rows.length * 0.28;
        slide.addText(summaryText, {
          x: 0.5, y: 1.1 + tableH + 0.1, w: 9, h: 0.5,
          fontSize: 9, italic: true, color: theme.mutedColor, fontFace: FONTS.body,
        });
      }

      addSlideFooter(slide, theme, hasPostmasterData);
    }
  };

  addCampaignSlides(report.bestCampaigns, "Best Performing Campaigns", report.bestSummary, theme.green);
  addCampaignSlides(report.worstCampaigns, "Underperforming Campaigns", report.worstSummary, theme.red, true);

  // ==========================================
  // SLIDE 10: Send Mix & Use Case Coverage
  // ==========================================
  slideNum++;
  const s10 = pptx.addSlide();
  addSlideBackground(s10, theme);
  addSlideHeader(s10, "Send Mix & Use Case Coverage", theme, undefined, slideNum);

  const enhRep = diagnostics.reputationReport?.enhancedReport;
  if (enhRep?.sendMixAnalysis) {
    const mix = enhRep.sendMixAnalysis;
    const mixTypes = ["Transactional", "Lifecycle", "Promotional"];
    const mixValues = [mix.transactionalPercent, mix.lifecyclePercent, mix.promotionalPercent];

    // Mix table
    const mixHeaderRow: pptxgen.TableCell[] = [
      { text: "", options: headerCellOpts(theme) },
      ...mixTypes.map(t => ({ text: t, options: headerCellOpts(theme, "center" as const) })),
    ];

    const mixValueRow: pptxgen.TableCell[] = [
      { text: "Mix %", options: { fontSize: 10, bold: true, fontFace: FONTS.body, color: theme.bodyColor } },
      ...mixValues.map((v, i) => ({
        text: `${v.toFixed(1)}%`,
        options: {
          fontSize: 12, bold: true, align: "center" as const, fontFace: FONTS.body,
          color: i === 2 && v > 60 ? theme.red : i === 2 && v > 40 ? theme.amber : theme.green,
        },
      })),
    ];

    const getStatus = (type: string): { text: string; color: string } => {
      const tl = type.toLowerCase();
      if (mix.overweightedTypes.includes(tl)) return { text: "Overweighted", color: theme.red };
      if (mix.underutilizedAbsorbers.includes(tl)) return { text: "Underutilized", color: theme.amber };
      return { text: "Balanced", color: theme.green };
    };

    const statusRow: pptxgen.TableCell[] = [
      { text: "Status", options: { fontSize: 10, bold: true, fontFace: FONTS.body, color: theme.bodyColor } },
      ...mixTypes.map(t => {
        const st = getStatus(t);
        return { text: st.text, options: { fontSize: 10, align: "center" as const, color: st.color, fontFace: FONTS.body } };
      }),
    ];

    s10.addTable([mixHeaderRow, mixValueRow, statusRow], {
      x: 1.5, y: 1.4, w: 7,
      colW: [1.2, 1.9, 1.9, 1.9],
      border: { type: "solid", color: lighten(theme.primary, 0.85), pt: 0.5 },
      fontFace: FONTS.body,
    });

    // Visual bar
    const barY = 3.4;
    let cx = 1.5;
    const barW = 7;
    const barColors = [theme.green, theme.amber, theme.red];
    mixValues.forEach((v, i) => {
      const w = (v / 100) * barW;
      if (w > 0.05) {
        s10.addShape("rect" as pptxgen.SHAPE_NAME, {
          x: cx, y: barY, w, h: 0.35,
          fill: { color: barColors[i] },
        });
        cx += w;
      }
    });

    s10.addText("■ Transactional  ■ Lifecycle  ■ Promotional", {
      x: 1.5, y: 3.85, w: 7, h: 0.25,
      fontSize: 8, color: theme.mutedColor, fontFace: FONTS.body,
    });

    // Confidence
    const confColor = mix.classificationConfidence === "high" ? theme.green : mix.classificationConfidence === "medium" ? theme.amber : theme.red;
    s10.addText(`Classification Confidence: ${mix.classificationConfidence.toUpperCase()}`, {
      x: 1.5, y: 4.2, w: 4, h: 0.25,
      fontSize: 9, color: confColor, fontFace: FONTS.body,
    });
  } else {
    s10.addText("Send mix analysis requires reputation data generation.", {
      x: 1, y: 2.5, w: 8, h: 0.5, fontSize: 12, color: theme.mutedColor, fontFace: FONTS.body, align: "center",
    });
  }
  addSlideFooter(s10, theme, hasPostmasterData);

  // ==========================================
  // SLIDE 11: Lifecycle Coverage Matrix
  // ==========================================
  slideNum++;
  const s11 = pptx.addSlide();
  addSlideBackground(s11, theme);
  addSlideHeader(s11, "Lifecycle Coverage Matrix", theme, undefined, slideNum);

  // Build a simplified lifecycle stage distribution from campaign data
  const stageKeywords: Record<string, string[]> = {
    Onboarding: ["welcome", "onboard", "getting started", "verify", "activation"],
    Engagement: ["engage", "newsletter", "weekly", "digest", "update", "content"],
    Conversion: ["offer", "discount", "promo", "sale", "deal", "buy", "purchase", "upgrade"],
    Retention: ["retain", "renew", "comeback", "reactivate", "win-back", "winback", "miss you"],
    Referral: ["refer", "invite", "share", "friend"],
    Transactional: ["receipt", "confirm", "order", "invoice", "shipping", "deliver"],
  };

  const stageCounts: Record<string, number> = {};
  Object.keys(stageKeywords).forEach(s => { stageCounts[s] = 0; });

  diagnostics.rawData.forEach(c => {
    const text = `${c.campaignName} ${c.subjectLine} ${c.title}`.toLowerCase();
    let matched = false;
    for (const [stage, keywords] of Object.entries(stageKeywords)) {
      if (keywords.some(k => text.includes(k))) {
        stageCounts[stage]++;
        matched = true;
        break;
      }
    }
    if (!matched) stageCounts["Engagement"] = (stageCounts["Engagement"] || 0) + 1;
  });

  const totalCampaigns = diagnostics.rawData.length;
  const lcRows: pptxgen.TableRow[] = [
    [
      { text: "Lifecycle Stage", options: headerCellOpts(theme) },
      { text: "Campaign Count", options: headerCellOpts(theme, "center") },
      { text: "Coverage %", options: headerCellOpts(theme, "center") },
      { text: "Status", options: headerCellOpts(theme, "center") },
    ],
  ];

  Object.entries(stageCounts).forEach(([stage, count], ri) => {
    const pct = totalCampaigns > 0 ? (count / totalCampaigns) * 100 : 0;
    const status = pct > 15 ? "Strong" : pct > 5 ? "Partial" : "Weak";
    const statusColor = status === "Strong" ? theme.green : status === "Partial" ? theme.amber : theme.red;

    lcRows.push([
      { text: stage, options: bodyCellOpts(theme, ri) },
      { text: String(count), options: bodyCellOpts(theme, ri, "center") },
      { text: `${pct.toFixed(1)}%`, options: bodyCellOpts(theme, ri, "center") },
      { text: status, options: bodyCellOpts(theme, ri, "center", statusColor) },
    ]);
  });

  s11.addTable(lcRows, {
    x: 1, y: 1.15, w: 8,
    colW: [2.5, 1.5, 1.5, 2.5],
    border: { type: "solid", color: lighten(theme.primary, 0.85), pt: 0.5 },
    fontFace: FONTS.body,
  });
  addSlideFooter(s11, theme, hasPostmasterData);

  // ==========================================
  // SLIDE 12: Key Learnings & Recommendations
  // ==========================================
  slideNum++;
  const s12 = pptx.addSlide();
  addSlideBackground(s12, theme);
  addSlideHeader(s12, "Key Learnings & Recommendations", theme, undefined, slideNum);

  if (intelligentLearnings && intelligentLearnings.length > 0) {
    const klRows: pptxgen.TableRow[] = [
      [
        { text: "Issue Identified", options: headerCellOpts(theme) },
        { text: "Recommendation", options: headerCellOpts(theme) },
        { text: "Priority", options: headerCellOpts(theme, "center") },
      ],
    ];

    intelligentLearnings.slice(0, 8).forEach((rec, ri) => {
      const prioColor = rec.priority === "P0" ? theme.red : rec.priority === "P1" ? theme.amber : theme.primary;
      klRows.push([
        { text: rec.issue, options: { ...bodyCellOpts(theme, ri), valign: "top" } },
        { text: rec.recommendation, options: { ...bodyCellOpts(theme, ri), color: theme.mutedColor, valign: "top" } },
        { text: rec.priority, options: { ...bodyCellOpts(theme, ri, "center", prioColor), bold: true } },
      ]);
    });

    s12.addTable(klRows, {
      x: 0.5, y: 1.15, w: 9,
      colW: [3.2, 4.0, 1.8],
      border: { type: "solid", color: lighten(theme.primary, 0.85), pt: 0.5 },
      fontFace: FONTS.body,
    });
  } else {
    // Fallback to legacy learnings
    const allLearnings = report.keyLearnings;
    if (allLearnings.length > 0) {
      const klRows: pptxgen.TableRow[] = [
        [
          { text: "Learning", options: headerCellOpts(theme) },
          { text: "Details", options: headerCellOpts(theme) },
        ],
      ];
      allLearnings.slice(0, 8).forEach((l, ri) => {
        klRows.push([
          { text: l.title, options: bodyCellOpts(theme, ri) },
          { text: l.description, options: { ...bodyCellOpts(theme, ri), color: theme.mutedColor } },
        ]);
      });

      s12.addTable(klRows, {
        x: 0.5, y: 1.15, w: 9,
        colW: [3.5, 5.5],
        border: { type: "solid", color: lighten(theme.primary, 0.85), pt: 0.5 },
        fontFace: FONTS.body,
      });
    }
  }
  addSlideFooter(s12, theme, hasPostmasterData);

  // ============= GENERATE FILE =============
  const safeMonthRange = monthRange.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
  const brandLabel = brandProfile?.brand_identity?.brand_name || brandName;
  const fileName = `${brandLabel}_Diagnostics_Executive_${safeMonthRange || "Report"}.pptx`;

  await pptx.writeFile({ fileName });
};
