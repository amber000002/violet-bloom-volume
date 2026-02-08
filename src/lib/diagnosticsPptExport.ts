// Inbox Diagnostics PPT Export - Professional Executive-Ready Deck
import pptxgen from "pptxgenjs";
import { DiagnosticsData, AnalysisReport, ReputationSignalRow } from "./csvAnalyzer";

// ============= STYLE CONSTANTS =============

const SLIDE_STYLES = {
  // Colors (hex without #)
  headerColor: "1F2933",      // Dark gray for headers
  bodyColor: "374151",        // Body text
  mutedColor: "6B7280",       // Muted/subtitle
  footerColor: "9CA3AF",      // Light gray footer
  
  // Semantic colors for metrics
  greenText: "059669",        // Healthy
  amberText: "D97706",        // Watch/Needs Attention
  redText: "DC2626",          // Risk/Critical
  
  // Table colors
  headerRowBg: "F3F4F6",      // Light gray header background
  borderColor: "E5E7EB",      // Hairline borders
  
  // Background
  background: "FFFFFF",
};

const FONTS = {
  primary: "Calibri",         // PPT-safe fallback
};

// ============= HELPER FUNCTIONS =============

const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

const formatPercent = (num: number): string => {
  return `${num.toFixed(2)}%`;
};

// Clean subject line by removing "{Subject:" prefix
const cleanSubjectLine = (subject: string): string => {
  if (!subject) return '';
  return subject.replace(/^\{Subject:\s*/i, '').replace(/\}$/, '').trim();
};

// Get color for metric based on thresholds
type MetricType = 'openRate' | 'clickRate' | 'bounceRate' | 'unsubscribeRate';

const getMetricColor = (value: number, metricType: MetricType): string => {
  const roundedValue = Math.round(value * 100) / 100;
  
  switch (metricType) {
    case 'openRate':
      if (roundedValue > 25.0) return SLIDE_STYLES.greenText;
      if (roundedValue > 10.0) return SLIDE_STYLES.amberText;
      return SLIDE_STYLES.redText;
    
    case 'clickRate':
      if (roundedValue > 3.0) return SLIDE_STYLES.greenText;
      if (roundedValue > 1.5) return SLIDE_STYLES.amberText;
      return SLIDE_STYLES.redText;
    
    case 'bounceRate':
      if (roundedValue < 1.0) return SLIDE_STYLES.greenText;
      if (roundedValue <= 3.0) return SLIDE_STYLES.amberText;
      return SLIDE_STYLES.redText;
    
    case 'unsubscribeRate':
      if (roundedValue < 0.3) return SLIDE_STYLES.greenText;
      if (roundedValue <= 0.7) return SLIDE_STYLES.amberText;
      return SLIDE_STYLES.redText;
    
    default:
      return SLIDE_STYLES.bodyColor;
  }
};

// Get month range from data
const getMonthRange = (data: AnalysisReport | null): string => {
  if (!data || data.monthlyOverview.length === 0) return "";
  const months = data.monthlyOverview.map(m => m.month);
  if (months.length === 1) return months[0];
  return `${months[0]} – ${months[months.length - 1]}`;
};

// Add footer to slide
const addSlideFooter = (slide: pptxgen.Slide, hasPostmasterData: boolean = true) => {
  const sourceText = hasPostmasterData 
    ? "Source: Campaign Performance + Postmaster Data | Generated via Inbox Diagnostics"
    : "Source: Campaign Performance Data | Generated via Inbox Diagnostics";
  
  slide.addText(sourceText, {
    x: 0.5,
    y: 5.2,
    w: 9,
    h: 0.3,
    fontSize: 10,
    color: SLIDE_STYLES.footerColor,
    fontFace: FONTS.primary,
  });
};

// Add header with title and optional date range
const addSlideHeader = (slide: pptxgen.Slide, title: string, monthRange?: string) => {
  slide.addText(title, {
    x: 0.5,
    y: 0.4,
    w: monthRange ? 6.5 : 9,
    h: 0.6,
    fontSize: 30,
    bold: true,
    color: SLIDE_STYLES.headerColor,
    fontFace: FONTS.primary,
  });
  
  if (monthRange) {
    slide.addText(monthRange, {
      x: 7,
      y: 0.5,
      w: 2.5,
      h: 0.4,
      fontSize: 12,
      color: SLIDE_STYLES.mutedColor,
      fontFace: FONTS.primary,
      align: "right",
    });
  }
};

// ============= MAIN EXPORT FUNCTION =============

// ============= MAIN EXPORT FUNCTION =============

