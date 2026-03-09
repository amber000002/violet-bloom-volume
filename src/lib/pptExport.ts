import pptxgen from "pptxgenjs";
import { buildExportFileName } from "./exportFileNameUtils";
import { CoreBrandJSON, BrandDesignProfile, BrandVisualAssets } from "@/types/brandProfile";

// ============= TYPES =============

interface SlideContent {
  title: string;
  subtitle?: string;
  bullets?: string[];
  volumeRange?: string;
  activeVolume?: string;
  inactiveVolume?: string;
  insight?: string;
}

interface InboxPotentialData {
  industry: string;
  businessModel: string;
  minVolume: number;
  maxVolume: number;
  activeVolume: number;
  inactiveVolume: number;
  purchaseCycle: string;
  frequencyReason: string;
  fatigueRisk: string;
  activePercent: number;
}

interface JourneyData {
  name: string;
  triggerType: string;
  whyItWorks: string;
}

interface CampaignData {
  name: string;
  purpose: string;
  bestTiming: string;
  suppressionAdvice: string;
}

interface UseCaseStudioData {
  framework: string;
  frameworkReason: string;
  journeys: JourneyData[];
  campaigns: CampaignData[];
}

interface AMPStudioData {
  industry: string;
  ampBenefits: string[];
  useCases: string[];
  guardrails: string[];
  supportsGamification: boolean;
}

interface DiagnosticsExportData {
  totalCampaigns: number;
  totalEmailsSent: number;
  medianOpenRate: number;
  medianClickRate: number;
  bestCampaign: string;
  worstCampaign: string;
  openRateTrend: string;
  clickRateTrend: string;
  overallRisk: string;
  recommendations: { title: string; description: string }[];
}

// ============= BRAND THEME ENGINE =============

interface BrandSlideTheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  textPrimary: string;
  textSecondary: string;
  chartPrimary: string;
  chartSecondary: string;
  chartNeutral: string;
  heroGradientStart: string;
  heroGradientEnd: string;
  accentGradientStart: string;
  accentGradientEnd: string;
  hasLogo: boolean;
  logoUrl: string;
  designDensity: string;
  visualStyle: string;
  ctaRadius: string;
  ctaFill: string;
  // Visual asset references
  visualAssets: BrandVisualAssets | null;
}

const DEFAULT_SLIDE_THEME: BrandSlideTheme = {
  primary: "7C3AED",
  secondary: "EC4899",
  accent: "A78BFA",
  background: "FFFFFF",
  textPrimary: "1A1A2E",
  textSecondary: "6B7280",
  chartPrimary: "7C3AED",
  chartSecondary: "EC4899",
  chartNeutral: "D1D5DB",
  heroGradientStart: "7C3AED",
  heroGradientEnd: "EC4899",
  accentGradientStart: "A78BFA",
  accentGradientEnd: "C4B5FD",
  hasLogo: false,
  logoUrl: "",
  designDensity: "editorial",
  visualStyle: "minimal_graphics",
  ctaRadius: "8px",
  ctaFill: "solid",
};

const hexClean = (color: string | undefined): string => {
  if (!color) return "";
  return color.replace(/^#/, "").trim();
};

const isValidHex = (hex: string): boolean => /^[0-9a-fA-F]{6}$/.test(hex);

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
  if (!isValidHex(hex)) return hex;
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * factor,
    g + (255 - g) * factor,
    b + (255 - b) * factor
  );
};

