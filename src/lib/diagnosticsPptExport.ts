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
const ZONE = {
  HEADER_Y: 0,                    // 0 EMU
  HEADER_H: 0.625,               // 571,500 EMU
  TABLE_Y: 0.625,                 // 571,500 EMU
  TABLE_MAX_H: 3.538,             // 3,234,690 EMU — hard ceiling
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

const addSlideHeader = (slide: pptxgen.Slide, title: string, theme: BrandTheme, monthRange?: string, slideNumber?: number) => {
  slide.addShape("rect" as pptxgen.SHAPE_NAME, { x: 0.5, y: ZONE.HEADER_Y + 0.95, w: 2.5, h: 0.04, fill: { color: theme.primary } });
  slide.addText(title, { x: 0.5, y: ZONE.HEADER_Y + 0.3, w: monthRange ? 6.5 : 8.5, h: 0.65, fontSize: 22, bold: true, color: theme.titleColor, fontFace: FONTS.headline });
  if (monthRange) slide.addText(monthRange, { x: 7, y: ZONE.HEADER_Y + 0.4, w: 2.5, h: 0.4, fontSize: 11, color: theme.mutedColor, fontFace: FONTS.body, align: "right" });
  if (slideNumber) slide.addText(`${slideNumber}`, { x: 9.3, y: ZONE.FOOTER_Y + 0.05, w: 0.4, h: 0.3, fontSize: 9, color: theme.mutedColor, fontFace: FONTS.body, align: "right" });
};

const addSlideFooter = (slide: pptxgen.Slide, theme: BrandTheme, _hasPostmasterData: boolean = true) => {
  slide.addText("Company Confidential. Do not distribute.", { x: 5.5, y: ZONE.FOOTER_Y + 0.05, w: 4, h: 0.3, fontSize: 8, color: theme.mutedColor, fontFace: FONTS.body, align: "right", italic: true });
};

const headerCellOpts = (theme: BrandTheme, align: "left" | "right" | "center" = "center"): pptxgen.TableCellProps => ({
  bold: true, fill: { color: theme.headerBg }, fontSize: 7, align, color: theme.titleColor, fontFace: FONTS.body, valign: "middle",
});

const bodyCellOpts = (theme: BrandTheme, rowIdx: number, align: "left" | "right" | "center" = "center", color?: string): pptxgen.TableCellProps => ({
  fontSize: 7, align, color: color || theme.bodyColor, fontFace: FONTS.body, valign: "middle",
  fill: rowIdx % 2 === 1 ? { color: theme.altRowBg } : undefined,
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

const extractInfrastructure = (
  campaignData: CampaignRow[],
  postmasterData: PostmasterRow[] | null
): { domains: InfrastructureDomain[]; ips: InfrastructureIP[] } => {
  const domainMap = new Map<string, InfrastructureDomain>();
  const ipMap = new Map<string, InfrastructureIP>();

  campaignData.forEach(c => {
    const provider = c.providerName || c.serviceProvider || "";
    if (provider && !domainMap.has(provider)) {
      domainMap.set(provider, { domain: provider, provider: c.serviceProvider, reputation: "N/A" });
    }
  });

  if (postmasterData) {
    postmasterData.forEach(p => {
      if (p.domain) {
        domainMap.set(p.domain, { domain: p.domain, provider: domainMap.get(p.domain)?.provider || "", reputation: p.domainReputation || "N/A" });
      }
      if (p.sampleIps) {
        p.sampleIps.split(",").map(ip => ip.trim()).filter(Boolean).forEach(ip => {
          ipMap.set(ip, { ip, reputation: p.ipReputation || "N/A" });
        });
      }
    });
  }

  return { domains: Array.from(domainMap.values()), ips: Array.from(ipMap.values()) };
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
  // SLIDE 2: Executive Metric Cards (3×2 Grid)
  // Visual glassmorphism cards for: Sent, Viewed, Clicked, Unsubs, Hard Bounce, Soft Bounce
  // ==========================================
  slideNum++;
  {
    const s = pptx.addSlide();
    addSlideBackground(s, theme);
    addDecorativeMotif(s, theme, "corner");
    addSlideHeader(s, "Campaign Overview", theme, monthRange, slideNum);

    // Compute grand totals from provider aggregates
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

    const getRiskColor = (rate: number, type: MetricType): string => {
      return getMetricColor(rate, type, theme);
    };

    const metricCards: { label: string; value: string; percent: string | null; context: string; shape: string; accentColor: string }[] = [
      { label: "SENT", value: formatNumber(gt.sent), percent: null, context: "Total emails dispatched", shape: "paperPlane", accentColor: theme.primary },
      { label: "VIEWED", value: formatNumber(gt.viewed), percent: formatPercent(viewRate), context: "Unique opens recorded", shape: "eye", accentColor: theme.secondary },
      { label: "CLICKED", value: formatNumber(gt.clicked), percent: formatPercent(clickRate), context: "Unique click-throughs", shape: "pointer", accentColor: theme.accent },
      { label: "UNSUBS", value: formatNumber(gt.unsubs), percent: formatPercent(unsubRate), context: "Unsubscribe rate", shape: "noSign", accentColor: getRiskColor(unsubRate, "unsubscribeRate") },
      { label: "HARD BOUNCE", value: formatNumber(gt.hard), percent: formatPercent(hardRate), context: "Hard bounce rate", shape: "warning", accentColor: getRiskColor(hardRate, "bounceRate") },
      { label: "SOFT BOUNCE", value: formatNumber(gt.soft), percent: formatPercent(softRate), context: "Soft bounce rate", shape: "refresh", accentColor: getRiskColor(softRate, "bounceRate") },
    ];

    // 3 columns × 2 rows grid
    const gridStartX = 0.6;
    const gridStartY = 1.2;
    const cardW = 2.7;
    const cardH = 1.85;
    const gapX = 0.35;
    const gapY = 0.3;

    metricCards.forEach((card, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = gridStartX + col * (cardW + gapX);
      const y = gridStartY + row * (cardH + gapY);

      // Card background — frosted glass effect (more prominent)
      s.addShape("roundRect" as pptxgen.SHAPE_NAME, {
        x, y, w: cardW, h: cardH,
        fill: { color: "FFFFFF", transparency: 40 },
        line: { color: "CCCCCC", width: 0.75 },
        rectRadius: 0.2,
        shadow: { type: "outer", blur: 16, offset: 4, color: "999999", opacity: 0.25 },
      });

      // Inner highlight shimmer (top portion, frosted)
      s.addShape("roundRect" as pptxgen.SHAPE_NAME, {
        x: x, y: y, w: cardW, h: cardH * 0.35,
        fill: { color: "FFFFFF", transparency: 60 },
        line: { type: "none" } as any,
        rectRadius: 0.2,
      });

      // Icon image (top right corner, watermark style) with per-icon sizing
      const iconData = iconBase64Map[card.shape];
      if (iconData) {
        // Custom sizes: sent=0.64x0.64cm, viewed=0.8x0.44cm, others=0.5x0.5 inches
        const cmToIn = (cm: number) => cm / 2.54;
        let iconW = 0.5, iconH = 0.5;
        if (card.shape === "paperPlane") { iconW = cmToIn(0.64); iconH = cmToIn(0.64); }
        else if (card.shape === "eye") { iconW = cmToIn(0.8); iconH = cmToIn(0.44); }
        else { iconW = 0.5; iconH = 0.5; }
        s.addImage({
          data: iconData,
          x: x + cardW - iconW - 0.2, y: y + 0.15, w: iconW, h: iconH,
          sizing: { type: "contain", w: iconW, h: iconH },
          transparency: 50,
        });
      }

      // Metric label (small, uppercase, single accent color)
      s.addText(card.label, {
        x: x + 0.3, y: y + 0.25, w: cardW - 0.6, h: 0.3,
        fontSize: 9, bold: true, color: theme.primary, fontFace: FONTS.body,
        align: "left", valign: "middle",
      });

      // Metric value (large, normal weight, black)
      s.addText(card.value, {
        x: x + 0.15, y: y + (card.percent ? 0.5 : 0.6), w: cardW - 0.3, h: 0.65,
        fontSize: 28, bold: false, color: "000000", fontFace: FONTS.headline,
        align: "center", valign: "middle",
      });

      // Percentage value (secondary, greyed out, below metric value)
      if (card.percent) {
        s.addText(card.percent, {
          x: x + 0.15, y: y + 1.1, w: cardW - 0.3, h: 0.35,
          fontSize: 14, color: "8E8E8E", fontFace: FONTS.body,
          align: "center", valign: "middle", transparency: 35,
        });
      }

      // Context line (small, muted)
      s.addText(card.context, {
        x: x + 0.3, y: y + cardH - 0.45, w: cardW - 0.6, h: 0.3,
        fontSize: 8, color: theme.mutedColor, fontFace: FONTS.body,
        align: "center", valign: "middle", italic: true,
      });
    });

    // Optional insight headline at bottom
    let insight = "";
    if (unsubRate > 0.5) insight = "Campaign reach remains strong but unsubscribe signals are rising";
    else if (hardRate > 2) insight = "Hard bounce rates indicate list hygiene attention needed";
    else if (viewRate > 20) insight = "Strong open rates suggest healthy sender reputation";
    else if (viewRate < 10) insight = "Open rates below benchmark — deliverability review recommended";
    else insight = "Campaign performance within expected ranges";

    s.addText(sanitizeText(insight), {
      x: 0.5, y: ZONE.INSIGHT_Y + 0.1, w: 9, h: 0.3,
      fontSize: 9, italic: true, color: theme.bodyColor, fontFace: FONTS.body, align: "center",
    });
    addInsightBlock(s, sectionInsights?.campaignOverview, 0, theme);

    addSlideFooter(s, theme, hasPostmasterData);
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
        { text: sanitizeText(`${p.serviceProvider} / ${p.providerName}`), options: bodyCellOpts(theme, ri) },
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
    const gtOpts = (align: "left" | "center" = "center"): pptxgen.TableCellProps => ({ bold: true, fontSize: 8, align, fill: { color: theme.headerBg }, fontFace: FONTS.body });
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
    // Distribute widths proportionally
    const baseW = useDelivered
      ? [1.6, 0.6, 0.6, 0.55, 0.55, 0.55, 0.55, 0.5, 0.5, 0.55, 0.5, 0.55, 0.5]
      : [1.8, 0.65, 0.6, 0.6, 0.6, 0.6, 0.55, 0.55, 0.6, 0.55, 0.6, 0.55];

    s.addTable(rows, {
      x: 0.3, y: 1.15, w: 9.4, colW: baseW,
      border: { type: "solid", color: lighten(theme.primary, 0.85), pt: 0.5 },
      fontFace: FONTS.body,
    });

    s.addText(`* Percentages use ${useDelivered ? "Delivered" : "Sent"} as denominator`, { x: 0.5, y: ZONE.INSIGHT_Y - 0.25, w: 5, h: 0.2, fontSize: 7, italic: true, color: theme.mutedColor, fontFace: FONTS.body });
    // Merge both campaign overview + provider insights into a single block (max 4 total)
    const mergedOverviewInsights = [
      ...(sectionInsights?.campaignOverview || []),
      ...(sectionInsights?.campaignOverviewByProvider || []),
    ].slice(0, 4);
    addInsightBlock(s, mergedOverviewInsights, 0, theme);
    addSlideFooter(s, theme, hasPostmasterData);
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

      const mColW = mUseDelivered
        ? [0.9, 0.5, 0.55, 0.55, 0.5, 0.5, 0.5, 0.5, 0.45, 0.5, 0.55, 0.5, 0.55, 0.5]
        : [1.0, 0.6, 0.65, 0.6, 0.6, 0.6, 0.6, 0.55, 0.6, 0.6, 0.6, 0.6, 0.6];

      s.addTable(mRows, {
        x: 0.3, y: 1.15, w: 9.4, colW: mColW,
        border: { type: "solid", color: lighten(theme.primary, 0.85), pt: 0.5 },
        fontFace: FONTS.body,
      });
      addInsightBlock(s, config.insights, 0, theme);
      addSlideFooter(s, theme, hasPostmasterData);
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

      // Grand Total Averages caption
      const totalSent = sentData.reduce((a, b) => a + b, 0);
      const totalViewed = viewedData.reduce((a, b) => a + b, 0);
      const totalClicked = clickedData.reduce((a, b) => a + b, 0);
      const totalBounces = bouncesData.reduce((a, b) => a + b, 0);
      const totalUnsubs = unsubsData.reduce((a, b) => a + b, 0);
      const denom = totalSent || 1;
      const avgLine = `Grand Total Avg:  Open Rate: ${((totalViewed / denom) * 100).toFixed(1)}%   Click Rate: ${((totalClicked / denom) * 100).toFixed(1)}%   Bounce Rate: ${((totalBounces / denom) * 100).toFixed(2)}%   Unsub Rate: ${((totalUnsubs / denom) * 100).toFixed(2)}%`;
      s.addText(sanitizeText(avgLine), { x: 0.5, y: 1.0, w: 9, h: 0.25, fontSize: 7, color: theme.bodyColor, fontFace: FONTS.body });

      s.addChart("line" as pptxgen.CHART_NAME, chartSeries, {
        x: 0.3, y: 1.3, w: 9.4, h: 3.5,
        showLegend: true, legendPos: "t", legendFontSize: 8,
        lineSmooth: false, lineSize: 1.5, showValue: false,
        catAxisLabelFontSize: 6, valAxisLabelFontSize: 7,
        catAxisLabelRotate: 45,
        catGridLine: { style: "none" } as pptxgen.OptsChartGridLine,
        valGridLine: { color: lighten(theme.primary, 0.88), style: "dash" } as pptxgen.OptsChartGridLine,
        chartColors: colors,
      });

      s.addText(`Showing ${chartLabels.length} data points (daily aggregation)`, { x: 0.5, y: ZONE.INSIGHT_Y - 0.2, w: 9, h: 0.2, fontSize: 7, italic: true, color: theme.mutedColor, fontFace: FONTS.body, align: "center" });
    } else {
      s.addText("No data available for trend chart", { x: 2, y: 2.5, w: 6, h: 0.5, fontSize: 14, color: theme.mutedColor, fontFace: FONTS.body, align: "center" });
    }
    addInsightBlock(s, sectionInsights?.emailMetricsTrend, 0, theme);
    addSlideFooter(s, theme, hasPostmasterData);
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
      s.addText("Domain Details", { x: 0.5, y: 1.1, w: 4, h: 0.3, fontSize: 12, bold: true, color: theme.titleColor, fontFace: FONTS.headline });

      const domRows: pptxgen.TableRow[] = [
        [
          { text: "Domain", options: headerCellOpts(theme) },
          { text: "Service Provider", options: headerCellOpts(theme) },
          { text: "Reputation", options: headerCellOpts(theme, "center") },
        ],
      ];
      infra.domains.forEach((d, ri) => {
        domRows.push([
          { text: sanitizeText(d.domain), options: bodyCellOpts(theme, ri) },
          { text: sanitizeText(d.provider) || "—", options: bodyCellOpts(theme, ri) },
          { text: sanitizeText(d.reputation), options: bodyCellOpts(theme, ri, "center", getReputationColor(d.reputation, theme)) },
        ]);
      });

      s.addTable(domRows, {
        x: 0.5, y: 1.5, w: 4.2, colW: [1.6, 1.4, 1.2],
        border: { type: "solid", color: lighten(theme.primary, 0.85), pt: 0.5 },
        fontFace: FONTS.body,
      });
    }

    if (infra.ips.length > 0) {
      s.addText("IP Details", { x: 5.3, y: 1.1, w: 4, h: 0.3, fontSize: 12, bold: true, color: theme.titleColor, fontFace: FONTS.headline });

      const ipRows: pptxgen.TableRow[] = [
        [
          { text: "IP Address", options: headerCellOpts(theme) },
          { text: "Reputation", options: headerCellOpts(theme, "center") },
        ],
      ];
      infra.ips.forEach((ip, ri) => {
        ipRows.push([
          { text: ip.ip, options: bodyCellOpts(theme, ri) },
          { text: ip.reputation, options: bodyCellOpts(theme, ri, "center", getReputationColor(ip.reputation, theme)) },
        ]);
      });

      s.addTable(ipRows, {
        x: 5.3, y: 1.5, w: 4.2, colW: [2.5, 1.7],
        border: { type: "solid", color: lighten(theme.primary, 0.85), pt: 0.5 },
        fontFace: FONTS.body,
      });
    }

    if (infra.domains.length === 0 && infra.ips.length === 0) {
      s.addText("No infrastructure details available", { x: 2, y: 2.5, w: 6, h: 0.5, fontSize: 14, color: theme.mutedColor, fontFace: FONTS.body, align: "center" });
    }
    addInsightBlock(s, sectionInsights?.infrastructureReputation, 0, theme);
    addSlideFooter(s, theme, hasPostmasterData);
  }

  // ==========================================
  // SLIDE 6: Reputation Scorecard
  // All signals from signalHealthData rendered as table
  // ==========================================
  slideNum++;
  {
    const s = pptx.addSlide();
    addSlideBackground(s, theme);
    addDecorativeMotif(s, theme, "dots");
    addSlideHeader(s, "Reputation Scorecard", theme, undefined, slideNum);

    if (signalHealthData && signalHealthData.length > 0) {
      const shRows: pptxgen.TableRow[] = [
        [
          { text: "Signal", options: headerCellOpts(theme) },
          { text: "Current Value", options: headerCellOpts(theme, "center") },
          { text: "Status", options: headerCellOpts(theme, "center") },
          { text: "Trend", options: headerCellOpts(theme, "center") },
        ],
      ];

      signalHealthData.forEach((sig, ri) => {
        const statusColor = sig.status === "healthy" ? theme.green : sig.status === "warning" ? theme.amber : theme.red;
        const trendColor = sig.trend === "improving" ? theme.green : sig.trend === "stable" ? theme.mutedColor : theme.red;
        shRows.push([
          { text: sanitizeText(sig.metric), options: bodyCellOpts(theme, ri) },
          { text: sanitizeText(sig.currentValue), options: bodyCellOpts(theme, ri, "center") },
          { text: sanitizeText(sig.status), options: bodyCellOpts(theme, ri, "center", statusColor) },
          { text: sanitizeText(sig.trend), options: bodyCellOpts(theme, ri, "center", trendColor) },
        ]);
      });

      s.addTable(shRows, {
        x: 1, y: 1.15, w: 8, colW: [2.5, 2.0, 1.75, 1.75],
        border: { type: "solid", color: lighten(theme.primary, 0.85), pt: 0.5 },
        fontFace: FONTS.body,
      });
    } else {
      s.addText("Signal health data not available. Generate from campaign + postmaster data.", { x: 1, y: 2.5, w: 8, h: 0.5, fontSize: 12, color: theme.mutedColor, fontFace: FONTS.body, align: "center" });
    }
    addSlideFooter(s, theme, hasPostmasterData);
  }

  // ==========================================
  // SLIDES 7+: Reputation Trends — one slide per domain
  // Each slide: 2x2 chart grid (IP Rep, Domain Rep, Spam, Error) + domain-specific insights
  // ==========================================

  if (diagnostics.postmasterData && diagnostics.postmasterData.length > 0) {
    const MONTH_MAP_PPT: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
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

    // Group postmaster data by domain
    const domainMap = new Map<string, typeof diagnostics.postmasterData>();
    diagnostics.postmasterData.forEach((row) => {
      const d = row.domain?.trim();
      if (!d) return;
      if (!domainMap.has(d)) domainMap.set(d, []);
      domainMap.get(d)!.push(row);
    });

    // If no domain info, treat all data as one group
    if (domainMap.size === 0) {
      domainMap.set("All Domains", diagnostics.postmasterData);
    }

    const domainNames = Array.from(domainMap.keys()).sort();

    for (const domainName of domainNames) {
      const domainData = domainMap.get(domainName)!;
      slideNum++;
      const s = pptx.addSlide();
      addSlideBackground(s, theme);
      addDecorativeMotif(s, theme, "corner");
      addSlideHeader(s, `Reputation Trends — ${sanitizeText(domainName)}`, theme, undefined, slideNum);

      const pmData = [...domainData].sort((a, b) => {
        const da = parsePmDate(a.date);
        const db = parsePmDate(b.date);
        if (!da || !db) return 0;
        return da.getTime() - db.getTime();
      });

      const pmDates = pmData.map(p => sanitizeText(p.date));
      const spamData = pmData.map(p => (p.spamRatio || 0) * 100);
      const errorData = pmData.map(p => (p.errorRatio || 0) * 100);

      const ipRepEntries = pmData.filter(p => repToNum(p.ipReputation) !== null);
      const domainRepEntries = pmData.filter(p => repToNum(p.domainReputation) !== null);
      const ipRepDates = ipRepEntries.map(p => sanitizeText(p.date));
      const domainRepDates = domainRepEntries.map(p => sanitizeText(p.date));
      const ipRepData = ipRepEntries.map(p => repToNum(p.ipReputation) as number);
      const domainRepData = domainRepEntries.map(p => repToNum(p.domainReputation) as number);

      const chartPositions = [
        { x: 0.3, y: 1.1, w: 4.4, h: 2.0 },
        { x: 5.3, y: 1.1, w: 4.4, h: 2.0 },
        { x: 0.3, y: 3.2, w: 4.4, h: 2.0 },
        { x: 5.3, y: 3.2, w: 4.4, h: 2.0 },
      ];

      const chartConfigs = [
        { name: "IP Reputation", data: ipRepData, labels: ipRepDates, color: theme.primary, min: 0, max: 3, isReputation: true },
        { name: "Domain Reputation", data: domainRepData, labels: domainRepDates, color: theme.secondary, min: 0, max: 3, isReputation: true },
        { name: "Spam Ratio %", data: spamData, labels: pmDates, color: theme.red, isReputation: false },
        { name: "Error Ratio %", data: errorData, labels: pmDates, color: theme.amber, isReputation: false },
      ];

      chartConfigs.forEach((cfg, i) => {
        if (cfg.data.length === 0) return;
        const opts: any = {
          ...chartPositions[i],
          showLegend: false, lineSmooth: !cfg.isReputation, lineSize: 2,
          catAxisLabelFontSize: 6, valAxisLabelFontSize: 7,
          catGridLine: { style: "none" },
          valGridLine: { color: lighten(theme.primary, 0.88), style: "dash" },
          chartColors: [cfg.color],
          showTitle: true, title: cfg.name, titleFontSize: 9, titleColor: theme.titleColor,
        };
        if (cfg.min !== undefined) opts.valAxisMinVal = cfg.min;
        if (cfg.max !== undefined) opts.valAxisMaxVal = cfg.max;

        if (cfg.isReputation) {
          opts.valAxisMajorUnit = 1;
          opts.valAxisHidden = true;
          opts.valAxisLabelFontSize = 1;
          opts.valAxisLabelColor = theme.slideBg;
        }

        s.addChart("line" as pptxgen.CHART_NAME, [{ name: cfg.name, labels: cfg.labels, values: cfg.data }], opts);

        if (cfg.isReputation) {
          const pos = chartPositions[i];
          const repLabels = ["BAD", "LOW", "MEDIUM", "HIGH"];
          const chartAreaX = pos.x + 0.35;
          const chartTop = pos.y + 0.35;
          const chartBottom = pos.y + pos.h - 0.25;
          const plotHeight = chartBottom - chartTop;
          repLabels.forEach((label, li) => {
            const yPos = chartBottom - (li / 3) * plotHeight - 0.08;
            s.addText(label, {
              x: chartAreaX - 0.55, y: yPos, w: 0.55, h: 0.16,
              fontSize: 5, color: li >= 2 ? theme.green : li === 1 ? theme.amber : theme.red,
              fontFace: FONTS.body, align: "right", bold: true,
            });
          });
        }
      });

      // Domain-specific insights from the engine
      const domainInsights = sectionInsights?.reputationTrendsByDomain?.[domainName]
        || sectionInsights?.reputationTrends
        || [];
      addInsightBlock(s, domainInsights.length > 0 ? domainInsights : undefined, 0, theme);
      addSlideFooter(s, theme, hasPostmasterData);
    }
  } else {
    // No postmaster data — single fallback slide
    slideNum++;
    const s = pptx.addSlide();
    addSlideBackground(s, theme);
    addDecorativeMotif(s, theme, "corner");
    addSlideHeader(s, "Reputation Trends", theme, undefined, slideNum);
    s.addText("Postmaster data required for reputation trend charts.", { x: 1, y: 2.5, w: 8, h: 0.5, fontSize: 12, color: theme.mutedColor, fontFace: FONTS.body, align: "center" });
    addInsightBlock(s, sectionInsights?.reputationTrends, 0, theme);
    addSlideFooter(s, theme, hasPostmasterData);
  }

  // ==========================================
  // SLIDES 8 & 9: Best & Underperforming Campaigns (Top 5 each)
  // Columns match app: Start Date, Campaign Name, Subject Line, Sent, Unique Open, Open%, Unique Clicked, Click%, Unique CTR, Unsubs, Unsub%, Hard Bounce, Hard%, Soft Bounce, Soft%
  // ==========================================
  const createFullCampaignHeader = (): pptxgen.TableRow =>
    ["Date", "Campaign", "Subject", "Sent", "Open", "Open%", "Click", "Click%", "CTR", "Unsub", "Unsub%", "Hard", "Hard%", "Soft", "Soft%"]
      .map((h, i) => ({ text: h, options: headerCellOpts(theme, i < 3 ? "left" : "center") }));

  const createFullCampaignRow = (c: TopCampaign, ri: number): pptxgen.TableRow => {
    const denom = c.totalDeliveredUsers > 0 ? c.totalDeliveredUsers : c.totalSentUsers;
    const uniqueCTR = c.uniqueViewed > 0 ? (c.uniqueClicked / c.uniqueViewed) * 100 : 0;
    const unsubPct = denom > 0 ? (c.unsubscribes / denom) * 100 : 0;
    const hardPct = denom > 0 ? (c.hardBounces / denom) * 100 : 0;
    const softPct = denom > 0 ? (c.softBounces / denom) * 100 : 0;
    return [
      { text: sanitizeText(c.startDate) || "—", options: bodyCellOpts(theme, ri) },
      { text: sanitizeText((c.campaignName || "").substring(0, 40)), options: bodyCellOpts(theme, ri) },
      { text: cleanSubjectLine(c.subjectLine).substring(0, 45), options: bodyCellOpts(theme, ri) },
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

  const campaignColW = [0.55, 1.1, 1.2, 0.45, 0.45, 0.5, 0.45, 0.45, 0.45, 0.4, 0.45, 0.4, 0.45, 0.4, 0.45];

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

  // Best Performing — by Open Rate (separate slide)
  slideNum++;
  {
    const s = pptx.addSlide();
    addSlideBackground(s, theme);
    addDecorativeMotif(s, theme, "corner");
    addSlideHeader(s, "Best Performing Campaigns — by Open Rate", theme, undefined, slideNum);

    const byOpenRate = [...allCampaignsForSort].sort((a, b) => b.openRate - a.openRate).slice(0, 5);
    const rows: pptxgen.TableRow[] = [createFullCampaignHeader()];
    byOpenRate.forEach((c, ri) => rows.push(createFullCampaignRow(c, ri)));

    s.addText("Top 5 by Unique Open Rate", { x: 0.5, y: 1.0, w: 5, h: 0.2, fontSize: 8, italic: true, color: theme.mutedColor, fontFace: FONTS.body });
    s.addTable(rows, {
      x: 0.2, y: 1.25, w: 9.6, colW: campaignColW,
      border: { type: "solid", color: lighten(theme.primary, 0.85), pt: 0.5 },
      fontFace: FONTS.body,
    });

    // One-liner insight matching the app
    if (byOpenRate.length > 0) {
      const avgOpen = byOpenRate.reduce((s, c) => s + c.openRate, 0) / byOpenRate.length;
      const avgClick = byOpenRate.reduce((s, c) => s + c.clickRate, 0) / byOpenRate.length;
      s.addText(sanitizeText(`Top performers achieved ${avgOpen.toFixed(1)}% avg open rate and ${avgClick.toFixed(1)}% click rate.`), {
        x: 0.3, y: ZONE.INSIGHT_Y - 0.15, w: 9.0, h: 0.2, fontSize: 7, italic: true, color: theme.mutedColor, fontFace: FONTS.body,
      });
    }
    addInsightBlock(s, sectionInsights?.bestPerformingOpenRate, 0, theme);
    addSlideFooter(s, theme, hasPostmasterData);
  }

  // Best Performing — by CTR (separate slide)
  slideNum++;
  {
    const s = pptx.addSlide();
    addSlideBackground(s, theme);
    addDecorativeMotif(s, theme, "corner");
    addSlideHeader(s, "Best Performing Campaigns — by CTR", theme, undefined, slideNum);

    const byCTR = [...allCampaignsForSort]
      .sort((a, b) => {
        const ctrA = a.uniqueViewed > 0 ? (a.uniqueClicked / a.uniqueViewed) * 100 : 0;
        const ctrB = b.uniqueViewed > 0 ? (b.uniqueClicked / b.uniqueViewed) * 100 : 0;
        return ctrB - ctrA;
      }).slice(0, 5);

    const rows: pptxgen.TableRow[] = [createFullCampaignHeader()];
    byCTR.forEach((c, ri) => rows.push(createFullCampaignRow(c, ri)));

    s.addText("Top 5 by Unique CTR", { x: 0.5, y: 1.0, w: 5, h: 0.2, fontSize: 8, italic: true, color: theme.mutedColor, fontFace: FONTS.body });
    s.addTable(rows, {
      x: 0.2, y: 1.25, w: 9.6, colW: campaignColW,
      border: { type: "solid", color: lighten(theme.primary, 0.85), pt: 0.5 },
      fontFace: FONTS.body,
    });
    addInsightBlock(s, sectionInsights?.bestPerformingCTR, 0, theme);
    addSlideFooter(s, theme, hasPostmasterData);
  }

  // Underperforming — by Open Rate (separate slide)
  slideNum++;
  {
    const s = pptx.addSlide();
    addSlideBackground(s, theme);
    addDecorativeMotif(s, theme, "side");
    addSlideHeader(s, "Underperforming Campaigns — by Open Rate", theme, undefined, slideNum);

    s.addShape("roundRect" as pptxgen.SHAPE_NAME, {
      x: 0.1, y: 0.15, w: 9.8, h: 0.9,
      fill: { color: theme.slideBg, transparency: 100 },
      line: { color: theme.amber, width: 1 }, rectRadius: 0.06,
    });

    const byOpenRate = [...worstFiltered].sort((a, b) => a.openRate - b.openRate).slice(0, 5);
    const rows: pptxgen.TableRow[] = [createFullCampaignHeader()];
    byOpenRate.forEach((c, ri) => rows.push(createFullCampaignRow(c, ri)));

    s.addText("Bottom 5 by Unique Open Rate", { x: 0.5, y: 1.0, w: 5, h: 0.2, fontSize: 8, italic: true, color: theme.mutedColor, fontFace: FONTS.body });
    s.addTable(rows, {
      x: 0.2, y: 1.25, w: 9.6, colW: campaignColW,
      border: { type: "solid", color: lighten(theme.primary, 0.85), pt: 0.5 },
      fontFace: FONTS.body,
    });

    // One-liner insight matching the app
    if (byOpenRate.length > 0) {
      const avgOpen = byOpenRate.reduce((s, c) => s + c.openRate, 0) / byOpenRate.length;
      const avgClick = byOpenRate.reduce((s, c) => s + c.clickRate, 0) / byOpenRate.length;
      s.addText(sanitizeText(`Under-performers averaged ${avgOpen.toFixed(1)}% open rate and ${avgClick.toFixed(1)}% click rate.`), {
        x: 0.3, y: ZONE.INSIGHT_Y - 0.15, w: 9.0, h: 0.2, fontSize: 7, italic: true, color: theme.mutedColor, fontFace: FONTS.body,
      });
    }
    addInsightBlock(s, sectionInsights?.underperformingOpenRate, 0, theme);
    addSlideFooter(s, theme, hasPostmasterData);
  }

  // Underperforming — by CTR (separate slide)
  slideNum++;
  {
    const s = pptx.addSlide();
    addSlideBackground(s, theme);
    addDecorativeMotif(s, theme, "side");
    addSlideHeader(s, "Underperforming Campaigns — by CTR", theme, undefined, slideNum);

    s.addShape("roundRect" as pptxgen.SHAPE_NAME, {
      x: 0.1, y: 0.15, w: 9.8, h: 0.9,
      fill: { color: theme.slideBg, transparency: 100 },
      line: { color: theme.amber, width: 1 }, rectRadius: 0.06,
    });

    const byCTR = [...worstFiltered]
      .sort((a, b) => {
        const ctrA = a.uniqueViewed > 0 ? (a.uniqueClicked / a.uniqueViewed) * 100 : 0;
        const ctrB = b.uniqueViewed > 0 ? (b.uniqueClicked / b.uniqueViewed) * 100 : 0;
        return ctrA - ctrB;
      }).slice(0, 5);

    const rows: pptxgen.TableRow[] = [createFullCampaignHeader()];
    byCTR.forEach((c, ri) => rows.push(createFullCampaignRow(c, ri)));

    s.addText("Bottom 5 by Unique CTR", { x: 0.5, y: 1.0, w: 5, h: 0.2, fontSize: 8, italic: true, color: theme.mutedColor, fontFace: FONTS.body });
    s.addTable(rows, {
      x: 0.2, y: 1.25, w: 9.6, colW: campaignColW,
      border: { type: "solid", color: lighten(theme.primary, 0.85), pt: 0.5 },
      fontFace: FONTS.body,
    });
    addInsightBlock(s, sectionInsights?.underperformingCTR, 0, theme);
    addSlideFooter(s, theme, hasPostmasterData);
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

      // Left column: Effective Practices table
      s.addText("Effective Design & Content Practices", { x: 0.3, y: 1.05, w: 3, h: 0.25, fontSize: 9, bold: true, color: theme.green, fontFace: FONTS.body });

      const practiceRows: pptxgen.TableRow[] = [
        [
          { text: "Area", options: headerCellOpts(theme) },
          { text: "Practice", options: headerCellOpts(theme) },
        ],
      ];
      creativeAnalysis.effectivePractices.forEach((p, ri) => {
        practiceRows.push([
          { text: sanitizeText(p.area), options: bodyCellOpts(theme, ri) },
          { text: sanitizeText(p.practice), options: bodyCellOpts(theme, ri) },
        ]);
      });

      s.addTable(practiceRows, {
        x: 0.3, y: 1.35, w: 3.0, colW: [1.0, 2.0],
        border: { type: "solid", color: lighten(theme.primary, 0.85), pt: 0.5 },
        fontFace: FONTS.body,
      });

      // Center: Creative image — use contain to preserve aspect ratio without stretching
      if (creativeImage) {
        s.addImage({
          data: creativeImage,
          x: 3.6, y: 1.35, w: 2.8, h: 3.2,
          sizing: { type: "contain", w: 2.8, h: 3.2 },
        });
      } else if (false) {
        // placeholder disabled
        s.addShape("roundRect" as pptxgen.SHAPE_NAME, {
          x: 3.8, y: 1.8, w: 2.4, h: 2.5,
          fill: { color: theme.altRowBg },
          line: { color: lighten(theme.primary, 0.8), width: 0.75, dashType: "dash" },
          rectRadius: 0.1,
        });
        s.addText("Email Creative", { x: 3.8, y: 2.8, w: 2.4, h: 0.5, fontSize: 10, color: theme.mutedColor, fontFace: FONTS.body, align: "center" });
      }

      // Right column: Risk Areas table
      s.addText("Design & Content Risk Areas", { x: 6.7, y: 1.05, w: 3, h: 0.25, fontSize: 9, bold: true, color: theme.amber, fontFace: FONTS.body });

      const riskRows: pptxgen.TableRow[] = [
        [
          { text: "Area", options: headerCellOpts(theme) },
          { text: "Observation", options: headerCellOpts(theme) },
          { text: "Impact", options: headerCellOpts(theme) },
        ],
      ];
      creativeAnalysis.riskAreas.forEach((r, ri) => {
        riskRows.push([
          { text: sanitizeText(r.area), options: bodyCellOpts(theme, ri) },
          { text: sanitizeText(r.observation), options: bodyCellOpts(theme, ri) },
          { text: sanitizeText(r.impact), options: bodyCellOpts(theme, ri) },
        ]);
      });

      s.addTable(riskRows, {
        x: 6.7, y: 1.35, w: 3.0, colW: [0.8, 1.2, 1.0],
        border: { type: "solid", color: lighten(theme.primary, 0.85), pt: 0.5 },
        fontFace: FONTS.body,
      });

      addSlideFooter(s, theme, hasPostmasterData);
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

      addSlideFooter(s, theme, hasPostmasterData);
    }
  }

  // ==========================================
  // SLIDE 12: Send Mix & Lifecycle Coverage
  // ==========================================
  slideNum++;
  {
    const s = pptx.addSlide();
    addSlideBackground(s, theme);
    addDecorativeMotif(s, theme, "diagonal");
    addSlideHeader(s, "Send Mix & Lifecycle Coverage", theme, undefined, slideNum);

    // Send Mix Analysis from enhanced reputation report
    const enhRep = diagnostics.reputationReport?.enhancedReport;
    let mixEndY = 1.15;

    if (enhRep?.sendMixAnalysis) {
      const mix = enhRep.sendMixAnalysis;
      const mixTypes = ["Transactional", "Lifecycle", "Promotional"];
      const mixValues = [mix.transactionalPercent, mix.lifecyclePercent, mix.promotionalPercent];

      const mixHeaderRow: pptxgen.TableCell[] = [
        { text: "Delivery Type", options: headerCellOpts(theme) },
        { text: "Share %", options: headerCellOpts(theme, "center") },
        { text: "Status", options: headerCellOpts(theme, "center") },
      ];

      const getStatus = (type: string): { text: string; color: string } => {
        const tl = type.toLowerCase();
        if (mix.overweightedTypes.includes(tl)) return { text: "Overweighted", color: theme.red };
        if (mix.underutilizedAbsorbers.includes(tl)) return { text: "Underutilized", color: theme.amber };
        return { text: "Balanced", color: theme.green };
      };

      const mixRows: pptxgen.TableRow[] = [mixHeaderRow];
      mixTypes.forEach((t, ri) => {
        const st = getStatus(t);
        mixRows.push([
          { text: t, options: bodyCellOpts(theme, ri) },
          { text: `${mixValues[ri].toFixed(1)}%`, options: bodyCellOpts(theme, ri, "center") },
          { text: st.text, options: bodyCellOpts(theme, ri, "center", st.color) },
        ]);
      });

      s.addText("Send Mix Analysis", { x: 0.5, y: 1.05, w: 4, h: 0.25, fontSize: 10, bold: true, color: theme.titleColor, fontFace: FONTS.body });
      s.addTable(mixRows, {
        x: 0.5, y: 1.35, w: 4, colW: [1.5, 1.25, 1.25],
        border: { type: "solid", color: lighten(theme.primary, 0.85), pt: 0.5 },
        fontFace: FONTS.body,
      });
      mixEndY = 1.35 + (mixRows.length) * 0.3;
    }

    // Lifecycle Coverage Matrix
    if (lifecycleCoverage && lifecycleCoverage.length > 0) {
      const lcRows: pptxgen.TableRow[] = [
        [
          { text: "Lifecycle Stage", options: headerCellOpts(theme) },
          { text: "Coverage", options: headerCellOpts(theme, "center") },
          { text: "Active/Total", options: headerCellOpts(theme, "center") },
          { text: "Campaigns", options: headerCellOpts(theme, "center") },
          { text: "Status", options: headerCellOpts(theme, "center") },
        ],
      ];

      lifecycleCoverage.forEach((lc, ri) => {
        const statusColor = lc.coverage === "Strong" ? theme.green : lc.coverage === "Partial" ? theme.amber : theme.red;
        const coveragePct = lc.totalUseCases > 0 ? ((lc.activeUseCases / lc.totalUseCases) * 100).toFixed(0) + "%" : "0%";
        lcRows.push([
          { text: lc.stage, options: bodyCellOpts(theme, ri) },
          { text: coveragePct, options: bodyCellOpts(theme, ri, "center") },
          { text: `${lc.activeUseCases}/${lc.totalUseCases}`, options: bodyCellOpts(theme, ri, "center") },
          { text: String(lc.campaignCount), options: bodyCellOpts(theme, ri, "center") },
          { text: lc.coverage, options: bodyCellOpts(theme, ri, "center", statusColor) },
        ]);
      });

      s.addText("Lifecycle Coverage Matrix", { x: 5, y: 1.05, w: 4.5, h: 0.25, fontSize: 10, bold: true, color: theme.titleColor, fontFace: FONTS.body });
      s.addTable(lcRows, {
        x: 5, y: 1.35, w: 4.5, colW: [1.2, 0.7, 0.8, 0.8, 1.0],
        border: { type: "solid", color: lighten(theme.primary, 0.85), pt: 0.5 },
        fontFace: FONTS.body,
      });
    } else {
      // Fallback: keyword-based lifecycle from campaign data
      const stageKeywords: Record<string, string[]> = {
        Onboarding: ["welcome", "onboard", "getting started", "verify", "activation"],
        Engagement: ["engage", "newsletter", "weekly", "digest", "update", "content"],
        Conversion: ["offer", "discount", "promo", "sale", "deal", "buy", "purchase", "upgrade"],
        Retention: ["retain", "renew", "comeback", "reactivate", "win-back", "winback", "miss you"],
        Referral: ["refer", "invite", "share", "friend"],
        Transactional: ["receipt", "confirm", "order", "invoice", "shipping", "deliver"],
      };
      const stageCounts: Record<string, number> = {};
      Object.keys(stageKeywords).forEach(st => { stageCounts[st] = 0; });

      diagnostics.rawData.forEach(c => {
        const text = `${c.campaignName} ${c.subjectLine} ${c.title}`.toLowerCase();
        let matched = false;
        for (const [stage, keywords] of Object.entries(stageKeywords)) {
          if (keywords.some(k => text.includes(k))) { stageCounts[stage]++; matched = true; break; }
        }
        if (!matched) stageCounts["Engagement"] = (stageCounts["Engagement"] || 0) + 1;
      });

      const total = diagnostics.rawData.length;
      const lcRows: pptxgen.TableRow[] = [
        [
          { text: "Lifecycle Stage", options: headerCellOpts(theme) },
          { text: "Campaign Count", options: headerCellOpts(theme, "center") },
          { text: "Coverage %", options: headerCellOpts(theme, "center") },
          { text: "Status", options: headerCellOpts(theme, "center") },
        ],
      ];
      Object.entries(stageCounts).forEach(([stage, count], ri) => {
        const pct = total > 0 ? (count / total) * 100 : 0;
        const status = pct > 15 ? "Strong" : pct > 5 ? "Partial" : "Weak";
        const statusColor = status === "Strong" ? theme.green : status === "Partial" ? theme.amber : theme.red;
        lcRows.push([
          { text: stage, options: bodyCellOpts(theme, ri) },
          { text: String(count), options: bodyCellOpts(theme, ri, "center") },
          { text: `${pct.toFixed(1)}%`, options: bodyCellOpts(theme, ri, "center") },
          { text: status, options: bodyCellOpts(theme, ri, "center", statusColor) },
        ]);
      });

      s.addText("Lifecycle Coverage (Inferred)", { x: 5, y: 1.05, w: 4.5, h: 0.25, fontSize: 10, bold: true, color: theme.titleColor, fontFace: FONTS.body });
      s.addTable(lcRows, {
        x: 5, y: 1.35, w: 4.5, colW: [1.5, 1.0, 1.0, 1.0],
        border: { type: "solid", color: lighten(theme.primary, 0.85), pt: 0.5 },
        fontFace: FONTS.body,
      });
    }

    addInsightBlock(s, sectionInsights?.sendMixCoverage, 0, theme);
    addSlideFooter(s, theme, hasPostmasterData);
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
        x: 0.5, y: 1.15, w: 9, colW: [3.2, 4.0, 1.8],
        border: { type: "solid", color: lighten(theme.primary, 0.85), pt: 0.5 },
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
          x: 0.5, y: 1.15, w: 9, colW: [3.5, 5.5],
          border: { type: "solid", color: lighten(theme.primary, 0.85), pt: 0.5 },
          fontFace: FONTS.body,
        });
      }
    }
    addInsightBlock(s, sectionInsights?.keyLearnings, 0, theme);
    addSlideFooter(s, theme, hasPostmasterData);
  }

  // ============= GENERATE FILE =============
  const safeMonthRange = monthRange.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
  const brandLabel = brandProfile?.brand_identity?.brand_name || brandName;
  const fallbackName = `${brandLabel}_Diagnostics_Executive_${safeMonthRange || "Report"}`;
  const fileName = buildExportFileName(opts.sourceFileName, fallbackName);

  await pptx.writeFile({ fileName });
};
