// Inbox Diagnostics PPT Export — 13-Slide Deck (PRD-aligned)
// Renders existing analysis output only — no recomputation
import pptxgen from "pptxgenjs";
import { buildExportFileName } from "./exportFileNameUtils";
import {
  DiagnosticsData,
  AnalysisReport,
  CampaignRow,
  PostmasterRow,
  MonthlyOverview,
  ProviderAggregate,
  TopCampaign,
} from "./csvAnalyzer";
import { CoreBrandJSON, BrandVisualAssets } from "@/types/brandProfile";
import { SectionInsights, TableInsight } from "./sectionInsightEngine";

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

interface InfrastructureDomain {
  domain: string;
  provider: string;
  reputation: string;
}

interface InfrastructureIP {
  ip: string;
  reputation: string;
}

interface CreativeAnalysisExport {
  effectivePractices: { area: string; practice: string }[];
  riskAreas: { area: string; observation: string; impact: string }[];
  improvements: string[];
}

interface LifecycleCoverageExport {
  stage: string;
  coverage: string; // "Strong" | "Partial" | "Weak"
  activeUseCases: number;
  totalUseCases: number;
  campaignCount: number;
}

export interface DiagnosticsDeckOptions {
  diagnostics: DiagnosticsData;
  brandName?: string;
  brandProfile?: CoreBrandJSON | null;
  signalHealthData?: SignalHealthExport[];
  intelligentLearnings?: IntelligentRecommendation[];
  industry?: string;
  sourceFileName?: string;
  creativeAnalysis?: CreativeAnalysisExport | null;
  creativeImage?: string | null;
  lifecycleCoverage?: LifecycleCoverageExport[];
  sectionInsights?: SectionInsights;
}

// ============= BRAND COLOR ENGINE =============

interface BrandTheme {
  primary: string;
  secondary: string;
  accent: string;
  headerBg: string;
  headerBgEnd: string;
  altRowBg: string;
  slideBg: string;
  bgAccent: string;
  titleColor: string;
  bodyColor: string;
  mutedColor: string;
  footerColor: string;
  green: string;
  amber: string;
  red: string;
}

const DEFAULT_THEME: BrandTheme = {
  primary: "4338CA",
  secondary: "7C3AED",
  accent: "A78BFA",
  headerBg: "EEF2FF",
  headerBgEnd: "F5F3FF",
  altRowBg: "FAFAFA",
  slideBg: "FFFFFF",
  bgAccent: "F5F3FF",
  titleColor: "1E1B4B",
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

const rgbToHex = (r: number, g: number, b: number): string =>
  [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join("");

const lighten = (hex: string, factor: number): string => {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * factor, g + (255 - g) * factor, b + (255 - b) * factor);
};

const desaturate = (hex: string, factor: number): string => {
  const { r, g, b } = hexToRgb(hex);
  const avg = (r + g + b) / 3;
  return rgbToHex(r + (avg - r) * factor, g + (avg - g) * factor, b + (avg - b) * factor);
};

const luminance = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

const hexClean = (color: string | undefined): string => {
  if (!color) return "";
  return color.replace(/^#/, "").trim();
};

const isValidHex = (hex: string): boolean => /^[0-9a-fA-F]{6}$/.test(hex);

const buildBrandTheme = (brandProfile?: CoreBrandJSON | null, industry?: string): BrandTheme => {
  const designProfile = brandProfile?.brand_design_profile;
  const brandColors = brandProfile?.brand_colors;

  let primary = "";
  let secondary = "";
  let accent = "";

  if (designProfile?.colors) {
    primary = hexClean(designProfile.colors.primary);
    secondary = hexClean(designProfile.colors.secondary);
    accent = hexClean(designProfile.colors.accent);
  }

  if (brandColors) {
    if (!isValidHex(primary)) primary = hexClean(brandColors.primary);
    if (!isValidHex(secondary)) secondary = hexClean(brandColors.secondary) || hexClean(brandColors.accent);
    if (!isValidHex(accent)) accent = hexClean(brandColors.accent);
  }

  if (!isValidHex(primary)) return DEFAULT_THEME;
  if (!isValidHex(secondary)) secondary = lighten(primary, 0.3);
  if (!isValidHex(accent)) accent = lighten(primary, 0.5);

  if (luminance(primary) > 0.75) primary = desaturate(primary, 0.15);

  let chartPrimary = primary;
  let chartSecondary = secondary;
  if (designProfile?.chart_palette) {
    const cp = designProfile.chart_palette;
    if (isValidHex(hexClean(cp.primary))) chartPrimary = hexClean(cp.primary);
    if (isValidHex(hexClean(cp.secondary))) chartSecondary = hexClean(cp.secondary);
  }

  const ind = (industry || brandProfile?.brand_identity?.industry || "").toLowerCase();
  const isFintech = ind.includes("fintech") || ind.includes("finance") || ind.includes("banking");

  const headerBg = lighten(primary, isFintech ? 0.88 : 0.92);
  const altRowBg = lighten(primary, 0.96);
  const titleColor = isFintech ? "0F172A" : lighten(primary, -0.4) || "1E1B4B";

  let textPrimary = "";
  if (designProfile?.colors?.text_primary) textPrimary = hexClean(designProfile.colors.text_primary);
  if (!isValidHex(textPrimary) && brandColors?.text_primary) textPrimary = hexClean(brandColors.text_primary);
  const resolvedTitleColor = isValidHex(textPrimary) ? textPrimary : (luminance(primary) < 0.3 ? primary : titleColor);

  return {
    ...DEFAULT_THEME,
    primary: chartPrimary !== primary ? primary : primary,
    secondary: chartSecondary !== secondary ? secondary : secondary,
    accent,
    headerBg,
    headerBgEnd: lighten(secondary, 0.92),
    altRowBg,
    bgAccent: lighten(secondary, 0.88),
    titleColor: resolvedTitleColor,
    bodyColor: isFintech ? "1E293B" : "374151",
  };
};

// ============= STYLE CONSTANTS =============

const FONTS = { headline: "Calibri", body: "Calibri" };

// ============= FIXED ZONE LAYOUT (EMU → inches) =============
// Slide: 10" × 5.625" (9,144,000 × 5,143,500 EMU)
// All data slides (2–11) use these four immovable zones.
// Accent line bottom = titleY(0.12) + 0.44 + 0.035 = 0.595"
// Fixed 16px (0.167") gap from accent line bottom to first content element.
const ZONE = {
  HEADER_Y: 0,                    // 0 EMU
  HEADER_H: 0.625,               // 571,500 EMU
  TABLE_Y: 0.762,                 // accent bottom (0.595) + 16px gap (0.167)
  TABLE_MAX_H: 3.401,             // from TABLE_Y to INSIGHT_Y
  INSIGHT_Y: 4.163,               // 3,806,190 EMU — fixed anchor
  INSIGHT_H: 1.012,               // 925,830 EMU
  INSIGHT_ROW_H: 0.22,            // single insight row height
  FOOTER_Y: 5.175,                // 4,731,990 EMU — anchored to bottom
  FOOTER_H: 0.45,                 // 411,480 EMU
} as const;

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    for (let j = 0; j < chunk.length; j++) binary += String.fromCharCode(chunk[j]);
  }
  return btoa(binary);
};

const detectMimeType = (buffer: ArrayBuffer): string => {
  const arr = new Uint8Array(buffer).subarray(0, 4);
  let header = "";
  for (let i = 0; i < arr.length; i++) header += arr[i].toString(16).padStart(2, "0");
  if (header.startsWith("89504e47")) return "image/png";
  if (header.startsWith("ffd8ff")) return "image/jpeg";
  if (header.startsWith("47494638")) return "image/gif";
  if (header.startsWith("52494646")) return "image/webp";
  if (header.startsWith("3c737667") || header.startsWith("3c3f786d")) return "image/svg+xml";
  return "image/png";
};

const fetchLogoAsBase64 = async (url: string): Promise<string | null> => {
  if (!url || url.length < 5) return null;
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength < 100) return null;
    const mime = detectMimeType(buffer);
    return `data:${mime};base64,${arrayBufferToBase64(buffer)}`;
  } catch {
    try {
      const resp2 = await fetch(url);
      if (!resp2.ok) return null;
      const buffer = await resp2.arrayBuffer();
      if (buffer.byteLength < 100) return null;
      const mime = detectMimeType(buffer);
      return `data:${mime};base64,${arrayBufferToBase64(buffer)}`;
    } catch { return null; }
  }
};

// ============= HELPER FUNCTIONS =============

/**
 * Sanitize text for PPTX XML safety:
 * - Remove invalid XML 1.0 characters (control chars except tab/newline/carriage-return)
 * - Remove unpaired surrogates that break XML serialization
 * - Strip emojis that may use surrogate pairs and cause corruption
 */
const sanitizeText = (text: string | null | undefined): string => {
  if (!text) return "";
  // Remove XML-invalid control characters (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F, 0x7F)
  let cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  // Remove characters outside the Basic Multilingual Plane (emojis, supplementary chars)
  // that use surrogate pairs and can corrupt PPTX XML
  cleaned = cleaned.replace(/[\uD800-\uDFFF]/g, "");
  // Also remove common emoji ranges that might slip through
  cleaned = cleaned.replace(/[\u{10000}-\u{10FFFF}]/gu, "");
  return cleaned;
};

const formatNumber = (num: number): string => {
  if (!isFinite(num) || isNaN(num)) return "0";
  return num.toLocaleString("en-US", { maximumFractionDigits: 0 });
};
const formatPercent = (num: number): string => {
  if (!isFinite(num) || isNaN(num)) return "0.00%";
  return `${num.toFixed(2)}%`;
};

const cleanSubjectLine = (subject: string): string => {
  if (!subject) return "";
  let cleaned = subject.replace(/^\{Subject:\s*/i, "").replace(/\}$/, "").trim();
  cleaned = cleaned.split('|')[0].trim();
  cleaned = cleaned.split(',Preheader:')[0].trim();
  return sanitizeText(cleaned);
};

type MetricType = "openRate" | "clickRate" | "bounceRate" | "unsubscribeRate";

const getMetricColor = (value: number, metricType: MetricType, theme: BrandTheme): string => {
  const v = Math.round(value * 100) / 100;
  switch (metricType) {
    case "openRate": return v > 25 ? theme.green : v > 10 ? theme.amber : theme.red;
    case "clickRate": return v > 3 ? theme.green : v > 1.5 ? theme.amber : theme.red;
    case "bounceRate": return v < 1 ? theme.green : v <= 3 ? theme.amber : theme.red;
    case "unsubscribeRate": return v < 0.3 ? theme.green : v <= 0.7 ? theme.amber : theme.red;
    default: return theme.bodyColor;
  }
};

const getMonthRange = (data: AnalysisReport | null): string => {
  if (!data || data.monthlyOverview.length === 0) return "";
  const months = data.monthlyOverview.map(m => m.month);
  if (months.length === 1) return months[0];
  return `${months[0]} – ${months[months.length - 1]}`;
};

const getReputationColor = (rep: string, theme: BrandTheme): string => {
  const r = (rep || "").toLowerCase();
  if (r === "high" || r === "healthy") return theme.green;
  if (r === "medium" || r === "warning" || r === "moderate") return theme.amber;
  if (r === "low" || r === "bad" || r === "risk" || r === "critical") return theme.red;
  return theme.mutedColor;
};