const luminance = (hex: string): number => {
  if (!isValidHex(hex)) return 0.5;
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

/** Parse CSS gradient string to extract hex colors */
const parseGradientColors = (gradient: string | undefined): { start: string; end: string } | null => {
  if (!gradient) return null;
  const hexMatches = gradient.match(/#([0-9a-fA-F]{6})/g);
  if (hexMatches && hexMatches.length >= 2) {
    return { start: hexMatches[0].replace("#", ""), end: hexMatches[1].replace("#", "") };
  }
  return null;
};

const buildSlideTheme = (brandProfile?: CoreBrandJSON | null): BrandSlideTheme => {
  if (!brandProfile) return DEFAULT_SLIDE_THEME;

  const designProfile = brandProfile.brand_design_profile;
  const brandColors = brandProfile.brand_colors;

  // Priority 1: brand_design_profile.colors
  // Priority 2: brand_colors
  // Priority 3: defaults

  let primary = "";
  let secondary = "";
  let accent = "";
  let background = "";
  let textPrimary = "";
  let textSecondary = "";

  // Resolve colors with priority chain
  if (designProfile?.colors) {
    primary = hexClean(designProfile.colors.primary);
    secondary = hexClean(designProfile.colors.secondary);
    accent = hexClean(designProfile.colors.accent);
    background = hexClean(designProfile.colors.background);
    textPrimary = hexClean(designProfile.colors.text_primary);
  }

  if (brandColors) {
    if (!isValidHex(primary)) primary = hexClean(brandColors.primary);
    if (!isValidHex(secondary)) secondary = hexClean(brandColors.secondary);
    if (!isValidHex(accent)) accent = hexClean(brandColors.accent);
    if (!isValidHex(background)) background = hexClean(brandColors.background);
    if (!isValidHex(textPrimary)) textPrimary = hexClean(brandColors.text_primary);
    textSecondary = hexClean(brandColors.text_secondary) || "";
  }

  // Fallback to defaults
  if (!isValidHex(primary)) primary = DEFAULT_SLIDE_THEME.primary;
  if (!isValidHex(secondary)) secondary = lighten(primary, 0.3);
  if (!isValidHex(accent)) accent = lighten(primary, 0.5);
  if (!isValidHex(background)) background = DEFAULT_SLIDE_THEME.background;
  if (!isValidHex(textPrimary)) textPrimary = luminance(primary) < 0.3 ? primary : DEFAULT_SLIDE_THEME.textPrimary;
  if (!isValidHex(textSecondary)) textSecondary = DEFAULT_SLIDE_THEME.textSecondary;

  // Chart palette: design_profile.chart_palette > derived from brand colors
  let chartPrimary = primary;
  let chartSecondary = secondary;
  let chartNeutral = DEFAULT_SLIDE_THEME.chartNeutral;

  if (designProfile?.chart_palette) {
    const cp = designProfile.chart_palette;
    if (isValidHex(hexClean(cp.primary))) chartPrimary = hexClean(cp.primary);
    if (isValidHex(hexClean(cp.secondary))) chartSecondary = hexClean(cp.secondary);
    if (isValidHex(hexClean(cp.neutral))) chartNeutral = hexClean(cp.neutral);
  }

  // Gradients
  let heroGradientStart = primary;
  let heroGradientEnd = secondary;
  let accentGradientStart = accent;
  let accentGradientEnd = lighten(accent, 0.3);

  if (designProfile?.gradients?.hero_gradient) {
    const parsed = parseGradientColors(designProfile.gradients.hero_gradient);
    if (parsed) {
      heroGradientStart = parsed.start;
      heroGradientEnd = parsed.end;
    }
  }
  if (designProfile?.gradients?.accent_gradient) {
    const parsed = parseGradientColors(designProfile.gradients.accent_gradient);
    if (parsed) {
      accentGradientStart = parsed.start;
      accentGradientEnd = parsed.end;
    }
  }

  // Logo
  const hasLogo = !!(designProfile?.logo?.logo_url);
  const logoUrl = designProfile?.logo?.logo_url || "";

  // Design density & visual style
  const designDensity = designProfile?.design_density || "editorial";
  const visualStyle = designProfile?.visual_style || "minimal_graphics";
  const ctaRadius = designProfile?.cta_style?.radius || "8px";
  const ctaFill = designProfile?.cta_style?.fill || "solid";

  return {
    primary,
    secondary,
    accent,
    background,
    textPrimary,
    textSecondary,
    chartPrimary,
    chartSecondary,
    chartNeutral,
    heroGradientStart,
    heroGradientEnd,
    accentGradientStart,
    accentGradientEnd,
    hasLogo,
    logoUrl,
    designDensity,
    visualStyle,
    ctaRadius,
    ctaFill,
  };
};

// ============= HELPER FUNCTIONS =============

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toFixed(0);
};

const FONTS = {
  headline: "Calibri",
  body: "Calibri",
};

/** Spacing multiplier based on design density */
const getDensitySpacing = (density: string): number => {
  switch (density) {
    case "minimal": return 1.3;
    case "editorial": return 1.15;
    case "corporate": return 1.0;
    case "playful": return 1.1;
    default: return 1.15;
  }
};

/** Fetch an external image URL as a base64 data URI for pptxgenjs embedding */
const fetchLogoAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

// ============= SLIDE HELPERS =============

const addBrandedBackground = (slide: pptxgen.Slide, theme: BrandSlideTheme) => {
  slide.background = { color: theme.background };
  // Subtle brand accent glow
  slide.addShape("ellipse" as pptxgen.SHAPE_NAME, {
    x: 6, y: 3, w: 6, h: 4,
    fill: { color: theme.accentGradientStart, transparency: 92 },
  });
};

const addSectionDivider = (
  pptx: pptxgen,
  theme: BrandSlideTheme,
  sectionNumber: string,
  title: string,
  subtitle: string,
  logoBase64: string | null
) => {
  const slide = pptx.addSlide();

  // Gradient background using hero gradient
  slide.background = { color: theme.heroGradientStart };
  slide.addShape("rect" as pptxgen.SHAPE_NAME, {
    x: 0, y: 0, w: 10, h: 5.625,
    fill: { color: theme.heroGradientEnd, transparency: 60 },
  });

  // Accent gradient panel
  slide.addShape("ellipse" as pptxgen.SHAPE_NAME, {
    x: 4, y: 1, w: 6, h: 4,
    fill: { color: theme.accentGradientEnd, transparency: 80 },
  });

  // Logo on section dividers
  if (logoBase64) {
    slide.addImage({
      data: logoBase64,
      x: 4.0, y: 0.3, w: 2.0, h: 0.8,
      sizing: { type: "contain", w: 2.0, h: 0.8 },
    });
  }

  const textColor = luminance(theme.heroGradientStart) > 0.6 ? theme.textPrimary : "FFFFFF";

  slide.addText(sectionNumber, {
    x: 0.5, y: 2, w: 9, h: 0.5,
    fontSize: 14, color: textColor, align: "center",
    fontFace: FONTS.body, transparency: 30,
  });
  slide.addText(title, {
    x: 0.5, y: 2.5, w: 9, h: 1,
    fontSize: 36, bold: true, color: textColor, align: "center",
    fontFace: FONTS.headline,
  });
  slide.addText(subtitle, {
    x: 0.5, y: 3.5, w: 9, h: 0.5,
    fontSize: 18, color: textColor, align: "center",
    fontFace: FONTS.body, transparency: 20,
  });
};

const addSlideTitle = (
  slide: pptxgen.Slide,
  title: string,
  theme: BrandSlideTheme
) => {
  // Brand-colored accent underline
  slide.addShape("rect" as pptxgen.SHAPE_NAME, {
    x: 0.5, y: 0.95, w: 2.5, h: 0.04,
    fill: { color: theme.primary },
  });

  slide.addText(title, {
    x: 0.5, y: 0.5, w: 9, h: 0.7,
    fontSize: 28, bold: true, color: theme.textPrimary,
    fontFace: FONTS.headline,
  });
};

// ============= MAIN EXPORT FUNCTION =============

export const exportToPPT = async (
  inboxData: InboxPotentialData | null,
  useCaseData: UseCaseStudioData | null,
  ampData: AMPStudioData | null,
  deckType: "executive" | "detailed" = "executive",
  diagnosticsData: DiagnosticsExportData | null = null,
  brandProfile?: CoreBrandJSON | null
) => {
  const theme = buildSlideTheme(brandProfile);
  const spacing = getDensitySpacing(theme.designDensity);

  // Pre-fetch logo as base64 to avoid CORS issues during PPT generation
  let logoBase64: string | null = null;
  if (theme.hasLogo && theme.logoUrl) {
    logoBase64 = await fetchLogoAsBase64(theme.logoUrl);
  }

  const pptx = new pptxgen();
  const brandName = brandProfile?.brand_identity?.brand_name || "Inbox Alchemy";

  pptx.author = brandName;
  pptx.title = `${brandName} – Email Strategy Overview`;
  pptx.subject = "Email Strategy Presentation";
  pptx.company = brandName;

  // ==========================================
  // TITLE SLIDE
  // ==========================================
  const titleSlide = pptx.addSlide();
  // Hero gradient background
  titleSlide.background = { color: theme.heroGradientStart };
  titleSlide.addShape("rect" as pptxgen.SHAPE_NAME, {
    x: 0, y: 0, w: 10, h: 5.625,
    fill: { color: theme.heroGradientEnd, transparency: 55 },
  });
  // Accent glow
  titleSlide.addShape("ellipse" as pptxgen.SHAPE_NAME, {
    x: 3, y: 1, w: 7, h: 5,
    fill: { color: theme.accentGradientStart, transparency: 85 },
  });

  const titleTextColor = luminance(theme.heroGradientStart) > 0.6 ? theme.textPrimary : "FFFFFF";

  // Logo on title slide
  if (logoBase64) {
    titleSlide.addImage({
      data: logoBase64,
      x: 3.5, y: 0.5, w: 3.0, h: 1.2,
      sizing: { type: "contain", w: 3.0, h: 1.2 },
    });
  }

  titleSlide.addText(brandName, {
    x: 0.5, y: 2.0, w: 9, h: 1,
    fontSize: 44, bold: true, color: titleTextColor, align: "center",
    fontFace: FONTS.headline,
  });
  titleSlide.addText("Email Strategy Overview", {
    x: 0.5, y: 3.2, w: 9, h: 0.5,
    fontSize: 24, color: titleTextColor, align: "center",
    fontFace: FONTS.body, transparency: 15,
  });
  if (inboxData) {
    titleSlide.addText(`${inboxData.industry} • ${inboxData.businessModel}`, {
      x: 0.5, y: 3.9, w: 9, h: 0.4,
      fontSize: 14, color: titleTextColor, align: "center",
      fontFace: FONTS.body, transparency: 35,
    });
  }

  // Bottom accent line
  titleSlide.addShape("rect" as pptxgen.SHAPE_NAME, {
    x: 3, y: 4.6, w: 4, h: 0.04,
    fill: { color: titleTextColor, transparency: 50 },
  });

  // ==========================================
  // SECTION 1: Inbox Potential
  // ==========================================
  if (inboxData) {
    addSectionDivider(pptx, theme, "Section 1", "Responsible Inbox Potential", "Industry-aligned monthly email scale", logoBase64);

    // Volume Summary Slide
    const volumeSlide = pptx.addSlide();
    addBrandedBackground(volumeSlide, theme);
    addSlideTitle(volumeSlide, "Volume Summary", theme);

    volumeSlide.addText(
      `≈ ${formatNumber(inboxData.minVolume)} – ${formatNumber(inboxData.maxVolume)} emails/month`,
      {
        x: 0.5, y: 1.5, w: 9, h: 0.8,
        fontSize: 32, bold: true, color: theme.primary, align: "center",
        fontFace: FONTS.headline,
      }
    );

    volumeSlide.addText("Volume Breakdown:", {
      x: 0.5, y: 2.8, w: 9, h: 0.4,
      fontSize: 16, bold: true, color: theme.textPrimary,
      fontFace: FONTS.body,
    });

    const totalVolume = inboxData.activeVolume + inboxData.inactiveVolume;
    const activePercent = Math.round((inboxData.activeVolume / totalVolume) * 100);

    volumeSlide.addText(
      [
        { text: "• ", options: { color: theme.chartPrimary } },
        { text: `Active users: ${formatNumber(inboxData.activeVolume)} (${activePercent}%)`, options: { color: theme.textPrimary } },
      ],
      { x: 0.5, y: 3.3, w: 9, h: 0.4, fontSize: 14, fontFace: FONTS.body }
    );
    volumeSlide.addText(
      [
        { text: "• ", options: { color: theme.chartSecondary } },
        { text: `Re-engagement: ${formatNumber(inboxData.inactiveVolume)} (${100 - activePercent}%)`, options: { color: theme.textPrimary } },
      ],
      { x: 0.5, y: 3.7, w: 9, h: 0.4, fontSize: 14, fontFace: FONTS.body }
    );

    volumeSlide.addText("Key Assumption:", {
      x: 0.5, y: 4.4, w: 9, h: 0.4,
      fontSize: 14, bold: true, color: theme.textSecondary,
      fontFace: FONTS.body,
    });
    volumeSlide.addText(
      `Active user base: ${Math.round(inboxData.activePercent * 100)}% • Frequency guardrails applied`,
      { x: 0.5, y: 4.8, w: 9, h: 0.4, fontSize: 12, color: theme.textSecondary, fontFace: FONTS.body }
    );

    // Strategic Insight Slide
    const insightSlide = pptx.addSlide();
    addBrandedBackground(insightSlide, theme);
    addSlideTitle(insightSlide, "Strategic Insight", theme);

    const insights = [
      { label: "What drives volume", text: inboxData.purchaseCycle },
      { label: "Primary risk to avoid", text: inboxData.fatigueRisk },
      { label: "Biggest growth lever", text: inboxData.frequencyReason },
    ];

    insights.forEach((insight, i) => {
      // Insight callout card with accent gradient
      insightSlide.addShape("roundRect" as pptxgen.SHAPE_NAME, {
        x: 0.4, y: 1.4 + i * 1.4, w: 9.2, h: 1.2,
        fill: { color: theme.accentGradientStart, transparency: 92 },
        line: { color: lighten(theme.primary, 0.8), width: 0.5 },
        rectRadius: 0.06,
      });
      // Left accent stripe
      insightSlide.addShape("rect" as pptxgen.SHAPE_NAME, {
        x: 0.4, y: 1.4 + i * 1.4, w: 0.06, h: 1.2,
        fill: { color: theme.primary },
      });

      insightSlide.addText(insight.label, {
        x: 0.6, y: 1.45 + i * 1.4, w: 8.8, h: 0.4,
        fontSize: 14, bold: true, color: theme.primary,
        fontFace: FONTS.body,
      });
      insightSlide.addText(insight.text, {
        x: 0.6, y: 1.85 + i * 1.4, w: 8.8, h: 0.7,
        fontSize: 13, color: theme.textPrimary,
        fontFace: FONTS.body,
      });
    });
  }

  // ==========================================
  // SECTION 2: Use Case Studio
  // ==========================================
  if (useCaseData) {
    addSectionDivider(pptx, theme, "Section 2", "Use Case Studio", "Framework-driven lifecycle journeys & campaigns", logoBase64);

    // Framework Slide
    const frameworkSlide = pptx.addSlide();
    addBrandedBackground(frameworkSlide, theme);
    addSlideTitle(frameworkSlide, "Use Case Framework", theme);

    frameworkSlide.addText(`Selected Framework: ${useCaseData.framework}`, {
      x: 0.5, y: 1.5, w: 9, h: 0.5,
      fontSize: 18, bold: true, color: theme.primary,
      fontFace: FONTS.headline,
    });
    frameworkSlide.addText(useCaseData.frameworkReason, {
      x: 0.5, y: 2.2, w: 9, h: 1,
      fontSize: 14, color: theme.textPrimary,
      fontFace: FONTS.body,
    });

    // Journeys Slide
    const journeysSlide = pptx.addSlide();
    addBrandedBackground(journeysSlide, theme);
    addSlideTitle(journeysSlide, "Always-on Journeys", theme);

    const journeysToShow = deckType === "executive"
      ? useCaseData.journeys.slice(0, 4)
      : useCaseData.journeys.slice(0, 6);

    journeysToShow.forEach((journey, i) => {
      journeysSlide.addText(journey.name, {
        x: 0.5, y: 1.3 + i * 0.9,
        w: 9, h: 0.35,
        fontSize: 14, bold: true, color: theme.textPrimary,
        fontFace: FONTS.body,
      });
      journeysSlide.addText(`Trigger: ${journey.triggerType} • ${journey.whyItWorks}`, {
        x: 0.5, y: 1.6 + i * 0.9,
        w: 9, h: 0.4,
        fontSize: 11, color: theme.textSecondary,
        fontFace: FONTS.body,
      });
    });

    // Campaigns Slide
    const campaignsSlide = pptx.addSlide();
    addBrandedBackground(campaignsSlide, theme);
    addSlideTitle(campaignsSlide, "Contextual Campaigns", theme);

    const campaignsToShow = deckType === "executive"
      ? useCaseData.campaigns.slice(0, 4)
      : useCaseData.campaigns.slice(0, 6);

    campaignsToShow.forEach((campaign, i) => {
      campaignsSlide.addText(campaign.name, {
        x: 0.5, y: 1.3 + i * 1.1,
        w: 9, h: 0.35,
        fontSize: 14, bold: true, color: theme.textPrimary,
        fontFace: FONTS.body,
      });
      campaignsSlide.addText(
        `${campaign.purpose}\nBest timing: ${campaign.bestTiming}\nSuppression: ${campaign.suppressionAdvice}`,
        {
          x: 0.5, y: 1.6 + i * 1.1,
          w: 9, h: 0.7,
          fontSize: 10, color: theme.textSecondary,
          fontFace: FONTS.body,
        }
      );
    });
  }

  // ==========================================
  // SECTION 3: AMP Email Studio
  // ==========================================
  if (ampData) {
    addSectionDivider(pptx, theme, "Section 3", "AMP Email Studio", "Interactive email experiences", logoBase64);

    // Why Interactive Email
    const whyAmpSlide = pptx.addSlide();
    addBrandedBackground(whyAmpSlide, theme);
    addSlideTitle(whyAmpSlide, "Why Interactive Email", theme);

    whyAmpSlide.addText("Where AMP adds value:", {
      x: 0.5, y: 1.4, w: 9, h: 0.4,
      fontSize: 14, bold: true, color: theme.primary,
      fontFace: FONTS.body,
    });

    ampData.ampBenefits.forEach((benefit, i) => {
      whyAmpSlide.addText(`• ${benefit}`, {
        x: 0.5, y: 1.8 + i * 0.35,
        w: 9, h: 0.35,
        fontSize: 12, color: theme.textPrimary,
        fontFace: FONTS.body,
      });
    });

    whyAmpSlide.addText("Best suited use cases:", {
      x: 0.5, y: 3.2, w: 9, h: 0.4,
      fontSize: 14, bold: true, color: theme.primary,
      fontFace: FONTS.body,
    });

    ampData.useCases.slice(0, 4).forEach((useCase, i) => {
      whyAmpSlide.addText(`• ${useCase}`, {
        x: 0.5, y: 3.6 + i * 0.35,
        w: 9, h: 0.35,
        fontSize: 12, color: theme.textPrimary,
        fontFace: FONTS.body,
      });
    });

    // Brand-led Carousel Template
    const brandCarouselSlide = pptx.addSlide();
    addBrandedBackground(brandCarouselSlide, theme);
    addSlideTitle(brandCarouselSlide, "Brand-led Carousel Template", theme);

    const carouselFeatures = [
      "Brand logo prominently displayed",
      "Hero carousel with 3-4 personalized items",
      "Personalized headline based on user behavior",
      "Dynamic CTA that updates in real-time",
      "Footer with social links and preferences",
    ];

    carouselFeatures.forEach((feature, i) => {
      brandCarouselSlide.addText(`• ${feature}`, {
        x: 0.5, y: 1.5 + i * 0.5,
        w: 9, h: 0.4,
        fontSize: 14, color: theme.textPrimary,
        fontFace: FONTS.body,
      });
    });

    brandCarouselSlide.addText("Personalization signals: Past purchases, browsing history, preferences", {
      x: 0.5, y: 4.5, w: 9, h: 0.4,
      fontSize: 12, italic: true, color: theme.textSecondary,
      fontFace: FONTS.body,
    });

    // Gamified Template
    if (ampData.supportsGamification) {
      const gamifiedSlide = pptx.addSlide();
      addBrandedBackground(gamifiedSlide, theme);
      addSlideTitle(gamifiedSlide, "Gamified Interactive Template", theme);

      const gamifiedFeatures = [
        "Contextual hero image",
        "Interactive element (spin wheel, scratch card, quiz)",
        "Inline reward/result reveal",
        "Engaging CTA post-interaction",
        "Compliance-friendly footer",
      ];

      gamifiedFeatures.forEach((feature, i) => {
        gamifiedSlide.addText(`• ${feature}`, {
          x: 0.5, y: 1.5 + i * 0.5,
          w: 9, h: 0.4,
          fontSize: 14, color: theme.textPrimary,
          fontFace: FONTS.body,
        });
      });

      gamifiedSlide.addText("Best for: Commerce, Gaming, Fitness, Ed-tech, Loyalty programs", {
        x: 0.5, y: 4.5, w: 9, h: 0.4,
        fontSize: 12, italic: true, color: theme.textSecondary,
        fontFace: FONTS.body,
      });
    }
  }

  // ==========================================
  // SECTION 4: Inbox Diagnostics
  // ==========================================
  if (diagnosticsData) {
    addSectionDivider(pptx, theme, "Section 4", "Inbox Diagnostics", "Campaign performance analysis", logoBase64);

    // Performance slide
    const perfSlide = pptx.addSlide();
    addBrandedBackground(perfSlide, theme);
    addSlideTitle(perfSlide, "Campaign Performance", theme);

    perfSlide.addText(`${formatNumber(diagnosticsData.totalEmailsSent)} emails across ${diagnosticsData.totalCampaigns} campaigns`, {
      x: 0.5, y: 1.5, w: 9, h: 0.5,
      fontSize: 18, color: theme.primary, align: "center",
      fontFace: FONTS.headline,
    });
    perfSlide.addText(`Median Open Rate: ${diagnosticsData.medianOpenRate.toFixed(1)}%`, {
      x: 0.5, y: 2.5, w: 9, h: 0.4, fontSize: 14, color: theme.textPrimary, fontFace: FONTS.body,
    });
    perfSlide.addText(`Median Click Rate: ${diagnosticsData.medianClickRate.toFixed(1)}%`, {
      x: 0.5, y: 3, w: 9, h: 0.4, fontSize: 14, color: theme.textPrimary, fontFace: FONTS.body,
    });
    perfSlide.addText(`Open Rate Trend: ${diagnosticsData.openRateTrend} • Click Rate Trend: ${diagnosticsData.clickRateTrend}`, {
      x: 0.5, y: 3.8, w: 9, h: 0.4, fontSize: 12, color: theme.textSecondary, fontFace: FONTS.body,
    });

    // Recommendations slide
    const recSlide = pptx.addSlide();
    addBrandedBackground(recSlide, theme);
    addSlideTitle(recSlide, "Key Recommendations", theme);

    diagnosticsData.recommendations.slice(0, 4).forEach((rec, i) => {
      // Recommendation card
      recSlide.addShape("roundRect" as pptxgen.SHAPE_NAME, {
        x: 0.4, y: 1.3 + i * 1.1, w: 9.2, h: 0.95,
        fill: { color: theme.accentGradientStart, transparency: 93 },
        line: { color: lighten(theme.primary, 0.85), width: 0.5 },
        rectRadius: 0.05,
      });
      recSlide.addShape("rect" as pptxgen.SHAPE_NAME, {
        x: 0.4, y: 1.3 + i * 1.1, w: 0.05, h: 0.95,
        fill: { color: theme.primary },
      });

      recSlide.addText(rec.title, {
        x: 0.6, y: 1.35 + i * 1.1, w: 8.8, h: 0.35,
        fontSize: 14, bold: true, color: theme.textPrimary,
        fontFace: FONTS.body,
      });
      recSlide.addText(rec.description, {
        x: 0.6, y: 1.65 + i * 1.1, w: 8.8, h: 0.55,
        fontSize: 11, color: theme.textSecondary,
        fontFace: FONTS.body,
      });
    });
  }

  // ==========================================
  // CLOSING SLIDE
  // ==========================================
  const closingSlide = pptx.addSlide();
  // Gradient background matching title slide
  closingSlide.background = { color: theme.heroGradientStart };
  closingSlide.addShape("rect" as pptxgen.SHAPE_NAME, {
    x: 0, y: 0, w: 10, h: 5.625,
    fill: { color: theme.heroGradientEnd, transparency: 55 },
  });

  const closingTextColor = luminance(theme.heroGradientStart) > 0.6 ? theme.textPrimary : "FFFFFF";

  // Logo on closing slide
  if (logoBase64) {
    closingSlide.addImage({
      data: logoBase64,
      x: 3.5, y: 0.8, w: 3.0, h: 1.0,
      sizing: { type: "contain", w: 3.0, h: 1.0 },
    });
  }

  closingSlide.addText("Thank You", {
    x: 0.5, y: 2, w: 9, h: 1,
    fontSize: 44, bold: true, color: closingTextColor, align: "center",
    fontFace: FONTS.headline,
  });
  closingSlide.addText(
    "\"Inbox excellence is built on relevance, not volume.\"",
    {
      x: 0.5, y: 3.2, w: 9, h: 0.6,
      fontSize: 18, italic: true, color: closingTextColor, align: "center",
      fontFace: FONTS.body, transparency: 15,
    }
  );
  closingSlide.addText(`Powered by ${brandName}`, {
    x: 0.5, y: 4.5, w: 9, h: 0.4,
    fontSize: 12, color: closingTextColor, align: "center",
    fontFace: FONTS.body, transparency: 40,
  });

  // Generate and download
  const fileName = buildExportFileName(undefined, `${brandName}_${deckType === "executive" ? "Executive" : "Detailed"}_Deck`);
  await pptx.writeFile({ fileName });
};
