import pptxgen from "pptxgenjs";
import { buildExportFileName } from "./exportFileNameUtils";

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

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toFixed(0);
};

const slideStyles = {
  background: "FFFFFF",
  titleColor: "1A1A2E",
  subtitleColor: "6B7280",
  textColor: "374151",
  accentColor: "7C3AED",
  secondaryColor: "EC4899",
};

export const exportToPPT = async (
  inboxData: InboxPotentialData | null,
  useCaseData: UseCaseStudioData | null,
  ampData: AMPStudioData | null,
  deckType: "executive" | "detailed" = "executive",
  diagnosticsData: DiagnosticsExportData | null = null
) => {
  const pptx = new pptxgen();

  pptx.author = "Inbox Alchemy";
  pptx.title = "Inbox Alchemy – Email Strategy Overview";
  pptx.subject = "Email Strategy Presentation";
  pptx.company = "Inbox Alchemy";

  // Title Slide
  const titleSlide = pptx.addSlide();
  titleSlide.addText("Inbox Alchemy", {
    x: 0.5,
    y: 2.5,
    w: 9,
    h: 1,
    fontSize: 44,
    bold: true,
    color: slideStyles.titleColor,
    align: "center",
  });
  titleSlide.addText("Email Strategy Overview", {
    x: 0.5,
    y: 3.5,
    w: 9,
    h: 0.5,
    fontSize: 24,
    color: slideStyles.subtitleColor,
    align: "center",
  });
  if (inboxData) {
    titleSlide.addText(`${inboxData.industry} • ${inboxData.businessModel}`, {
      x: 0.5,
      y: 4.2,
      w: 9,
      h: 0.4,
      fontSize: 14,
      color: slideStyles.subtitleColor,
      align: "center",
    });
  }

  // Section 1: Inbox Potential
  if (inboxData) {
    // Section header
    const section1Header = pptx.addSlide();
    section1Header.addText("Section 1", {
      x: 0.5,
      y: 2,
      w: 9,
      h: 0.5,
      fontSize: 14,
      color: slideStyles.accentColor,
      align: "center",
    });
    section1Header.addText("Responsible Inbox Potential", {
      x: 0.5,
      y: 2.5,
      w: 9,
      h: 1,
      fontSize: 36,
      bold: true,
      color: slideStyles.titleColor,
      align: "center",
    });
    section1Header.addText("Industry-aligned monthly email scale", {
      x: 0.5,
      y: 3.5,
      w: 9,
      h: 0.5,
      fontSize: 18,
      color: slideStyles.subtitleColor,
      align: "center",
    });

    // Volume Summary Slide
    const volumeSlide = pptx.addSlide();
    volumeSlide.addText("Volume Summary", {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.7,
      fontSize: 28,
      bold: true,
      color: slideStyles.titleColor,
    });

    volumeSlide.addText(
      `≈ ${formatNumber(inboxData.minVolume)} – ${formatNumber(inboxData.maxVolume)} emails/month`,
      {
        x: 0.5,
        y: 1.5,
        w: 9,
        h: 0.8,
        fontSize: 32,
        bold: true,
        color: slideStyles.accentColor,
        align: "center",
      }
    );

    volumeSlide.addText("Volume Breakdown:", {
      x: 0.5,
      y: 2.8,
      w: 9,
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: slideStyles.titleColor,
    });

    const totalVolume = inboxData.activeVolume + inboxData.inactiveVolume;
    const activePercent = Math.round((inboxData.activeVolume / totalVolume) * 100);

    volumeSlide.addText(
      [
        { text: "• ", options: { color: slideStyles.accentColor } },
        { text: `Active users: ${formatNumber(inboxData.activeVolume)} (${activePercent}%)`, options: { color: slideStyles.textColor } },
      ],
      { x: 0.5, y: 3.3, w: 9, h: 0.4, fontSize: 14 }
    );
    volumeSlide.addText(
      [
        { text: "• ", options: { color: slideStyles.secondaryColor } },
        { text: `Re-engagement: ${formatNumber(inboxData.inactiveVolume)} (${100 - activePercent}%)`, options: { color: slideStyles.textColor } },
      ],
      { x: 0.5, y: 3.7, w: 9, h: 0.4, fontSize: 14 }
    );

    volumeSlide.addText("Key Assumption:", {
      x: 0.5,
      y: 4.4,
      w: 9,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: slideStyles.subtitleColor,
    });
    volumeSlide.addText(
      `Active user base: ${Math.round(inboxData.activePercent * 100)}% • Frequency guardrails applied`,
      { x: 0.5, y: 4.8, w: 9, h: 0.4, fontSize: 12, color: slideStyles.subtitleColor }
    );

    // Strategic Insight Slide
    const insightSlide = pptx.addSlide();
    insightSlide.addText("Strategic Insight", {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.7,
      fontSize: 28,
      bold: true,
      color: slideStyles.titleColor,
    });

    const insights = [
      { label: "What drives volume", text: inboxData.purchaseCycle },
      { label: "Primary risk to avoid", text: inboxData.fatigueRisk },
      { label: "Biggest growth lever", text: inboxData.frequencyReason },
    ];

    insights.forEach((insight, i) => {
      insightSlide.addText(insight.label, {
        x: 0.5,
        y: 1.5 + i * 1.4,
        w: 9,
        h: 0.4,
        fontSize: 14,
        bold: true,
        color: slideStyles.accentColor,
      });
      insightSlide.addText(insight.text, {
        x: 0.5,
        y: 1.9 + i * 1.4,
        w: 9,
        h: 0.8,
        fontSize: 13,
        color: slideStyles.textColor,
      });
    });
  }

  // Section 2: Use Case Studio
  if (useCaseData) {
    // Section header
    const section2Header = pptx.addSlide();
    section2Header.addText("Section 2", {
      x: 0.5,
      y: 2,
      w: 9,
      h: 0.5,
      fontSize: 14,
      color: slideStyles.accentColor,
      align: "center",
    });
    section2Header.addText("Use Case Studio", {
      x: 0.5,
      y: 2.5,
      w: 9,
      h: 1,
      fontSize: 36,
      bold: true,
      color: slideStyles.titleColor,
      align: "center",
    });

    // Framework Slide
    const frameworkSlide = pptx.addSlide();
    frameworkSlide.addText("Use Case Framework", {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.7,
      fontSize: 28,
      bold: true,
      color: slideStyles.titleColor,
    });

    frameworkSlide.addText(`Selected Framework: ${useCaseData.framework}`, {
      x: 0.5,
      y: 1.5,
      w: 9,
      h: 0.5,
      fontSize: 18,
      bold: true,
      color: slideStyles.accentColor,
    });

    frameworkSlide.addText(useCaseData.frameworkReason, {
      x: 0.5,
      y: 2.2,
      w: 9,
      h: 1,
      fontSize: 14,
      color: slideStyles.textColor,
    });

    // Journeys Slide
    const journeysSlide = pptx.addSlide();
    journeysSlide.addText("Always-on Journeys", {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.7,
      fontSize: 28,
      bold: true,
      color: slideStyles.titleColor,
    });

    const journeysToShow = deckType === "executive" 
      ? useCaseData.journeys.slice(0, 4) 
      : useCaseData.journeys.slice(0, 6);

    journeysToShow.forEach((journey, i) => {
      journeysSlide.addText(journey.name, {
        x: 0.5,
        y: 1.3 + i * 0.9,
        w: 9,
        h: 0.35,
        fontSize: 14,
        bold: true,
        color: slideStyles.titleColor,
      });
      journeysSlide.addText(`Trigger: ${journey.triggerType} • ${journey.whyItWorks}`, {
        x: 0.5,
        y: 1.6 + i * 0.9,
        w: 9,
        h: 0.4,
        fontSize: 11,
        color: slideStyles.subtitleColor,
      });
    });

    // Campaigns Slide
    const campaignsSlide = pptx.addSlide();
    campaignsSlide.addText("Contextual Campaigns", {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.7,
      fontSize: 28,
      bold: true,
      color: slideStyles.titleColor,
    });

    const campaignsToShow = deckType === "executive"
      ? useCaseData.campaigns.slice(0, 4)
      : useCaseData.campaigns.slice(0, 6);

    campaignsToShow.forEach((campaign, i) => {
      campaignsSlide.addText(campaign.name, {
        x: 0.5,
        y: 1.3 + i * 1.1,
        w: 9,
        h: 0.35,
        fontSize: 14,
        bold: true,
        color: slideStyles.titleColor,
      });
      campaignsSlide.addText(
        `${campaign.purpose}\nBest timing: ${campaign.bestTiming}\nSuppression: ${campaign.suppressionAdvice}`,
        {
          x: 0.5,
          y: 1.6 + i * 1.1,
          w: 9,
          h: 0.7,
          fontSize: 10,
          color: slideStyles.subtitleColor,
        }
      );
    });
  }

  // Section 3: AMP Email Studio
  if (ampData) {
    // Section header
    const section3Header = pptx.addSlide();
    section3Header.addText("Section 3", {
      x: 0.5,
      y: 2,
      w: 9,
      h: 0.5,
      fontSize: 14,
      color: slideStyles.accentColor,
      align: "center",
    });
    section3Header.addText("AMP Email Studio", {
      x: 0.5,
      y: 2.5,
      w: 9,
      h: 1,
      fontSize: 36,
      bold: true,
      color: slideStyles.titleColor,
      align: "center",
    });

    // Why Interactive Email
    const whyAmpSlide = pptx.addSlide();
    whyAmpSlide.addText("Why Interactive Email", {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.7,
      fontSize: 28,
      bold: true,
      color: slideStyles.titleColor,
    });

    whyAmpSlide.addText("Where AMP adds value:", {
      x: 0.5,
      y: 1.4,
      w: 9,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: slideStyles.accentColor,
    });

    ampData.ampBenefits.forEach((benefit, i) => {
      whyAmpSlide.addText(`• ${benefit}`, {
        x: 0.5,
        y: 1.8 + i * 0.35,
        w: 9,
        h: 0.35,
        fontSize: 12,
        color: slideStyles.textColor,
      });
    });

    whyAmpSlide.addText("Best suited use cases:", {
      x: 0.5,
      y: 3.2,
      w: 9,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: slideStyles.accentColor,
    });

    ampData.useCases.slice(0, 4).forEach((useCase, i) => {
      whyAmpSlide.addText(`• ${useCase}`, {
        x: 0.5,
        y: 3.6 + i * 0.35,
        w: 9,
        h: 0.35,
        fontSize: 12,
        color: slideStyles.textColor,
      });
    });

    // Template Slides
    const brandCarouselSlide = pptx.addSlide();
    brandCarouselSlide.addText("Brand-led Carousel Template", {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.7,
      fontSize: 28,
      bold: true,
      color: slideStyles.titleColor,
    });

    const carouselFeatures = [
      "Brand logo prominently displayed",
      "Hero carousel with 3-4 personalized items",
      "Personalized headline based on user behavior",
      "Dynamic CTA that updates in real-time",
      "Footer with social links and preferences",
    ];

    carouselFeatures.forEach((feature, i) => {
      brandCarouselSlide.addText(`• ${feature}`, {
        x: 0.5,
        y: 1.5 + i * 0.5,
        w: 9,
        h: 0.4,
        fontSize: 14,
        color: slideStyles.textColor,
      });
    });

    brandCarouselSlide.addText("Personalization signals: Past purchases, browsing history, preferences", {
      x: 0.5,
      y: 4.5,
      w: 9,
      h: 0.4,
      fontSize: 12,
      italic: true,
      color: slideStyles.subtitleColor,
    });

    // Gamified Template (only if supported)
    if (ampData.supportsGamification) {
      const gamifiedSlide = pptx.addSlide();
      gamifiedSlide.addText("Gamified Interactive Template", {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 0.7,
        fontSize: 28,
        bold: true,
        color: slideStyles.titleColor,
      });

      const gamifiedFeatures = [
        "Contextual hero image",
        "Interactive element (spin wheel, scratch card, quiz)",
        "Inline reward/result reveal",
        "Engaging CTA post-interaction",
        "Compliance-friendly footer",
      ];

      gamifiedFeatures.forEach((feature, i) => {
        gamifiedSlide.addText(`• ${feature}`, {
          x: 0.5,
          y: 1.5 + i * 0.5,
          w: 9,
          h: 0.4,
          fontSize: 14,
          color: slideStyles.textColor,
        });
      });

      gamifiedSlide.addText("Best for: Commerce, Gaming, Fitness, Ed-tech, Loyalty programs", {
        x: 0.5,
        y: 4.5,
        w: 9,
        h: 0.4,
        fontSize: 12,
        italic: true,
        color: slideStyles.subtitleColor,
      });
    }
  }

  // Section 4: Inbox Diagnostics
  if (diagnosticsData) {
    const section4Header = pptx.addSlide();
    section4Header.addText("Section 4", {
      x: 0.5, y: 2, w: 9, h: 0.5,
      fontSize: 14, color: slideStyles.accentColor, align: "center",
    });
    section4Header.addText("Inbox Diagnostics", {
      x: 0.5, y: 2.5, w: 9, h: 1,
      fontSize: 36, bold: true, color: slideStyles.titleColor, align: "center",
    });

    // Performance slide
    const perfSlide = pptx.addSlide();
    perfSlide.addText("Campaign Performance", {
      x: 0.5, y: 0.5, w: 9, h: 0.7,
      fontSize: 28, bold: true, color: slideStyles.titleColor,
    });
    perfSlide.addText(`${formatNumber(diagnosticsData.totalEmailsSent)} emails across ${diagnosticsData.totalCampaigns} campaigns`, {
      x: 0.5, y: 1.5, w: 9, h: 0.5,
      fontSize: 18, color: slideStyles.accentColor, align: "center",
    });
    perfSlide.addText(`Median Open Rate: ${diagnosticsData.medianOpenRate.toFixed(1)}%`, {
      x: 0.5, y: 2.5, w: 9, h: 0.4, fontSize: 14, color: slideStyles.textColor,
    });
    perfSlide.addText(`Median Click Rate: ${diagnosticsData.medianClickRate.toFixed(1)}%`, {
      x: 0.5, y: 3, w: 9, h: 0.4, fontSize: 14, color: slideStyles.textColor,
    });
    perfSlide.addText(`Open Rate Trend: ${diagnosticsData.openRateTrend} • Click Rate Trend: ${diagnosticsData.clickRateTrend}`, {
      x: 0.5, y: 3.8, w: 9, h: 0.4, fontSize: 12, color: slideStyles.subtitleColor,
    });

    // Recommendations slide
    const recSlide = pptx.addSlide();
    recSlide.addText("Key Recommendations", {
      x: 0.5, y: 0.5, w: 9, h: 0.7,
      fontSize: 28, bold: true, color: slideStyles.titleColor,
    });
    diagnosticsData.recommendations.slice(0, 4).forEach((rec, i) => {
      recSlide.addText(rec.title, {
        x: 0.5, y: 1.4 + i * 1.1, w: 9, h: 0.35,
        fontSize: 14, bold: true, color: slideStyles.titleColor,
      });
      recSlide.addText(rec.description, {
        x: 0.5, y: 1.7 + i * 1.1, w: 9, h: 0.6,
        fontSize: 11, color: slideStyles.subtitleColor,
      });
    });
  }

  // Closing Slide
  const closingSlide = pptx.addSlide();
  closingSlide.addText("Thank You", {
    x: 0.5,
    y: 2,
    w: 9,
    h: 1,
    fontSize: 44,
    bold: true,
    color: slideStyles.titleColor,
    align: "center",
  });
  closingSlide.addText(
    "\"Inbox excellence is built on relevance, not volume.\"",
    {
      x: 0.5,
      y: 3.2,
      w: 9,
      h: 0.6,
      fontSize: 18,
      italic: true,
      color: slideStyles.subtitleColor,
      align: "center",
    }
  );
  closingSlide.addText("Powered by Inbox Alchemy", {
    x: 0.5,
    y: 4.5,
    w: 9,
    h: 0.4,
    fontSize: 12,
    color: slideStyles.subtitleColor,
    align: "center",
  });

  // Generate and download
  const fileName = buildExportFileName(undefined, `Inbox_Alchemy_${deckType === "executive" ? "Executive" : "Detailed"}_Deck`);
  await pptx.writeFile({ fileName });
};