export const exportDiagnosticsToPPT = async (
  diagnostics: DiagnosticsData,
  activeReport: "analysis" | "reputation" | null,
  brandName: string = "Campaign"
) => {
  const pptx = new pptxgen();
  
  pptx.author = "Inbox Diagnostics";
  pptx.title = "Inbox Diagnostics Analysis Report";
  pptx.subject = "Email Campaign Performance Analysis";
  pptx.company = "Inbox Alchemy";
  
  // Define slide dimensions (standard 16:9)
  pptx.defineLayout({ name: "WIDESCREEN", width: 10, height: 5.625 });
  pptx.layout = "WIDESCREEN";

  const hasPostmasterData = !!diagnostics.postmasterData && diagnostics.postmasterData.length > 0;
  
  if (activeReport === "analysis" && diagnostics.analysisReport) {
    const report = diagnostics.analysisReport;
    const monthRange = getMonthRange(report);
    
    // ========== SLIDE 1: Campaign Overview (Aggregate) ==========
    const overviewSlide = pptx.addSlide();
    addSlideHeader(overviewSlide, "Campaign Overview – Email Channel", monthRange);
    
    // Calculate aggregates
    const totals = report.providerAggregates.reduce((acc, p) => ({
      sent: acc.sent + p.totalSentUsers,
      delivered: acc.delivered + p.totalDeliveredUsers,
      viewed: acc.viewed + p.uniqueViewed,
      clicked: acc.clicked + p.uniqueClicked,
      hardBounce: acc.hardBounce + p.hardBounces,
      softBounce: acc.softBounce + p.softBounces,
      unsubs: acc.unsubs + p.unsubscribes,
    }), { sent: 0, delivered: 0, viewed: 0, clicked: 0, hardBounce: 0, softBounce: 0, unsubs: 0 });
    
    const useDelivered = totals.delivered > 0;
    const denominator = useDelivered ? totals.delivered : totals.sent;
    
    // Left column - Key insights
    const insights = [
      `• Total sends: ${formatNumber(totals.sent)} emails`,
      `• Delivery health: ${denominator > 0 ? formatPercent((totals.delivered / totals.sent) * 100) : "N/A"} delivered`,
      `• Overall engagement: ${formatPercent((totals.viewed / denominator) * 100)} open rate`,
      `• Click performance: ${formatPercent((totals.clicked / denominator) * 100)} CTR`,
      `• Deliverability signals: ${formatPercent(((totals.hardBounce + totals.softBounce) / totals.sent) * 100)} total bounce`,
    ];
    
    insights.forEach((insight, i) => {
      overviewSlide.addText(insight, {
        x: 0.5,
        y: 1.2 + i * 0.4,
        w: 4,
        h: 0.35,
        fontSize: 12,
        color: SLIDE_STYLES.bodyColor,
        fontFace: FONTS.primary,
      });
    });
    
    // Right column - Aggregate table
    const overviewTableRows: pptxgen.TableRow[] = [
      [
        { text: "Metric", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 11 } },
        { text: "Value", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 11, align: "right" } },
        { text: "%", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 11, align: "right" } },
      ],
      [
        { text: "Sent", options: { fontSize: 11 } },
        { text: formatNumber(totals.sent), options: { fontSize: 11, align: "right" } },
        { text: "–", options: { fontSize: 11, align: "right", color: SLIDE_STYLES.mutedColor } },
      ],
    ];
    
    // Only add Delivered row if there's delivery data
    if (useDelivered) {
      overviewTableRows.push([
        { text: "Delivered", options: { fontSize: 11 } },
        { text: formatNumber(totals.delivered), options: { fontSize: 11, align: "right" } },
        { text: formatPercent((totals.delivered / totals.sent) * 100), options: { fontSize: 11, align: "right" } },
      ]);
    }
    
    const viewedPercent = denominator > 0 ? (totals.viewed / denominator) * 100 : 0;
    const clickedPercent = denominator > 0 ? (totals.clicked / denominator) * 100 : 0;
    const hardBouncePercent = totals.sent > 0 ? (totals.hardBounce / totals.sent) * 100 : 0;
    const softBouncePercent = totals.sent > 0 ? (totals.softBounce / totals.sent) * 100 : 0;
    const unsubPercent = denominator > 0 ? (totals.unsubs / denominator) * 100 : 0;
    
    overviewTableRows.push(
      [
        { text: "Viewed", options: { fontSize: 11 } },
        { text: formatNumber(totals.viewed), options: { fontSize: 11, align: "right" } },
        { text: formatPercent(viewedPercent), options: { fontSize: 11, align: "right", color: getMetricColor(viewedPercent, 'openRate') } },
      ],
      [
        { text: "Clicked", options: { fontSize: 11 } },
        { text: formatNumber(totals.clicked), options: { fontSize: 11, align: "right" } },
        { text: formatPercent(clickedPercent), options: { fontSize: 11, align: "right", color: getMetricColor(clickedPercent, 'clickRate') } },
      ],
      [
        { text: "Hard Bounce", options: { fontSize: 11 } },
        { text: formatNumber(totals.hardBounce), options: { fontSize: 11, align: "right" } },
        { text: formatPercent(hardBouncePercent), options: { fontSize: 11, align: "right", color: getMetricColor(hardBouncePercent, 'bounceRate') } },
      ],
      [
        { text: "Soft Bounce", options: { fontSize: 11 } },
        { text: formatNumber(totals.softBounce), options: { fontSize: 11, align: "right" } },
        { text: formatPercent(softBouncePercent), options: { fontSize: 11, align: "right", color: getMetricColor(softBouncePercent, 'bounceRate') } },
      ],
      [
        { text: "Unsubscribes", options: { fontSize: 11 } },
        { text: formatNumber(totals.unsubs), options: { fontSize: 11, align: "right" } },
        { text: formatPercent(unsubPercent), options: { fontSize: 11, align: "right", color: getMetricColor(unsubPercent, 'unsubscribeRate') } },
      ]
    );
    
    overviewSlide.addTable(overviewTableRows, {
      x: 4.8,
      y: 1.1,
      w: 4.7,
      colW: [1.8, 1.4, 1.5],
      border: { type: "solid", color: SLIDE_STYLES.borderColor, pt: 0.5 },
      fontFace: FONTS.primary,
    });
    
    addSlideFooter(overviewSlide, hasPostmasterData);
    
    // ========== SLIDE 2: Monthly Performance Trend ==========
    const monthlySlide = pptx.addSlide();
    addSlideHeader(monthlySlide, "Monthly Performance Trend", monthRange);
    
    // Left column - trend summary
    const monthlyData = report.monthlyOverview;
    const trendBullets: string[] = [];
    
    if (monthlyData.length >= 2) {
      const first = monthlyData[0];
      const last = monthlyData[monthlyData.length - 1];
      const openDiff = last.viewPercent - first.viewPercent;
      const clickDiff = last.clickPercent - first.clickPercent;
      
      trendBullets.push(`• Open rate: ${openDiff >= 0 ? '↑' : '↓'} ${Math.abs(openDiff).toFixed(1)}pp MoM`);
      trendBullets.push(`• Click rate: ${clickDiff >= 0 ? '↑' : '↓'} ${Math.abs(clickDiff).toFixed(1)}pp MoM`);
      
      const avgBounce = monthlyData.reduce((sum, m) => sum + m.hardBouncePercent + m.softBouncePercent, 0) / monthlyData.length;
      trendBullets.push(`• Avg bounce: ${formatPercent(avgBounce)}`);
    }
    
    trendBullets.forEach((bullet, i) => {
      monthlySlide.addText(bullet, {
        x: 0.5,
        y: 1.2 + i * 0.4,
        w: 3.5,
        h: 0.35,
        fontSize: 12,
        color: SLIDE_STYLES.bodyColor,
        fontFace: FONTS.primary,
      });
    });
    
    // Right column - Monthly table (max 6 rows)
    const monthlyTableRows: pptxgen.TableRow[] = [
      [
        { text: "Month", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 10 } },
        { text: "Sent", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 10, align: "right" } },
        { text: "View %", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 10, align: "right" } },
        { text: "Click %", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 10, align: "right" } },
        { text: "Unsub %", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 10, align: "right" } },
        { text: "Bounce %", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 10, align: "right" } },
      ],
    ];
    
    monthlyData.slice(0, 6).forEach(m => {
      const totalBounce = m.hardBouncePercent + m.softBouncePercent;
      monthlyTableRows.push([
        { text: m.month, options: { fontSize: 10 } },
        { text: formatNumber(m.totalSentUsers), options: { fontSize: 10, align: "right" } },
        { text: formatPercent(m.viewPercent), options: { fontSize: 10, align: "right", color: getMetricColor(m.viewPercent, 'openRate') } },
        { text: formatPercent(m.clickPercent), options: { fontSize: 10, align: "right", color: getMetricColor(m.clickPercent, 'clickRate') } },
        { text: formatPercent(m.unsubscribePercent), options: { fontSize: 10, align: "right", color: getMetricColor(m.unsubscribePercent, 'unsubscribeRate') } },
        { text: formatPercent(totalBounce), options: { fontSize: 10, align: "right", color: getMetricColor(totalBounce, 'bounceRate') } },
      ]);
    });
    
    monthlySlide.addTable(monthlyTableRows, {
      x: 4,
      y: 1.1,
      w: 5.5,
      colW: [1.2, 0.9, 0.85, 0.85, 0.85, 0.85],
      border: { type: "solid", color: SLIDE_STYLES.borderColor, pt: 0.5 },
      fontFace: FONTS.primary,
    });
    
    addSlideFooter(monthlySlide, hasPostmasterData);
    
    // ========== BEST & WORST PERFORMING CAMPAIGNS - FULL FIDELITY EXPORT ==========
    // STRICT: 1:1 match with UI tables - all 14 columns, no truncation, multi-slide overflow
    
    const createCampaignTableHeader = (): pptxgen.TableRow => [
      { text: "Start Date", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 8, align: "left" } },
      { text: "Campaign Name", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 8, align: "left" } },
      { text: "Subject Line", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 8, align: "left" } },
      { text: "Sent", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 8, align: "right" } },
      { text: "Viewed", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 8, align: "right" } },
      { text: "Open %", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 8, align: "right" } },
      { text: "Clicked", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 8, align: "right" } },
      { text: "Click %", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 8, align: "right" } },
      { text: "Unsubs", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 8, align: "right" } },
      { text: "Unsub %", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 8, align: "right" } },
      { text: "Hard Bounce", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 8, align: "right" } },
      { text: "Hard %", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 8, align: "right" } },
      { text: "Soft Bounce", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 8, align: "right" } },
      { text: "Soft %", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 8, align: "right" } },
    ];
    
    const createCampaignDataRow = (c: typeof report.bestCampaigns[0]): pptxgen.TableRow => {
      const denom = c.totalDeliveredUsers > 0 ? c.totalDeliveredUsers : c.totalSentUsers;
      const unsubPercent = denom > 0 ? (c.unsubscribes / denom) * 100 : 0;
      const hardBouncePercent = denom > 0 ? (c.hardBounces / denom) * 100 : 0;
      const softBouncePercent = denom > 0 ? (c.softBounces / denom) * 100 : 0;
      // NO TRUNCATION - full text display
      const subject = cleanSubjectLine(c.subjectLine);
      const campaignName = c.campaignName || '';
      
      return [
        { text: c.startDate || '—', options: { fontSize: 8, align: "left" } },
        { text: campaignName, options: { fontSize: 8, align: "left" } },
        { text: subject, options: { fontSize: 8, align: "left" } },
        { text: formatNumber(c.totalSentUsers), options: { fontSize: 8, align: "right" } },
        { text: formatNumber(c.uniqueViewed), options: { fontSize: 8, align: "right" } },
        { text: formatPercent(c.openRate), options: { fontSize: 8, align: "right", color: getMetricColor(c.openRate, 'openRate') } },
        { text: formatNumber(c.uniqueClicked), options: { fontSize: 8, align: "right" } },
        { text: formatPercent(c.clickRate), options: { fontSize: 8, align: "right", color: getMetricColor(c.clickRate, 'clickRate') } },
        { text: formatNumber(c.unsubscribes), options: { fontSize: 8, align: "right" } },
        { text: formatPercent(unsubPercent), options: { fontSize: 8, align: "right", color: getMetricColor(unsubPercent, 'unsubscribeRate') } },
        { text: formatNumber(c.hardBounces), options: { fontSize: 8, align: "right" } },
        { text: formatPercent(hardBouncePercent), options: { fontSize: 8, align: "right", color: getMetricColor(hardBouncePercent, 'bounceRate') } },
        { text: formatNumber(c.softBounces), options: { fontSize: 8, align: "right" } },
        { text: formatPercent(softBouncePercent), options: { fontSize: 8, align: "right", color: getMetricColor(softBouncePercent, 'bounceRate') } },
      ];
    };
    
    // Column widths for 14-column table (total 9.5" to use full slide width with 0.25" margins)
    const campaignTableColWidths = [0.65, 1.4, 1.8, 0.55, 0.55, 0.55, 0.55, 0.55, 0.5, 0.5, 0.55, 0.5, 0.55, 0.5];
    const MAX_ROWS_PER_SLIDE = 8; // Header + 7 data rows max per slide to avoid overflow
    
    // Helper to add campaign table slides with overflow handling
    const addCampaignTableSlides = (
      campaigns: typeof report.bestCampaigns,
      baseTitle: string,
      summaryTitle: string,
      summaryColor: string,
      summary: string
    ) => {
      const allCampaigns = campaigns; // No slicing - export ALL campaigns
      const totalSlides = Math.ceil(allCampaigns.length / (MAX_ROWS_PER_SLIDE - 1)); // -1 for header row
      
      for (let slideIdx = 0; slideIdx < totalSlides; slideIdx++) {
        const slide = pptx.addSlide();
        const startRow = slideIdx * (MAX_ROWS_PER_SLIDE - 1);
        const endRow = Math.min(startRow + (MAX_ROWS_PER_SLIDE - 1), allCampaigns.length);
        const campaignsOnSlide = allCampaigns.slice(startRow, endRow);
        
        // Title with slide indicator for multi-slide
        const slideTitle = totalSlides > 1 
          ? `${baseTitle} (${slideIdx + 1}/${totalSlides})`
          : baseTitle;
        addSlideHeader(slide, slideTitle);
        
        // Build table with header repeated on each slide
        const tableRows: pptxgen.TableRow[] = [createCampaignTableHeader()];
        campaignsOnSlide.forEach(c => tableRows.push(createCampaignDataRow(c)));
        
        slide.addTable(tableRows, {
          x: 0.25,
          y: 1.0,
          w: 9.5,
          colW: campaignTableColWidths,
          border: { type: "solid", color: SLIDE_STYLES.borderColor, pt: 0.5 },
          fontFace: FONTS.primary,
          autoPage: false, // We handle pagination manually
          autoPageLineWeight: 0,
        });
        
        // Only add summary on last slide
        if (slideIdx === totalSlides - 1) {
          const tableHeight = 0.35 + (tableRows.length * 0.3);
          const bulletStartY = 1.0 + tableHeight + 0.15;
          
          slide.addText(`${summaryTitle}:`, {
            x: 0.25,
            y: bulletStartY,
            w: 9.5,
            h: 0.25,
            fontSize: 10,
            bold: true,
            color: summaryColor,
            fontFace: FONTS.primary,
          });
          
          const insights = summary.split('. ').filter(s => s.trim()).slice(0, 3);
          insights.forEach((insight, i) => {
            slide.addText(`• ${insight.trim()}`, {
              x: 0.25,
              y: bulletStartY + 0.28 + i * 0.25,
              w: 9.5,
              h: 0.23,
              fontSize: 9,
              color: SLIDE_STYLES.bodyColor,
              fontFace: FONTS.primary,
            });
          });
        }
        
        addSlideFooter(slide, hasPostmasterData);
      }
    };
    
    // ========== SLIDE 3+: Best Performing Campaigns (all rows, no truncation) ==========
    addCampaignTableSlides(
      report.bestCampaigns,
      "Best Performing Campaigns (by Views)",
      "What Worked",
      SLIDE_STYLES.greenText,
      report.bestSummary
    );
    
    // ========== SLIDE 4+: Under-Performing Campaigns (all rows, no truncation) ==========
    addCampaignTableSlides(
      report.worstCampaigns,
      "Underperforming Campaigns",
      "What Didn't Work",
      SLIDE_STYLES.redText,
      report.worstSummary
    );
    
    // ========== SLIDE 5: Deliverability & Reputation Diagnostics ==========
    const deliverabilitySlide = pptx.addSlide();
    addSlideHeader(deliverabilitySlide, "Deliverability & Reputation Signals");
    
    // Left column - Reputation summary
    const avgHardBounce = report.providerAggregates.reduce((sum, p) => sum + p.hardBouncePercent, 0) / report.providerAggregates.length;
    const avgSoftBounce = report.providerAggregates.reduce((sum, p) => sum + p.softBouncePercent, 0) / report.providerAggregates.length;
    const avgUnsub = report.providerAggregates.reduce((sum, p) => sum + p.unsubscribePercent, 0) / report.providerAggregates.length;
    
    const deliveryBullets = [
      `• Hard bounce avg: ${formatPercent(avgHardBounce)}`,
      `• Soft bounce avg: ${formatPercent(avgSoftBounce)}`,
      `• Unsubscribe avg: ${formatPercent(avgUnsub)}`,
    ];
    
    // Add reputation status
    let reputationStatus = "Healthy";
    let statusColor = SLIDE_STYLES.greenText;
    if (avgHardBounce > 3 || avgSoftBounce > 5) {
      reputationStatus = "Needs Attention";
      statusColor = SLIDE_STYLES.amberText;
    }
    if (avgHardBounce > 5 || avgSoftBounce > 8) {
      reputationStatus = "At Risk";
      statusColor = SLIDE_STYLES.redText;
    }
    
    deliverabilitySlide.addText(`Reputation Status: ${reputationStatus}`, {
      x: 0.5,
      y: 1.2,
      w: 3.5,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: statusColor,
      fontFace: FONTS.primary,
    });
    
    deliveryBullets.forEach((bullet, i) => {
      deliverabilitySlide.addText(bullet, {
        x: 0.5,
        y: 1.8 + i * 0.4,
        w: 3.5,
        h: 0.35,
        fontSize: 12,
        color: SLIDE_STYLES.bodyColor,
        fontFace: FONTS.primary,
      });
    });
    
    if (!hasPostmasterData) {
      deliverabilitySlide.addText("* Postmaster data not provided", {
        x: 0.5,
        y: 3.4,
        w: 3.5,
        h: 0.3,
        fontSize: 10,
        italic: true,
        color: SLIDE_STYLES.mutedColor,
        fontFace: FONTS.primary,
      });
    }
    
    // Right column - Provider breakdown table
    const providerTableRows: pptxgen.TableRow[] = [
      [
        { text: "Provider", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 10 } },
        { text: "View %", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 10, align: "right" } },
        { text: "Hard %", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 10, align: "right" } },
        { text: "Soft %", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 10, align: "right" } },
      ],
    ];
    
    report.providerAggregates.slice(0, 5).forEach(p => {
      providerTableRows.push([
        { text: p.providerName || p.serviceProvider, options: { fontSize: 10 } },
        { text: formatPercent(p.viewPercent), options: { fontSize: 10, align: "right", color: getMetricColor(p.viewPercent, 'openRate') } },
        { text: formatPercent(p.hardBouncePercent), options: { fontSize: 10, align: "right", color: getMetricColor(p.hardBouncePercent, 'bounceRate') } },
        { text: formatPercent(p.softBouncePercent), options: { fontSize: 10, align: "right", color: getMetricColor(p.softBouncePercent, 'bounceRate') } },
      ]);
    });
    
    deliverabilitySlide.addTable(providerTableRows, {
      x: 4.5,
      y: 1.1,
      w: 5,
      colW: [2, 1, 1, 1],
      border: { type: "solid", color: SLIDE_STYLES.borderColor, pt: 0.5 },
      fontFace: FONTS.primary,
    });
    
    addSlideFooter(deliverabilitySlide, hasPostmasterData);
    
    // ========== SLIDE 6: Key Learnings & Next Steps ==========
    const learningsSlide = pptx.addSlide();
    addSlideHeader(learningsSlide, "Key Learnings & Next Steps");
    
    // Split learnings into "What Worked" and "What Needs Fixing"
    const allLearnings = report.keyLearnings;
    const whatWorked = allLearnings.filter((_, i) => i % 2 === 0).slice(0, 5);
    const whatNeedsFix = allLearnings.filter((_, i) => i % 2 === 1).slice(0, 5);
    
    // Left column - What Worked
    learningsSlide.addText("What Worked", {
      x: 0.5,
      y: 1.2,
      w: 4,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: SLIDE_STYLES.greenText,
      fontFace: FONTS.primary,
    });
    
    whatWorked.forEach((learning, i) => {
      learningsSlide.addText(`• ${learning.title}`, {
        x: 0.5,
        y: 1.7 + i * 0.6,
        w: 4.2,
        h: 0.55,
        fontSize: 11,
        color: SLIDE_STYLES.bodyColor,
        fontFace: FONTS.primary,
      });
    });
    
    // Right column - What Needs Fixing
    learningsSlide.addText("What Needs Fixing", {
      x: 5,
      y: 1.2,
      w: 4.5,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: SLIDE_STYLES.amberText,
      fontFace: FONTS.primary,
    });
    
    whatNeedsFix.forEach((learning, i) => {
      learningsSlide.addText(`• ${learning.title}`, {
        x: 5,
        y: 1.7 + i * 0.6,
        w: 4.5,
        h: 0.55,
        fontSize: 11,
        color: SLIDE_STYLES.bodyColor,
        fontFace: FONTS.primary,
      });
    });
    
    addSlideFooter(learningsSlide, hasPostmasterData);
  }
  
  // ========== REPUTATION REPAIR REPORT ==========
  if (activeReport === "reputation" && diagnostics.reputationReport) {
    const repReport = diagnostics.reputationReport;
    const enhancedReport = repReport.enhancedReport;
    
    // Helper to get signal metric color
    const getSignalMetricColor = (signal: string, percentage: string): string => {
      const value = parseFloat(percentage);
      if (isNaN(value)) return SLIDE_STYLES.bodyColor;
      
      const signalLower = signal.toLowerCase();
      if (signalLower.includes('open') || signalLower.includes('view')) {
        return getMetricColor(value, 'openRate');
      } else if (signalLower.includes('click')) {
        return getMetricColor(value, 'clickRate');
      } else if (signalLower.includes('hard bounce')) {
        return getMetricColor(value, 'bounceRate');
      } else if (signalLower.includes('soft bounce')) {
        // Soft bounce: more lenient thresholds
        if (value < 2) return SLIDE_STYLES.greenText;
        if (value <= 5) return SLIDE_STYLES.amberText;
        return SLIDE_STYLES.redText;
      } else if (signalLower.includes('unsub')) {
        return getMetricColor(value, 'unsubscribeRate');
      } else if (signalLower.includes('spam') || signalLower.includes('complaint')) {
        if (value < 0.1) return SLIDE_STYLES.greenText;
        if (value <= 0.3) return SLIDE_STYLES.amberText;
        return SLIDE_STYLES.redText;
      }
      return SLIDE_STYLES.bodyColor;
    };
    
    // Helper to get trend color
    const getTrendColor = (signal: string, trend: string): string => {
      const signalLower = signal.toLowerCase();
      const isNegativeMetric = signalLower.includes('bounce') || 
                               signalLower.includes('unsub') || 
                               signalLower.includes('spam') ||
                               signalLower.includes('complaint');
      
      if (trend === 'up') {
        return isNegativeMetric ? SLIDE_STYLES.redText : SLIDE_STYLES.greenText;
      } else if (trend === 'down') {
        return isNegativeMetric ? SLIDE_STYLES.greenText : SLIDE_STYLES.redText;
      }
      return SLIDE_STYLES.mutedColor;
    };
    
    // Slide 1: Reputation Signal Table (Horizontal Layout)
    if (enhancedReport && enhancedReport.signalTable && enhancedReport.signalTable.length > 0) {
      const signalSlide = pptx.addSlide();
      addSlideHeader(signalSlide, "Reputation Signal Table");
      
      // Add snapshot info if available
      if (enhancedReport.reputationSnapshot) {
        const snapshot = enhancedReport.reputationSnapshot;
        const statusColor = snapshot.primaryStressSignal.includes('Hard') ? SLIDE_STYLES.redText :
                           snapshot.primaryStressSignal.includes('Spam') ? SLIDE_STYLES.redText :
                           snapshot.primaryStressSignal === 'None identified' ? SLIDE_STYLES.greenText :
                           SLIDE_STYLES.amberText;
        
        signalSlide.addText(`Primary Stress Signal: ${snapshot.primaryStressSignal}`, {
          x: 0.5,
          y: 1.0,
          w: 9,
          h: 0.3,
          fontSize: 12,
          bold: true,
          color: statusColor,
          fontFace: FONTS.primary,
        });
      }
      
      // Build horizontal signal table with signals as columns
      const signals = enhancedReport.signalTable;
      
      // Header row: Signal names
      const headerRow: pptxgen.TableCell[] = [
        { text: "Metric", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 9, align: "left" } },
      ];
      signals.forEach(s => {
        headerRow.push({
          text: s.signal.replace(' Rate', '').replace(' Ratio', ''),
          options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 9, align: "center" }
        });
      });
      
      // Value row
      const valueRow: pptxgen.TableCell[] = [
        { text: "Value", options: { fontSize: 9, bold: true } },
      ];
      signals.forEach(s => {
        valueRow.push({
          text: typeof s.value === 'number' ? s.value.toLocaleString() : String(s.value),
          options: { fontSize: 9, align: "center" }
        });
      });
      
      // Rate row with color coding
      const rateRow: pptxgen.TableCell[] = [
        { text: "Rate %", options: { fontSize: 9, bold: true } },
      ];
      signals.forEach(s => {
        rateRow.push({
          text: s.percentage,
          options: { 
            fontSize: 9, 
            align: "center",
            color: getSignalMetricColor(s.signal, s.percentage)
          }
        });
      });
      
      // Trend row with icons and color coding
      const trendRow: pptxgen.TableCell[] = [
        { text: "Trend", options: { fontSize: 9, bold: true } },
      ];
      signals.forEach(s => {
        const trendIcon = s.trend === 'up' ? '↑' : s.trend === 'down' ? '↓' : s.trend === 'stable' ? '→' : '–';
        trendRow.push({
          text: trendIcon,
          options: { 
            fontSize: 10, 
            align: "center",
            color: getTrendColor(s.signal, s.trend)
          }
        });
      });
      
      // Change row
      const changeRow: pptxgen.TableCell[] = [
        { text: "Change", options: { fontSize: 9, bold: true } },
      ];
      signals.forEach(s => {
        changeRow.push({
          text: s.trendDescription || '–',
          options: { 
            fontSize: 8, 
            align: "center",
            color: getTrendColor(s.signal, s.trend)
          }
        });
      });
      
      const signalTableRows: pptxgen.TableRow[] = [headerRow, valueRow, rateRow, trendRow, changeRow];
      
      // Calculate column widths: first col fixed, others equal
      const numSignals = signals.length;
      const firstColWidth = 0.8;
      const remainingWidth = 8.7 - firstColWidth;
      const signalColWidth = remainingWidth / numSignals;
      const colWidths = [firstColWidth, ...Array(numSignals).fill(signalColWidth)];
      
      signalSlide.addTable(signalTableRows, {
        x: 0.5,
        y: 1.4,
        w: 9,
        colW: colWidths,
        border: { type: "solid", color: SLIDE_STYLES.borderColor, pt: 0.5 },
        fontFace: FONTS.primary,
      });
      
      // Add denominator note
      if (enhancedReport.signalTableDenominatorNote) {
        signalSlide.addText(`* ${enhancedReport.signalTableDenominatorNote}`, {
          x: 0.5,
          y: 3.6,
          w: 9,
          h: 0.3,
          fontSize: 9,
          italic: true,
          color: SLIDE_STYLES.mutedColor,
          fontFace: FONTS.primary,
        });
      }
      
      // Add color legend
      signalSlide.addText("Legend: ", {
        x: 0.5,
        y: 4.0,
        w: 0.7,
        h: 0.25,
        fontSize: 9,
        color: SLIDE_STYLES.mutedColor,
        fontFace: FONTS.primary,
      });
      signalSlide.addText("● Healthy", {
        x: 1.2,
        y: 4.0,
        w: 1.0,
        h: 0.25,
        fontSize: 9,
        color: SLIDE_STYLES.greenText,
        fontFace: FONTS.primary,
      });
      signalSlide.addText("● Watch", {
        x: 2.2,
        y: 4.0,
        w: 0.8,
        h: 0.25,
        fontSize: 9,
        color: SLIDE_STYLES.amberText,
        fontFace: FONTS.primary,
      });
      signalSlide.addText("● Risk", {
        x: 3.0,
        y: 4.0,
        w: 0.6,
        h: 0.25,
        fontSize: 9,
        color: SLIDE_STYLES.redText,
        fontFace: FONTS.primary,
      });
      
      addSlideFooter(signalSlide, hasPostmasterData);
    }
    
    // Slide 2: MoM Analysis (Horizontal Layout)
    if (enhancedReport && enhancedReport.momAnalysis && enhancedReport.momAnalysis.comparisonAvailable) {
      const momSlide = pptx.addSlide();
      addSlideHeader(momSlide, "Month-over-Month Analysis");
      
      const mom = enhancedReport.momAnalysis;
      const categories = ['Changes This Month', 'Stable Factors', 'Worsened Before Shift'];
      const categoryData = [mom.changesThisMonth || [], mom.stableFactors || [], mom.worsenedBeforeShift || []];
      const maxRows = Math.max(...categoryData.map(arr => arr.length), 1);
      
      // Header row
      const momHeaderRow: pptxgen.TableCell[] = [
        { text: "", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 9 } },
      ];
      categories.forEach((cat, i) => {
        const color = i === 0 ? SLIDE_STYLES.amberText : i === 1 ? SLIDE_STYLES.greenText : SLIDE_STYLES.redText;
        momHeaderRow.push({
          text: cat,
          options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 9, align: "center", color }
        });
      });
      
      const momTableRows: pptxgen.TableRow[] = [momHeaderRow];
      
      // Data rows
      for (let rowIdx = 0; rowIdx < maxRows; rowIdx++) {
        const row: pptxgen.TableCell[] = [
          { text: rowIdx === 0 ? "Observations" : "", options: { fontSize: 9, bold: true, color: SLIDE_STYLES.mutedColor } },
        ];
        categoryData.forEach(data => {
          row.push({
            text: data[rowIdx] || '—',
            options: { fontSize: 9, align: "center" }
          });
        });
        momTableRows.push(row);
      }
      
      momSlide.addTable(momTableRows, {
        x: 0.5,
        y: 1.2,
        w: 9,
        colW: [0.9, 2.7, 2.7, 2.7],
        border: { type: "solid", color: SLIDE_STYLES.borderColor, pt: 0.5 },
        fontFace: FONTS.primary,
      });
      
      // Comparison note
      if (mom.comparisonNote) {
        momSlide.addText(mom.comparisonNote, {
          x: 0.5,
          y: 4.2,
          w: 9,
          h: 0.4,
          fontSize: 10,
          italic: true,
          color: SLIDE_STYLES.mutedColor,
          fontFace: FONTS.primary,
        });
      }
      
      addSlideFooter(momSlide, hasPostmasterData);
    }
    
    // Slide 3: Send Mix Analysis (Horizontal Layout)
    if (enhancedReport && enhancedReport.sendMixAnalysis) {
      const mixSlide = pptx.addSlide();
      addSlideHeader(mixSlide, "Send Mix & Lifecycle Pressure");
      
      const mix = enhancedReport.sendMixAnalysis;
      const mixTypes = ['Transactional', 'Lifecycle', 'Promotional'];
      const mixValues = [mix.transactionalPercent, mix.lifecyclePercent, mix.promotionalPercent];
      
      // Get color for mix values
      const getMixColor = (value: number, type: string): string => {
        if (type === 'Promotional' && value > 60) return SLIDE_STYLES.redText;
        if (type === 'Promotional' && value > 40) return SLIDE_STYLES.amberText;
        if (type === 'Transactional' && value > 30) return SLIDE_STYLES.greenText;
        if (type === 'Lifecycle' && value > 20) return SLIDE_STYLES.greenText;
        return SLIDE_STYLES.bodyColor;
      };
      
      // Get status for each type
      const getStatus = (type: string): { text: string; color: string } => {
        const typeLower = type.toLowerCase();
        if (mix.overweightedTypes.includes(typeLower)) {
          return { text: 'Overweighted', color: SLIDE_STYLES.redText };
        }
        if (mix.underutilizedAbsorbers.includes(typeLower)) {
          return { text: 'Underutilized', color: SLIDE_STYLES.amberText };
        }
        return { text: 'Balanced', color: SLIDE_STYLES.greenText };
      };
      
      // Header row
      const mixHeaderRow: pptxgen.TableCell[] = [
        { text: "", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 10 } },
      ];
      mixTypes.forEach(type => {
        mixHeaderRow.push({
          text: type,
          options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 10, align: "center" }
        });
      });
      
      // Mix % row
      const mixValueRow: pptxgen.TableCell[] = [
        { text: "Mix %", options: { fontSize: 10, bold: true } },
      ];
      mixTypes.forEach((type, i) => {
        mixValueRow.push({
          text: `${mixValues[i].toFixed(1)}%`,
          options: { fontSize: 12, bold: true, align: "center", color: getMixColor(mixValues[i], type) }
        });
      });
      
      // Status row
      const statusRow: pptxgen.TableCell[] = [
        { text: "Status", options: { fontSize: 10, bold: true } },
      ];
      mixTypes.forEach(type => {
        const status = getStatus(type);
        statusRow.push({
          text: status.text,
          options: { fontSize: 10, align: "center", color: status.color }
        });
      });
      
      const mixTableRows: pptxgen.TableRow[] = [mixHeaderRow, mixValueRow, statusRow];
      
      mixSlide.addTable(mixTableRows, {
        x: 1.5,
        y: 1.4,
        w: 7,
        colW: [1.2, 1.9, 1.9, 1.9],
        border: { type: "solid", color: SLIDE_STYLES.borderColor, pt: 0.5 },
        fontFace: FONTS.primary,
      });
      
      // Confidence badge
      const confidenceColor = mix.classificationConfidence === 'high' ? SLIDE_STYLES.greenText :
                              mix.classificationConfidence === 'medium' ? SLIDE_STYLES.amberText :
                              SLIDE_STYLES.redText;
      mixSlide.addText(`Classification Confidence: ${mix.classificationConfidence.toUpperCase()}`, {
        x: 0.5,
        y: 3.2,
        w: 4,
        h: 0.3,
        fontSize: 10,
        color: confidenceColor,
        fontFace: FONTS.primary,
      });
      
      // Ambiguity notes
      if (mix.ambiguityNotes && mix.ambiguityNotes.length > 0) {
        mixSlide.addText(`Notes: ${mix.ambiguityNotes.join('; ')}`, {
          x: 0.5,
          y: 3.6,
          w: 9,
          h: 0.4,
          fontSize: 9,
          italic: true,
          color: SLIDE_STYLES.mutedColor,
          fontFace: FONTS.primary,
        });
      }
      
      // Visual bar chart representation
      const barY = 4.2;
      const barHeight = 0.4;
      const totalWidth = 8;
      
      let currentX = 1;
      const colors = ['059669', 'D97706', 'DC2626']; // green, amber, red for trans, life, promo
      
      mixTypes.forEach((type, i) => {
        const width = (mixValues[i] / 100) * totalWidth;
        if (width > 0.1) {
          mixSlide.addShape("rect" as pptxgen.SHAPE_NAME, {
            x: currentX,
            y: barY,
            w: width,
            h: barHeight,
            fill: { color: colors[i] },
          });
          currentX += width;
        }
      });
      
      // Bar labels
      mixSlide.addText("■ Transactional  ■ Lifecycle  ■ Promotional", {
        x: 1,
        y: 4.7,
        w: 8,
        h: 0.25,
        fontSize: 9,
        color: SLIDE_STYLES.mutedColor,
        fontFace: FONTS.primary,
      });
      
      addSlideFooter(mixSlide, hasPostmasterData);
    }
    
    // Slide 4: Root Causes & Repair Actions
    if (enhancedReport && (enhancedReport.rootCauses.length > 0 || enhancedReport.repairActions.length > 0)) {
      const actionsSlide = pptx.addSlide();
      addSlideHeader(actionsSlide, "Root Causes & Repair Actions");
      
      // Left column - Root Causes
      if (enhancedReport.rootCauses.length > 0) {
        actionsSlide.addText("Root Causes", {
          x: 0.5,
          y: 1.2,
          w: 4.2,
          h: 0.35,
          fontSize: 14,
          bold: true,
          color: SLIDE_STYLES.amberText,
          fontFace: FONTS.primary,
        });
        
        enhancedReport.rootCauses.slice(0, 4).forEach((rc, i) => {
          actionsSlide.addText(`• ${rc.cause}`, {
            x: 0.5,
            y: 1.6 + i * 0.7,
            w: 4.2,
            h: 0.35,
            fontSize: 11,
            bold: true,
            color: SLIDE_STYLES.bodyColor,
            fontFace: FONTS.primary,
          });
          actionsSlide.addText(`Evidence: ${rc.evidence}`, {
            x: 0.6,
            y: 1.9 + i * 0.7,
            w: 4.1,
            h: 0.3,
            fontSize: 9,
            color: SLIDE_STYLES.mutedColor,
            fontFace: FONTS.primary,
          });
        });
      }
      
      // Right column - Repair Actions
      if (enhancedReport.repairActions.length > 0) {
        actionsSlide.addText("Repair Actions", {
          x: 5,
          y: 1.2,
          w: 4.5,
          h: 0.35,
          fontSize: 14,
          bold: true,
          color: SLIDE_STYLES.greenText,
          fontFace: FONTS.primary,
        });
        
        enhancedReport.repairActions.slice(0, 5).forEach((action, i) => {
          const priorityLabel = action.priority === 'immediate' ? '[0-7d]' : 
                               action.priority === 'short-term' ? '[7-21d]' : '[Ongoing]';
          const priorityColor = action.priority === 'immediate' ? SLIDE_STYLES.redText : 
                               action.priority === 'short-term' ? SLIDE_STYLES.amberText : SLIDE_STYLES.mutedColor;
          
          actionsSlide.addText(`${priorityLabel} ${action.action.substring(0, 55)}${action.action.length > 55 ? '...' : ''}`, {
            x: 5,
            y: 1.6 + i * 0.6,
            w: 4.5,
            h: 0.55,
            fontSize: 10,
            color: priorityColor,
            fontFace: FONTS.primary,
          });
        });
      }
      
      addSlideFooter(actionsSlide, hasPostmasterData);
    }
    
    // Slide 3: Legacy Diagnostic Summary (fallback if no enhanced report)
    if (!enhancedReport) {
      const summarySlide = pptx.addSlide();
      addSlideHeader(summarySlide, "Deliverability & Performance Diagnostics");
      
      // Trend analysis
      if (repReport.diagnosticSummary.trendAnalysis.length > 0) {
        summarySlide.addText("Trend Analysis", {
          x: 0.5,
          y: 1.2,
          w: 4.5,
          h: 0.35,
          fontSize: 14,
          bold: true,
          color: SLIDE_STYLES.headerColor,
          fontFace: FONTS.primary,
        });
        
        repReport.diagnosticSummary.trendAnalysis.slice(0, 4).forEach((t, i) => {
          const trendIcon = t.trend === 'improving' ? '↑' : t.trend === 'declining' ? '↓' : '→';
          const trendColor = t.trend === 'improving' ? SLIDE_STYLES.greenText : t.trend === 'declining' ? SLIDE_STYLES.redText : SLIDE_STYLES.mutedColor;
          summarySlide.addText(`${trendIcon} ${t.observation}`, {
            x: 0.5,
            y: 1.6 + i * 0.45,
            w: 4.5,
            h: 0.4,
            fontSize: 11,
            color: trendColor,
            fontFace: FONTS.primary,
          });
        });
      }
      
      // Prioritized recommendations
      if (repReport.diagnosticSummary.prioritizedRecommendations.length > 0) {
        summarySlide.addText("Prioritized Actions", {
          x: 5.2,
          y: 1.2,
          w: 4.3,
          h: 0.35,
          fontSize: 14,
          bold: true,
          color: SLIDE_STYLES.headerColor,
          fontFace: FONTS.primary,
        });
        
        repReport.diagnosticSummary.prioritizedRecommendations.slice(0, 4).forEach((r, i) => {
          const priorityLabel = r.priority === 'immediate' ? '[0-7d]' : r.priority === 'short-term' ? '[7-21d]' : '[Ongoing]';
          const priorityColor = r.priority === 'immediate' ? SLIDE_STYLES.redText : r.priority === 'short-term' ? SLIDE_STYLES.amberText : SLIDE_STYLES.mutedColor;
          summarySlide.addText(`${priorityLabel} ${r.recommendation.substring(0, 60)}${r.recommendation.length > 60 ? '...' : ''}`, {
            x: 5.2,
            y: 1.6 + i * 0.55,
            w: 4.3,
            h: 0.5,
            fontSize: 10,
            color: priorityColor,
            fontFace: FONTS.primary,
          });
        });
      }
      
      addSlideFooter(summarySlide, hasPostmasterData);
    }
    
    // Issues Detail Slide (if any)
    if (repReport.issues.length > 0) {
      const issuesSlide = pptx.addSlide();
      addSlideHeader(issuesSlide, `Campaign Issues Detected (${repReport.issues.length})`);
      
      // Show top 4 issues as a table
      const issuesTableRows: pptxgen.TableRow[] = [
        [
          { text: "Campaign", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 9 } },
          { text: "Observation", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 9 } },
          { text: "Impact", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 9 } },
          { text: "Priority", options: { bold: true, fill: { color: SLIDE_STYLES.headerRowBg }, fontSize: 9, align: "center" } },
        ],
      ];
      
      repReport.issues.slice(0, 4).forEach(issue => {
        const priorityColor = issue.priority === 'immediate' ? SLIDE_STYLES.redText : 
                              issue.priority === 'short-term' ? SLIDE_STYLES.amberText : SLIDE_STYLES.mutedColor;
        issuesTableRows.push([
          { text: issue.campaignId.substring(0, 12), options: { fontSize: 9 } },
          { text: issue.observation.substring(0, 45) + (issue.observation.length > 45 ? '...' : ''), options: { fontSize: 9 } },
          { text: issue.impact.substring(0, 35) + (issue.impact.length > 35 ? '...' : ''), options: { fontSize: 9 } },
          { text: issue.priority || 'N/A', options: { fontSize: 9, align: "center", color: priorityColor } },
        ]);
      });
      
      issuesSlide.addTable(issuesTableRows, {
        x: 0.5,
        y: 1.2,
        w: 9,
        colW: [1.5, 3.5, 2.5, 1.5],
        border: { type: "solid", color: SLIDE_STYLES.borderColor, pt: 0.5 },
        fontFace: FONTS.primary,
      });
      
      if (repReport.issues.length > 4) {
        issuesSlide.addText(`+ ${repReport.issues.length - 4} more issues in detailed report`, {
          x: 0.5,
          y: 4.2,
          w: 9,
          h: 0.3,
          fontSize: 10,
          italic: true,
          color: SLIDE_STYLES.mutedColor,
          fontFace: FONTS.primary,
        });
      }
      
      addSlideFooter(issuesSlide, hasPostmasterData);
    }
  }
  
  // Generate filename
  const monthRange = diagnostics.analysisReport ? getMonthRange(diagnostics.analysisReport) : "";
  const safeMonthRange = monthRange.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
  const reportType = activeReport === "analysis" ? "Analysis" : "Reputation_Repair";
  const fileName = `Inbox_Diagnostics_${brandName}_${safeMonthRange || "Report"}.pptx`;
  
  await pptx.writeFile({ fileName });
};