// ============= SLIDE HELPERS =============

const addDecorativeMotif = (slide: pptxgen.Slide, theme: BrandTheme, variant: "corner" | "side" | "diagonal" | "dots" = "corner") => {
  const motifColor = theme.accent;
  switch (variant) {
    case "corner":
      slide.addShape("ellipse" as pptxgen.SHAPE_NAME, { x: 7.5, y: -1.5, w: 4, h: 4, fill: { color: motifColor, transparency: 90 } });
      slide.addShape("ellipse" as pptxgen.SHAPE_NAME, { x: -0.5, y: 4.2, w: 2, h: 2, fill: { color: theme.primary, transparency: 92 } });
      break;
    case "side":
      slide.addShape("rect" as pptxgen.SHAPE_NAME, { x: 9.6, y: 0, w: 0.4, h: 5.625, fill: { color: motifColor, transparency: 80 } });
      slide.addShape("ellipse" as pptxgen.SHAPE_NAME, { x: 8.8, y: 4.5, w: 0.6, h: 0.6, fill: { color: theme.primary, transparency: 85 } });
      break;
    case "diagonal":
      slide.addShape("rect" as pptxgen.SHAPE_NAME, { x: 6.5, y: -1, w: 6, h: 1.2, fill: { color: motifColor, transparency: 92 }, rotate: -15 });
      slide.addShape("rect" as pptxgen.SHAPE_NAME, { x: 7, y: -0.3, w: 5.5, h: 0.6, fill: { color: theme.primary, transparency: 94 }, rotate: -15 });
      break;
    case "dots":
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          slide.addShape("ellipse" as pptxgen.SHAPE_NAME, { x: 8.2 + i * 0.5, y: 3.8 + j * 0.5, w: 0.15, h: 0.15, fill: { color: motifColor, transparency: 85 } });
        }
      }
      break;
  }
};

const motifVariants: Array<"corner" | "side" | "diagonal" | "dots"> = ["corner", "side", "diagonal", "dots"];

const addSlideBackground = (slide: pptxgen.Slide, theme: BrandTheme) => {
  slide.background = { color: theme.slideBg };
  slide.addShape("rect" as pptxgen.SHAPE_NAME, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: theme.bgAccent, transparency: 85 } });
};

/**
 * Universal header — identical on every data slide.
 * Elements: title (left), accent line (under title), date range (right).
 * Not rendered on title/thank-you slides.
 */
const addSlideHeader = (slide: pptxgen.Slide, title: string, theme: BrandTheme, monthRange?: string, _slideNumber?: number, opts?: { titleMaxW?: number; titleFontSize?: number }) => {
  // Title — left-aligned, font-weight 600, nowrap via fixed width
  const titleX = 0.35;
  const titleY = ZONE.HEADER_Y + 0.12;
  const titleW = opts?.titleMaxW ?? 7.0; // default 70%, or 80% for long titles
  const titleFontSize = opts?.titleFontSize ?? 22;
  // Auto-reduce font for very long titles (> ~45 chars) to prevent wrapping
  const effectiveFontSize = title.length > 50 ? Math.min(titleFontSize, 18) : title.length > 45 ? Math.min(titleFontSize, 20) : titleFontSize;
  slide.addText(title, {
    x: titleX, y: titleY, w: titleW, h: 0.42,
    fontSize: effectiveFontSize, fontFace: FONTS.headline, color: theme.titleColor, bold: true,
    autoFit: true,
  });

  // Accent line — short bar under title, ~40-50% of title text width
  const accentW = Math.min(title.length * 0.11, titleW * 0.5, 3.0);
  slide.addShape("roundRect" as pptxgen.SHAPE_NAME, {
    x: titleX, y: titleY + 0.44, w: Math.max(accentW, 1.2), h: 0.035,
    fill: { color: theme.primary },
    rectRadius: 0.018,
  });

  // Date range — right-aligned
  if (monthRange) {
    slide.addText(sanitizeText(monthRange), {
      x: 7.0, y: ZONE.HEADER_Y + 0.18, w: 2.65, h: 0.3,
      fontSize: 11, fontFace: FONTS.body, color: "6B7280", align: "right",
    });
  }
};

/**
 * Universal footer — identical on every data slide.
 * Contains only the page number, right-aligned, italic.
 * Not rendered on title/thank-you slides.
 */
const addSlideFooter = (slide: pptxgen.Slide, _theme: BrandTheme, slideNumber?: number | boolean) => {
  // If slideNumber is a boolean (legacy call) or falsy, skip rendering
  if (typeof slideNumber !== "number" || !slideNumber) return;
  slide.addText(`${slideNumber}`, {
    x: 9.2, y: ZONE.FOOTER_Y + 0.05, w: 0.5, h: 0.35,
    fontSize: 9, fontFace: FONTS.body, color: "9CA3AF", align: "right", italic: true,
  });
};

// Table border color per spec: #E5E7EB
const TABLE_BORDER_COLOR = "E5E7EB";
const TABLE_BORDER: pptxgen.BorderOptions = { type: "solid", color: TABLE_BORDER_COLOR, pt: 0.5 };

// Table positions: full content zone width with 2% margins (0.2" each side on 10" slide)
const TABLE_X = 0.2;
const TABLE_W = 9.6;

const headerCellOpts = (theme: BrandTheme, align: "left" | "right" | "center" = "center"): pptxgen.TableCellProps => ({
  bold: true, fill: { color: theme.headerBg }, fontSize: 7, align, color: theme.titleColor,
  fontFace: FONTS.body, valign: "middle",
  margin: [3, 4, 3, 4], // tight cell padding (top, right, bottom, left in points)
});

const bodyCellOpts = (theme: BrandTheme, rowIdx: number, align: "left" | "right" | "center" = "center", color?: string, wrap?: boolean): pptxgen.TableCellProps => ({
  fontSize: 7, align, color: color || theme.bodyColor, fontFace: FONTS.body,
  valign: wrap ? "top" : "middle",
  fill: rowIdx % 2 === 1 ? { color: theme.altRowBg } : undefined,
  margin: [3, 4, 3, 4],
});

// ============= INSIGHT BLOCK RENDERER =============
// Glassmorphism light design — frosted card rows, severity pips, no source tags

const SEVERITY_PIP: Record<string, string> = {
  critical: "EF4444",
  warning: "F59E0B",
  info: "3B82F6",
  positive: "10B981",
};

const SEVERITY_LABEL_COLOR: Record<string, string> = {
  critical: "DC2626",
  warning: "D97706",
  info: "2563EB",
  positive: "059669",
};

const SEVERITY_LABEL_TEXT: Record<string, string> = {
  critical: "CRITICAL",
  warning: "WARNING",
  info: "INFO",
  positive: "POSITIVE",
};

// Keep legacy alias for any external references
const SEVERITY_COLORS = SEVERITY_PIP;

const addInsightBlock = (slide: pptxgen.Slide, insights: TableInsight[] | undefined, _yPosLegacy: number, _theme: BrandTheme): void => {
  if (!insights || insights.length === 0) return;

  const zoneW = 9.0;
  const zoneX = 0.5;
  const cardH = 0.185;
  const cardGap = 0.025;
  const cardUnit = cardH + cardGap;

  // Calculate how many cards fit in the default zone
  const defaultAvailable = ZONE.INSIGHT_H - 0.02; // small top padding only (no label)
  const defaultMaxCards = Math.floor(defaultAvailable / cardUnit);

  // If insights exceed default zone, shift zone upward to accommodate more
  const totalNeeded = insights.length;
  let y0 = ZONE.INSIGHT_Y;
  let maxCards = defaultMaxCards;

  if (totalNeeded > defaultMaxCards) {
    // Expand upward — up to 0.4" above the default zone start
    const extraNeeded = (totalNeeded - defaultMaxCards) * cardUnit;
    const maxShift = 0.4;
    const shift = Math.min(extraNeeded, maxShift);
    y0 = ZONE.INSIGHT_Y - shift;
    const expandedAvailable = ZONE.INSIGHT_H + shift - 0.02;
    maxCards = Math.floor(expandedAvailable / cardUnit);
  }

  const needsTruncation = totalNeeded > maxCards;
  const visibleCount = needsTruncation ? Math.max(1, maxCards - 1) : Math.min(totalNeeded, maxCards);
  const visibleInsights = insights.slice(0, visibleCount);

  // Divider line (0.5px, very light)
  slide.addShape("rect" as any, {
    x: zoneX, y: y0, w: zoneW, h: 0.005,
    fill: { color: "000000", transparency: 94 },
  });

  const cardsStartY = y0 + 0.015;

  visibleInsights.forEach((insight, i) => {
    const cy = cardsStartY + i * cardUnit;

    // Card background — frosted glass
    slide.addShape("roundRect" as any, {
      x: zoneX, y: cy, w: zoneW, h: cardH,
      fill: { color: "FFFFFF", transparency: 35 },
      line: { color: "000000", width: 0.4, transparency: 94 } as any,
      rectRadius: 0.06,
    });

    // Severity pip (6px dot) — color-coded, no text label
    const pipColor = SEVERITY_PIP[insight.severity] || "999999";
    slide.addShape("ellipse" as any, {
      x: zoneX + 0.12, y: cy + cardH / 2 - 0.035, w: 0.07, h: 0.07,
      fill: { color: pipColor },
      shadow: { type: "outer", blur: 4, offset: 0, color: pipColor, opacity: 0.25 },
    });

    // Insight text — starts right after the dot (no severity label)
    slide.addText(sanitizeText(insight.text), {
      x: zoneX + 0.28, y: cy, w: zoneW - 0.40, h: cardH,
      fontSize: 7.5, fontFace: FONTS.body, color: "616161", valign: "middle",
    });
  });

  // "+N more" truncation label
  if (needsTruncation) {
    const remaining = totalNeeded - visibleCount;
    const truncY = cardsStartY + visibleCount * cardUnit;
    slide.addText(`+${remaining} more insight${remaining > 1 ? "s" : ""}`, {
      x: zoneX + 0.12, y: truncY, w: 3, h: cardH,
      fontSize: 6, fontFace: FONTS.body, color: "B8B8B8", italic: true, valign: "middle",
    });
  }
};

// ============= INFRASTRUCTURE EXTRACTION =============
// Mirrors InfrastructureDetailsTable.tsx logic: latest valid reputation, cleaned IPs, sorted by reputation

const cleanIP = (ip: string): string => ip.replace(/[[\](){}]/g, "").trim();

const extractInfrastructure = (
  campaignData: CampaignRow[],
  postmasterData: PostmasterRow[] | null
): { domains: InfrastructureDomain[]; ips: InfrastructureIP[] } => {
  if (!postmasterData || postmasterData.length === 0) {
    return { domains: [], ips: [] };
  }

  // Sort newest first for "latest valid" logic
  const sorted = [...postmasterData].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Domains: collect unique domains, then find latest valid reputation per domain
  const domainNames = new Map<string, string>();
  sorted.forEach((row) => {
    const domainKey = row.domain?.toLowerCase().trim();
    if (domainKey && !domainNames.has(domainKey)) {
      domainNames.set(domainKey, row.domain?.trim() || domainKey);
    }
  });

  const domains: InfrastructureDomain[] = [];
  domainNames.forEach((displayName, domainKey) => {
    const latestValid = sorted.find((row) => {
      if (row.domain?.toLowerCase().trim() !== domainKey) return false;
      const rep = row.domainReputation?.trim();
      return rep && rep.toLowerCase() !== "n/a" && rep !== "";
    });
    domains.push({
      domain: displayName,
      provider: "",
      reputation: latestValid?.domainReputation?.trim() || "—",
    });
  });

  // IPs: all unique IPs from sampleIps, latest recorded valid reputation, cleaned
  const ipMap = new Map<string, InfrastructureIP>();
  const ipSeen = new Set<string>();
  sorted.forEach((row) => {
    if (!row.sampleIps) return;
    const ipList = row.sampleIps.split(/[,;]/).map((s) => cleanIP(s)).filter(Boolean);
    ipList.forEach((ip) => {
      if (ipSeen.has(ip)) return;
      ipSeen.add(ip);
      const rep = row.ipReputation?.trim();
      const isValid = rep && rep.toLowerCase() !== "n/a" && rep !== "";
      ipMap.set(ip, { ip, reputation: isValid ? rep! : "—" });
    });
  });

  // Sort IPs by reputation: high → medium → low → bad → unknown
  const repOrder: Record<string, number> = { high: 0, medium: 1, low: 2, bad: 3 };
  const sortedIps = Array.from(ipMap.values()).sort((a, b) => {
    const ra = repOrder[(a.reputation || "").toLowerCase()] ?? 4;
    const rb = repOrder[(b.reputation || "").toLowerCase()] ?? 4;
    return ra - rb;
  });

  return { domains, ips: sortedIps };
};

// ============= MAIN EXPORT FUNCTION =============

export const exportDiagnosticsToPPT = async (opts: DiagnosticsDeckOptions) => {
  const {
    diagnostics,
    brandName = "Campaign",
    brandProfile,
    signalHealthData,
    intelligentLearnings,
    industry,
    creativeAnalysis,
    creativeImage,
    lifecycleCoverage,
    sectionInsights,
  } = opts;

  const theme = buildBrandTheme(brandProfile, industry);
  const hasPostmasterData = !!diagnostics.postmasterData && diagnostics.postmasterData.length > 0;

  // Pre-fetch logo
  let logoBase64: string | null = null;
  const logoUrl = brandProfile?.brand_design_profile?.logo?.logo_url;
  if (logoUrl) logoBase64 = await fetchLogoAsBase64(logoUrl);

  // Pre-fetch metric card icons
  const iconPaths: Record<string, string> = {
    paperPlane: "/icons/icon-send.png",
    eye: "/icons/icon-eye.png",
    pointer: "/icons/icon-click.png",
    noSign: "/icons/icon-unsub.png",
    warning: "/icons/icon-warning.png",
    refresh: "/icons/icon-refresh.png",
  };
  const iconBase64Map: Record<string, string | null> = {};
  await Promise.all(
    Object.entries(iconPaths).map(async ([key, path]) => {
      try {
        const resp = await fetch(path);
        if (!resp.ok) { iconBase64Map[key] = null; return; }
        const buffer = await resp.arrayBuffer();
        const mime = detectMimeType(buffer);
        iconBase64Map[key] = `data:${mime};base64,${arrayBufferToBase64(buffer)}`;
      } catch { iconBase64Map[key] = null; }
    })
  );

  const pptx = new pptxgen();
  pptx.author = "Inbox Diagnostics";
  pptx.title = `${brandName} – Email Diagnostics Executive Deck`;
  pptx.subject = "Email Campaign Performance Analysis";
  pptx.company = brandProfile?.brand_identity?.brand_name || "Inbox Alchemy";
  pptx.defineLayout({ name: "WIDESCREEN", width: 10, height: 5.625 });
  pptx.layout = "WIDESCREEN";

  const report = diagnostics.analysisReport;
  if (!report) {
    const s = pptx.addSlide();
    s.addText("No analysis report data available", { x: 2, y: 2, w: 6, h: 1, fontSize: 20, color: theme.mutedColor });
    await pptx.writeFile({ fileName: buildExportFileName(opts.sourceFileName, `Inbox_Diagnostics_${brandName}_Report`) });
    return;
  }

  const monthRange = getMonthRange(report);
  let slideNum = 0;

  // ==========================================
  // SLIDE 1: Cover Slide
  // ==========================================
  {
    const s0 = pptx.addSlide();
    s0.background = { color: theme.primary };
    s0.addShape("rect" as pptxgen.SHAPE_NAME, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: theme.secondary, transparency: 70 } });
    s0.addShape("ellipse" as pptxgen.SHAPE_NAME, { x: 5, y: 1.5, w: 8, h: 4, fill: { color: theme.accent, transparency: 85 } });

    if (logoBase64) {
      s0.addImage({ data: logoBase64, x: 3.5, y: 0.4, w: 3.0, h: 1.4, sizing: { type: "contain", w: 3.0, h: 1.4 } });
    } else {
      s0.addShape("roundRect" as pptxgen.SHAPE_NAME, { x: 3.75, y: 0.6, w: 2.5, h: 1.2, fill: { color: "FFFFFF", transparency: 80 }, line: { color: "FFFFFF", width: 1.5, dashType: "dash" }, rectRadius: 0.15 });
      s0.addText("LOGO", { x: 3.75, y: 0.6, w: 2.5, h: 1.2, fontSize: 14, color: "FFFFFF", fontFace: FONTS.body, align: "center", valign: "middle", transparency: 50 });
    }

    const deckBrandName = sanitizeText(brandProfile?.brand_identity?.brand_name || brandName || "Email");
    s0.addText(`${deckBrandName}\nInbox Diagnostics Report`, { x: 0.5, y: 2.1, w: 9, h: 1.4, fontSize: 36, bold: true, color: "FFFFFF", fontFace: FONTS.headline, align: "center", valign: "middle", lineSpacingMultiple: 1.2 });
    s0.addText("Executive Performance Report", { x: 0.5, y: 3.4, w: 9, h: 0.5, fontSize: 16, color: "FFFFFF", fontFace: FONTS.body, align: "center", transparency: 20 });
    if (monthRange) s0.addText(sanitizeText(monthRange), { x: 0.5, y: 4.1, w: 9, h: 0.4, fontSize: 13, color: "FFFFFF", fontFace: FONTS.body, align: "center", transparency: 35 });
    s0.addShape("rect" as pptxgen.SHAPE_NAME, { x: 3, y: 4.8, w: 4, h: 0.04, fill: { color: "FFFFFF", transparency: 50 } });
    const now = new Date();
    s0.addText(`Generated: ${now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, { x: 0.5, y: 5.0, w: 9, h: 0.3, fontSize: 9, color: "FFFFFF", fontFace: FONTS.body, align: "center", transparency: 50 });
  }

  // ==========================================
  // SLIDE 2: Campaign Overview — KPI Cards (3×2 Grid)
  // Fixed four-zone layout with glassmorphism card styling per design spec
  // ==========================================
  slideNum++;
  {
    const s = pptx.addSlide();
    // Background: #f8f8fa with existing decorative elements
    s.background = { color: "F8F8FA" };
    s.addShape("rect" as pptxgen.SHAPE_NAME, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: theme.bgAccent, transparency: 85 } });
    addDecorativeMotif(s, theme, "corner");

    // --- HEADER ZONE --- (universal)
    addSlideHeader(s, "Campaign overview", theme, monthRange);

    // --- Compute grand totals ---
    const gt = { sent: 0, viewed: 0, clicked: 0, unsubs: 0, hard: 0, soft: 0 };
    report.providerAggregates.forEach(p => {
      gt.sent += p.totalSentUsers;
      gt.viewed += p.uniqueViewed;
      gt.clicked += p.uniqueClicked;
      gt.unsubs += p.unsubscribes;
      gt.hard += p.hardBounces;
      gt.soft += p.softBounces;
    });
    const denom = gt.sent || 1;
    const viewRate = (gt.viewed / denom) * 100;
    const clickRate = (gt.clicked / denom) * 100;
    const unsubRate = (gt.unsubs / denom) * 100;
    const hardRate = (gt.hard / denom) * 100;
    const softRate = (gt.soft / denom) * 100;

    // --- Metric definitions with fixed accent colors per spec ---
    const METRIC_COLORS = {
      sent:      "534AB7",
      viewed:    "1D9E75",
      clicked:   "378ADD",
      unsubs:    "D97706",
      hardBounce:"D85A30",
      softBounce:"993556",
    };

    const engagementCards = [
      { label: "SENT", value: formatNumber(gt.sent), percent: null, desc: "Total emails dispatched", accent: METRIC_COLORS.sent },
      { label: "VIEWED", value: formatNumber(gt.viewed), percent: formatPercent(viewRate), desc: "Unique opens recorded", accent: METRIC_COLORS.viewed },
      { label: "CLICKED", value: formatNumber(gt.clicked), percent: formatPercent(clickRate), desc: "Unique click-throughs", accent: METRIC_COLORS.clicked },
    ];
    const deliverabilityCards = [
      { label: "UNSUBSCRIBES", value: formatNumber(gt.unsubs), percent: formatPercent(unsubRate), desc: "Unsubscribe rate", accent: METRIC_COLORS.unsubs },
      { label: "HARD BOUNCE", value: formatNumber(gt.hard), percent: formatPercent(hardRate), desc: "Hard bounce rate", accent: METRIC_COLORS.hardBounce },
      { label: "SOFT BOUNCE", value: formatNumber(gt.soft), percent: formatPercent(softRate), desc: "Soft bounce rate", accent: METRIC_COLORS.softBounce },
    ];

    // --- CONTENT ZONE (11.11% – 74%, y=0.625" h=3.538") ---
    const contentY = ZONE.TABLE_Y;
    const contentH = ZONE.TABLE_MAX_H;
    const gridX = 0.35;
    const gridW = 9.3;
    const cols = 3;
    const gapX = 0.12;
    const cardW = (gridW - gapX * (cols - 1)) / cols;

    // Row heights: two card rows + divider label between them
    const dividerH = 0.25;
    const availableForCards = contentH - dividerH - 0.15; // 0.15 top padding
    const cardH = availableForCards / 2;
    

    const row1Y = contentY + 0.1;
    const dividerY = row1Y + cardH + 0.02;
    const row2Y = dividerY + dividerH;

    // Helper: render a single KPI card
    const renderCard = (card: typeof engagementCards[0], col: number, rowY: number) => {
      const x = gridX + col * (cardW + gapX);
      const y = rowY;

      // Card background — glassmorphism
      s.addShape("roundRect" as pptxgen.SHAPE_NAME, {
        x, y, w: cardW, h: cardH,
        fill: { color: "FFFFFF", transparency: 45 },
        line: { color: "FFFFFF", width: 0.4 } as any,
        rectRadius: 0.1,
      });

      // Top accent bar (2.5px ≈ 0.025")
      s.addShape("rect" as pptxgen.SHAPE_NAME, {
        x, y, w: cardW, h: 0.025,
        fill: { color: card.accent },
      });

      // Label (uppercase, accent color)
      s.addText(card.label, {
        x: x + 0.2, y: y + 0.15, w: cardW - 0.4, h: 0.22,
        fontSize: 9, fontFace: FONTS.body, color: card.accent,
        bold: true, align: "left", valign: "middle",
      });

      // Value (dominant, primary text)
      s.addText(card.value, {
        x: x + 0.15, y: y + (card.percent ? 0.4 : 0.5), w: cardW - 0.3, h: 0.55,
        fontSize: 26, fontFace: FONTS.headline, color: theme.titleColor,
        bold: false, align: "center", valign: "middle",
      });

      // Percentage (secondary, muted)
      if (card.percent) {
        s.addText(card.percent, {
          x: x + 0.15, y: y + 0.9, w: cardW - 0.3, h: 0.25,
          fontSize: 12, fontFace: FONTS.body, color: "8E8E8E",
          align: "center", valign: "middle",
        });
      }

      // Description (tertiary)
      s.addText(card.desc, {
        x: x + 0.2, y: y + cardH - 0.35, w: cardW - 0.4, h: 0.22,
        fontSize: 8, fontFace: FONTS.body, color: theme.mutedColor,
        align: "left", valign: "middle",
      });
    };

    // Render engagement row
    engagementCards.forEach((card, i) => renderCard(card, i, row1Y));

    // Section divider label
    s.addText("DELIVERABILITY", {
      x: gridX, y: dividerY, w: 3, h: dividerH,
      fontSize: 8, fontFace: FONTS.body, color: theme.mutedColor,
      bold: true, align: "left", valign: "middle",
    });

    // Render deliverability row
    deliverabilityCards.forEach((card, i) => renderCard(card, i, row2Y));

    // --- INSIGHT ZONE (74% – 92%, y=4.163" h=1.012") ---
    addInsightBlock(s, sectionInsights?.campaignOverview, 0, theme);

    // --- FOOTER ZONE (92%+, y=5.175") ---
    addSlideFooter(s, theme, slideNum);
  }

  // ==========================================
  // SLIDE 3: Campaign Overview by Provider (Table)
  // Columns exactly match app: Provider, Sent, [Delivered], Viewed, View%, Clicked, Click%, Unsubs, Unsub%, Hard Bounce, Hard%, Soft Bounce, Soft%
  // ==========================================
  slideNum++;
  {
    const s = pptx.addSlide();
    addSlideBackground(s, theme);
    addDecorativeMotif(s, theme, "corner");
    addSlideHeader(s, "Campaign Overview by Provider", theme, monthRange, slideNum);

    const useDelivered = report.providerAggregates[0]?.useDeliveredAsDenominator;
    const headers: string[] = ["Provider", "Sent"];
    if (useDelivered) headers.push("Delivered");
    headers.push("Viewed", "View %", "Clicked", "Click %", "Unsubs", "Unsub %", "Hard Bounce", "Hard %", "Soft Bounce", "Soft %");

    const hRow: pptxgen.TableCell[] = headers.map((h, i) => ({ text: h, options: headerCellOpts(theme, i === 0 ? "left" : "center") }));
    const rows: pptxgen.TableRow[] = [hRow];

    const totals = { sent: 0, delivered: 0, viewed: 0, clicked: 0, unsubs: 0, hard: 0, soft: 0 };

    report.providerAggregates.forEach((p, ri) => {
      totals.sent += p.totalSentUsers;
      totals.delivered += p.totalDeliveredUsers;
      totals.viewed += p.uniqueViewed;
      totals.clicked += p.uniqueClicked;
      totals.unsubs += p.unsubscribes;
      totals.hard += p.hardBounces;
      totals.soft += p.softBounces;

      const row: pptxgen.TableCell[] = [
        { text: sanitizeText(`${p.serviceProvider} / ${p.providerName}`), options: bodyCellOpts(theme, ri, "left", undefined, true) },
        { text: formatNumber(p.totalSentUsers), options: bodyCellOpts(theme, ri, "center") },
      ];
      if (useDelivered) row.push({ text: formatNumber(p.totalDeliveredUsers), options: bodyCellOpts(theme, ri, "center") });
      row.push(
        { text: formatNumber(p.uniqueViewed), options: bodyCellOpts(theme, ri, "center") },
        { text: formatPercent(p.viewPercent), options: bodyCellOpts(theme, ri, "center", getMetricColor(p.viewPercent, "openRate", theme)) },
        { text: formatNumber(p.uniqueClicked), options: bodyCellOpts(theme, ri, "center") },
        { text: formatPercent(p.clickPercent), options: bodyCellOpts(theme, ri, "center", getMetricColor(p.clickPercent, "clickRate", theme)) },
        { text: formatNumber(p.unsubscribes), options: bodyCellOpts(theme, ri, "center") },
        { text: formatPercent(p.unsubscribePercent), options: bodyCellOpts(theme, ri, "center", getMetricColor(p.unsubscribePercent, "unsubscribeRate", theme)) },
        { text: formatNumber(p.hardBounces), options: bodyCellOpts(theme, ri, "center") },
        { text: formatPercent(p.hardBouncePercent), options: bodyCellOpts(theme, ri, "center", getMetricColor(p.hardBouncePercent, "bounceRate", theme)) },
        { text: formatNumber(p.softBounces), options: bodyCellOpts(theme, ri, "center") },
        { text: formatPercent(p.softBouncePercent), options: bodyCellOpts(theme, ri, "center", getMetricColor(p.softBouncePercent, "bounceRate", theme)) },
      );
      rows.push(row);
    });

    // Grand Total row
    const denom = useDelivered ? totals.delivered : totals.sent;
    const gtOpts = (align: "left" | "center" = "center"): pptxgen.TableCellProps => ({ bold: true, fontSize: 7, align, fill: { color: theme.headerBg }, fontFace: FONTS.body, valign: "middle", margin: [3, 4, 3, 4] });
    const gt: pptxgen.TableCell[] = [
      { text: "Grand Total", options: gtOpts("left") },
      { text: formatNumber(totals.sent), options: gtOpts() },
    ];
    if (useDelivered) gt.push({ text: formatNumber(totals.delivered), options: gtOpts() });
    gt.push(
      { text: formatNumber(totals.viewed), options: gtOpts() },
      { text: formatPercent(denom > 0 ? (totals.viewed / denom) * 100 : 0), options: { ...gtOpts(), color: getMetricColor(denom > 0 ? (totals.viewed / denom) * 100 : 0, "openRate", theme) } },
      { text: formatNumber(totals.clicked), options: gtOpts() },
      { text: formatPercent(denom > 0 ? (totals.clicked / denom) * 100 : 0), options: { ...gtOpts(), color: getMetricColor(denom > 0 ? (totals.clicked / denom) * 100 : 0, "clickRate", theme) } },
      { text: formatNumber(totals.unsubs), options: gtOpts() },
      { text: formatPercent(denom > 0 ? (totals.unsubs / denom) * 100 : 0), options: { ...gtOpts(), color: getMetricColor(denom > 0 ? (totals.unsubs / denom) * 100 : 0, "unsubscribeRate", theme) } },
      { text: formatNumber(totals.hard), options: gtOpts() },
      { text: formatPercent(denom > 0 ? (totals.hard / denom) * 100 : 0), options: { ...gtOpts(), color: getMetricColor(denom > 0 ? (totals.hard / denom) * 100 : 0, "bounceRate", theme) } },
      { text: formatNumber(totals.soft), options: gtOpts() },
      { text: formatPercent(denom > 0 ? (totals.soft / denom) * 100 : 0), options: { ...gtOpts(), color: getMetricColor(denom > 0 ? (totals.soft / denom) * 100 : 0, "bounceRate", theme) } },
    );
    rows.push(gt);

    const numCols = headers.length;
    // Column widths — Provider is flex (wraps), all others no-wrap
    const baseW = useDelivered
      ? [1.5, 0.55, 0.55, 0.55, 0.55, 0.55, 0.55, 0.5, 0.55, 0.6, 0.55, 0.6, 0.55]
      : [1.7, 0.6, 0.55, 0.6, 0.55, 0.6, 0.55, 0.6, 0.55, 0.65, 0.55, 0.65, 0.55];

    s.addTable(rows, {
      x: TABLE_X, y: ZONE.TABLE_Y, w: TABLE_W, colW: baseW,
      border: TABLE_BORDER,
      fontFace: FONTS.body,
    });

    s.addText(`* Percentages use ${useDelivered ? "Delivered" : "Sent"} as denominator`, { x: 0.5, y: ZONE.INSIGHT_Y - 0.25, w: 5, h: 0.2, fontSize: 7, italic: true, color: theme.mutedColor, fontFace: FONTS.body });
    // Merge both campaign overview + provider insights into a single block (max 4 total)
    const mergedOverviewInsights = [
      ...(sectionInsights?.campaignOverview || []),
      ...(sectionInsights?.campaignOverviewByProvider || []),
    ].slice(0, 4);
    addInsightBlock(s, mergedOverviewInsights, 0, theme);
    addSlideFooter(s, theme, slideNum);
  }

  // ==========================================
  // SLIDE 3+: Monthly Overview (per-provider when multi-provider)
  // ==========================================
  {
    const byProvider = report.monthlyOverviewByProvider;
    const uniqueProviders = [...new Set(byProvider.map(m => m.provider))];
    const hasMultiProvider = uniqueProviders.length > 1;

    // Build list of slide configs: one per provider if multi, or one aggregate
    const monthlySlideConfigs = hasMultiProvider
      ? uniqueProviders.map(provider => ({
          title: `Monthly Overview \u2014 ${provider}`,
          data: byProvider.filter(m => m.provider === provider && (m.month !== "Unknown Date" || m.totalSentUsers > 0)),
          insights: sectionInsights?.monthlyOverviewByProvider?.[provider] ?? sectionInsights?.monthlyOverview,
        }))
      : [{
          title: "Monthly Overview",
          data: report.monthlyOverview.filter(m => m.month !== "Unknown Date" || m.totalSentUsers > 0),
          insights: sectionInsights?.monthlyOverview,
        }];

    for (const config of monthlySlideConfigs) {
      slideNum++;
      const s = pptx.addSlide();
      addSlideBackground(s, theme);
      addDecorativeMotif(s, theme, "side");
      addSlideHeader(s, config.title, theme, monthRange, slideNum);

      const monthlyData = config.data;
      const mUseDelivered = monthlyData[0]?.useDeliveredAsDenominator;

      const mHeaders: string[] = ["Month", "Campaigns", "Sent"];
      if (mUseDelivered) mHeaders.push("Delivered");
      mHeaders.push("Viewed", "View %", "Clicked", "Click %", "Unsubs", "Unsub %", "Hard Bounce", "Hard %", "Soft Bounce", "Soft %");

      const mHeaderRow: pptxgen.TableCell[] = mHeaders.map((h, i) => ({ text: h, options: headerCellOpts(theme, i === 0 ? "left" : "center") }));
      const mRows: pptxgen.TableRow[] = [mHeaderRow];

      monthlyData.forEach((m, ri) => {
        const row: pptxgen.TableCell[] = [
          { text: sanitizeText(m.month), options: bodyCellOpts(theme, ri) },
          { text: String(m.campaignCount), options: bodyCellOpts(theme, ri, "center") },
          { text: formatNumber(m.totalSentUsers), options: bodyCellOpts(theme, ri, "center") },
        ];
        if (mUseDelivered) row.push({ text: formatNumber(m.totalDeliveredUsers), options: bodyCellOpts(theme, ri, "center") });
        row.push(
          { text: formatNumber(m.uniqueViewed), options: bodyCellOpts(theme, ri, "center") },
          { text: formatPercent(m.viewPercent), options: bodyCellOpts(theme, ri, "center", getMetricColor(m.viewPercent, "openRate", theme)) },
          { text: formatNumber(m.uniqueClicked), options: bodyCellOpts(theme, ri, "center") },
          { text: formatPercent(m.clickPercent), options: bodyCellOpts(theme, ri, "center", getMetricColor(m.clickPercent, "clickRate", theme)) },
          { text: formatNumber(m.unsubscribes), options: bodyCellOpts(theme, ri, "center") },
          { text: formatPercent(m.unsubscribePercent), options: bodyCellOpts(theme, ri, "center", getMetricColor(m.unsubscribePercent, "unsubscribeRate", theme)) },
          { text: formatNumber(m.hardBounces), options: bodyCellOpts(theme, ri, "center") },
          { text: formatPercent(m.hardBouncePercent), options: bodyCellOpts(theme, ri, "center", getMetricColor(m.hardBouncePercent, "bounceRate", theme)) },
          { text: formatNumber(m.softBounces), options: bodyCellOpts(theme, ri, "center") },
          { text: formatPercent(m.softBouncePercent), options: bodyCellOpts(theme, ri, "center", getMetricColor(m.softBouncePercent, "bounceRate", theme)) },
        );
        mRows.push(row);
      });

      // Monthly overview column widths — Month is left-aligned, all numeric no-wrap
      const mColW = mUseDelivered
        ? [0.85, 0.5, 0.55, 0.55, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.6, 0.5, 0.6, 0.5]
        : [0.95, 0.55, 0.6, 0.55, 0.6, 0.55, 0.6, 0.55, 0.6, 0.55, 0.65, 0.55, 0.65, 0.55];

      s.addTable(mRows, {
        x: TABLE_X, y: ZONE.TABLE_Y, w: TABLE_W, colW: mColW,
        border: TABLE_BORDER,
        fontFace: FONTS.body,
      });
      addInsightBlock(s, config.insights, 0, theme);
      addSlideFooter(s, theme, slideNum);
    }
  }

  // ==========================================
  // SLIDE 4: Email Metrics Trend (Daily Line Chart)
  // Shows absolute values: Sent, Delivered, Unique Opens, Unique Clicks, Bounces, Unsubscribes
  // Matches the app's Email Metrics Trend chart exactly
  // ==========================================
  slideNum++;
  {
    const s = pptx.addSlide();
    addSlideBackground(s, theme);
    addSlideHeader(s, "Email Metrics Trend", theme, monthRange, slideNum);

    // Aggregate campaign data by date (daily granularity)
    const dailyMap = new Map<string, { sent: number; delivered: number; viewed: number; clicked: number; unsubs: number; bounces: number }>();
    
    diagnostics.rawData.forEach(c => {
      const dateKey = c.startDate || "Unknown";
      const existing = dailyMap.get(dateKey) || { sent: 0, delivered: 0, viewed: 0, clicked: 0, unsubs: 0, bounces: 0 };
      existing.sent += c.totalSentUsers;
      existing.delivered += c.totalDeliveredUsers;
      existing.viewed += c.uniqueViewedWithinConversion;
      existing.clicked += c.uniqueClickedWithinConversion;
      existing.unsubs += c.totalUnsubscribes;
      existing.bounces += c.hardBounces + c.softBounces;
      dailyMap.set(dateKey, existing);
    });

    // Sort by date
    const parseDateKey = (d: string): Date => {
      const parts = d.split("/");
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        return new Date(year, month, day);
      }
      return new Date(d);
    };

    const sortedDates = Array.from(dailyMap.keys())
      .filter(d => d !== "Unknown")
      .sort((a, b) => parseDateKey(a).getTime() - parseDateKey(b).getTime());

    const chartLabels = sortedDates.map(d => sanitizeText(d));
    
    // Absolute values — matching the app chart
    const sentData = sortedDates.map(d => dailyMap.get(d)!.sent);
    const deliveredData = sortedDates.map(d => dailyMap.get(d)!.delivered);
    const viewedData = sortedDates.map(d => dailyMap.get(d)!.viewed);
    const clickedData = sortedDates.map(d => dailyMap.get(d)!.clicked);
    const bouncesData = sortedDates.map(d => dailyMap.get(d)!.bounces);
    const unsubsData = sortedDates.map(d => dailyMap.get(d)!.unsubs);

    // Check if delivered data has any non-zero values
    const hasDelivered = deliveredData.some(v => v > 0);

    if (chartLabels.length > 0) {
      const chartSeries: { name: string; labels: string[]; values: number[] }[] = [
        { name: "Sent", labels: chartLabels, values: sentData },
      ];
      const colors: string[] = [
        "EC4899", // pink/rose for Sent
      ];
      if (hasDelivered) {
        chartSeries.push({ name: "Delivered", labels: chartLabels, values: deliveredData });
        colors.push("06B6D4"); // cyan for Delivered
      }
      chartSeries.push(
        { name: "Unique Opens", labels: chartLabels, values: viewedData },
        { name: "Unique Clicks", labels: chartLabels, values: clickedData },
        { name: "Bounces", labels: chartLabels, values: bouncesData },
        { name: "Unsubscribes", labels: chartLabels, values: unsubsData },
      );
      colors.push(
        "374151", // dark gray for Opens
        "10B981", // green for Clicks
        "F97316", // orange for Bounces
        "8B5CF6", // purple for Unsubs
      );

      // Grand Total Averages row — first content element, 16px gap from accent line
      const totalSent = sentData.reduce((a, b) => a + b, 0);
      const totalViewed = viewedData.reduce((a, b) => a + b, 0);
      const totalClicked = clickedData.reduce((a, b) => a + b, 0);
      const totalBounces = bouncesData.reduce((a, b) => a + b, 0);
      const totalUnsubs = unsubsData.reduce((a, b) => a + b, 0);
      const denom = totalSent || 1;

      const AVG_ROW_Y = ZONE.TABLE_Y; // first content element
      const AVG_ROW_H = 0.22; // single line height
      const GAP_AVG_CHART = 0.125; // 12px
      const DATA_LABEL_H = 0.18; // data points label height
      const GAP_CHART_LABEL = 0.083; // 8px
      const CHART_Y = AVG_ROW_Y + AVG_ROW_H + GAP_AVG_CHART;
      const DATA_LABEL_Y = ZONE.INSIGHT_Y - DATA_LABEL_H;
      const CHART_H = DATA_LABEL_Y - GAP_CHART_LABEL - CHART_Y;

      // Grand Total Avg line with bold prefix
      s.addText([
        { text: "Grand Total Avg:  ", options: { bold: true, fontSize: 8, color: theme.bodyColor, fontFace: FONTS.body } },
        { text: `Open Rate: ${((totalViewed / denom) * 100).toFixed(1)}%   Click Rate: ${((totalClicked / denom) * 100).toFixed(1)}%   Bounce Rate: ${((totalBounces / denom) * 100).toFixed(2)}%   Unsub Rate: ${((totalUnsubs / denom) * 100).toFixed(2)}%`, options: { fontSize: 8, color: theme.mutedColor, fontFace: FONTS.body } },
      ], { x: 0.3, y: AVG_ROW_Y, w: 9.4, h: AVG_ROW_H, valign: "middle" });

      // Chart — flex element filling remaining space
      s.addChart("line" as pptxgen.CHART_NAME, chartSeries, {
        x: 0.3, y: CHART_Y, w: 9.4, h: Math.max(CHART_H, 1.5),
        showLegend: true, legendPos: "t", legendFontSize: 8,
        lineSmooth: false, lineSize: 1.5, showValue: false,
        catAxisLabelFontSize: 6, valAxisLabelFontSize: 7,
        catAxisLabelRotate: 45,
        catGridLine: { style: "none" } as pptxgen.OptsChartGridLine,
        valGridLine: { color: lighten(theme.primary, 0.88), style: "dash" } as pptxgen.OptsChartGridLine,
        chartColors: colors,
      });

      // Data points label — flush above insight zone
      s.addText(`Showing ${chartLabels.length} data points (daily aggregation)`, {
        x: 0.3, y: DATA_LABEL_Y, w: 9.4, h: DATA_LABEL_H,
        fontSize: 7, italic: true, color: theme.mutedColor, fontFace: FONTS.body, align: "left",
      });
    } else {
      s.addText("No data available for trend chart", { x: 2, y: 2.5, w: 6, h: 0.5, fontSize: 14, color: theme.mutedColor, fontFace: FONTS.body, align: "center" });
    }
    // No divider line on this slide — data points label provides separation
    addInsightBlock(s, sectionInsights?.emailMetricsTrend, 0, theme);
    addSlideFooter(s, theme, slideNum);
  }

  // ==========================================
  // SLIDE 5: Infrastructure Details
  // Domain Details: Domain | Service Provider | Reputation
  // IP Details: IP | Reputation
  // ==========================================
  slideNum++;
  {
    const s = pptx.addSlide();
    addSlideBackground(s, theme);
    addDecorativeMotif(s, theme, "diagonal");
    addSlideHeader(s, "Infrastructure Details", theme, undefined, slideNum);

    const infra = extractInfrastructure(diagnostics.rawData, diagnostics.postmasterData);

    if (infra.domains.length > 0) {
      s.addText("Domain Details", { x: 0.3, y: ZONE.TABLE_Y, w: 4, h: 0.3, fontSize: 10, bold: true, color: theme.titleColor, fontFace: FONTS.headline });

      const domRows: pptxgen.TableRow[] = [
        [
          { text: "Domain", options: headerCellOpts(theme, "center") },
          { text: "Domain Reputation", options: headerCellOpts(theme, "center") },
        ],
      ];
      infra.domains.forEach((d, ri) => {
        domRows.push([
          { text: sanitizeText(d.domain), options: bodyCellOpts(theme, ri, "center") },
          { text: sanitizeText(d.reputation), options: bodyCellOpts(theme, ri, "center", getReputationColor(d.reputation, theme)) },
        ]);
      });

      s.addTable(domRows, {
        x: 0.2, y: ZONE.TABLE_Y + 0.35, w: 4.5, colW: [2.5, 2.0],
        border: TABLE_BORDER,
        fontFace: FONTS.body,
      });
    }

    if (infra.ips.length > 0) {
      s.addText("IP Details", { x: 5.2, y: ZONE.TABLE_Y, w: 4, h: 0.3, fontSize: 10, bold: true, color: theme.titleColor, fontFace: FONTS.headline });

      const ipRows: pptxgen.TableRow[] = [
        [
          { text: "IP Address", options: headerCellOpts(theme, "center") },
          { text: "Reputation", options: headerCellOpts(theme, "center") },
        ],
      ];
      infra.ips.forEach((ip, ri) => {
        ipRows.push([
          { text: ip.ip, options: bodyCellOpts(theme, ri, "center") },
          { text: ip.reputation, options: bodyCellOpts(theme, ri, "center", getReputationColor(ip.reputation, theme)) },
        ]);
      });

      s.addTable(ipRows, {
        x: 5.2, y: ZONE.TABLE_Y + 0.35, w: 4.6, colW: [2.8, 1.8],
        border: TABLE_BORDER,
        fontFace: FONTS.body,
      });
    }

    if (infra.domains.length === 0 && infra.ips.length === 0) {
      s.addText("No infrastructure details available", { x: 2, y: 2.5, w: 6, h: 0.5, fontSize: 14, color: theme.mutedColor, fontFace: FONTS.body, align: "center" });
    }
    addInsightBlock(s, sectionInsights?.infrastructureReputation, 0, theme);
    addSlideFooter(s, theme, slideNum);
  }




  // ==========================================
  // SLIDES 7+: Google Postmaster Reputation — one slide per domain
  // 2×2 chart grid: Domain Rep (TL), IP Rep (TR), Spam % (BL), Error % (BR)
  // ==========================================

  if (diagnostics.postmasterData && diagnostics.postmasterData.length > 0) {
    const MONTH_MAP_PPT: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const parsePmDate = (dateStr: string): Date | null => {
      if (!dateStr) return null;
      const match = dateStr.trim().match(/^([A-Z][a-z]{2})\s+(\d{1,2}),\s*(\d{4})$/);
      if (!match) return null;
      const mi = MONTH_MAP_PPT[match[1]];
      if (mi === undefined) return null;
      return new Date(parseInt(match[3], 10), mi, parseInt(match[2], 10));
    };
    const repToNum = (rep: string): number | null => {
      if (!rep) return null;
      const map: Record<string, number> = { "high": 3, "medium": 2, "low": 1, "bad": 0 };
      const val = map[rep.trim().toLowerCase()];
      return val !== undefined ? val : null;
    };
    // Format date as "MMM D" (no year)
    const fmtDateShort = (d: Date): string => `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;

    // Group postmaster data by domain
    const domainMap = new Map<string, typeof diagnostics.postmasterData>();
    diagnostics.postmasterData.forEach((row) => {
      const d = row.domain?.trim();
      if (!d) return;
      if (!domainMap.has(d)) domainMap.set(d, []);
      domainMap.get(d)!.push(row);
    });

    if (domainMap.size === 0) {
      domainMap.set("All Domains", diagnostics.postmasterData);
    }

    const domainNames = Array.from(domainMap.keys()).sort();

    // Reputation chart line colors per spec
    const REP_COLORS = {
      domain: "4A7CA5",  // steel blue
      ip: "534AB7",      // purple
      spam: "EF4444",    // red
      error: "D97706",   // amber
    };

    // Y-axis label colors for reputation charts
    const REP_LABEL_COLORS: Record<string, string> = {
      High: "10B981",
      Medium: "F59E0B",
      Low: "F97316",
      Bad: "EF4444",
    };

    for (const domainName of domainNames) {
      const domainData = domainMap.get(domainName)!;
      slideNum++;
      const s = pptx.addSlide();
      addSlideBackground(s, theme);
      addDecorativeMotif(s, theme, "corner");

      // Title with en dash per spec — title case "Reputation", nowrap via width allocation
      const pmTitle = `Google Postmaster Reputation \u2013 ${sanitizeText(domainName)}`;
      // Use addSlideHeader but give title 80% width for long domains
      addSlideHeader(s, pmTitle, theme, undefined, slideNum, { titleMaxW: 8.0 });

      const pmData = [...domainData].sort((a, b) => {
        const da = parsePmDate(a.date);
        const db = parsePmDate(b.date);
        if (!da || !db) return 0;
        return da.getTime() - db.getTime();
      });

      // Build date labels (MMM D, no year)
      const allDateLabels = pmData.map(p => {
        const d = parsePmDate(p.date);
        return d ? fmtDateShort(d) : sanitizeText(p.date);
      });

      const spamData = pmData.map(p => (p.spamRatio || 0) * 100);
      const errorData = pmData.map(p => (p.errorRatio || 0) * 100);

      const ipRepEntries = pmData.filter(p => repToNum(p.ipReputation) !== null);
      const domainRepEntries = pmData.filter(p => repToNum(p.domainReputation) !== null);

      const ipRepLabels = ipRepEntries.map(p => {
        const d = parsePmDate(p.date);
        return d ? fmtDateShort(d) : sanitizeText(p.date);
      });
      const domainRepLabels = domainRepEntries.map(p => {
        const d = parsePmDate(p.date);
        return d ? fmtDateShort(d) : sanitizeText(p.date);
      });
      const ipRepData = ipRepEntries.map(p => repToNum(p.ipReputation) as number);
      const domainRepData = domainRepEntries.map(p => repToNum(p.domainReputation) as number);

      // 2×2 grid positions from ZONE constants
      // Content area: ZONE.TABLE_Y to ZONE.INSIGHT_Y
      const gridX = 0.35;
      const gridW = 9.3;      // full content width
      const colGap = 0.125;   // 12px
      const rowGap = 0.125;   // 12px
      const cellW = (gridW - colGap) / 2;
      const totalH = ZONE.INSIGHT_Y - ZONE.TABLE_Y - 0.05; // small bottom padding
      const cellH = (totalH - rowGap) / 2;

      const chartPositions = [
        { x: gridX,                     y: ZONE.TABLE_Y,                w: cellW, h: cellH }, // TL: Domain
        { x: gridX + cellW + colGap,    y: ZONE.TABLE_Y,                w: cellW, h: cellH }, // TR: IP
        { x: gridX,                     y: ZONE.TABLE_Y + cellH + rowGap, w: cellW, h: cellH }, // BL: Spam
        { x: gridX + cellW + colGap,    y: ZONE.TABLE_Y + cellH + rowGap, w: cellW, h: cellH }, // BR: Error
      ];

      // Chart order per spec: Domain Rep (TL), IP Rep (TR), Spam (BL), Error (BR)
      const chartConfigs = [
        { name: "Domain reputation",  data: domainRepData, labels: domainRepLabels, color: REP_COLORS.domain, min: 0, max: 3, isReputation: true },
        { name: "IP reputation",      data: ipRepData,     labels: ipRepLabels,     color: REP_COLORS.ip,     min: 0, max: 3, isReputation: true },
        { name: "Spam ratio %",       data: spamData,      labels: allDateLabels,   color: REP_COLORS.spam,   isReputation: false },
        { name: "Error ratio %",      data: errorData,     labels: allDateLabels,   color: REP_COLORS.error,  isReputation: false },
      ];

      chartConfigs.forEach((cfg, i) => {
        if (cfg.data.length === 0) return;
        const pos = chartPositions[i];

        // Glassmorphism card container
        s.addShape("roundRect" as any, {
          x: pos.x, y: pos.y, w: pos.w, h: pos.h,
          fill: { color: "FFFFFF", transparency: 45 },
          line: { color: "FFFFFF", width: 0.5, transparency: 20 } as any,
          rectRadius: 0.1,
        });

        // Chart title inside card
        s.addText(cfg.name, {
          x: pos.x + 0.16, y: pos.y + 0.06, w: pos.w - 0.32, h: 0.2,
          fontSize: 9, fontFace: FONTS.body, color: theme.titleColor, bold: false,
        });

        // All charts use the same inner x/w so x-axis gridlines align across reputation and ratio charts
        const chartInnerX = pos.x + 0.08;
        const chartInnerY = pos.y + 0.3;
        const chartInnerW = pos.w - 0.16;
        const chartInnerH = pos.h - 0.4;

        const opts: any = {
          x: chartInnerX, y: chartInnerY, w: chartInnerW, h: chartInnerH,
          showLegend: false, lineSmooth: !cfg.isReputation, lineSize: 2,
          lineDataSymbolSize: 4,
          catAxisLabelFontSize: 6, valAxisLabelFontSize: 6,
          catAxisLabelColor: theme.mutedColor,
          catGridLine: { style: "none" },
          valGridLine: { color: "000000", width: 0.5, transparency: 94 },
          chartColors: [cfg.color],
          showTitle: false,
          plotArea: { fill: { color: "FFFFFF", transparency: 100 } },
        };

        opts.valAxisMinVal = 0;
        if (cfg.max !== undefined) opts.valAxisMaxVal = cfg.max;

        if (cfg.isReputation) {
          opts.valAxisMajorUnit = 1;
          opts.valAxisHidden = false;
          opts.valAxisLineShow = false;
          opts.valAxisLabelColor = theme.slideBg;
          opts.valAxisLabelFontSize = 1;
        } else {
          opts.valAxisLabelColor = theme.mutedColor;
          opts.numFmt = "0.0\"%\"";
        }

        s.addChart("line" as pptxgen.CHART_NAME, [{ name: cfg.name, labels: cfg.labels, values: cfg.data }], opts);

        // Custom Y-axis labels for reputation charts — overlapping chart edge, tight to grid lines
        if (cfg.isReputation) {
          const repLabels = ["Bad", "Low", "Medium", "High"];
          const plotTop = chartInnerY + chartInnerH * 0.04;
          const plotBottom = chartInnerY + chartInnerH * 0.78;
          const plotHeight = plotBottom - plotTop;
          const labelH = 0.13;
          // Labels overlap into chart area for tight grid-line alignment
          const labelW = 0.55;
          const labelX = chartInnerX - labelW + 0.06;
          repLabels.forEach((label, li) => {
            const gridLineY = plotBottom - (li / 3) * plotHeight;
            s.addText(label, {
              x: labelX, y: gridLineY - labelH / 2, w: labelW, h: labelH,
              fontSize: 7, color: REP_LABEL_COLORS[label] || theme.mutedColor,
              fontFace: FONTS.body, align: "right", bold: true,
              valign: "middle", wrap: false,
            });
          });
        }
      });

      // Domain-specific insights
      const domainInsights = sectionInsights?.reputationTrendsByDomain?.[domainName]
        || sectionInsights?.reputationTrends
        || [];
      addInsightBlock(s, domainInsights.length > 0 ? domainInsights : undefined, 0, theme);
      addSlideFooter(s, theme, slideNum);
    }
  } else {
    // No postmaster data — single fallback slide
    slideNum++;
    const s = pptx.addSlide();
    addSlideBackground(s, theme);
    addDecorativeMotif(s, theme, "corner");
    addSlideHeader(s, "Google Postmaster Reputation", theme, undefined, slideNum);
    s.addText("Postmaster data required for reputation trend charts.", { x: 1, y: 2.5, w: 8, h: 0.5, fontSize: 12, color: theme.mutedColor, fontFace: FONTS.body, align: "center" });
    addInsightBlock(s, sectionInsights?.reputationTrends, 0, theme);
    addSlideFooter(s, theme, slideNum);
  }

  // ==========================================
  // SLIDES 8-11: Best & Underperforming Campaigns (4 slides)
  // ==========================================
  const createFullCampaignHeader = (): pptxgen.TableRow =>
    ["Date", "Campaign", "Subject", "Sent", "Open", "Open%", "Click", "Click%", "CTR", "Unsub", "Unsub%", "Hard", "Hard%", "Soft", "Soft%"]
      .map((h, i) => ({ text: h, options: headerCellOpts(theme, i === 1 || i === 2 ? "left" : "center") }));

  const createFullCampaignRow = (c: TopCampaign, ri: number): pptxgen.TableRow => {
    const denom = c.totalDeliveredUsers > 0 ? c.totalDeliveredUsers : c.totalSentUsers;
    const uniqueCTR = c.uniqueViewed > 0 ? (c.uniqueClicked / c.uniqueViewed) * 100 : 0;
    const unsubPct = denom > 0 ? (c.unsubscribes / denom) * 100 : 0;
    const hardPct = denom > 0 ? (c.hardBounces / denom) * 100 : 0;
    const softPct = denom > 0 ? (c.softBounces / denom) * 100 : 0;
    return [
      { text: sanitizeText(c.startDate) || "\u2014", options: bodyCellOpts(theme, ri, "center") },
      { text: sanitizeText((c.campaignName || "").substring(0, 40)), options: bodyCellOpts(theme, ri, "left", undefined, true) },
      { text: cleanSubjectLine(c.subjectLine).substring(0, 45), options: bodyCellOpts(theme, ri, "left", undefined, true) },
      { text: formatNumber(c.totalSentUsers), options: bodyCellOpts(theme, ri, "center") },
      { text: formatNumber(c.uniqueViewed), options: bodyCellOpts(theme, ri, "center") },
      { text: formatPercent(c.openRate), options: bodyCellOpts(theme, ri, "center", getMetricColor(c.openRate, "openRate", theme)) },
      { text: formatNumber(c.uniqueClicked), options: bodyCellOpts(theme, ri, "center") },
      { text: formatPercent(c.clickRate), options: bodyCellOpts(theme, ri, "center", getMetricColor(c.clickRate, "clickRate", theme)) },
      { text: formatPercent(uniqueCTR), options: bodyCellOpts(theme, ri, "center", getMetricColor(uniqueCTR, "clickRate", theme)) },
      { text: formatNumber(c.unsubscribes), options: bodyCellOpts(theme, ri, "center") },
      { text: formatPercent(unsubPct), options: bodyCellOpts(theme, ri, "center", getMetricColor(unsubPct, "unsubscribeRate", theme)) },
      { text: formatNumber(c.hardBounces), options: bodyCellOpts(theme, ri, "center") },
      { text: formatPercent(hardPct), options: bodyCellOpts(theme, ri, "center", getMetricColor(hardPct, "bounceRate", theme)) },
      { text: formatNumber(c.softBounces), options: bodyCellOpts(theme, ri, "center") },
      { text: formatPercent(softPct), options: bodyCellOpts(theme, ri, "center", getMetricColor(softPct, "bounceRate", theme)) },
    ];
  };

  // Campaign table column widths: Date(fixed), Campaign(flex), Subject(flex), then 12 numeric fixed cols
  // Fixed cols: Date=0.55, then 12 numeric cols at their natural widths
  const fixedDateW = 0.55;
  const numericWidths = [0.5, 0.45, 0.5, 0.45, 0.5, 0.45, 0.4, 0.5, 0.4, 0.5, 0.4, 0.5]; // 12 cols
  const totalFixedW = fixedDateW + numericWidths.reduce((s, w) => s + w, 0);
  const remainingW = TABLE_W - totalFixedW;
  const flexW = Math.min(remainingW / 2, 2.2); // cap at 220px equivalent (~2.2")
  const campaignColW = [fixedDateW, flexW, flexW, ...numericWidths];

  // Build full campaign list (≥1000 sends)
  const allCampaignsForSort: TopCampaign[] = diagnostics.rawData
    .filter(c => c.totalSentUsers >= 1000)
    .map(c => ({
      campaignId: c.campaignId, campaignName: c.campaignName, subjectLine: c.subjectLine,
      totalSentUsers: c.totalSentUsers, totalDeliveredUsers: c.totalDeliveredUsers,
      uniqueViewed: c.uniqueViewedWithinConversion, uniqueClicked: c.uniqueClickedWithinConversion,
      conversions: c.clickThroughConversions, unsubscribes: c.totalUnsubscribes,
      hardBounces: c.hardBounces, softBounces: c.softBounces,
      openRate: c.openRate, clickRate: c.clickRate, startDate: c.startDate,
    }));
  const worstFiltered = allCampaignsForSort.filter(c => (c.campaignName || "").trim() !== "");

  // Open rate threshold for summary insight severity
  const OPEN_RATE_THRESHOLD = 2.0;
  // CTR thresholds: <1.5% poor (red), 1.5-5% average (amber), >5% excellent (green)
  const CTR_THRESHOLD_POOR = 1.5;
  const CTR_THRESHOLD_GOOD = 5.0;

  // Helper: build summary insight for open rate slides
  const buildOpenRateSummary = (campaigns: TopCampaign[], label: "Top" | "Under"): TableInsight => {
    const avgOpen = campaigns.reduce((s, c) => s + c.openRate, 0) / campaigns.length;
    const avgClick = campaigns.reduce((s, c) => s + c.clickRate, 0) / campaigns.length;
    const severity = avgOpen >= OPEN_RATE_THRESHOLD ? "positive" : "critical";
    return {
      severity: severity as "positive" | "critical",
      text: `${label}-performers averaged ${avgOpen.toFixed(1)}% open rate and ${avgClick.toFixed(1)}% click rate.`,
      source: "Sender Reputation",
    };
  };

  // Helper: build summary insight for CTR slides
  const buildCTRSummary = (campaigns: TopCampaign[], label: "Top" | "Under"): TableInsight => {
    const avgCTR = campaigns.reduce((s, c) => {
      const ctr = c.uniqueViewed > 0 ? (c.uniqueClicked / c.uniqueViewed) * 100 : 0;
      return s + ctr;
    }, 0) / campaigns.length;
    const avgOpen = campaigns.reduce((s, c) => s + c.openRate, 0) / campaigns.length;
    const severity = avgCTR >= CTR_THRESHOLD_GOOD ? "positive" : avgCTR >= CTR_THRESHOLD_POOR ? "warning" : "critical";
    return {
      severity: severity as "positive" | "critical" | "warning",
      text: `${label}-performers averaged ${avgCTR.toFixed(1)}% CTR with ${avgOpen.toFixed(1)}% average open rate.`,
      source: "Sender Reputation",
    };
  };

  // Helper: assemble insights with summary replacing open-rate insights, sorted by severity
  const SEVERITY_PRIORITY: Record<string, number> = { critical: 0, positive: 1, warning: 2, info: 3 };
  const assembleInsights = (summary: TableInsight, rawInsights: TableInsight[] | undefined): TableInsight[] => {
    // Filter out open-rate-specific insights that the summary replaces
    const filtered = (rawInsights || []).filter(i =>
      !(/open rate/i.test(i.text) && (/averaged|indicates|of \d+.*%/i.test(i.text))) &&
      !(/CTR of \d+.*%/i.test(i.text) && /outperforms|indicates/i.test(i.text))
    );
    const all = [summary, ...filtered];
    all.sort((a, b) => (SEVERITY_PRIORITY[a.severity] ?? 9) - (SEVERITY_PRIORITY[b.severity] ?? 9));
    // Truncate to 4, dropping info (blue) first
    if (all.length > 4) {
      const nonInfo = all.filter(i => i.severity !== "info");
      const info = all.filter(i => i.severity === "info");
      return [...nonInfo, ...info].slice(0, 4);
    }
    return all;
  };

  // Best Performing \u2013 by Open Rate
  slideNum++;
  {
    const s = pptx.addSlide();
    addSlideBackground(s, theme);
    addDecorativeMotif(s, theme, "corner");
    addSlideHeader(s, "Best Performing Campaigns \u2013 by Open Rate", theme, undefined, slideNum);

    const byOpenRate = [...allCampaignsForSort].sort((a, b) => b.openRate - a.openRate).slice(0, 5);
    const rows: pptxgen.TableRow[] = [createFullCampaignHeader()];
    byOpenRate.forEach((c, ri) => rows.push(createFullCampaignRow(c, ri)));

    s.addTable(rows, {
      x: TABLE_X, y: ZONE.TABLE_Y, w: TABLE_W, colW: campaignColW,
      border: TABLE_BORDER,
      fontFace: FONTS.body,
    });

    if (byOpenRate.length > 0) {
      const summary = buildOpenRateSummary(byOpenRate, "Top");
      const assembled = assembleInsights(summary, sectionInsights?.bestPerformingOpenRate);
      addInsightBlock(s, assembled, 0, theme);
    } else {
      addInsightBlock(s, sectionInsights?.bestPerformingOpenRate, 0, theme);
    }
    addSlideFooter(s, theme, slideNum);
  }

  // Best Performing \u2013 by CTR
  slideNum++;
  {
    const s = pptx.addSlide();
    addSlideBackground(s, theme);
    addDecorativeMotif(s, theme, "corner");
    addSlideHeader(s, "Best Performing Campaigns \u2013 by CTR", theme, undefined, slideNum);

    const byCTR = [...allCampaignsForSort]
      .sort((a, b) => {
        const ctrA = a.uniqueViewed > 0 ? (a.uniqueClicked / a.uniqueViewed) * 100 : 0;
        const ctrB = b.uniqueViewed > 0 ? (b.uniqueClicked / b.uniqueViewed) * 100 : 0;
        return ctrB - ctrA;
      }).slice(0, 5);

    const rows: pptxgen.TableRow[] = [createFullCampaignHeader()];
    byCTR.forEach((c, ri) => rows.push(createFullCampaignRow(c, ri)));

    s.addTable(rows, {
      x: TABLE_X, y: ZONE.TABLE_Y, w: TABLE_W, colW: campaignColW,
      border: TABLE_BORDER,
      fontFace: FONTS.body,
    });

    if (byCTR.length > 0) {
      const summary = buildCTRSummary(byCTR, "Top");
      const assembled = assembleInsights(summary, sectionInsights?.bestPerformingCTR);
      addInsightBlock(s, assembled, 0, theme);
    } else {
      addInsightBlock(s, sectionInsights?.bestPerformingCTR, 0, theme);
    }
    addSlideFooter(s, theme, slideNum);
  }

  // Underperforming \u2013 by Open Rate
  slideNum++;
  {
    const s = pptx.addSlide();
    addSlideBackground(s, theme);
    addDecorativeMotif(s, theme, "side");
    addSlideHeader(s, "Underperforming Campaigns \u2013 by Open Rate", theme, undefined, slideNum);

    const byOpenRate = [...worstFiltered].sort((a, b) => a.openRate - b.openRate).slice(0, 5);
    const rows: pptxgen.TableRow[] = [createFullCampaignHeader()];
    byOpenRate.forEach((c, ri) => rows.push(createFullCampaignRow(c, ri)));

    s.addTable(rows, {
      x: TABLE_X, y: ZONE.TABLE_Y, w: TABLE_W, colW: campaignColW,
      border: TABLE_BORDER,
      fontFace: FONTS.body,
    });

    if (byOpenRate.length > 0) {
      const summary = buildOpenRateSummary(byOpenRate, "Under");
      const assembled = assembleInsights(summary, sectionInsights?.underperformingOpenRate);
      addInsightBlock(s, assembled, 0, theme);
    } else {
      addInsightBlock(s, sectionInsights?.underperformingOpenRate, 0, theme);
    }
    addSlideFooter(s, theme, slideNum);
  }

  // Underperforming \u2013 by CTR
  slideNum++;
  {
    const s = pptx.addSlide();
    addSlideBackground(s, theme);
    addDecorativeMotif(s, theme, "side");
    addSlideHeader(s, "Underperforming Campaigns \u2013 by CTR", theme, undefined, slideNum);

    const byCTR = [...worstFiltered]
      .sort((a, b) => {
        const ctrA = a.uniqueViewed > 0 ? (a.uniqueClicked / a.uniqueViewed) * 100 : 0;
        const ctrB = b.uniqueViewed > 0 ? (b.uniqueClicked / b.uniqueViewed) * 100 : 0;
        return ctrA - ctrB;
      }).slice(0, 5);

    const rows: pptxgen.TableRow[] = [createFullCampaignHeader()];
    byCTR.forEach((c, ri) => rows.push(createFullCampaignRow(c, ri)));

    s.addTable(rows, {
      x: TABLE_X, y: ZONE.TABLE_Y, w: TABLE_W, colW: campaignColW,
      border: TABLE_BORDER,
      fontFace: FONTS.body,
    });

    if (byCTR.length > 0) {
      const summary = buildCTRSummary(byCTR, "Under");
      const assembled = assembleInsights(summary, sectionInsights?.underperformingCTR);
      addInsightBlock(s, assembled, 0, theme);
    } else {
      addInsightBlock(s, sectionInsights?.underperformingCTR, 0, theme);
    }
    addSlideFooter(s, theme, slideNum);
  }

  // ==========================================
  // SLIDES 10 & 11: Creative Analyzer (Conditional)
  // Only if creativeAnalysis is present
  // ==========================================
  if (creativeAnalysis) {
    // SLIDE 10: Creative Analysis — Practices + Image + Risk Areas
    slideNum++;
    {
      const s = pptx.addSlide();
      addSlideBackground(s, theme);
      addDecorativeMotif(s, theme, "dots");
      addSlideHeader(s, "Creative & Content Effectiveness Analysis", theme, undefined, slideNum);

      // Layout constants for three-panel grid
      // Left panel is compact (2 cols), center is narrow, right gets most space (3 cols)
      const padX = 0.35; // 3.5% of 10"
      const contentTop = ZONE.TABLE_Y;
      const contentBottom = ZONE.FOOTER_Y;
      const contentH = contentBottom - contentTop;
      const gapBetween = 0.12;
      const totalW = 10 - padX * 2;

      // Asymmetric layout: left ~22%, center ~16%, right ~54% (+ gaps)
      const leftPanelW = totalW * 0.22;
      const centerW = creativeImage ? totalW * 0.16 : 0;
      const rightPanelW = centerW > 0
        ? totalW - leftPanelW - centerW - gapBetween * 2
        : totalW - leftPanelW - gapBetween;

      const leftX = padX;
      const centerX = leftX + leftPanelW + gapBetween;
      const rightX = centerW > 0
        ? centerX + centerW + gapBetween
        : leftX + leftPanelW + gapBetween;

      // Section title height
      const titleH = 0.22;
      const titleGap = 0.08;
      const tableTop = contentTop + titleH + titleGap;
      const tableH = contentH - titleH - titleGap;

      // --- Left panel: Effective Design & Content Practices ---
      s.addShape("roundRect" as pptxgen.SHAPE_NAME, {
        x: leftX, y: contentTop, w: leftPanelW, h: contentH,
        fill: { color: "FFFFFF" },
        line: { color: "000000", width: 0.375 },
        rectRadius: 0.1,
        shadow: { type: "outer", blur: 2, offset: 1, color: "000000", opacity: 0.06 },
      });

      s.addText("Effective Design & Content Practices", {
        x: leftX + 0.08, y: contentTop + 0.06, w: leftPanelW - 0.16, h: titleH,
        fontSize: 8, bold: true, color: "1D9E75", fontFace: FONTS.body, wrap: true,
      });

      // Practices table
      const practiceRows: pptxgen.TableRow[] = [
        [
          { text: "Area", options: headerCellOpts(theme) },
          { text: "Practice", options: headerCellOpts(theme) },
        ],
      ];
      creativeAnalysis.effectivePractices.forEach((p, ri) => {
        practiceRows.push([
          { text: sanitizeText(p.area), options: { ...bodyCellOpts(theme, ri), align: "center" as const, _bodyProp: { wrap: 'none' } as any } },
          { text: sanitizeText(p.practice), options: { ...bodyCellOpts(theme, ri, "left", undefined, true), _bodyProp: { wrap: 'square' } as any } },
        ]);
      });

      const practiceRowCount = practiceRows.length;
      const practiceFontSize = practiceRowCount > 8 ? 5.5 : practiceRowCount > 6 ? 6 : practiceRowCount > 4 ? 7 : 8;
      const areaColW = 0.55;
      const practiceTableInner = leftPanelW - 0.16;
      const practiceColW = practiceTableInner - areaColW;

      s.addTable(practiceRows, {
        x: leftX + 0.08, y: tableTop, w: practiceTableInner,
        colW: [areaColW, practiceColW],
        border: TABLE_BORDER,
        fontFace: FONTS.body,
        fontSize: practiceFontSize,
        autoPage: false,
      });

      // --- Center panel: Creative preview image ---
      if (creativeImage) {
        s.addShape("roundRect" as pptxgen.SHAPE_NAME, {
          x: centerX, y: contentTop, w: centerW, h: contentH,
          fill: { color: "F8F8FA" },
          line: { color: "000000", width: 0.375 },
          rectRadius: 0.08,
        });

        // contain preserves aspect ratio — no stretching
        s.addImage({
          data: creativeImage,
          x: centerX + 0.04, y: contentTop + 0.04,
          w: centerW - 0.08, h: contentH - 0.08,
          sizing: { type: "contain", w: centerW - 0.08, h: contentH - 0.08 },
        });
      }

      // --- Right panel: Design & Content Risk Areas ---
      s.addShape("roundRect" as pptxgen.SHAPE_NAME, {
        x: rightX, y: contentTop, w: rightPanelW, h: contentH,
        fill: { color: "FFFFFF" },
        line: { color: "000000", width: 0.375 },
        rectRadius: 0.1,
        shadow: { type: "outer", blur: 2, offset: 1, color: "000000", opacity: 0.06 },
      });

      s.addText("Design & Content Risk Areas", {
        x: rightX + 0.12, y: contentTop + 0.06, w: rightPanelW - 0.24, h: titleH,
        fontSize: 9, bold: true, color: "D85A30", fontFace: FONTS.body, wrap: false,
      });

      // Risk Areas table
      const riskRows: pptxgen.TableRow[] = [
        [
          { text: "Area", options: headerCellOpts(theme) },
          { text: "Observation", options: headerCellOpts(theme) },
          { text: "Impact", options: headerCellOpts(theme) },
        ],
      ];
      creativeAnalysis.riskAreas.forEach((r, ri) => {
        riskRows.push([
          { text: sanitizeText(r.area), options: { ...bodyCellOpts(theme, ri), align: "center" as const, _bodyProp: { wrap: 'none' } as any } },
          { text: sanitizeText(r.observation), options: { ...bodyCellOpts(theme, ri), _bodyProp: { wrap: 'square' } as any } },
          { text: sanitizeText(r.impact), options: { ...bodyCellOpts(theme, ri), _bodyProp: { wrap: 'square' } as any } },
        ]);
      });

      // Aggressive font reduction for risk table
      const riskRowCount = riskRows.length;
      const riskFontSize = riskRowCount > 8 ? 5 : riskRowCount > 6 ? 5.5 : riskRowCount > 4 ? 6 : 7;
      const riskAreaW = 0.6;
      const riskTableInner = rightPanelW - 0.24;
      // Observation and Impact share remaining space equally (both wrap)
      const riskFlexW = (riskTableInner - riskAreaW) / 2;

      s.addTable(riskRows, {
        x: rightX + 0.12, y: tableTop, w: riskTableInner,
        colW: [riskAreaW, riskFlexW, riskFlexW],
        border: TABLE_BORDER,
        fontFace: FONTS.body,
        fontSize: riskFontSize,
        autoPage: false,
      });

      addSlideFooter(s, theme, slideNum);
    }

    // SLIDE 11: Creative Optimizations
    slideNum++;
    {
      const s = pptx.addSlide();
      addSlideBackground(s, theme);
      addDecorativeMotif(s, theme, "corner");
      addSlideHeader(s, "Creative Optimizations", theme, undefined, slideNum);

      const improvements = creativeAnalysis.improvements.slice(0, 7);
      improvements.forEach((imp, i) => {
        const y = 1.2 + i * 0.55;
        // Number circle
        s.addShape("ellipse" as pptxgen.SHAPE_NAME, {
          x: 0.8, y: y, w: 0.35, h: 0.35,
          fill: { color: theme.primary, transparency: 85 },
        });
        s.addText(`${i + 1}`, {
          x: 0.8, y: y, w: 0.35, h: 0.35,
          fontSize: 10, bold: true, color: theme.primary, fontFace: FONTS.body, align: "center", valign: "middle",
        });
        // Recommendation text
        s.addText(sanitizeText(imp), {
          x: 1.3, y: y, w: 8, h: 0.45,
          fontSize: 10, color: theme.bodyColor, fontFace: FONTS.body, valign: "middle",
        });
      });

      addSlideFooter(s, theme, slideNum);
    }
  }



  // ==========================================
  // SLIDE 13: Key Learnings & Recommendations
  // Columns: Issue Identified | Recommendation | Priority
  // ==========================================
  slideNum++;
  {
    const s = pptx.addSlide();
    addSlideBackground(s, theme);
    addDecorativeMotif(s, theme, "corner");
    addSlideHeader(s, "Key Learnings & Recommendations", theme, undefined, slideNum);

    if (intelligentLearnings && intelligentLearnings.length > 0) {
      const klRows: pptxgen.TableRow[] = [
        [
          { text: "Issue Identified", options: headerCellOpts(theme) },
          { text: "Recommendation", options: headerCellOpts(theme) },
          { text: "Priority", options: headerCellOpts(theme, "center") },
        ],
      ];

      intelligentLearnings.forEach((rec, ri) => {
        const prioColor = rec.priority === "P0" ? theme.red : rec.priority === "P1" ? theme.amber : theme.primary;
        klRows.push([
          { text: sanitizeText(rec.issue), options: { ...bodyCellOpts(theme, ri), valign: "top" } },
          { text: sanitizeText(rec.recommendation), options: { ...bodyCellOpts(theme, ri), color: theme.mutedColor, valign: "top" } },
          { text: sanitizeText(rec.priority), options: { ...bodyCellOpts(theme, ri, "center", prioColor), bold: true } },
        ]);
      });

      s.addTable(klRows, {
        x: TABLE_X, y: ZONE.TABLE_Y, w: TABLE_W, colW: [3.5, 4.3, 1.8],
        border: TABLE_BORDER,
        fontFace: FONTS.body,
      });
    } else {
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
            { text: sanitizeText(l.title), options: bodyCellOpts(theme, ri) },
            { text: sanitizeText(l.description), options: { ...bodyCellOpts(theme, ri), color: theme.mutedColor } },
          ]);
        });
        s.addTable(klRows, {
          x: TABLE_X, y: ZONE.TABLE_Y, w: TABLE_W, colW: [3.8, 5.8],
          border: TABLE_BORDER,
          fontFace: FONTS.body,
        });
      }
    }
    addInsightBlock(s, sectionInsights?.keyLearnings, 0, theme);
    addSlideFooter(s, theme, slideNum);
  }

  // ==========================================
  // THANK YOU SLIDE (Last slide)
  // Same background and decorations as Key Learnings slide
  // ==========================================
  {
    const s = pptx.addSlide();
    addSlideBackground(s, theme);
    addDecorativeMotif(s, theme, "corner");

    s.addText("Thank You", {
      x: 0, y: 0, w: 10, h: 5.625,
      fontSize: 44, bold: true, color: theme.titleColor,
      fontFace: FONTS.headline, align: "center", valign: "middle",
    });
  }


  const safeMonthRange = monthRange.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
  const brandLabel = brandProfile?.brand_identity?.brand_name || brandName;
  const fallbackName = `${brandLabel}_Diagnostics_Executive_${safeMonthRange || "Report"}`;
  const fileName = buildExportFileName(opts.sourceFileName, fallbackName);

  await pptx.writeFile({ fileName });
};
